/**
 * Helper to check and enforce edit limits for roles like factory_manager (max 2 edits).
 *
 * @param {Object} document - The Mongoose document instance or doc object
 * @param {Object} user - The req.user object containing role & id
 * @param {String} entityName - Friendly name of the entity being edited (e.g. 'Product', 'GRN', 'Production Order')
 */
export const checkAndApplyEditLimit = (document, user, entityName = 'Record') => {
    if (!user) return;

    // Super Admin and Admin have unlimited edit capabilities
    if (['super_admin', 'admin'].includes(user.role)) {
        return;
    }

    // Roles subject to maximum 2 edits (factory_manager, or user role matching factory_manager)
    const isLimitedRole = user.role === 'factory_manager';

    if (isLimitedRole) {
        const currentCount = Number(document.editCount) || 0;

        if (currentCount >= 2) {
            const err = new Error(
                `Edit permission limit reached: Factory Manager is permitted to edit a ${entityName} only up to 2 times. This record has already reached its 2-time edit limit.`
            );
            err.statusCode = 403;
            err.status = 403;
            throw err;
        }

        // Increment count and record history
        document.editCount = currentCount + 1;
        if (!Array.isArray(document.editHistory)) {
            document.editHistory = [];
        }
        document.editHistory.push({
            editedBy: user._id,
            editedAt: new Date(),
            editNumber: currentCount + 1,
            role: user.role,
        });
    }
};
