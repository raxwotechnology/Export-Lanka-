import express from 'express';
import {
    getAllRoles,
    getRoleByName,
    updateRolePermissions,
    resetRolePermissions,
    getAllPermissions,
} from '../controllers/roleController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';

const router = express.Router();

router.use(protect);

router.get('/', requirePermission('admin.roles.view'), getAllRoles);
router.get('/permissions/all', requirePermission('admin.roles.view'), getAllPermissions);
router.get('/:roleName', requirePermission('admin.roles.view'), getRoleByName);
router.put('/:roleName/permissions', requirePermission('admin.roles.manage'), updateRolePermissions);
router.post('/:roleName/reset', requirePermission('admin.roles.manage'), resetRolePermissions);

export default router;
