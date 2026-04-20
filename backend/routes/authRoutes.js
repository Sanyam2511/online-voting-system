import express from 'express';
import {
	registerVoter,
	loginVoter,
	getCurrentVoter,
	requestVoteVerificationCode,
	verifyVoteVerificationCode
} from '../controllers/authController.js';
import { protect } from '../middleware/AuthMiddleware.js';

const router = express.Router();

router.post('/register', registerVoter);
router.post('/login', loginVoter);
router.get('/me', protect, getCurrentVoter);
router.post('/vote-verification/request', protect, requestVoteVerificationCode);
router.post('/vote-verification/verify', protect, verifyVoteVerificationCode);

export default router;