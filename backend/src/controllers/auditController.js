import asyncHandler from 'express-async-handler';
import AuditLog from '../models/AuditLog.js';

/**
 * @desc    Get all audit logs
 * @route   GET /api/audit
 * @access  Private/Admin
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
    const { module, action, userId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const query = {};
    if (module) query.module = module;
    if (action) query.action = action;
    if (userId) query.performedBy = userId;
    
    if (startDate || endDate) {
        query.createdAt = {};
        if (startDate) query.createdAt.$gte = new Date(startDate);
        if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const count = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
        .populate('performedBy', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(limit) * (Number(page) - 1));

    res.json({
        success: true,
        data: logs,
        page: Number(page),
        pages: Math.ceil(count / Number(limit)),
        total: count,
    });
});

/**
 * @desc    Get single audit log detail
 * @route   GET /api/audit/:id
 * @access  Private/Admin
 */
export const getAuditLogById = asyncHandler(async (req, res) => {
    const log = await AuditLog.findById(req.params.id)
        .populate('performedBy', 'firstName lastName email role');

    if (log) {
        res.json({ success: true, data: log });
    } else {
        res.status(404);
        throw new Error('Audit log not found');
    }
});
