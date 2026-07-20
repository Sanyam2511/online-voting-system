import mongoose from 'mongoose';
import Election, { ELECTION_STATUSES } from '../models/Election.js';

export const DEFAULT_ELECTION_NAME = 'National General Election 2026';
export const PUBLIC_ELECTION_STATUSES = ['registration', 'live', 'counting', 'audited', 'published'];
export const VOTABLE_ELECTION_STATUSES = ['live'];
export const RECEIPT_COUNTABLE_STATUSES = ['counted', 'pending'];
export const SUSPICIOUS_ADMIN_TRANSITION_WINDOW_MS = 2 * 60 * 1000;

export const ELECTION_STATUS_TRANSITIONS = {
  draft: ['registration', 'archived'],
  registration: ['live', 'archived'],
  live: ['counting'],
  counting: ['audited'],
  audited: ['published', 'archived'],
  published: ['archived'],
  archived: []
};

export class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

export const throwHttpError = (statusCode, message) => {
  throw new HttpError(statusCode, message);
};

export const captureSecuritySignal = async (callback) => {
  try {
    await callback();
  } catch {
    // Security monitoring must be best-effort and never break voting flows.
  }
};

export const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const toSlug = (value) => String(value || '')
  .toLowerCase()
  .trim()
  .replace(/[^a-z0-9\s-]/g, '')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '');

export const parsePriorities = (prioritiesValue) => {
  if (Array.isArray(prioritiesValue)) {
    return prioritiesValue.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof prioritiesValue === 'string') {
    return prioritiesValue.split(',').map((item) => item.trim()).filter(Boolean);
  }
  return [];
};

export const parseDateInput = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throwHttpError(400, `Invalid ${fieldName}.`);
  }
  return date;
};

export const validateElectionTimeline = ({
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

export const serializeElection = (election, extras = {}) => ({
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

export const serializeCandidate = (candidate) => {
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

export const serializeReceipt = (receipt) => {
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

export const validateObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throwHttpError(400, `Invalid ${fieldName}.`);
  }
};

export const extractElectionId = (req) => {
  const queryElectionId = typeof req.query?.electionId === 'string' ? req.query.electionId : '';
  const bodyElectionId = typeof req.body?.electionId === 'string' ? req.body.electionId : '';
  return (queryElectionId || bodyElectionId).trim();
};

export const findElectionById = async (electionId, session = null) => {
  validateObjectId(electionId, 'election id');
  let query = Election.findById(electionId);
  if (session) query = query.session(session);
  
  const election = await query;
  if (!election) throwHttpError(404, 'Election not found.');
  return election;
};

export const getPreferredElection = async ({ statuses = PUBLIC_ELECTION_STATUSES, session = null } = {}) => {
  const seenStatuses = new Set();

  for (const status of statuses) {
    if (seenStatuses.has(status)) continue;
    seenStatuses.add(status);

    let query = Election.findOne({ status }).sort({ updatedAt: -1, createdAt: -1 });
    if (session) query = query.session(session);

    const election = await query;
    if (election) return election;
  }

  let fallbackQuery = Election.findOne({}).sort({ updatedAt: -1, createdAt: -1 });
  if (session) fallbackQuery = fallbackQuery.session(session);

  return fallbackQuery;
};

export const resolveElectionFromRequest = async (
  req,
  { required = false, fallbackToPreferred = false, preferredStatuses = PUBLIC_ELECTION_STATUSES } = {}
) => {
  const electionId = extractElectionId(req);

  if (electionId) return findElectionById(electionId);

  if (fallbackToPreferred) {
    const election = await getPreferredElection({ statuses: preferredStatuses });
    if (!election && required) throwHttpError(404, 'No election available.');
    return election;
  }

  if (required) throwHttpError(400, 'electionId is required.');
  return null;
};

export const ensureElectionIsVotable = (election) => {
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

export const createUniqueElectionSlug = async (seedSlug, ignoredElectionId = null) => {
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

export const handleControllerError = (res, error, fallbackMessage) => {
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({ message: error.message });
  }
  return res.status(500).json({ message: fallbackMessage });
};

export const withOptionalSession = (query, session = null) => {
  if (session) return query.session(session);
  return query;
};

export const saveWithOptionalSession = async (document, session = null) => {
  if (session) return document.save({ session });
  return document.save();
};
