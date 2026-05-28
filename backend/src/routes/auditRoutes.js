import express from 'express';
import { getAuditLogs, getAuditLogById } from '../controllers/auditController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/')
    .get(protect, authorize('admin', 'super_admin', 'manager'), getAuditLogs);

router.route('/:id')
    .get(protect, authorize('admin', 'super_admin', 'manager'), getAuditLogById);

export default router;
