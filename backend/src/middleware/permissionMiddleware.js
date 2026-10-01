import { ROLE_PERMISSIONS } from '../utils/seedPermissions.js';
import Role from '../models/Role.js';

// Runtime in-memory cache for dynamic role permissions with 60s TTL
const rolePermissionsCache = new Map();
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000;

export const invalidateRoleCache = (roleName) => {
    if (roleName) {
        rolePermissionsCache.delete(roleName);
    } else {
        rolePermissionsCache.clear();
    }
};

/**
 * Fetch role permissions dynamically with fallback to static constants
 */
export async function fetchRolePermissions(roleName) {
    if (!roleName) return [];

    const now = Date.now();
    if (now - cacheTimestamp < CACHE_TTL_MS && rolePermissionsCache.has(roleName)) {
        return rolePermissionsCache.get(roleName);
    }

    try {
        const roleDoc = await Role.findOne({ name: roleName }).select('permissions').lean();
        const perms = roleDoc && Array.isArray(roleDoc.permissions)
            ? roleDoc.permissions
            : (ROLE_PERMISSIONS[roleName] || []);
        
        rolePermissionsCache.set(roleName, perms);
        cacheTimestamp = now;
        return perms;
    } catch (e) {
        return ROLE_PERMISSIONS[roleName] || [];
    }
}

/**
 * Get the effective permissions for a user synchronously using cached/static data.
 * Merges the role's default permissions with any user-specific overrides.
 */
function getEffectivePermissions(user) {
    if (!user) return [];

    // Check cached or fallback static
    let rolePerms = rolePermissionsCache.get(user.role);
    if (!rolePerms) {
        rolePerms = ROLE_PERMISSIONS[user.role] || [];
    }
    const userPerms = user.permissions || [];

    // If either has wildcard, user has all permissions
    if (rolePerms.includes('*') || userPerms.includes('*')) {
        return ['*'];
    }

    // Merge role permissions + user-specific overrides (de-dup)
    return [...new Set([...rolePerms, ...userPerms])];
}

/**
 * Check if a user has a specific permission.
 */
function hasPermission(user, permissionCode) {
    const perms = getEffectivePermissions(user);
    if (perms.includes('*')) return true;
    return perms.includes(permissionCode);
}

/**
 * Check if a user has ANY of the given permissions.
 */
function hasAnyPermission(user, permissionCodes) {
    const perms = getEffectivePermissions(user);
    if (perms.includes('*')) return true;
    return permissionCodes.some((code) => perms.includes(code));
}

/**
 * Middleware: require ALL of the given permissions.
 */
export const requirePermission = (...requiredPermissions) => {
    return async (req, res, next) => {
        if (!req.user) {
            res.status(401);
            return next(new Error('Not authorized'));
        }

        // Ensure role permissions are loaded in cache
        if (!rolePermissionsCache.has(req.user.role)) {
            await fetchRolePermissions(req.user.role);
        }

        const allowed = requiredPermissions.every((p) => hasPermission(req.user, p));

        if (!allowed) {
            res.status(403);
            return next(new Error(
                `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
            ));
        }

        next();
    };
};

/**
 * Middleware: require ANY of the given permissions (OR logic).
 */
export const requireAnyPermission = (...requiredPermissions) => {
    return async (req, res, next) => {
        if (!req.user) {
            res.status(401);
            return next(new Error('Not authorized'));
        }

        // Ensure role permissions are loaded in cache
        if (!rolePermissionsCache.has(req.user.role)) {
            await fetchRolePermissions(req.user.role);
        }

        const allowed = hasAnyPermission(req.user, requiredPermissions);

        if (!allowed) {
            res.status(403);
            return next(new Error(
                `Insufficient permissions. Requires one of: ${requiredPermissions.join(', ')}`
            ));
        }

        next();
    };
};

// Export helpers for use in controllers (non-middleware contexts)
export { getEffectivePermissions, hasPermission, hasAnyPermission };
