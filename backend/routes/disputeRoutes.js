import express from 'express';
import { protect, adminOnly } from '../middleware/AuthMiddleware.js';
import {
  createDisputeCase,
  getMyDisputeCases,
  getDisputeCasesForAdmin,
  updateDisputeCaseStatus,
  getDisputeCaseById
} from '../controllers/disputeController.js';

const router = express.Router();

router.post('/', protect, createDisputeCase);
router.get('/me', protect, getMyDisputeCases);
router.get('/manage', protect, adminOnly, getDisputeCasesForAdmin);
router.patch('/manage/:disputeId/status', protect, adminOnly, updateDisputeCaseStatus);
router.get('/:disputeId', protect, getDisputeCaseById);

export default router;
