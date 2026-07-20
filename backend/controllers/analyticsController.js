import Candidate from '../models/Candidate.js';
import User from '../models/User.js';
import VoteReceipt from '../models/VoteReceipt.js';
import { LRUCache } from 'lru-cache';
import {
  DEFAULT_ELECTION_NAME,
  PUBLIC_ELECTION_STATUSES,
  RECEIPT_COUNTABLE_STATUSES,
  serializeCandidate,
  serializeReceipt,
  extractElectionId,
  findElectionById,
  resolveElectionFromRequest,
  handleControllerError
} from '../utils/voteUtils.js';

// In-memory cache to prevent database aggregation bottleneck
export const analyticsCache = new LRUCache({
  max: 100, // store up to 100 queries
  ttl: 1000 * 60 * 5 // 5 min TTL
});

export const buildElectionResults = async (election = null) => {
  const query = election ? { election: election.id } : {};
  const cacheKey = `results_${election ? election.id : 'all'}`;
  
  if (analyticsCache.has(cacheKey)) {
    return analyticsCache.get(cacheKey);
  }

  const candidates = await Candidate.find(query)
    .sort({ electionName: 1, voteCount: -1, name: 1 })
    .select('-__v');

  const electionMap = new Map();

  candidates.forEach((candidate) => {
    const electionKey = candidate.election ? String(candidate.election) : (candidate.electionName || DEFAULT_ELECTION_NAME);
    const electionName = election ? election.name : (candidate.electionName || DEFAULT_ELECTION_NAME);

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
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 3)
  }));

  const results = electionResults.sort((a, b) => {
    if (b.totalVotesCast !== a.totalVotesCast) return b.totalVotesCast - a.totalVotesCast;
    return a.electionName.localeCompare(b.electionName);
  });

  analyticsCache.set(cacheKey, results);
  return results;
};

export const buildVotingSummary = async (election = null) => {
  const candidateMatch = election ? { election: election._id } : {};
  const receiptMatch = election
    ? { election: election._id, status: { $in: RECEIPT_COUNTABLE_STATUSES } }
    : { status: { $in: RECEIPT_COUNTABLE_STATUSES } };

  const cacheKey = `summary_${election ? election._id : 'all'}`;
  if (analyticsCache.has(cacheKey)) {
    return analyticsCache.get(cacheKey);
  }

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
      { $group: { _id: null, totalVotes: { $sum: '$voteCount' } } }
    ]),
    VoteReceipt.countDocuments(receiptMatch),
    Candidate.distinct('party', candidateMatch),
    VoteReceipt.aggregate([
      { $match: receiptMatch },
      { $group: { _id: '$user' } },
      { $count: 'total' }
    ])
  ]);

  const votesFromCandidates = candidateVoteAgg[0]?.totalVotes || 0;
  const totalVotesCast = Math.max(votesFromCandidates, receiptCount);
  const votedUsers = votedUsersAgg[0]?.total || 0;
  const turnoutPercentage = totalVoters > 0 ? Number(((votedUsers / totalVoters) * 100).toFixed(1)) : 0;

  const summary = {
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

  analyticsCache.set(cacheKey, summary);
  return summary;
};

export const getVotingStats = async (req, res) => {
  try {
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

export const getTransparencyDashboard = async (req, res) => {
  try {
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
        { $group: { _id: '$party', votes: { $sum: '$voteCount' }, candidates: { $sum: 1 } } },
        { $sort: { votes: -1, _id: 1 } }
      ]),
      Candidate.find(candidateMatch).sort({ voteCount: -1, name: 1 }).limit(10).select('-__v'),
      VoteReceipt.aggregate([
        { $match: receiptMatch },
        { $project: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } } },
        { $group: { _id: '$day', votes: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      VoteReceipt.find(receiptMatch).sort({ createdAt: -1 }).limit(8)
        .populate('candidate', 'name party')
        .populate('election', 'name slug status registrationStartsAt registrationEndsAt votingStartsAt votingEndsAt')
        .select('receiptCode status createdAt election electionName candidate'),
      buildElectionResults(election)
    ]);

    const partyBreakdown = partyBreakdownRaw.map((party) => ({ party: party._id, votes: party.votes, candidates: party.candidates }));
    const candidateRanking = candidateRankingRaw.map((candidate) => serializeCandidate(candidate));

    let turnoutTimeline = turnoutTimelineRaw.map((entry) => ({ date: entry._id, votes: entry.votes }));

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
        const increment = isLast ? missingVotes - allocatedVotes : Math.floor((missingVotes * weight) / totalWeight);
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

export const getElectionResults = async (req, res) => {
  try {
    let election = null;
    const electionId = extractElectionId(req);
    if (electionId) election = await findElectionById(electionId);

    const electionResults = await buildElectionResults(election);

    return res.json({
      election: election ? serializeElection(election) : null,
      electionResults
    });
  } catch (error) {
    return handleControllerError(res, error, 'Server error while calculating election results.');
  }
};
