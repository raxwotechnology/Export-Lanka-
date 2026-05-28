import asyncHandler from 'express-async-handler';
import Invoice from '../../models/Invoice.js';
import Bill from '../../models/Bill.js';
import Payment from '../../models/Payment.js';
import Customer from '../../models/Customer.js';

/**
 * GET /api/reports/financial/snapshot
 * Revenue vs expenses, A/R + A/P, collection efficiency for a period
 */
export const getFinancialSnapshot = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const [revenue, expenses, collected, paid, arTotal, apTotal] = await Promise.all([
        Invoice.aggregate([
            { $match: { deletedAt: null, invoiceDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        Bill.aggregate([
            { $match: { deletedAt: null, billDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$grandTotal' } } },
        ]),
        Payment.aggregate([
            { $match: { deletedAt: null, direction: 'received', paymentDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Payment.aggregate([
            { $match: { deletedAt: null, direction: 'paid', paymentDate: { $gte: start, $lte: end } } },
            { $group: { _id: null, total: { $sum: '$amount' } } },
        ]),
        Invoice.aggregate([
            { $match: { deletedAt: null, paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue'] } } },
            {
                $group: {
                    _id: null,
                    current: { $sum: '$agingBuckets.current' },
                    b1_30: { $sum: '$agingBuckets.1_30' },
                    b31_60: { $sum: '$agingBuckets.31_60' },
                    b61_90: { $sum: '$agingBuckets.61_90' },
                    b91_plus: { $sum: '$agingBuckets.91_plus' },
                    total: { $sum: '$balanceDue' },
                },
            },
        ]),
        Bill.aggregate([
            { $match: { deletedAt: null, paymentStatus: { $in: ['unpaid', 'partially_paid', 'overdue'] } } },
            {
                $group: {
                    _id: null,
                    current: { $sum: '$agingBuckets.current' },
                    b1_30: { $sum: '$agingBuckets.1_30' },
                    b31_60: { $sum: '$agingBuckets.31_60' },
                    b61_90: { $sum: '$agingBuckets.61_90' },
                    b91_plus: { $sum: '$agingBuckets.91_plus' },
                    total: { $sum: '$balanceDue' },
                },
            },
        ]),
    ]);

    const revenueTotal = revenue[0]?.total || 0;
    const expensesTotal = expenses[0]?.total || 0;
    const collectedTotal = collected[0]?.total || 0;
    const paidTotal = paid[0]?.total || 0;

    res.json({
        success: true,
        data: {
            period: { start, end },
            revenue: +revenueTotal.toFixed(2),
            expenses: +expensesTotal.toFixed(2),
            grossProfit: +(revenueTotal - expensesTotal).toFixed(2),
            collected: +collectedTotal.toFixed(2),
            paid: +paidTotal.toFixed(2),
            netCashFlow: +(collectedTotal - paidTotal).toFixed(2),
            collectionEfficiency: revenueTotal > 0 ? +((collectedTotal / revenueTotal) * 100).toFixed(1) : 0,
            accountsReceivable: arTotal[0] || { current: 0, b1_30: 0, b31_60: 0, b61_90: 0, b91_plus: 0, total: 0 },
            accountsPayable: apTotal[0] || { current: 0, b1_30: 0, b31_60: 0, b61_90: 0, b91_plus: 0, total: 0 },
        },
    });
});