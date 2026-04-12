import express from 'express';
import {
	getCandidates,
	getCandidateProfile,
	compareCandidates,
	castVote,
	getVotingStats,
	getTransparencyDashboard,
	verifyVoteReceipt,
	getMyVoteReceipt
} from '../controllers/voteController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route to see candidates
router.get('/candidates', getCandidates);
router.get('/candidates/:candidateId', getCandidateProfile);
router.get('/compare', compareCandidates);
router.get('/stats', getVotingStats);
router.get('/transparency', getTransparencyDashboard);
router.get('/receipt/me', protect, getMyVoteReceipt);
router.get('/receipt/:receiptCode', verifyVoteReceipt);
// Protected route to cast a vote
router.post('/cast', protect, castVote);

export default router;