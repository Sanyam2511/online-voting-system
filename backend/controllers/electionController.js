import Election, { ELECTION_STATUSES } from '../models/Election.js';
import Candidate from '../models/Candidate.js';
import {
  PUBLIC_ELECTION_STATUSES,
  ELECTION_STATUS_TRANSITIONS,
  SUSPICIOUS_ADMIN_TRANSITION_WINDOW_MS,
  HttpError,
  throwHttpError,
  captureSecuritySignal,
  escapeRegex,
  parseDateInput,
  validateElectionTimeline,
  serializeElection,
  validateObjectId,
  createUniqueElectionSlug,
  handleControllerError
} from '../utils/voteUtils.js';
import {
  createSecurityEvent,
  getRequestSecurityContext,
  recordAdminAction
} from '../lib/securityMonitor.js';

const buildElectionVolumeMetrics = async (elections) => {
  if (elections.length === 0) return [];
  const electionIds = elections.map((election) => election._id);

  const [candidateCountsRaw, votesRaw] = await Promise.all([
    Candidate.aggregate([
      { $match: { election: { $in: electionIds } } },
      { $group: { _id: '$election', totalCandidates: { $sum: 1 } } }
    ]),
    Candidate.aggregate([
      { $match: { election: { $in: electionIds } } },
      { $group: { _id: '$election', totalVotesCast: { $sum: '$voteCount' } } }
    ])
  ]);

  const candidateCounts = new Map(candidateCountsRaw.map((entry) => [String(entry._id), entry.totalCandidates]));
  const voteCounts = new Map(votesRaw.map((entry) => [String(entry._id), entry.totalVotesCast]));

  return elections.map((election) => serializeElection(election, {
    totalCandidates: candidateCounts.get(election.id) || 0,
    totalVotesCast: voteCounts.get(election.id) || 0
  }));
};

export const getPublicElections = async (req, res) => {
  try {
    let elections = await Election.find({ status: { $in: PUBLIC_ELECTION_STATUSES } })
      .sort({ updatedAt: -1, createdAt: -1 });

    if (elections.length === 0) {
      elections = await Election.find({}).sort({ updatedAt: -1, createdAt: -1 });
    }

    const electionMetrics = await buildElectionVolumeMetrics(elections);
    return res.json({ elections: electionMetrics });
  } catch (error) {
    return handleControllerError(res, error, 'Server error while loading elections.');
  }
};

export const getManagedElections = async (req, res) => {
  try {
    const elections = await Election.find({}).sort({ createdAt: -1 });
    const electionMetrics = await buildElectionVolumeMetrics(elections);
    return res.json({ elections: electionMetrics });
  } catch (error) {
    return handleControllerError(res, error, 'Server error while loading election management data.');
  }
};

export const createElection = async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const requestedStatus = String(req.body.status || '').trim().toLowerCase();

    if (!name) throwHttpError(400, 'name is required.');
    if (requestedStatus && !ELECTION_STATUSES.includes(requestedStatus)) {
      throwHttpError(400, 'Invalid election status.');
    }

    const registrationStartsAt = parseDateInput(req.body.registrationStartsAt, 'registrationStartsAt');
    const registrationEndsAt = parseDateInput(req.body.registrationEndsAt, 'registrationEndsAt');
    const votingStartsAt = parseDateInput(req.body.votingStartsAt, 'votingStartsAt');
    const votingEndsAt = parseDateInput(req.body.votingEndsAt, 'votingEndsAt');

    const timelineError = validateElectionTimeline({
      registrationStartsAt, registrationEndsAt, votingStartsAt, votingEndsAt
    });
    if (timelineError) throwHttpError(400, timelineError);

    const existingElection = await Election.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }
    });
    if (existingElection) throwHttpError(400, 'Election with this name already exists.');

    const slugSeed = String(req.body.slug || name).trim();
    const slug = await createUniqueElectionSlug(slugSeed);

    const election = await Election.create({
      name, slug, description,
      status: requestedStatus || 'draft',
      registrationStartsAt, registrationEndsAt, votingStartsAt, votingEndsAt
    });

    await captureSecuritySignal(async () => {
      await recordAdminAction({
        actor: req.user,
        eventType: 'admin_election_created',
        message: 'Admin created a new election.',
        requestContext: getRequestSecurityContext(req),
        election,
        metadata: { status: election.status }
      });
    });

    return res.status(201).json(serializeElection(election));
  } catch (error) {
    return handleControllerError(res, error, 'Server error while creating election.');
  }
};

export const updateElection = async (req, res) => {
  try {
    const { electionId } = req.params;
    validateObjectId(electionId, 'election id');

    const election = await Election.findById(electionId);
    if (!election) throwHttpError(404, 'Election not found.');

    if (Object.prototype.hasOwnProperty.call(req.body, 'status') && req.body.status !== election.status) {
      throwHttpError(400, 'Use transition endpoint to move election lifecycle status.');
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      const nextName = String(req.body.name || '').trim();
      if (!nextName) throwHttpError(400, 'name cannot be empty.');
      if (nextName !== election.name) {
        const existingByName = await Election.findOne({
          _id: { $ne: election.id },
          name: { $regex: `^${escapeRegex(nextName)}$`, $options: 'i' }
        });
        if (existingByName) throwHttpError(400, 'Election with this name already exists.');
      }
      election.name = nextName;
      election.slug = await createUniqueElectionSlug(String(req.body.slug || nextName).trim(), election.id);
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'description')) {
      election.description = String(req.body.description || '').trim();
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'registrationStartsAt')) {
      election.registrationStartsAt = parseDateInput(req.body.registrationStartsAt, 'registrationStartsAt');
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'registrationEndsAt')) {
      election.registrationEndsAt = parseDateInput(req.body.registrationEndsAt, 'registrationEndsAt');
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'votingStartsAt')) {
      election.votingStartsAt = parseDateInput(req.body.votingStartsAt, 'votingStartsAt');
    }
    if (Object.prototype.hasOwnProperty.call(req.body, 'votingEndsAt')) {
      election.votingEndsAt = parseDateInput(req.body.votingEndsAt, 'votingEndsAt');
    }

    const timelineError = validateElectionTimeline({
      registrationStartsAt: election.registrationStartsAt,
      registrationEndsAt: election.registrationEndsAt,
      votingStartsAt: election.votingStartsAt,
      votingEndsAt: election.votingEndsAt
    });
    if (timelineError) throwHttpError(400, timelineError);

    await election.save();

    await captureSecuritySignal(async () => {
      await recordAdminAction({
        actor: req.user,
        eventType: 'admin_election_updated',
        message: 'Admin updated election metadata.',
        requestContext: getRequestSecurityContext(req),
        election,
        metadata: { status: election.status }
      });
    });

    return res.json(serializeElection(election));
  } catch (error) {
    return handleControllerError(res, error, 'Server error while updating election.');
  }
};

export const transitionElectionStatus = async (req, res) => {
  try {
    const { electionId } = req.params;
    const nextStatus = String(req.body.nextStatus || '').trim().toLowerCase();

    validateObjectId(electionId, 'election id');

    if (!ELECTION_STATUSES.includes(nextStatus)) throwHttpError(400, 'Invalid nextStatus value.');

    const election = await Election.findById(electionId);
    if (!election) throwHttpError(404, 'Election not found.');

    const previousStatus = election.status;
    const previousStatusUpdatedAt = election.updatedAt ? new Date(election.updatedAt) : null;

    if (election.status === nextStatus) return res.json(serializeElection(election));

    const allowedTransitions = ELECTION_STATUS_TRANSITIONS[election.status] || [];
    if (!allowedTransitions.includes(nextStatus)) {
      throwHttpError(400, `Invalid lifecycle transition from '${election.status}' to '${nextStatus}'.`);
    }

    const now = new Date();
    if (nextStatus === 'registration' && !election.registrationStartsAt) election.registrationStartsAt = now;
    if (nextStatus === 'live') {
      if (!election.votingStartsAt) election.votingStartsAt = now;
      if (election.votingStartsAt && now < election.votingStartsAt) throwHttpError(400, 'Cannot activate voting before votingStartsAt.');
      if (election.votingEndsAt && now > election.votingEndsAt) throwHttpError(400, 'Cannot activate voting after votingEndsAt.');
    }
    if (nextStatus === 'counting' && !election.votingEndsAt) election.votingEndsAt = now;
    if (nextStatus === 'published') election.resultsPublishedAt = now;
    if (nextStatus === 'archived') election.archivedAt = now;

    election.status = nextStatus;
    await election.save();

    await captureSecuritySignal(async () => {
      const requestContext = getRequestSecurityContext(req);
      await recordAdminAction({
        actor: req.user,
        eventType: 'admin_election_transition',
        message: `Admin transitioned election from ${previousStatus} to ${nextStatus}.`,
        requestContext,
        election,
        metadata: { previousStatus, nextStatus }
      });

      if (
        previousStatusUpdatedAt &&
        (Date.now() - previousStatusUpdatedAt.getTime()) <= SUSPICIOUS_ADMIN_TRANSITION_WINDOW_MS &&
        ['counting', 'published', 'archived'].includes(nextStatus)
      ) {
        await createSecurityEvent({
          eventType: 'admin_rapid_election_transition',
          category: 'admin',
          severity: 'high',
          isAnomaly: true,
          message: 'Election lifecycle transitioned unusually quickly into a sensitive state.',
          actorId: req.user.id,
          actorRole: req.user.role,
          actorEmail: req.user.email,
          electionId: election.id,
          electionName: election.name,
          sourceIp: requestContext.ipAddress,
          userAgent: requestContext.userAgent,
          metadata: { previousStatus, nextStatus, msSinceLastTransition: Date.now() - previousStatusUpdatedAt.getTime() }
        });
      }
    });

    return res.json(serializeElection(election));
  } catch (error) {
    return handleControllerError(res, error, 'Server error while transitioning election status.');
  }
};
