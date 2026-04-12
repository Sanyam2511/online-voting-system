import express from 'express';
import { registerVoter, loginVoter } from '../controllers/authController.js';

const router = express.Router();

router.post('/register', registerVoter);
router.post('/login', loginVoter);

export default router;