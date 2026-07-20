import express from 'express';
import {
  getPublicElections,
  getManagedElections,
  createElection,
  updateElection,
  transitionElectionStatus
} from '../controllers/electionController.js';

import {
  getCandidates,
  getCandidateProfile,
  getManagedCandidates,
  createCandidate,
  updateCandidate,
  deleteCandidate,
  compareCandidates
} from '../controllers/candidateController.js';

import {
  getVotingStats,
  getTransparencyDashboard,
  getElectionResults
} from '../controllers/analyticsController.js';

import {
  castVote,
  verifyVoteReceipt,
  getMyVoteReceipt
} from '../controllers/votingController.js';

import { protect, adminOnly } from '../middleware/AuthMiddleware.js';

const router = express.Router();

// ELECTION ROUTES
router.get('/elections/public', getPublicElections);
router.get('/elections', protect, adminOnly, getManagedElections);
router.post('/elections', protect, adminOnly, createElection);
router.put('/elections/:electionId', protect, adminOnly, updateElection);
router.put('/elections/:electionId/transition', protect, adminOnly, transitionElectionStatus);

// CANDIDATE ROUTES
router.get('/candidates/public', getCandidates);
router.get('/candidates/compare', compareCandidates);
router.get('/candidates/profile/:candidateId', getCandidateProfile);
router.get('/candidates', protect, adminOnly, getManagedCandidates);
router.post('/candidates', protect, adminOnly, createCandidate);
router.put('/candidates/:candidateId', protect, adminOnly, updateCandidate);
router.delete('/candidates/:candidateId', protect, adminOnly, deleteCandidate);

// ANALYTICS ROUTES
router.get('/stats', getVotingStats);
router.get('/dashboard', getTransparencyDashboard);
router.get('/results', getElectionResults);

// VOTING ROUTES
router.post('/cast', protect, castVote);
router.get('/receipt/my', protect, getMyVoteReceipt);
router.get('/receipt/:receiptCode', verifyVoteReceipt);

export default router;