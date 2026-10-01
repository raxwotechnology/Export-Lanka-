import asyncHandler from 'express-async-handler';
import MaintenanceRequest from '../models/MaintenanceRequest.js';
import { createAuditLog } from '../utils/auditLogger.js';

/**
 * @desc    Get maintenance requests
 * @route   GET /api/maintenance/requests
 * @access  Private
 */
export const getMaintenanceRequests = asyncHandler(async (req, res) => {
    const { status, priority } = req.query;
    const filter = { deletedAt: null };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const requests = await MaintenanceRequest.find(filter)
        .populate('requestedBy', 'firstName lastName')
        .sort({ createdAt: -1 });
    
    res.json({ success: true, data: requests });
});

/**
 * @desc    Create maintenance request (for machine or vehicle)
 * @route   POST /api/maintenance/requests
 * @access  Private
 */
export const createMaintenanceRequest = asyncHandler(async (req, res) => {
    const request = await MaintenanceRequest.create({
        ...req.body,
        status: 'pending',
        requestedBy: req.user._id
    });

    createAuditLog({
        action: 'create',
        module: 'maintenance',
        documentId: request._id,
        description: `New maintenance request for ${request.assetId} (${request.priority})`,
        req
    });

    res.status(201).json({ success: true, data: request });
});

/**
 * @desc    Update maintenance status (Complete repair)
 * @route   PUT /api/maintenance/requests/:id
 * @access  Private
 */
export const updateMaintenanceStatus = asyncHandler(async (req, res) => {
    const request = await MaintenanceRequest.findByIdAndUpdate(
        req.params.id,
        { ...req.body },
        { new: true }
    );

    createAuditLog({
        action: 'update',
        module: 'maintenance',
        documentId: request._id,
        description: `Maintenance request ${request.status}`,
        req
    });

    res.json({ success: true, data: request });
});
