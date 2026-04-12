import express from 'express';
import { registerVoter, loginVoter, getCurrentVoter } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', registerVoter);
router.post('/login', loginVoter);
router.get('/me', protect, getCurrentVoter);

export default router;