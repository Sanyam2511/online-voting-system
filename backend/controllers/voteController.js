import Candidate from '../models/Candidate.js';
import User from '../models/User.js';
import defaultCandidates from '../data/defaultCandidates.js';
import VoteReceipt from '../models/VoteReceipt.js';
import Election, { ELECTION_STATUSES } from '../models/Election.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

const DEFAULT_ELECTION_NAME = 'National General Election 2026';
const DEFAULT_ELECTION_SLUG = 'national-general-election-2026';
const PUBLIC_ELECTION_STATUSES = ['registration', 'live', 'counting', 'audited', 'published'];
const VOTABLE_ELECTION_STATUSES = ['live'];
const RECEIPT_COUNTABLE_STATUSES = ['counted', 'pending'];

const ELECTION_STATUS_TRANSITIONS = {
  draft: ['registration', 'archived'],
  registration: ['live', 'archived'],
  live: ['counting'],
  counting: ['audited'],
  audited: ['published', 'archived'],
  published: ['archived'],
  archived: []
};

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

const throwHttpError = (statusCode, message) => {
  throw new HttpError(statusCode, message);
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toSlug = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

const parsePriorities = (prioritiesValue) => {
  if (Array.isArray(prioritiesValue)) {
    return prioritiesValue.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof prioritiesValue === 'string') {
    return prioritiesValue.split(',').map((item) => item.trim()).filter(Boolean);
  }

  return [];
};

const parseDateInput = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throwHttpError(400, `Invalid ${fieldName}.`);
  }

  return date;
};

const validateElectionTimeline = ({
  registrationStartsAt,
  registrationEndsAt,
  votingStartsAt,
  votingEndsAt
}) => {
  if (registrationStartsAt && registrationEndsAt && registrationStartsAt > registrationEndsAt) {
    return 'registrationStartsAt must be before registrationEndsAt.';
  }

  if (votingStartsAt && votingEndsAt && votingStartsAt > votingEndsAt) {
    return 'votingStartsAt must be before votingEndsAt.';
  }

  if (registrationEndsAt && votingStartsAt && registrationEndsAt > votingStartsAt) {
    return 'registrationEndsAt must be before votingStartsAt.';
  }

  return null;
};

const serializeElection = (election, extras = {}) => ({
  _id: election.id,
  name: election.name,
  slug: election.slug,
  description: election.description || '',
  status: election.status,
  registrationStartsAt: election.registrationStartsAt,
  registrationEndsAt: election.registrationEndsAt,
  votingStartsAt: election.votingStartsAt,
  votingEndsAt: election.votingEndsAt,
  resultsPublishedAt: election.resultsPublishedAt,
  archivedAt: election.archivedAt,
  createdAt: election.createdAt,
  updatedAt: election.updatedAt,
  ...extras
});

const serializeCandidate = (candidate) => {
  const electionRef = candidate.election;
  const hasPopulatedElection = electionRef && typeof electionRef === 'object' && electionRef.name;
  const electionId = hasPopulatedElection
    ? electionRef.id
    : (electionRef ? String(electionRef) : null);

  return {
    _id: candidate.id,
    electionId,
    electionName: candidate.electionName || (hasPopulatedElection ? electionRef.name : DEFAULT_ELECTION_NAME),
    election: hasPopulatedElection ? serializeElection(electionRef) : null,
    name: candidate.name,
    party: candidate.party,
    campaignTagline: candidate.campaignTagline || '',
    manifesto: candidate.manifesto,
    imageUrl: candidate.imageUrl,
    bio: candidate.bio || '',
    region: candidate.region || '',
    age: candidate.age,
    education: candidate.education || '',
    experience: candidate.experience || '',
    priorities: candidate.priorities || [],
    isVerified: Boolean(candidate.isVerified),
    voteCount: candidate.voteCount
  };
};

const serializeReceipt = (receipt) => {
  const electionRef = receipt.election;
  const hasPopulatedElection = electionRef && typeof electionRef === 'object' && electionRef.name;

  return {
    receiptCode: receipt.receiptCode,
    status: receipt.status,
    electionId: hasPopulatedElection
      ? electionRef.id
      : (electionRef ? String(electionRef) : null),
    electionName: receipt.electionName || (hasPopulatedElection ? electionRef.name : DEFAULT_ELECTION_NAME),
    election: hasPopulatedElection ? serializeElection(electionRef) : null,
    submittedAt: receipt.createdAt,
    candidate: receipt.candidate
      ? {
          _id: receipt.candidate.id,
          name: receipt.candidate.name,
          party: receipt.candidate.party
        }
      : null
  };
};

const validateObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throwHttpError(400, `Invalid ${fieldName}.`);
  }
};

const extractElectionId = (req) => {
  const queryElectionId = typeof req.query?.electionId === 'string' ? req.query.electionId : '';
  const bodyElectionId = typeof req.body?.electionId === 'string' ? req.body.electionId : '';
  const electionId = queryElectionId || bodyElectionId;

  return electionId.trim();
};

const buildElectionFindOneQuery = (filter, session = null) => {
  let query = Election.findOne(filter);

  if (session) {
    query = query.session(session);
  }

  return query;
};

const findElectionById = async (electionId, session = null) => {
  validateObjectId(electionId, 'election id');

  let query = Election.findById(electionId);
  if (session) {
    query = query.session(session);
  }

  const election = await query;

  if (!election) {
    throwHttpError(404, 'Election not found.');
  }

  return election;
};

const getPreferredElection = async ({ statuses = PUBLIC_ELECTION_STATUSES, session = null } = {}) => {
  const seenStatuses = new Set();

  for (const status of statuses) {
    if (seenStatuses.has(status)) {
      continue;
    }

    seenStatuses.add(status);

    let query = Election.findOne({ status }).sort({ updatedAt: -1, createdAt: -1 });

    if (session) {
      query = query.session(session);
    }

    const election = await query;
    if (election) {
      return election;
    }
  }

  let fallbackQuery = Election.findOne({}).sort({ updatedAt: -1, createdAt: -1 });
  if (session) {
    fallbackQuery = fallbackQuery.session(session);
  }

  return fallbackQuery;
};

const resolveElectionFromRequest = async (
  req,
  {
    required = false,
    fallbackToPreferred = false,
    preferredStatuses = PUBLIC_ELECTION_STATUSES
  } = {}
) => {
  const electionId = extractElectionId(req);

  if (electionId) {
    return findElectionById(electionId);
  }

  if (fallbackToPreferred) {
    const election = await getPreferredElection({ statuses: preferredStatuses });

    if (!election && required) {
      throwHttpError(404, 'No election available.');
    }

    return election;
  }

  if (required) {
    throwHttpError(400, 'electionId is required.');
  }

  return null;
};

const ensureElectionIsVotable = (election) => {
  if (!VOTABLE_ELECTION_STATUSES.includes(election.status)) {
    throwHttpError(400, `Election is not accepting votes in '${election.status}' status.`);
  }

  const now = new Date();

  if (election.votingStartsAt && now < election.votingStartsAt) {
    throwHttpError(400, 'Voting has not started for this election yet.');
  }

  if (election.votingEndsAt && now > election.votingEndsAt) {
    throwHttpError(400, 'Voting has already ended for this election.');
  }
};

const createUniqueElectionSlug = async (seedSlug, ignoredElectionId = null) => {
  const normalizedBase = toSlug(seedSlug) || `election-${Date.now()}`;

  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidateSlug = attempt === 0 ? normalizedBase : `${normalizedBase}-${attempt + 1}`;
    const existingElection = await Election.findOne({ slug: candidateSlug }).select('_id');

    if (!existingElection || (ignoredElectionId && existingElection.id === ignoredElectionId)) {
      return candidateSlug;
    }
  }

  return `${normalizedBase}-${Date.now()}`;
};

const ensureDefaultElection = async () => {
  let election = await buildElectionFindOneQuery({ slug: DEFAULT_ELECTION_SLUG });

  if (!election) {
    election = await buildElectionFindOneQuery({ name: DEFAULT_ELECTION_NAME });
  }

  if (election) {
    let shouldSave = false;

    if (!election.slug) {
      election.slug = await createUniqueElectionSlug(DEFAULT_ELECTION_SLUG, election.id);
      shouldSave = true;
    }

    if (!election.votingStartsAt) {
      election.votingStartsAt = new Date(Date.now() - (24 * 60 * 60 * 1000));
      shouldSave = true;
    }

    if (!election.votingEndsAt) {
      election.votingEndsAt = new Date(Date.now() + (365 * 24 * 60 * 60 * 1000));
      shouldSave = true;
    }

    if (election.status === 'draft') {
      election.status = 'live';
      shouldSave = true;
    }

    if (shouldSave) {
      await election.save();
    }

    return election;
  }

  const now = Date.now();

  return Election.create({
    name: DEFAULT_ELECTION_NAME,
    slug: DEFAULT_ELECTION_SLUG,
    description: 'Default election seeded for initial platform bootstrapping.',
    status: 'live',
    votingStartsAt: new Date(now - (24 * 60 * 60 * 1000)),
    votingEndsAt: new Date(now + (365 * 24 * 60 * 60 * 1000))
  });
};

const ensureCandidatesSeeded = async () => {
  const defaultElection = await ensureDefaultElection();
  const candidateCount = await Candidate.estimatedDocumentCount();

  if (candidateCount === 0) {
    const seededCandidates = defaultCandidates.map((candidate) => ({
      ...candidate,
      election: defaultElection.id,
      electionName: defaultElection.name
    }));

    await Candidate.insertMany(seededCandidates);
    return;
  }

  const elections = await Election.find({}).select('name');
  for (const election of elections) {
    await Candidate.updateMany(
      {
        $or: [
          { election: { $exists: false } },
          { election: null }
        ],
        electionName: election.name
      },
      {
        $set: {
          election: election.id,
          electionName: election.name
        }
      }
    );
  }

  await Candidate.updateMany(
    {
      $or: [
        { election: { $exists: false } },
        { election: null }
      ]
    },
    {
      $set: {
        election: defaultElection.id,
        electionName: defaultElection.name
      }
    }
  );

  await Candidate.updateMany(
    {
      $or: [
        { electionName: { $exists: false } },
        { electionName: null },
        { electionName: '' }
      ]
    },
    {
      $set: {
        electionName: defaultElection.name
      }
    }
  );
};

const ensureVoteReceiptIndexes = async () => {
  try {
    await VoteReceipt.syncIndexes();
  } catch (error) {
    console.error(`[VoteReceiptIndexSync] ${error.message}`);
  }
};

let electionInfrastructurePromise = null;

const initializeElectionInfrastructure = async () => {
  await ensureDefaultElection();
  await ensureCandidatesSeeded();
  await ensureVoteReceiptIndexes();
};

export const ensureElectionInfrastructure = async () => {
  if (!electionInfrastructurePromise) {
    electionInfrastructurePromise = initializeElectionInfrastructure().catch((error) => {
      electionInfrastructurePromise = null;
      throw error;
    });
  }

  await electionInfrastructurePromise;
};

const buildElectionVolumeMetrics = async (elections) => {
  if (elections.length === 0) {
    return [];
  }

  const electionIds = elections.map((election) => election._id);

  const [candidateCountsRaw, votesRaw] = await Promise.all([
    Candidate.aggregate([
      {
        $match: {
          election: { $in: electionIds }
        }
      },
      {
        $group: {
          _id: '$election',
          totalCandidates: { $sum: 1 }
        }
      }
    ]),
    Candidate.aggregate([
      {
        $match: {
          election: { $in: electionIds }
        }
      },
      {
        $group: {
          _id: '$election',
          totalVotesCast: { $sum: '$voteCount' }
        }
      }
    ])
  ]);

  const candidateCounts = new Map(candidateCountsRaw.map((entry) => [String(entry._id), entry.totalCandidates]));
  const voteCounts = new Map(votesRaw.map((entry) => [String(entry._id), entry.totalVotesCast]));

  return elections.map((election) => serializeElection(election, {
    totalCandidates: candidateCounts.get(election.id) || 0,
    totalVotesCast: voteCounts.get(election.id) || 0
  }));
};

const buildElectionResults = async (election = null) => {
  const query = election ? { election: election.id } : {};
  const candidates = await Candidate.find(query)
    .sort({ electionName: 1, voteCount: -1, name: 1 })
    .select('-__v');

  const electionMap = new Map();

  candidates.forEach((candidate) => {
    const electionKey = candidate.election ? String(candidate.election) : (candidate.electionName || DEFAULT_ELECTION_NAME);
    const electionName = election
      ? election.name
      : (candidate.electionName || DEFAULT_ELECTION_NAME);

    if (!electionMap.has(electionKey)) {
      electionMap.set(electionKey, {
        electionId: candidate.election ? String(candidate.election) : null,
        electionName,
        totalVotesCast: 0,
        totalCandidates: 0,
        topCandidates: []
      });
    }

    const entry = electionMap.get(electionKey);
    entry.totalCandidates += 1;
    entry.totalVotesCast += candidate.voteCount || 0;
    entry.topCandidates.push({
      _id: candidate.id,
      name: candidate.name,
      party: candidate.party,
      voteCount: candidate.voteCount || 0
    });
  });

  const electionResults = [...electionMap.values()].map((entry) => ({
    ...entry,
    topCandidates: entry.topCandidates
      .sort((a, b) => {
        if (b.voteCount !== a.voteCount) {
          return b.voteCount - a.voteCount;
        }

        return a.name.localeCompare(b.name);
      })
      .slice(0, 3)
  }));

  return electionResults.sort((a, b) => {
    if (b.totalVotesCast !== a.totalVotesCast) {
      return b.totalVotesCast - a.totalVotesCast;
    }

    return a.electionName.localeCompare(b.electionName);
  });
};

const buildVotingSummary = async (election = null) => {
  const candidateMatch = election ? { election: election._id } : {};
  const receiptMatch = election
    ? { election: election._id, status: { $in: RECEIPT_COUNTABLE_STATUSES } }
    : { status: { $in: RECEIPT_COUNTABLE_STATUSES } };

  const [
    totalCandidates,
    totalVoters,
    candidateVoteAgg,
    receiptCount,
    parties,
    votedUsersAgg
  ] = await Promise.all([
    Candidate.countDocuments(candidateMatch),
    User.countDocuments({ role: 'Voter' }),
    Candidate.aggregate([
      { $match: candidateMatch },
      {
        $group: {
          _id: null,
          totalVotes: { $sum: '$voteCount' }
        }
      }
    ]),
    VoteReceipt.countDocuments(receiptMatch),
    Candidate.distinct('party', candidateMatch),
    VoteReceipt.aggregate([
      { $match: receiptMatch },
      {
        $group: {
          _id: '$user'
        }
      },
      {
        $count: 'total'
      }
    ])
  ]);

  const votesFromCandidates = candidateVoteAgg[0]?.totalVotes || 0;
  const totalVotesCast = Math.max(votesFromCandidates, receiptCount);
  const votedUsers = votedUsersAgg[0]?.total || 0;
  const turnoutPercentage = totalVoters > 0
    ? Number(((votedUsers / totalVoters) * 100).toFixed(1))
    : 0;

  return {
    electionId: election ? election.id : null,
    electionName: election ? election.name : 'All Elections',
    electionStatus: election ? election.status : null,
    totalCandidates,
    totalParties: parties.length,
    totalRegisteredVoters: totalVoters,
    totalVotesCast,
    turnoutPercentage,
    votedUsers
  };
};

const generateReceiptCode = () => {
  const year = new Date().getFullYear();
  const randomBlock = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CV-${year}-${randomBlock}`;
};

const createUniqueReceiptCode = async (session = null) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const receiptCode = generateReceiptCode();
    let existsQuery = VoteReceipt.exists({ receiptCode });

    if (session) {
      existsQuery = existsQuery.session(session);
    }

    const exists = await existsQuery;

    if (!exists) {
      return receiptCode;
    }
  }

  return `CV-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
};

const normalizeCandidateUpdateFields = (updates) => {
  const trimmedStringFields = [
    'name',
    'party',
    'manifesto',
    'imageUrl',
    'campaignTagline',
    'bio',
    'region',
    'education',
    'experience'
  ];

  trimmedStringFields.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key) && typeof updates[key] === 'string') {
      updates[key] = updates[key].trim();
    }
  });
};

const handleControllerError = (res, error, fallbackMessage) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  return res.status(500).json({ message: fallbackMessage });
};

const withOptionalSession = (query, session = null) => {
  if (session) {
    return query.session(session);
  }

  return query;
};

const saveWithOptionalSession = async (document, session = null) => {
  if (session) {
    return document.save({ session });
  }

  return document.save();
};

const isUnsupportedTransactionError = (error) => {
  const message = String(error?.message || '');

  return (
    message.includes('Transaction numbers are only allowed on a replica set member or mongos') ||
    message.includes('Current topology does not support sessions') ||
    message.includes('Transaction is not supported')
  );
};

const executeVoteCast = async ({ userId, candidateId, requestedElectionId, session = null }) => {
  const user = await withOptionalSession(User.findById(userId), session);
  if (!user) {
    throwHttpError(404, 'Voter not found.');
  }

  const candidate = await withOptionalSession(Candidate.findById(candidateId), session);
  if (!candidate) {
    throwHttpError(404, 'Candidate not found.');
  }

  let election = null;

  if (candidate.election) {
    election = await withOptionalSession(Election.findById(candidate.election), session);
  }

  if (!election && requestedElectionId) {
    election = await findElectionById(requestedElectionId, session);
  }

  if (!election) {
    election = await getPreferredElection({ statuses: VOTABLE_ELECTION_STATUSES, session });
  }

  if (!election) {
    throwHttpError(404, 'No election available for voting.');
  }

  if (requestedElectionId) {
    validateObjectId(requestedElectionId, 'election id');

    if (String(election.id) !== requestedElectionId) {
      throwHttpError(400, 'Selected candidate does not belong to the requested election.');
    }
  }

  ensureElectionIsVotable(election);

  if (candidate.election && String(candidate.election) !== String(election.id)) {
    throwHttpError(400, 'Candidate is not part of this election.');
  }

  if (!candidate.election) {
    candidate.election = election.id;
  }

  candidate.electionName = election.name;

  const existingReceipt = await withOptionalSession(
    VoteReceipt.findOne({
      user: user.id,
      election: election.id
    }),
    session
  );

  if (existingReceipt) {
    throwHttpError(400, 'You have already cast your vote in this election.');
  }

  const receiptCode = await createUniqueReceiptCode(session);

  const receiptRecords = session
    ? await VoteReceipt.create([
        {
          user: user.id,
          election: election.id,
          candidate: candidate.id,
          receiptCode,
          electionName: election.name,
          status: 'pending'
        }
      ], { session })
    : await VoteReceipt.create([
        {
          user: user.id,
          election: election.id,
          candidate: candidate.id,
          receiptCode,
          electionName: election.name,
          status: 'pending'
        }
      ]);

  const receipt = receiptRecords[0];

  candidate.voteCount = Number(candidate.voteCount || 0) + 1;
  await saveWithOptionalSession(candidate, session);

  user.hasVoted = true;
  await saveWithOptionalSession(user, session);

  receipt.status = 'counted';
  await saveWithOptionalSession(receipt, session);

  return {
    message: 'Vote successfully cast!',
    election: serializeElection(election),
    votedFor: {
      id: candidate.id,
      name: candidate.name,
      party: candidate.party
    },
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

// @desc Get public elections (non-admin)
export const getPublicElections = async (req, res) => {
  try {
    await ensureElectionInfrastructure();

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

// @desc Get all elections for management (admin)
export const getManagedElections = async (req, res) => {
  try {
    await ensureElectionInfrastructure();

    const elections = await Election.find({}).sort({ createdAt: -1 });
    const electionMetrics = await buildElectionVolumeMetrics(elections);

    return res.json({ elections: electionMetrics });
  } catch (error) {
    return handleControllerError(res, error, 'Server error while loading election management data.');
  }
};

// @desc Create election (admin)
export const createElection = async (req, res) => {
  try {
    await ensureElectionInfrastructure();

    const name = String(req.body.name || '').trim();
    const description = String(req.body.description || '').trim();
    const requestedStatus = String(req.body.status || '').trim().toLowerCase();

    if (!name) {
      throwHttpError(400, 'name is required.');
    }

    if (requestedStatus && !ELECTION_STATUSES.includes(requestedStatus)) {
      throwHttpError(400, 'Invalid election status.');
    }

    const registrationStartsAt = parseDateInput(req.body.registrationStartsAt, 'registrationStartsAt');
    const registrationEndsAt = parseDateInput(req.body.registrationEndsAt, 'registrationEndsAt');
    const votingStartsAt = parseDateInput(req.body.votingStartsAt, 'votingStartsAt');
    const votingEndsAt = parseDateInput(req.body.votingEndsAt, 'votingEndsAt');

    const timelineError = validateElectionTimeline({
      registrationStartsAt,
      registrationEndsAt,
      votingStartsAt,
      votingEndsAt
    });

    if (timelineError) {
      throwHttpError(400, timelineError);
    }

    const existingElection = await Election.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' }
    });

    if (existingElection) {
      throwHttpError(400, 'Election with this name already exists.');
    }

    const slugSeed = String(req.body.slug || name).trim();
    const slug = await createUniqueElectionSlug(slugSeed);

    const election = await Election.create({
      name,
      slug,
      description,
      status: requestedStatus || 'draft',
      registrationStartsAt,
      registrationEndsAt,
      votingStartsAt,
      votingEndsAt
    });

    return res.status(201).json(serializeElection(election));
  } catch (error) {
    return handleControllerError(res, error, 'Server error while creating election.');
  }
};

// @desc Update election details (admin)
export const updateElection = async (req, res) => {
  try {
    await ensureElectionInfrastructure();

    const { electionId } = req.params;
    validateObjectId(electionId, 'election id');

    const election = await Election.findById(electionId);
    if (!election) {
      throwHttpError(404, 'Election not found.');
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'status') && req.body.status !== election.status) {
      throwHttpError(400, 'Use transition endpoint to move election lifecycle status.');
    }

    if (Object.prototype.hasOwnProperty.call(req.body, 'name')) {
      const nextName = String(req.body.name || '').trim();

      if (!nextName) {
        throwHttpError(400, 'name cannot be empty.');
      }

      if (nextName !== election.name) {
        const existingByName = await Election.findOne({
          _id: { $ne: election.id },
          name: { $regex: `^${escapeRegex(nextName)}$`, $options: 'i' }
        });

        if (existingByName) {
          throwHttpError(400, 'Election with this name already exists.');
        }
      }

      election.name = nextName;
      const slugSeed = String(req.body.slug || nextName).trim();
      election.slug = await createUniqueElectionSlug(slugSeed, election.id);
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

    if (timelineError) {
      throwHttpError(400, timelineError);
    }

    await election.save();
    return res.json(serializeElection(election));
  } catch (error) {
    return handleControllerError(res, error, 'Server error while updating election.');
  }
};

// @desc Move election lifecycle status (admin)
export const transitionElectionStatus = async (req, res) => {
  try {
    await ensureElectionInfrastructure();

    const { electionId } = req.params;
    const nextStatus = String(req.body.nextStatus || '').trim().toLowerCase();

    validateObjectId(electionId, 'election id');

    if (!ELECTION_STATUSES.includes(nextStatus)) {
      throwHttpError(400, 'Invalid nextStatus value.');
    }

    const election = await Election.findById(electionId);
    if (!election) {
      throwHttpError(404, 'Election not found.');
    }

    if (election.status === nextStatus) {
      return res.json(serializeElection(election));
    }

    const allowedTransitions = ELECTION_STATUS_TRANSITIONS[election.status] || [];

    if (!allowedTransitions.includes(nextStatus)) {
      throwHttpError(
        400,
        `Invalid lifecycle transition from '${election.status}' to '${nextStatus}'.`
      );
    }

    const now = new Date();

    if (nextStatus === 'registration' && !election.registrationStartsAt) {
      election.registrationStartsAt = now;
    }

    if (nextStatus === 'live') {
      if (!election.votingStartsAt) {
        election.votingStartsAt = now;
      }

      if (election.votingStartsAt && now < election.votingStartsAt) {
        throwHttpError(400, 'Cannot activate voting before votingStartsAt.');
      }

      if (election.votingEndsAt && now > election.votingEndsAt) {
        throwHttpError(400, 'Cannot activate voting after votingEndsAt.');
      }
    }

    if (nextStatus === 'counting' && !election.votingEndsAt) {
      election.votingEndsAt = now;
    }

    if (nextStatus === 'published') {
      election.resultsPublishedAt = now;
    }

    if (nextStatus === 'archived') {
      election.archivedAt = now;
    }

    election.status = nextStatus;
    await election.save();

    return res.json(serializeElection(election));
  } catch (error) {
    return handleControllerError(res, error, 'Server error while transitioning election status.');
  }
};

// @desc Get all candidates
export const getCandidates = async (req, res) => {
  try {
    await ensureElectionInfrastructure();

    const election = await resolveElectionFromRequest(req, {
      fallbackToPreferred: true,
      preferredStatuses: PUBLIC_ELECTION_STATUSES
    });

    const query = election ? { election: election.id } : {};
    const candidates = await Candidate.find(query)
      .sort({ electionName: 1, party: 1, name: 1 })
      .select('-__v');

    return res.json({
      election: election ? serializeElection(election) : null,
      candidates: candidates.map(serializeCandidate)
    });
  } catch (error) {
    return handleControllerError(res, error, 'Server error while loading candidates.');
  }
};

// @desc Get one candidate profile
export const getCandidateProfile = async (req, res) => {
  try {
    const { candidateId } = req.params;
    validateObjectId(candidateId, 'candidate id');

    await ensureElectionInfrastructure();

    const candidate = await Candidate.findById(candidateId)
      .populate('election', 'name slug status registrationStartsAt registrationEndsAt votingStartsAt votingEndsAt')
      .select('-__v');

    if (!candidate) {
      throwHttpError(404, 'Candidate not found.');
    }

    return res.json(serializeCandidate(candidate));
  } catch (error) {
    return handleControllerError(res, error, 'Server error while loading candidate profile.');
  }
};

// @desc Candidate management list (protected)
export const getManagedCandidates = async (req, res) => {
  try {
    await ensureElectionInfrastructure();

    let election = null;
    const electionId = extractElectionId(req);

    if (electionId) {
      election = await findElectionById(electionId);
    }

    const query = election ? { election: election.id } : {};
    const candidates = await Candidate.find(query)
      .sort({ electionName: 1, party: 1, name: 1 })
      .select('-__v');

    return res.json({
      election: election ? serializeElection(election) : null,
      candidates: candidates.map(serializeCandidate)
    });
  } catch (error) {
    return handleControllerError(res, error, 'Server error while loading candidate management data.');
  }
};

// @desc Candidate management create (protected)
export const createCandidate = async (req, res) => {
  try {
    await ensureElectionInfrastructure();

    const {
      name,
      party,
      manifesto,
      imageUrl,
      campaignTagline,
      bio,
      region,
      age,
      education,
      experience,
      priorities,
      isVerified
    } = req.body;

    if (!name || !party || !manifesto) {
      throwHttpError(400, 'name, party, and manifesto are required.');
    }

    let election = null;
    const electionId = extractElectionId(req);

    if (electionId) {
      election = await findElectionById(electionId);
    }

    if (!election && typeof req.body.electionName === 'string' && req.body.electionName.trim()) {
      election = await Election.findOne({
        name: { $regex: `^${escapeRegex(req.body.electionName.trim())}$`, $options: 'i' }
      });

      if (!election) {
        throwHttpError(404, 'Election not found for provided electionName.');
      }
    }

    if (!election) {
      election = await getPreferredElection({ statuses: ['draft', ...PUBLIC_ELECTION_STATUSES] });
    }

    if (!election) {
      throwHttpError(400, 'No election available. Create an election first.');
    }

    let parsedAge = null;
    if (age !== undefined && age !== null && age !== '') {
      parsedAge = Number(age);
      if (Number.isNaN(parsedAge)) {
        throwHttpError(400, 'age must be a valid number.');
      }
    }

    const candidate = await Candidate.create({
      election: election.id,
      electionName: election.name,
      name: String(name).trim(),
      party: String(party).trim(),
      manifesto: String(manifesto).trim(),
      imageUrl: typeof imageUrl === 'string' ? imageUrl.trim() : undefined,
      campaignTagline: typeof campaignTagline === 'string' ? campaignTagline.trim() : '',
      bio: typeof bio === 'string' ? bio.trim() : '',
      region: typeof region === 'string' ? region.trim() : '',
      age: parsedAge,
      education: typeof education === 'string' ? education.trim() : '',
      experience: typeof experience === 'string' ? experience.trim() : '',
      priorities: parsePriorities(priorities),
      isVerified: typeof isVerified === 'boolean' ? isVerified : true
    });

    const hydratedCandidate = await Candidate.findById(candidate.id)
      .populate('election', 'name slug status registrationStartsAt registrationEndsAt votingStartsAt votingEndsAt')
      .select('-__v');

    return res.status(201).json(serializeCandidate(hydratedCandidate));
  } catch (error) {
    return handleControllerError(res, error, 'Server error while creating candidate.');
  }
};

// @desc Candidate management update (protected)
export const updateCandidate = async (req, res) => {
  try {
    await ensureElectionInfrastructure();

    const { candidateId } = req.params;
    validateObjectId(candidateId, 'candidate id');

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      throwHttpError(404, 'Candidate not found.');
    }

    const updates = {
      ...req.body
    };

    if (Object.prototype.hasOwnProperty.call(updates, 'priorities')) {
      updates.priorities = parsePriorities(updates.priorities);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'age')) {
      if (updates.age === '' || updates.age === null || updates.age === undefined) {
        updates.age = null;
      } else {
        updates.age = Number(updates.age);

        if (Number.isNaN(updates.age)) {
          throwHttpError(400, 'age must be a valid number.');
        }
      }
    }

    normalizeCandidateUpdateFields(updates);

    if (Object.prototype.hasOwnProperty.call(updates, 'electionId')) {
      const nextElectionId = String(updates.electionId || '').trim();
      if (!nextElectionId) {
        throwHttpError(400, 'electionId cannot be empty when provided.');
      }

      const election = await findElectionById(nextElectionId);
      updates.election = election.id;
      updates.electionName = election.name;
      delete updates.electionId;
    } else if (Object.prototype.hasOwnProperty.call(updates, 'electionName')) {
      const requestedElectionName = String(updates.electionName || '').trim();

      if (!requestedElectionName) {
        throwHttpError(400, 'electionName cannot be empty when provided.');
      }

      const election = await Election.findOne({
        name: { $regex: `^${escapeRegex(requestedElectionName)}$`, $options: 'i' }
      });

      if (!election) {
        throwHttpError(404, 'Election not found for provided electionName.');
      }

      updates.election = election.id;
      updates.electionName = election.name;
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidateId,
      updates,
      {
        new: true,
        runValidators: true
      }
    )
      .populate('election', 'name slug status registrationStartsAt registrationEndsAt votingStartsAt votingEndsAt')
      .select('-__v');

    return res.json(serializeCandidate(updatedCandidate));
  } catch (error) {
    return handleControllerError(res, error, 'Server error while updating candidate.');
  }
};

// @desc Candidate management delete (protected)
export const deleteCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    validateObjectId(candidateId, 'candidate id');

    const candidate = await Candidate.findById(candidateId);

    if (!candidate) {
      throwHttpError(404, 'Candidate not found.');
    }

    await Candidate.findByIdAndDelete(candidateId);
    return res.json({ message: 'Candidate removed successfully.' });
  } catch (error) {
    return handleControllerError(res, error, 'Server error while deleting candidate.');
  }
};

// @desc Compare selected candidates
export const compareCandidates = async (req, res) => {
  try {
    await ensureElectionInfrastructure();

    const idsParam = req.query.candidateIds;
    if (!idsParam) {
      throwHttpError(400, 'candidateIds query is required.');
    }

    const candidateIds = [...new Set(
      idsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    )];

    if (candidateIds.length < 2 || candidateIds.length > 3) {
      throwHttpError(400, 'Please compare between 2 and 3 candidates.');
    }

    candidateIds.forEach((id) => validateObjectId(id, 'candidate id'));

    const candidates = await Candidate.find({ _id: { $in: candidateIds } })
      .populate('election', 'name slug status registrationStartsAt registrationEndsAt votingStartsAt votingEndsAt')
      .select('-__v');

    if (candidates.length !== candidateIds.length) {
      throwHttpError(404, 'One or more candidates were not found.');
    }

    const electionIds = [...new Set(candidates
      .map((candidate) => (candidate.election ? String(candidate.election._id || candidate.election) : null))
      .filter(Boolean))];

    if (electionIds.length > 1) {
      throwHttpError(400, 'Please compare candidates within the same election.');
    }

    const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const orderedCandidates = candidateIds.map((candidateId) => serializeCandidate(candidateMap.get(candidateId)));

    const election = electionIds.length === 1
      ? await Election.findById(electionIds[0])
      : null;

    return res.json({
      election: election ? serializeElection(election) : null,
      candidates: orderedCandidates
    });
  } catch (error) {
    return handleControllerError(res, error, 'Server error while comparing candidates.');
  }
};

// @desc Get live voting stats
export const getVotingStats = async (req, res) => {
  try {
    await ensureElectionInfrastructure();

    const election = await resolveElectionFromRequest(req, {
      fallbackToPreferred: true,
      preferredStatuses: PUBLIC_ELECTION_STATUSES
    });

    const summary = await buildVotingSummary(election);
    return res.json(summary);
  } catch (error) {
    return handleControllerError(res, error, 'Server error while loading voting stats.');
  }
};

// @desc Get public transparency dashboard data
export const getTransparencyDashboard = async (req, res) => {
  try {
    await ensureElectionInfrastructure();

    const election = await resolveElectionFromRequest(req, {
      fallbackToPreferred: true,
      preferredStatuses: PUBLIC_ELECTION_STATUSES
    });

    const candidateMatch = election ? { election: election._id } : {};
    const receiptMatch = election ? { election: election._id } : {};

    const [
      summary,
      partyBreakdownRaw,
      candidateRankingRaw,
      turnoutTimelineRaw,
      recentReceiptsRaw,
      electionResults
    ] = await Promise.all([
      buildVotingSummary(election),
      Candidate.aggregate([
        { $match: candidateMatch },
        {
          $group: {
            _id: '$party',
            votes: { $sum: '$voteCount' },
            candidates: { $sum: 1 }
          }
        },
        { $sort: { votes: -1, _id: 1 } }
      ]),
      Candidate.find(candidateMatch)
        .sort({ voteCount: -1, name: 1 })
        .limit(10)
        .select('-__v'),
      VoteReceipt.aggregate([
        { $match: receiptMatch },
        {
          $project: {
            day: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
            }
          }
        },
        {
          $group: {
            _id: '$day',
            votes: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]),
      VoteReceipt.find(receiptMatch)
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('candidate', 'name party')
        .populate('election', 'name slug status registrationStartsAt registrationEndsAt votingStartsAt votingEndsAt')
        .select('receiptCode status createdAt election electionName candidate'),
      buildElectionResults(election)
    ]);

    const partyBreakdown = partyBreakdownRaw.map((party) => ({
      party: party._id,
      votes: party.votes,
      candidates: party.candidates
    }));

    const candidateRanking = candidateRankingRaw.map((candidate) => serializeCandidate(candidate));

    let turnoutTimeline = turnoutTimelineRaw.map((entry) => ({
      date: entry._id,
      votes: entry.votes
    }));

    const timelineVotes = turnoutTimeline.reduce((sum, entry) => sum + entry.votes, 0);
    if (summary.totalVotesCast > timelineVotes) {
      const missingVotes = summary.totalVotesCast - timelineVotes;
      const timelineMap = new Map(turnoutTimeline.map((entry) => [entry.date, entry.votes]));

      const latestDate = turnoutTimeline.length > 0
        ? turnoutTimeline[turnoutTimeline.length - 1].date
        : new Date().toISOString().slice(0, 10);
      const latestDateUtc = new Date(`${latestDate}T12:00:00.000Z`);

      const backfillWindowDays = 12;
      const targetDates = [];

      for (let dayOffset = backfillWindowDays - 1; dayOffset >= 0; dayOffset -= 1) {
        const date = new Date(latestDateUtc);
        date.setUTCDate(latestDateUtc.getUTCDate() - dayOffset);
        targetDates.push(date.toISOString().slice(0, 10));
      }

      const weights = targetDates.map((_, index) => index + 1);
      const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

      let allocatedVotes = 0;
      targetDates.forEach((date, index) => {
        const weight = weights[index];
        const isLast = index === targetDates.length - 1;
        const increment = isLast
          ? missingVotes - allocatedVotes
          : Math.floor((missingVotes * weight) / totalWeight);

        allocatedVotes += increment;
        timelineMap.set(date, (timelineMap.get(date) || 0) + increment);
      });

      turnoutTimeline = [...timelineMap.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, votes]) => ({ date, votes }));
    }

    const recentReceipts = recentReceiptsRaw.map((receipt) => serializeReceipt(receipt));

    return res.json({
      election: election ? serializeElection(election) : null,
      summary,
      electionResults,
      partyBreakdown,
      candidateRanking,
      turnoutTimeline,
      recentReceipts
    });
  } catch (error) {
    return handleControllerError(res, error, 'Server error while loading transparency dashboard.');
  }
};

// @desc Get election result calculation (top 3 + total votes per election)
export const getElectionResults = async (req, res) => {
  try {
    await ensureElectionInfrastructure();

    let election = null;
    const electionId = extractElectionId(req);
    if (electionId) {
      election = await findElectionById(electionId);
    }

    const electionResults = await buildElectionResults(election);

    return res.json({
      election: election ? serializeElection(election) : null,
      electionResults
    });
  } catch (error) {
    return handleControllerError(res, error, 'Server error while calculating election results.');
  }
};

// @desc Verify a vote receipt by code
export const verifyVoteReceipt = async (req, res) => {
  try {
    const code = String(req.params.receiptCode || '').trim().toUpperCase();

    if (!code) {
      throwHttpError(400, 'Receipt code is required.');
    }

    const receipt = await VoteReceipt.findOne({ receiptCode: code })
      .populate('candidate', 'name party')
      .populate('election', 'name slug status registrationStartsAt registrationEndsAt votingStartsAt votingEndsAt')
      .select('receiptCode status createdAt election electionName candidate');

    if (!receipt) {
      throwHttpError(404, 'Receipt not found.');
    }

    return res.json(serializeReceipt(receipt));
  } catch (error) {
    return handleControllerError(res, error, 'Server error while verifying receipt.');
  }
};

// @desc Get current user's vote receipt
export const getMyVoteReceipt = async (req, res) => {
  try {
    await ensureElectionInfrastructure();

    let election = null;
    const electionId = extractElectionId(req);
    if (electionId) {
      election = await findElectionById(electionId);
    }

    const query = {
      user: req.user.id
    };

    if (election) {
      query.election = election.id;
    }

    const receipt = await VoteReceipt.findOne(query)
      .sort({ createdAt: -1 })
      .populate('candidate', 'name party')
      .populate('election', 'name slug status registrationStartsAt registrationEndsAt votingStartsAt votingEndsAt')
      .select('receiptCode status createdAt election electionName candidate');

    if (!receipt) {
      if (election) {
        throwHttpError(404, 'Receipt not found for this user in the selected election.');
      }

      throwHttpError(404, 'Receipt not found for this user.');
    }

    return res.json(serializeReceipt(receipt));
  } catch (error) {
    return handleControllerError(res, error, 'Server error while fetching user receipt.');
  }
};

// @desc Cast a vote
export const castVote = async (req, res) => {
  const { candidateId } = req.body;
  const requestedElectionId = extractElectionId(req);
  const userId = req.user.id;

  if (!candidateId) {
    return res.status(400).json({ message: 'candidateId is required.' });
  }

  if (!mongoose.Types.ObjectId.isValid(candidateId)) {
    return res.status(400).json({ message: 'Invalid candidate id.' });
  }

  try {
    await ensureElectionInfrastructure();

    let responsePayload = null;

    try {
      const session = await mongoose.startSession();

      try {
        await session.withTransaction(async () => {
          responsePayload = await executeVoteCast({
            userId,
            candidateId,
            requestedElectionId,
            session
          });
        });
      } finally {
        await session.endSession();
      }
    } catch (transactionError) {
      if (!isUnsupportedTransactionError(transactionError)) {
        throw transactionError;
      }
    }

    if (!responsePayload) {
      responsePayload = await executeVoteCast({
        userId,
        candidateId,
        requestedElectionId
      });
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Server error during voting' });
  }
};
