import mongoose from 'mongoose';
import crypto from 'crypto';
import Candidate from '../models/Candidate.js';
import User from '../models/User.js';
import VoteReceipt from '../models/VoteReceipt.js';
import VoteVerificationChallenge from '../models/VoteVerificationChallenge.js';
import { verifyVoteVerificationToken } from '../lib/voteVerification.js';
import { createSecurityEvent, getRequestSecurityContext, observeAccessFingerprint } from '../lib/securityMonitor.js';
import {
  VOTABLE_ELECTION_STATUSES,
  HttpError,
  throwHttpError,
  captureSecuritySignal,
  serializeElection,
  serializeReceipt,
  validateObjectId,
  extractElectionId,
  findElectionById,
  getPreferredElection,
  ensureElectionIsVotable,
  handleControllerError,
  withOptionalSession,
  saveWithOptionalSession
} from '../utils/voteUtils.js';

const VOTE_VERIFICATION_MAX_AGE_MS = 10 * 60 * 1000;
const RAPID_VOTE_BURST_WINDOW_SECONDS = 90;
const RAPID_VOTE_BURST_THRESHOLD = 8;

const generateReceiptCode = () => {
  const year = new Date().getFullYear();
  const randomBlock = crypto.randomBytes(16).toString('hex').toUpperCase();
  return `CV-${year}-${randomBlock}`;
};

const createUniqueReceiptCode = async (session = null) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const receiptCode = generateReceiptCode();
    let existsQuery = VoteReceipt.exists({ receiptCode });
    if (session) existsQuery = existsQuery.session(session);

    const exists = await existsQuery;
    if (!exists) return receiptCode;
  }
  return `CV-${Date.now()}-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
};

const isUnsupportedTransactionError = (error) => {
  const message = String(error?.message || '');
  return (
    message.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
    message.includes('Current topology does not support sessions') ||
    message.includes('Transaction is not supported')
  );
};

const validateVoteVerificationForCast = async ({
  userId,
  requestedElectionId,
  verificationToken,
  session = null
}) => {
  if (!verificationToken || typeof verificationToken !== 'string') {
    throwHttpError(400, 'Strong voter verification is required before casting vote.');
  }

  let verificationPayload = null;
  try {
    verificationPayload = verifyVoteVerificationToken(verificationToken);
  } catch {
    throwHttpError(401, 'Vote verification token is invalid or expired. Verify again before casting your vote.');
  }

  if (verificationPayload?.purpose !== 'vote-cast') {
    throwHttpError(401, 'Invalid vote verification token purpose.');
  }

  const verifiedUserId = String(verificationPayload.userId || '');
  const verifiedElectionId = String(verificationPayload.electionId || '');
  const challengeId = String(verificationPayload.challengeId || '');

  if (!verifiedUserId || !verifiedElectionId || !challengeId) {
    throwHttpError(401, 'Vote verification token is malformed.');
  }
  if (verifiedUserId !== String(userId)) {
    throwHttpError(403, 'Vote verification token does not belong to this voter.');
  }
  if (requestedElectionId && verifiedElectionId !== String(requestedElectionId)) {
    throwHttpError(400, 'Vote verification token does not match the selected election.');
  }

  validateObjectId(verifiedElectionId, 'verified election id');
  validateObjectId(challengeId, 'verification challenge id');

  const challenge = await withOptionalSession(
    VoteVerificationChallenge.findOne({ _id: challengeId, user: userId, election: verifiedElectionId }),
    session
  );

  if (!challenge) throwHttpError(401, 'Vote verification challenge not found. Request a new code.');
  if (!challenge.verifiedAt) throwHttpError(401, 'Verification code is not confirmed yet. Complete verification first.');
  if (challenge.consumedAt) throwHttpError(401, 'Vote verification challenge is already consumed. Request a new code.');

  const now = new Date();
  if (challenge.expiresAt && now > challenge.expiresAt) {
    throwHttpError(401, 'Verification code expired. Request and verify a new code.');
  }
  if (now.getTime() - challenge.verifiedAt.getTime() > VOTE_VERIFICATION_MAX_AGE_MS) {
    throwHttpError(401, 'Vote verification session expired. Verify again before casting your vote.');
  }

  return { verifiedElectionId, challenge };
};

const executeVoteCast = async ({ userId, candidateId, requestedElectionId, verificationToken, session = null }) => {
  const verificationContext = await validateVoteVerificationForCast({
    userId, requestedElectionId, verificationToken, session
  });

  const effectiveRequestedElectionId = requestedElectionId || verificationContext.verifiedElectionId;

  const user = await withOptionalSession(User.findById(userId), session);
  if (!user) throwHttpError(404, 'Voter not found.');

  const candidate = await withOptionalSession(Candidate.findById(candidateId), session);
  if (!candidate) throwHttpError(404, 'Candidate not found.');

  let election = null;
  if (candidate.election) {
    election = await withOptionalSession(Election.findById(candidate.election), session);
  }
  if (!election && effectiveRequestedElectionId) {
    election = await findElectionById(effectiveRequestedElectionId, session);
  }
  if (!election) {
    election = await getPreferredElection({ statuses: VOTABLE_ELECTION_STATUSES, session });
  }

  if (!election) throwHttpError(404, 'No election available for voting.');

  if (effectiveRequestedElectionId) {
    validateObjectId(effectiveRequestedElectionId, 'election id');
    if (String(election.id) !== effectiveRequestedElectionId) {
      throwHttpError(400, 'Selected candidate does not belong to the requested election.');
    }
  }

  ensureElectionIsVotable(election);

  if (candidate.election && String(candidate.election) !== String(election.id)) {
    throwHttpError(400, 'Candidate is not part of this election.');
  }
  if (!candidate.election) candidate.election = election.id;

  const existingReceipt = await withOptionalSession(
    VoteReceipt.findOne({ user: user.id, election: election.id }),
    session
  );
  if (existingReceipt) throwHttpError(400, 'You have already cast your vote in this election.');

  const receiptCode = await createUniqueReceiptCode(session);

  let receiptRecords;
  try {
    const data = [{
      user: user.id,
      election: election.id,
      candidate: candidate.id,
      receiptCode,
      electionName: election.name,
      status: 'pending'
    }];
    receiptRecords = session ? await VoteReceipt.create(data, { session }) : await VoteReceipt.create(data);
  } catch (error) {
    if (error.code === 11000) throwHttpError(400, 'You have already cast your vote in this election.');
    throw error;
  }

  const receipt = receiptRecords[0];

  await withOptionalSession(
    Candidate.updateOne({ _id: candidate.id }, { $inc: { voteCount: 1 } }),
    session
  );

  receipt.status = 'counted';
  await saveWithOptionalSession(receipt, session);

  verificationContext.challenge.consumedAt = new Date();
  await saveWithOptionalSession(verificationContext.challenge, session);

  return {
    message: 'Vote successfully cast!',
    election: serializeElection(election),
    votedFor: { id: candidate.id, name: candidate.name, party: candidate.party },
    receipt: {
      receiptCode: receipt.receiptCode,
      code: receipt.receiptCode,
      electionId: election.id,
      electionName: election.name,
      status: receipt.status,
      submittedAt: receipt.createdAt
    }
  };
};

export const verifyVoteReceipt = async (req, res) => {
  try {
    const code = String(req.params.receiptCode || '').trim().toUpperCase();
    if (!code) throwHttpError(400, 'Receipt code is required.');

    const receipt = await VoteReceipt.findOne({ receiptCode: code })
      .populate('candidate', 'name party')
      .populate('election', 'name slug status registrationStartsAt registrationEndsAt votingStartsAt votingEndsAt')
      .select('receiptCode status createdAt election electionName candidate');

    if (!receipt) throwHttpError(404, 'Receipt not found.');

    return res.json(serializeReceipt(receipt));
  } catch (error) {
    return handleControllerError(res, error, 'Server error while verifying receipt.');
  }
};

export const getMyVoteReceipt = async (req, res) => {
  try {
    let election = null;
    const electionId = extractElectionId(req);
    if (electionId) election = await findElectionById(electionId);

    const query = { user: req.user.id };
    if (election) query.election = election.id;

    const receipt = await VoteReceipt.findOne(query)
      .sort({ createdAt: -1 })
      .populate('candidate', 'name party')
      .populate('election', 'name slug status registrationStartsAt registrationEndsAt votingStartsAt votingEndsAt')
      .select('receiptCode status createdAt election electionName candidate');

    if (!receipt) {
      if (election) throwHttpError(404, 'Receipt not found for this user in the selected election.');
      throwHttpError(404, 'Receipt not found for this user.');
    }

    return res.json(serializeReceipt(receipt));
  } catch (error) {
    return handleControllerError(res, error, 'Server error while fetching user receipt.');
  }
};

export const castVote = async (req, res) => {
  const { candidateId, verificationToken } = req.body;
  const requestedElectionId = extractElectionId(req);
  const userId = req.user.id;

  if (!candidateId) return res.status(400).json({ message: 'candidateId is required.' });
  if (!mongoose.Types.ObjectId.isValid(candidateId)) return res.status(400).json({ message: 'Invalid candidate id.' });
  if (!verificationToken || typeof verificationToken !== 'string') {
    return res.status(400).json({ message: 'verificationToken is required for strong voter verification.' });
  }

  try {
    let responsePayload = null;
    try {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          responsePayload = await executeVoteCast({ userId, candidateId, requestedElectionId, verificationToken, session });
        });
      } finally {
        await session.endSession();
      }
    } catch (transactionError) {
      if (!isUnsupportedTransactionError(transactionError)) throw transactionError;
    }

    if (!responsePayload) {
      responsePayload = await executeVoteCast({ userId, candidateId, requestedElectionId, verificationToken });
    }

    await captureSecuritySignal(async () => {
      const requestContext = getRequestSecurityContext(req);
      const electionId = String(responsePayload.election?._id || responsePayload.receipt?.electionId || '').trim();
      const electionName = String(responsePayload.election?.name || responsePayload.receipt?.electionName || '').trim();

      await observeAccessFingerprint({
        actor: req.user, actorRole: req.user.role, actorEmail: req.user.email,
        election: electionId ? { id: electionId, name: electionName } : null,
        electionName, eventType: 'vote_cast_access', message: 'Voter submitted a ballot after strong verification.',
        requestContext, metadata: { candidateId }
      });

      await createSecurityEvent({
        eventType: 'vote_cast_recorded', category: 'voting', severity: 'info', isAnomaly: false,
        message: 'Vote cast event recorded for security telemetry.',
        actorId: req.user.id, actorRole: req.user.role, actorEmail: req.user.email,
        electionId, electionName, sourceIp: requestContext.ipAddress, userAgent: requestContext.userAgent,
        metadata: { receiptCode: responsePayload.receipt?.receiptCode || '' }
      });

      if (electionId && mongoose.Types.ObjectId.isValid(electionId)) {
        const windowStart = new Date(Date.now() - (RAPID_VOTE_BURST_WINDOW_SECONDS * 1000));
        const recentVotes = await VoteReceipt.countDocuments({ election: electionId, createdAt: { $gte: windowStart } });

        if (recentVotes >= RAPID_VOTE_BURST_THRESHOLD) {
          await createSecurityEvent({
            eventType: 'rapid_vote_burst', category: 'voting', severity: 'high', isAnomaly: true,
            message: 'Rapid voting burst detected in a short time window.',
            actorId: req.user.id, actorRole: req.user.role, actorEmail: req.user.email,
            electionId, electionName, sourceIp: requestContext.ipAddress, userAgent: requestContext.userAgent,
            metadata: { recentVotes, windowSeconds: RAPID_VOTE_BURST_WINDOW_SECONDS, threshold: RAPID_VOTE_BURST_THRESHOLD }
          });
        }
      }
    });

    return res.status(200).json(responsePayload);
  } catch (error) {
    if (error instanceof HttpError) return res.status(error.statusCode).json({ message: error.message });
    return res.status(500).json({ message: 'Server error during voting' });
  }
};
