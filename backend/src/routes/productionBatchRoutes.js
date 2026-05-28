import express from 'express';
import {
    getProductionBatches,
    createProductionBatch,
    startProductionBatch,
    completeProductionBatch
} from '../controllers/productionBatchController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);

router.route('/')
    .get(getProductionBatches)
    .post(authorize('admin', 'manager', 'production_staff'), createProductionBatch);

router.put('/:id/start', authorize('admin', 'manager', 'production_staff'), startProductionBatch);
router.put('/:id/complete', authorize('admin', 'manager', 'production_staff'), completeProductionBatch);

export default router;
