import express from 'express';
import rateLimit from 'express-rate-limit';
import {
	registerVoter,
	loginVoter,
	getCurrentVoter,
	requestVoteVerificationCode,
	verifyVoteVerificationCode
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const verificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { message: 'Too many verification requests from this IP, please try again after 5 minutes.' }
});

const router = express.Router();

router.post('/register', registerVoter);
router.post('/login', loginVoter);
router.get('/me', protect, getCurrentVoter);
router.post('/vote-verification/request', protect, verificationLimiter, requestVoteVerificationCode);
router.post('/vote-verification/verify', protect, verificationLimiter, verifyVoteVerificationCode);

export default router;