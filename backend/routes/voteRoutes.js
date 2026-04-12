import express from 'express';
import { getCandidates, castVote } from '../controllers/voteController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public route to see candidates
router.get('/candidates', getCandidates);
// Protected route to cast a vote
router.post('/cast', protect, castVote);

export default router;