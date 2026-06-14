import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { getSecurityEvents, getSecurityOverview } from '../controllers/securityController.js';

const router = express.Router();

router.get('/overview', protect, adminOnly, getSecurityOverview);
router.get('/events', protect, adminOnly, getSecurityEvents);

export default router;
