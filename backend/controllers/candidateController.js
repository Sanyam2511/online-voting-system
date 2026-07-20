import Candidate from '../models/Candidate.js';
import Election from '../models/Election.js';
import {
  PUBLIC_ELECTION_STATUSES,
  HttpError,
  throwHttpError,
  escapeRegex,
  parsePriorities,
  serializeElection,
  serializeCandidate,
  validateObjectId,
  extractElectionId,
  findElectionById,
  getPreferredElection,
  resolveElectionFromRequest,
  handleControllerError
} from '../utils/voteUtils.js';

const normalizeCandidateUpdateFields = (updates) => {
  const trimmedStringFields = [
    'name', 'party', 'manifesto', 'imageUrl', 'campaignTagline',
    'bio', 'region', 'education', 'experience'
  ];
  trimmedStringFields.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(updates, key) && typeof updates[key] === 'string') {
      updates[key] = updates[key].trim();
    }
  });
};

export const getCandidates = async (req, res) => {
  try {
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

export const getCandidateProfile = async (req, res) => {
  try {
    const { candidateId } = req.params;
    validateObjectId(candidateId, 'candidate id');

    const candidate = await Candidate.findById(candidateId)
      .populate('election', 'name slug status registrationStartsAt registrationEndsAt votingStartsAt votingEndsAt')
      .select('-__v');

    if (!candidate) throwHttpError(404, 'Candidate not found.');

    return res.json(serializeCandidate(candidate));
  } catch (error) {
    return handleControllerError(res, error, 'Server error while loading candidate profile.');
  }
};

export const getManagedCandidates = async (req, res) => {
  try {
    let election = null;
    const electionId = extractElectionId(req);

    if (electionId) election = await findElectionById(electionId);

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

export const createCandidate = async (req, res) => {
  try {
    const {
      name, party, manifesto, imageUrl, campaignTagline, bio,
      region, age, education, experience, priorities, isVerified
    } = req.body;

    if (!name || !party || !manifesto) {
      throwHttpError(400, 'name, party, and manifesto are required.');
    }

    let election = null;
    const electionId = extractElectionId(req);

    if (electionId) election = await findElectionById(electionId);

    if (!election && typeof req.body.electionName === 'string' && req.body.electionName.trim()) {
      election = await Election.findOne({
        name: { $regex: `^${escapeRegex(req.body.electionName.trim())}$`, $options: 'i' }
      });
      if (!election) throwHttpError(404, 'Election not found for provided electionName.');
    }

    if (!election) {
      election = await getPreferredElection({ statuses: ['draft', ...PUBLIC_ELECTION_STATUSES] });
    }

    if (!election) throwHttpError(400, 'No election available. Create an election first.');

    let parsedAge = null;
    if (age !== undefined && age !== null && age !== '') {
      parsedAge = Number(age);
      if (Number.isNaN(parsedAge)) throwHttpError(400, 'age must be a valid number.');
    }

    const candidate = await Candidate.create({
      election: election.id,
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

export const updateCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    validateObjectId(candidateId, 'candidate id');

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) throwHttpError(404, 'Candidate not found.');

    const allowedFields = ['name', 'party', 'manifesto', 'imageUrl', 'campaignTagline', 'bio', 'region', 'education', 'experience', 'priorities', 'age', 'electionId'];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'priorities')) {
      updates.priorities = parsePriorities(updates.priorities);
    }

    if (Object.prototype.hasOwnProperty.call(updates, 'age')) {
      if (updates.age === '' || updates.age === null || updates.age === undefined) {
        updates.age = null;
      } else {
        updates.age = Number(updates.age);
        if (Number.isNaN(updates.age)) throwHttpError(400, 'age must be a valid number.');
      }
    }

    normalizeCandidateUpdateFields(updates);

    if (Object.prototype.hasOwnProperty.call(updates, 'electionId')) {
      const nextElectionId = String(updates.electionId || '').trim();
      if (!nextElectionId) throwHttpError(400, 'electionId cannot be empty when provided.');

      const election = await findElectionById(nextElectionId);
      updates.election = election.id;
      delete updates.electionId;
    } else if (Object.prototype.hasOwnProperty.call(updates, 'electionName')) {
      const requestedElectionName = String(updates.electionName || '').trim();
      if (!requestedElectionName) throwHttpError(400, 'electionName cannot be empty when provided.');

      const election = await Election.findOne({
        name: { $regex: `^${escapeRegex(requestedElectionName)}$`, $options: 'i' }
      });
      if (!election) throwHttpError(404, 'Election not found for provided electionName.');

      updates.election = election.id;
    }

    const updatedCandidate = await Candidate.findByIdAndUpdate(
      candidateId,
      updates,
      { new: true, runValidators: true }
    )
      .populate('election', 'name slug status registrationStartsAt registrationEndsAt votingStartsAt votingEndsAt')
      .select('-__v');

    return res.json(serializeCandidate(updatedCandidate));
  } catch (error) {
    return handleControllerError(res, error, 'Server error while updating candidate.');
  }
};

export const deleteCandidate = async (req, res) => {
  try {
    const { candidateId } = req.params;
    validateObjectId(candidateId, 'candidate id');

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) throwHttpError(404, 'Candidate not found.');

    await Candidate.findByIdAndDelete(candidateId);
    return res.json({ message: 'Candidate removed successfully.' });
  } catch (error) {
    return handleControllerError(res, error, 'Server error while deleting candidate.');
  }
};

export const compareCandidates = async (req, res) => {
  try {
    const idsParam = req.query.candidateIds;
    if (!idsParam) throwHttpError(400, 'candidateIds query is required.');

    const candidateIds = [...new Set(
      idsParam.split(',').map((id) => id.trim()).filter(Boolean)
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
