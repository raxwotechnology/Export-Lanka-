import asyncHandler from 'express-async-handler';
import Role from '../models/Role.js';
import User from '../models/User.js';
import { PERMISSIONS, DEFAULT_ROLES } from '../utils/seedPermissions.js';
import { invalidateRoleCache } from '../middleware/permissionMiddleware.js';

/**
 * @desc    Get all roles with permission count and active user counts
 * @route   GET /api/roles
 * @access  Private (admin.roles.view)
 */
export const getAllRoles = asyncHandler(async (req, res) => {
    let roles = await Role.find({}).sort({ createdAt: 1 });

    // If roles are not yet seeded in DB, seed them from defaults
    if (roles.length === 0) {
        for (const r of DEFAULT_ROLES) {
            await Role.create(r);
        }
        roles = await Role.find({}).sort({ createdAt: 1 });
    }

    // Get active user counts per role
    const userCounts = await User.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);
    const countMap = userCounts.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
    }, {});

    const enrichedRoles = roles.map((role) => ({
        _id: role._id,
        name: role.name,
        label: role.label,
        description: role.description,
        color: role.color,
        permissions: role.permissions,
        isSystem: role.isSystem,
        userCount: countMap[role.name] || 0,
    }));

    res.json({
        success: true,
        data: enrichedRoles,
    });
});

/**
 * @desc    Get a single role by name
 * @route   GET /api/roles/:roleName
 * @access  Private (admin.roles.view)
 */
export const getRoleByName = asyncHandler(async (req, res) => {
    const { roleName } = req.params;
    let role = await Role.findOne({ name: roleName });

    if (!role) {
        const defaultRole = DEFAULT_ROLES.find((r) => r.name === roleName);
        if (defaultRole) {
            role = await Role.create(defaultRole);
        } else {
            res.status(404);
            throw new Error(`Role '${roleName}' not found`);
        }
    }

    const userCount = await User.countDocuments({ role: role.name, isActive: true });

    res.json({
        success: true,
        data: {
            ...role.toObject(),
            userCount,
        },
    });
});

/**
 * @desc    Update permissions for a specific role
 * @route   PUT /api/roles/:roleName/permissions
 * @access  Private (admin.roles.manage)
 */
export const updateRolePermissions = asyncHandler(async (req, res) => {
    const { roleName } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
        res.status(400);
        throw new Error('Permissions must be an array of strings');
    }

    let role = await Role.findOne({ name: roleName });

    if (!role) {
        const defaultRole = DEFAULT_ROLES.find((r) => r.name === roleName) || {
            name: roleName,
            label: roleName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
            description: '',
            color: '#4b5563',
            permissions: [],
            isSystem: false,
        };
        role = new Role(defaultRole);
    }

    role.permissions = permissions;
    await role.save();

    // Invalidate runtime cache so changes take effect immediately
    invalidateRoleCache(roleName);

    res.json({
        success: true,
        message: `Permissions updated successfully for ${role.label}`,
        data: role,
    });
});

/**
 * @desc    Reset a role's permissions to default factory settings
 * @route   POST /api/roles/:roleName/reset
 * @access  Private (admin.roles.manage)
 */
export const resetRolePermissions = asyncHandler(async (req, res) => {
    const { roleName } = req.params;
    const defaultRole = DEFAULT_ROLES.find((r) => r.name === roleName);

    if (!defaultRole) {
        res.status(404);
        throw new Error(`No default configuration found for role '${roleName}'`);
    }

    let role = await Role.findOne({ name: roleName });
    if (!role) {
        role = new Role(defaultRole);
    } else {
        role.permissions = defaultRole.permissions;
        role.label = defaultRole.label;
        role.description = defaultRole.description;
        role.color = defaultRole.color;
    }

    await role.save();
    invalidateRoleCache(roleName);

    res.json({
        success: true,
        message: `Role ${role.label} reset to default permissions`,
        data: role,
    });
});

/**
 * @desc    Get all available system permissions grouped by module
 * @route   GET /api/roles/permissions/all
 * @access  Private (admin.roles.view)
 */
export const getAllPermissions = asyncHandler(async (req, res) => {
    // Group permissions by module
    const moduleTitles = {
        dashboard: 'Dashboard & Analytics',
        catalog: 'Products & Catalog',
        inventory: 'Inventory & Warehousing',
        sales: 'Sales & Customer CRM',
        purchasing: 'Purchasing & Suppliers',
        finance: 'Invoices, Bills & Payments',
        production: 'Production & Manufacturing (BOM)',
        after_sales: 'Returns, Repairs & Damages',
        hr: 'HR, Attendance & Payroll',
        reports: 'Business & Financial Reports',
        admin: 'System Administration & Security',
    };

    const grouped = {};
    for (const p of PERMISSIONS) {
        const modKey = p.module || 'other';
        if (!grouped[modKey]) {
            grouped[modKey] = {
                module: modKey,
                title: moduleTitles[modKey] || modKey.toUpperCase(),
                permissions: [],
            };
        }
        grouped[modKey].permissions.push(p);
    }

    res.json({
        success: true,
        data: {
            all: PERMISSIONS,
            modules: Object.values(grouped),
        },
    });
});
