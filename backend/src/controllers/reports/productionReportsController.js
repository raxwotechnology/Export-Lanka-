import asyncHandler from 'express-async-handler';
import ProductionOrder from '../../models/ProductionOrder.js';
import ProductionBatch from '../../models/ProductionBatch.js';
import DamageRecord from '../../models/DamageRecord.js';
import Product from '../../models/Product.js';

/**
 * GET /api/reports/production/summary?startDate=&endDate=
 */
export const getProductionSummary = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const [batchSummary, batchByStatus, orderSummary, orderByStatus] = await Promise.all([
        ProductionBatch.aggregate([
            {
                $match: {
                    deletedAt: null,
                    $or: [
                        { date: { $gte: start, $lte: end } },
                        { createdAt: { $gte: start, $lte: end } }
                    ]
                }
            },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalPlannedQty: { $sum: { $ifNull: ['$inputWeight_total', 0] } },
                    totalProducedQty: { $sum: { $ifNull: ['$outputWeight_total', 0] } },
                    totalPlannedCost: { $sum: { $ifNull: ['$materialCost', 0] } },
                    totalActualCost: { $sum: { $ifNull: ['$totalCost', 0] } },
                    totalVariance: { $sum: { $ifNull: ['$costVariance', 0] } },
                }
            }
        ]),
        ProductionBatch.aggregate([
            {
                $match: {
                    deletedAt: null,
                    $or: [
                        { date: { $gte: start, $lte: end } },
                        { createdAt: { $gte: start, $lte: end } }
                    ]
                }
            },
            { $group: { _id: { $ifNull: ['$status', 'completed'] }, count: { $sum: 1 }, quantity: { $sum: { $ifNull: ['$inputWeight_total', 0] } } } }
        ]),
        ProductionOrder.aggregate([
            { $match: { deletedAt: null, createdAt: { $gte: start, $lte: end } } },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalPlannedQty: { $sum: '$plannedQuantity' },
                    totalProducedQty: { $sum: '$totalProduced' },
                    totalPlannedCost: { $sum: '$totalPlannedCost' },
                    totalActualCost: { $sum: '$totalActualCost' },
                    totalVariance: { $sum: '$costVariance' },
                }
            }
        ]),
        ProductionOrder.aggregate([
            { $match: { deletedAt: null, createdAt: { $gte: start, $lte: end } } },
            { $group: { _id: '$status', count: { $sum: 1 }, quantity: { $sum: '$plannedQuantity' } } }
        ])
    ]);

    const b = batchSummary[0] || { totalOrders: 0, totalPlannedQty: 0, totalProducedQty: 0, totalPlannedCost: 0, totalActualCost: 0, totalVariance: 0 };
    const o = orderSummary[0] || { totalOrders: 0, totalPlannedQty: 0, totalProducedQty: 0, totalPlannedCost: 0, totalActualCost: 0, totalVariance: 0 };

    const totalOrders = b.totalOrders + o.totalOrders;
    const totalPlannedQty = +(b.totalPlannedQty + o.totalPlannedQty).toFixed(2);
    const totalProducedQty = +(b.totalProducedQty + o.totalProducedQty).toFixed(2);
    const totalPlannedCost = +(b.totalPlannedCost + o.totalPlannedCost).toFixed(2);
    const totalActualCost = +(b.totalActualCost + o.totalActualCost).toFixed(2);
    const totalVariance = +(b.totalVariance + o.totalVariance).toFixed(2);

    const yieldPct = totalPlannedQty > 0 ? +((totalProducedQty / totalPlannedQty) * 100).toFixed(1) : 0;
    const variancePct = totalPlannedCost > 0 ? +((totalVariance / totalPlannedCost) * 100).toFixed(1) : 0;

    // Combine status breakdown
    const statusMap = {};
    [...batchByStatus, ...orderByStatus].forEach(st => {
        const key = st._id || 'completed';
        if (!statusMap[key]) {
            statusMap[key] = { _id: key, count: 0, quantity: 0 };
        }
        statusMap[key].count += st.count || 0;
        statusMap[key].quantity += st.quantity || 0;
    });

    res.json({
        success: true,
        data: {
            period: { start, end },
            summary: {
                totalOrders,
                totalPlannedQty,
                totalProducedQty,
                totalPlannedCost,
                totalActualCost,
                totalVariance,
                yieldPercent: yieldPct,
                variancePercent: variancePct,
            },
            byStatus: Object.values(statusMap),
        },
    });
});

/**
 * GET /api/reports/production/by-product
 */
export const getProductionByProduct = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // 1. Batch data
    const batchData = await ProductionBatch.aggregate([
        {
            $match: {
                deletedAt: null,
                $or: [
                    { date: { $gte: start, $lte: end } },
                    { createdAt: { $gte: start, $lte: end } }
                ]
            }
        },
        {
            $group: {
                _id: { $ifNull: ['$product', 'General Production'] },
                productName: { $first: { $ifNull: ['$product', 'General Production'] } },
                orderCount: { $sum: 1 },
                totalPlanned: { $sum: { $ifNull: ['$inputWeight_total', 0] } },
                totalProduced: { $sum: { $ifNull: ['$outputWeight_total', 0] } },
                totalPlannedCost: { $sum: { $ifNull: ['$materialCost', 0] } },
                totalActualCost: { $sum: { $ifNull: ['$totalCost', 0] } },
            }
        }
    ]);

    // 2. Order data
    const orderData = await ProductionOrder.aggregate([
        {
            $match: {
                deletedAt: null,
                actualEndDate: { $gte: start, $lte: end }
            }
        },
        {
            $group: {
                _id: '$finishedProductId',
                productCode: { $first: '$finishedProductCode' },
                productName: { $first: '$finishedProductName' },
                orderCount: { $sum: 1 },
                totalPlanned: { $sum: '$plannedQuantity' },
                totalProduced: { $sum: '$totalProduced' },
                totalPlannedCost: { $sum: '$totalPlannedCost' },
                totalActualCost: { $sum: '$totalActualCost' },
            }
        }
    ]);

    // Lookup products for productCode mapping
    const allProducts = await Product.find({ deletedAt: null }).select('name productCode');
    const productCodeMap = new Map(allProducts.map(p => [p.name.toLowerCase().trim(), p.productCode]));

    const combinedMap = new Map();

    batchData.forEach(b => {
        const name = b.productName || 'General Production';
        const code = productCodeMap.get(name.toLowerCase().trim()) || `PRD-${name.slice(0, 3).toUpperCase()}`;
        combinedMap.set(name, {
            _id: name,
            productCode: code,
            productName: name,
            orderCount: b.orderCount,
            totalPlanned: +b.totalPlanned.toFixed(2),
            totalProduced: +b.totalProduced.toFixed(2),
            totalPlannedCost: +b.totalPlannedCost.toFixed(2),
            totalActualCost: +b.totalActualCost.toFixed(2),
        });
    });

    orderData.forEach(o => {
        const key = o.productName || o.productCode || 'Other';
        if (combinedMap.has(key)) {
            const existing = combinedMap.get(key);
            existing.orderCount += o.orderCount;
            existing.totalPlanned += o.totalPlanned;
            existing.totalProduced += o.totalProduced;
            existing.totalPlannedCost += o.totalPlannedCost;
            existing.totalActualCost += o.totalActualCost;
        } else {
            combinedMap.set(key, {
                _id: o._id || key,
                productCode: o.productCode || 'PRD-ORD',
                productName: key,
                orderCount: o.orderCount,
                totalPlanned: +o.totalPlanned.toFixed(2),
                totalProduced: +o.totalProduced.toFixed(2),
                totalPlannedCost: +o.totalPlannedCost.toFixed(2),
                totalActualCost: +o.totalActualCost.toFixed(2),
            });
        }
    });

    const result = Array.from(combinedMap.values()).map(d => {
        const yieldPercent = d.totalPlanned > 0 ? +((d.totalProduced / d.totalPlanned) * 100).toFixed(1) : 0;
        const avgCostPerUnit = d.totalProduced > 0 ? +(d.totalActualCost / d.totalProduced).toFixed(2) : 0;
        return {
            ...d,
            yieldPercent,
            avgCostPerUnit,
            totalPlanned: +d.totalPlanned.toFixed(2),
            totalProduced: +d.totalProduced.toFixed(2),
            totalPlannedCost: +d.totalPlannedCost.toFixed(2),
            totalActualCost: +d.totalActualCost.toFixed(2)
        };
    }).sort((a, b) => b.totalProduced - a.totalProduced);

    res.json({
        success: true,
        data: result
    });
});

/**
 * GET /api/reports/production/wastage
 */
export const getProductionWastage = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const [damageWastage, batchRejects] = await Promise.all([
        DamageRecord.aggregate([
            {
                $match: {
                    deletedAt: null,
                    source: 'production_reject',
                    createdAt: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id: '$productId',
                    productCode: { $first: '$productCode' },
                    productName: { $first: '$productName' },
                    count: { $sum: 1 },
                    totalQuantity: { $sum: '$quantity' },
                    totalValue: { $sum: '$totalValue' },
                },
            },
        ]),
        ProductionBatch.aggregate([
            {
                $match: {
                    deletedAt: null,
                    $or: [
                        { date: { $gte: start, $lte: end } },
                        { createdAt: { $gte: start, $lte: end } }
                    ],
                    $expr: {
                        $gt: [{ $add: [{ $ifNull: ['$rejects_day', 0] }, { $ifNull: ['$rejects_night', 0] }] }, 0]
                    }
                }
            },
            {
                $group: {
                    _id: { $ifNull: ['$product', 'General'] },
                    productName: { $first: { $ifNull: ['$product', 'General'] } },
                    count: { $sum: 1 },
                    totalQuantity: { $sum: { $add: [{ $ifNull: ['$rejects_day', 0] }, { $ifNull: ['$rejects_night', 0] }] } },
                    totalValue: { $sum: 0 },
                }
            }
        ])
    ]);

    const wastageMap = new Map();

    damageWastage.forEach(w => {
        const key = w.productName || 'Unknown';
        wastageMap.set(key, {
            productCode: w.productCode || 'PRD',
            productName: key,
            count: w.count,
            totalQuantity: +w.totalQuantity.toFixed(2),
            totalValue: +w.totalValue.toFixed(2)
        });
    });

    batchRejects.forEach(b => {
        const key = b.productName || 'General';
        if (wastageMap.has(key)) {
            const existing = wastageMap.get(key);
            existing.count += b.count;
            existing.totalQuantity += b.totalQuantity;
        } else {
            wastageMap.set(key, {
                productCode: `PRD-${key.slice(0, 3).toUpperCase()}`,
                productName: key,
                count: b.count,
                totalQuantity: +b.totalQuantity.toFixed(2),
                totalValue: 0
            });
        }
    });

    const byProduct = Array.from(wastageMap.values()).map(w => ({
        ...w,
        totalQuantity: +w.totalQuantity.toFixed(2),
        totalValue: +w.totalValue.toFixed(2)
    })).sort((a, b) => b.totalQuantity - a.totalQuantity);

    const totalWastageValue = byProduct.reduce((s, w) => s + w.totalValue, 0);
    const totalIncidents = byProduct.reduce((s, w) => s + w.count, 0);

    res.json({
        success: true,
        data: {
            totalWastageValue: +totalWastageValue.toFixed(2),
            totalIncidents,
            byProduct,
        },
    });
});