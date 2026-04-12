import Candidate from '../models/Candidate.js';
import User from '../models/User.js';
import defaultCandidates from '../data/defaultCandidates.js';
import VoteReceipt from '../models/VoteReceipt.js';
import crypto from 'crypto';
import mongoose from 'mongoose';

const ELECTION_NAME = 'National General Election 2026';

const ensureCandidatesSeeded = async () => {
  const count = await Candidate.estimatedDocumentCount();

  if (count === 0) {
    await Candidate.insertMany(defaultCandidates);
  }
};

const serializeCandidate = (candidate) => ({
  _id: candidate.id,
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
});

const buildVotingSummary = async () => {
  const [totalCandidates, totalVoters, votedUsers, candidateVoteAgg, receiptCount, parties] = await Promise.all([
    Candidate.countDocuments({}),
    User.countDocuments({ role: 'Voter' }),
    User.countDocuments({ role: 'Voter', hasVoted: true }),
    Candidate.aggregate([
      {
        $group: {
          _id: null,
          totalVotes: { $sum: '$voteCount' }
        }
      }
    ]),
    VoteReceipt.countDocuments({ status: { $in: ['counted', 'pending'] } }),
    Candidate.distinct('party')
  ]);

  const votesFromCandidates = candidateVoteAgg[0]?.totalVotes || 0;
  const totalVotesCast = Math.max(votesFromCandidates, receiptCount);
  const turnoutPercentage = totalVoters > 0
    ? Number(((votedUsers / totalVoters) * 100).toFixed(1))
    : 0;

  return {
    totalCandidates,
    totalParties: parties.length,
    totalRegisteredVoters: totalVoters,
    totalVotesCast,
    turnoutPercentage,
    votedUsers,
    electionName: ELECTION_NAME
  };
};

const generateReceiptCode = () => {
  const year = new Date().getFullYear();
  const randomBlock = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CV-${year}-${randomBlock}`;
};

const createUniqueReceiptCode = async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const receiptCode = generateReceiptCode();
    const exists = await VoteReceipt.exists({ receiptCode });

    if (!exists) {
      return receiptCode;
    }
  }

  return `CV-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
};

// @desc Get all candidates
export const getCandidates = async (req, res) => {
  try {
    await ensureCandidatesSeeded();
    const candidates = await Candidate.find({}).sort({ party: 1, name: 1 }).select('-__v');
    res.json(candidates.map(serializeCandidate));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc Get one candidate profile
export const getCandidateProfile = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.candidateId)) {
      return res.status(400).json({ message: 'Invalid candidate id.' });
    }

    await ensureCandidatesSeeded();
    const candidate = await Candidate.findById(req.params.candidateId).select('-__v');

    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found' });
    }

    return res.json(serializeCandidate(candidate));
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc Compare selected candidates
export const compareCandidates = async (req, res) => {
  try {
    await ensureCandidatesSeeded();

    const idsParam = req.query.candidateIds;
    if (!idsParam) {
      return res.status(400).json({ message: 'candidateIds query is required' });
    }

    const candidateIds = [...new Set(
      idsParam
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean)
    )];

    const invalidId = candidateIds.some((id) => !mongoose.Types.ObjectId.isValid(id));
    if (invalidId) {
      return res.status(400).json({ message: 'One or more candidate ids are invalid.' });
    }

    if (candidateIds.length < 2 || candidateIds.length > 3) {
      return res.status(400).json({ message: 'Please compare between 2 and 3 candidates.' });
    }

    const candidates = await Candidate.find({ _id: { $in: candidateIds } }).select('-__v');

    if (candidates.length !== candidateIds.length) {
      return res.status(404).json({ message: 'One or more candidates were not found.' });
    }

    const candidateMap = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const orderedCandidates = candidateIds.map((candidateId) => serializeCandidate(candidateMap.get(candidateId)));

    return res.json({ candidates: orderedCandidates });
  } catch (error) {
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc Get live voting stats
export const getVotingStats = async (req, res) => {
  try {
    await ensureCandidatesSeeded();
    const summary = await buildVotingSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc Get public transparency dashboard data
export const getTransparencyDashboard = async (req, res) => {
  try {
    await ensureCandidatesSeeded();

    const [summary, partyBreakdownRaw, candidateRankingRaw, turnoutTimelineRaw, recentReceiptsRaw] = await Promise.all([
      buildVotingSummary(),
      Candidate.aggregate([
        {
          $group: {
            _id: '$party',
            votes: { $sum: '$voteCount' },
            candidates: { $sum: 1 }
          }
        },
        { $sort: { votes: -1, _id: 1 } }
      ]),
      Candidate.find({}).sort({ voteCount: -1, name: 1 }).limit(10).select('-__v'),
      VoteReceipt.aggregate([
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
      VoteReceipt.find({})
        .sort({ createdAt: -1 })
        .limit(8)
        .populate('candidate', 'name party')
        .select('receiptCode status createdAt electionName candidate')
    ]);

    const partyBreakdown = partyBreakdownRaw.map((party) => ({
      party: party._id,
      votes: party.votes,
      candidates: party.candidates
    }));

    const candidateRanking = candidateRankingRaw.map((candidate) => ({
      ...serializeCandidate(candidate)
    }));

    const turnoutTimeline = turnoutTimelineRaw.map((entry) => ({
      date: entry._id,
      votes: entry.votes
    }));

    const recentReceipts = recentReceiptsRaw.map((receipt) => ({
      receiptCode: receipt.receiptCode,
      status: receipt.status,
      electionName: receipt.electionName,
      submittedAt: receipt.createdAt,
      candidate: receipt.candidate
        ? {
            name: receipt.candidate.name,
            party: receipt.candidate.party
          }
        : null
    }));

    res.json({
      summary,
      partyBreakdown,
      candidateRanking,
      turnoutTimeline,
      recentReceipts
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc Verify a vote receipt by code
export const verifyVoteReceipt = async (req, res) => {
  try {
    const code = (req.params.receiptCode || '').trim().toUpperCase();

    if (!code) {
      return res.status(400).json({ message: 'Receipt code is required.' });
    }

    const receipt = await VoteReceipt.findOne({ receiptCode: code })
      .populate('candidate', 'name party')
      .select('receiptCode status createdAt electionName candidate');

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found.' });
    }

    return res.json({
      receiptCode: receipt.receiptCode,
      status: receipt.status,
      electionName: receipt.electionName,
      submittedAt: receipt.createdAt,
      candidate: receipt.candidate
        ? {
            name: receipt.candidate.name,
            party: receipt.candidate.party
          }
        : null
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while verifying receipt.' });
  }
};

// @desc Get current user's vote receipt
export const getMyVoteReceipt = async (req, res) => {
  try {
    const receipt = await VoteReceipt.findOne({ user: req.user.id })
      .populate('candidate', 'name party')
      .select('receiptCode status createdAt electionName candidate');

    if (!receipt) {
      return res.status(404).json({ message: 'Receipt not found for this user.' });
    }

    return res.json({
      receiptCode: receipt.receiptCode,
      status: receipt.status,
      electionName: receipt.electionName,
      submittedAt: receipt.createdAt,
      candidate: receipt.candidate
        ? {
            name: receipt.candidate.name,
            party: receipt.candidate.party
          }
        : null
    });
  } catch (error) {
    return res.status(500).json({ message: 'Server error while fetching user receipt.' });
  }
};

// @desc Cast a vote
export const castVote = async (req, res) => {
  const { candidateId } = req.body;
  const userId = req.user.id;

  try {
    await ensureCandidatesSeeded();

    if (!candidateId) {
      return res.status(400).json({ message: 'candidateId is required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(candidateId)) {
      return res.status(400).json({ message: 'Invalid candidate id.' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Voter not found.' });
    }

    if (user.hasVoted) {
      return res.status(400).json({ message: 'You have already cast your vote.' });
    }

    const existingReceipt = await VoteReceipt.findOne({ user: userId });
    if (existingReceipt) {
      return res.status(400).json({ message: 'Vote receipt already exists for this voter.' });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: 'Candidate not found.' });
    }

    const receiptCode = await createUniqueReceiptCode();

    const receipt = await VoteReceipt.create({
      user: userId,
      candidate: candidate.id,
      receiptCode,
      electionName: ELECTION_NAME,
      status: 'pending'
    });

    candidate.voteCount += 1;
    user.hasVoted = true;

    try {
      await Promise.all([candidate.save(), user.save()]);
      receipt.status = 'counted';
      await receipt.save();
    } catch (saveError) {
      await VoteReceipt.findByIdAndDelete(receipt.id);
      throw saveError;
    }

    res.status(200).json({ 
      message: 'Vote successfully cast!',
      votedFor: {
        id: candidate.id,
        name: candidate.name,
        party: candidate.party
      },
      receipt: {
        receiptCode: receipt.receiptCode,
        code: receipt.receiptCode,
        electionName: receipt.electionName,
        status: receipt.status,
        submittedAt: receipt.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during voting' });
  }
};