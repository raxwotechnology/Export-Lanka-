import express from 'express';
import {
    getDashboardKpis, getRevenueChart, getTopProducts, getTopCustomers,
} from '../controllers/dashboardController.js';
import {
    getSalesSummary, getSalesByProduct, getSalesByCustomer, getSalesTrend,
} from '../controllers/reports/salesReportsController.js';
import {
    getStockValuation, getStockMovement, getSlowFastMovers, getLowStockReport,
} from '../controllers/reports/inventoryReportsController.js';
import { protect } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/permissionMiddleware.js';
import {
    getPnLRecords, createPnLRecord, updatePnLRecord, deletePnLRecord
} from '../controllers/dailyPnLController.js';
import {
    getProductionSummary, getProductionByProduct, getProductionWastage,
} from '../controllers/reports/productionReportsController.js';
import {
    getReturnsSummary, getDamagesReport,
} from '../controllers/reports/returnsReportsController.js';
import { getFinancialSnapshot } from '../controllers/reports/financialReportsController.js';
import {
    getHeadcountReport, getAttendanceReport, getLeavePatternsReport, getPayrollSummaryReport,
} from '../controllers/reports/hrReportsController.js';

const router = express.Router();
router.use(protect);

// Production
router.get('/production/summary', requirePermission('reports.production'), getProductionSummary);
router.get('/production/by-product', requirePermission('reports.production'), getProductionByProduct);
router.get('/production/wastage', requirePermission('reports.production'), getProductionWastage);

// Returns & Damages
router.get('/returns/summary', requirePermission('reports.sales'), getReturnsSummary);
router.get('/damages/summary', requirePermission('reports.inventory'), getDamagesReport);

// Financial
router.get('/financial/snapshot', requirePermission('reports.financial'), getFinancialSnapshot);
router.get('/pnl/records', requirePermission('reports.financial'), getPnLRecords);
router.post('/pnl/records', requirePermission('reports.financial'), createPnLRecord);
router.put('/pnl/records/:id', requirePermission('reports.financial'), updatePnLRecord);
router.delete('/pnl/records/:id', requirePermission('reports.financial'), deletePnLRecord);

// HR
router.get('/hr/headcount', requirePermission('reports.hr'), getHeadcountReport);
router.get('/hr/attendance-summary', requirePermission('reports.hr'), getAttendanceReport);
router.get('/hr/leave-patterns', requirePermission('reports.hr'), getLeavePatternsReport);
router.get('/hr/payroll-summary', requirePermission('reports.hr'), getPayrollSummaryReport);

// Dashboard
router.get('/dashboard/kpis', requirePermission('dashboard.view'), getDashboardKpis);
router.get('/dashboard/revenue-chart', requirePermission('dashboard.view'), getRevenueChart);
router.get('/dashboard/top-products', requirePermission('dashboard.view'), getTopProducts);
router.get('/dashboard/top-customers', requirePermission('dashboard.view'), getTopCustomers);

// Sales reports
router.get('/sales/summary', requirePermission('reports.sales'), getSalesSummary);
router.get('/sales/by-product', requirePermission('reports.sales'), getSalesByProduct);
router.get('/sales/by-customer', requirePermission('reports.sales'), getSalesByCustomer);
router.get('/sales/trend', requirePermission('reports.sales'), getSalesTrend);

// Inventory reports
router.get('/inventory/valuation', requirePermission('reports.inventory'), getStockValuation);
router.get('/inventory/movement', requirePermission('reports.inventory'), getStockMovement);
router.get('/inventory/slow-fast-movers', requirePermission('reports.inventory'), getSlowFastMovers);
router.get('/inventory/low-stock', requirePermission('reports.inventory'), getLowStockReport);

export default router;