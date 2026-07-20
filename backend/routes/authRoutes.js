import express from 'express';
import {
	registerVoter,
	loginVoter,
	logoutVoter,
	getCurrentVoter,
	requestVoteVerificationCode,
	verifyVoteVerificationCode
} from '../controllers/authController.js';
import { protect } from '../middleware/AuthMiddleware.js';
import { validate, registerSchema, loginSchema } from '../middleware/validationMiddleware.js';
import rateLimit from 'express-rate-limit';

const verificationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: { message: 'Too many verification requests from this IP, please try again after 5 minutes.' }
});

const router = express.Router();

router.post('/register', validate(registerSchema), registerVoter);
router.post('/login', validate(loginSchema), loginVoter);
router.post('/logout', logoutVoter);
router.get('/me', protect, getCurrentVoter);
router.post('/vote-verification/request', protect, verificationLimiter, requestVoteVerificationCode);
router.post('/vote-verification/verify', protect, verificationLimiter, verifyVoteVerificationCode);

export default router;