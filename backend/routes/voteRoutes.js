import express from 'express';
import {
	getPublicElections,
	getManagedElections,
	createElection,
	updateElection,
	transitionElectionStatus,
	getCandidates,
	getManagedCandidates,
	createCandidate,
	updateCandidate,
	deleteCandidate,
	getCandidateProfile,
	compareCandidates,
	castVote,
	getVotingStats,
	getElectionResults,
	getTransparencyDashboard,
	verifyVoteReceipt,
	getMyVoteReceipt
} from '../controllers/voteController.js';
import { protect, adminOnly } from '../middleware/AuthMiddleware.js';

const router = express.Router();

router.get('/elections/public', getPublicElections);
router.get('/elections/manage', protect, adminOnly, getManagedElections);
router.post('/elections/manage', protect, adminOnly, createElection);
router.put('/elections/manage/:electionId', protect, adminOnly, updateElection);
router.post('/elections/manage/:electionId/transition', protect, adminOnly, transitionElectionStatus);

// Public route to see candidates
router.get('/candidates', getCandidates);
router.get('/candidates/manage', protect, adminOnly, getManagedCandidates);
router.post('/candidates/manage', protect, adminOnly, createCandidate);
router.put('/candidates/manage/:candidateId', protect, adminOnly, updateCandidate);
router.delete('/candidates/manage/:candidateId', protect, adminOnly, deleteCandidate);
router.get('/candidates/:candidateId', getCandidateProfile);
router.get('/compare', compareCandidates);
router.get('/stats', getVotingStats);
router.get('/results/elections', getElectionResults);
router.get('/transparency', getTransparencyDashboard);
router.get('/receipt/me', protect, getMyVoteReceipt);
router.get('/receipt/:receiptCode', verifyVoteReceipt);
// Protected route to cast a vote
router.post('/cast', protect, castVote);

export default router;