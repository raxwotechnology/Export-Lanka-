import asyncHandler from 'express-async-handler';
import StockItem from '../../models/StockItem.js';
import StockMovement from '../../models/StockMovement.js';
import Product from '../../models/Product.js';

/**
 * GET /api/reports/inventory/valuation?warehouseId=
 * Total stock value per product and warehouse
 */
export const getStockValuation = asyncHandler(async (req, res) => {
    const { warehouseId } = req.query;
    const matchStage = {};
    if (warehouseId) matchStage.warehouseId = warehouseId;

    const data = await StockItem.aggregate([
        { $match: matchStage },
        {
            $lookup: {
                from: 'products', localField: 'productId', foreignField: '_id', as: 'product',
            },
        },
        { $unwind: '$product' },
        { $match: { 'product.deletedAt': null } },
        {
            $lookup: {
                from: 'warehouses', localField: 'warehouseId', foreignField: '_id', as: 'warehouse',
            },
        },
        { $unwind: '$warehouse' },
        {
            $project: {
                productId: '$product._id',
                productCode: '$product.productCode',
                productName: '$product.name',
                productType: '$product.productType',
                warehouseName: '$warehouse.name',
                warehouseCode: '$warehouse.warehouseCode',
                onHand: '$quantities.onHand',
                reserved: '$quantities.reserved',
                available: { $subtract: ['$quantities.onHand', '$quantities.reserved'] },
                costPerUnit: 1,
                totalValue: { $multiply: ['$quantities.onHand', '$costPerUnit'] },
                batchNumber: 1,
            },
        },
        { $sort: { totalValue: -1 } },
    ]);

    const totalValue = data.reduce((s, r) => s + (r.totalValue || 0), 0);
    const totalUnits = data.reduce((s, r) => s + (r.onHand || 0), 0);

    // Group by product type
    const byType = data.reduce((acc, r) => {
        const type = r.productType || 'unknown';
        if (!acc[type]) acc[type] = { type, units: 0, value: 0, items: 0 };
        acc[type].units += r.onHand || 0;
        acc[type].value += r.totalValue || 0;
        acc[type].items += 1;
        return acc;
    }, {});

    res.json({
        success: true,
        data: {
            summary: {
                totalValue: +totalValue.toFixed(2),
                totalUnits,
                productCount: data.length,
            },
            byProductType: Object.values(byType).map((t) => ({
                ...t,
                value: +t.value.toFixed(2),
            })),
            items: data.map((r) => ({
                ...r,
                totalValue: +(r.totalValue || 0).toFixed(2),
            })),
        },
    });
});

/**
 * GET /api/reports/inventory/movement?startDate=&endDate=&productId=
 * Movement ledger
 */
export const getStockMovement = asyncHandler(async (req, res) => {
    const { startDate, endDate, productId, warehouseId, limit = 200 } = req.query;
    const filter = {};
    if (productId) filter.productId = productId;
    if (warehouseId) filter.warehouseId = warehouseId;
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate); end.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = end;
        }
    }

    const movements = await StockMovement.find(filter)
        .populate('productId', 'name productCode')
        .populate('warehouseId', 'name warehouseCode')
        .populate('performedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .limit(Number(limit));

    res.json({ success: true, count: movements.length, data: movements });
});

/**
 * GET /api/reports/inventory/slow-fast-movers?days=90
 * ABC analysis + identifies slow and fast movers
 */
export const getSlowFastMovers = asyncHandler(async (req, res) => {
    const { days = 90 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 60 * 60 * 1000);

    // Revenue per product in the period
    const revenueByProduct = await StockMovement.aggregate([
        {
            $match: {
                createdAt: { $gte: since },
                movementType: { $in: ['sale_dispatch'] },
                direction: 'out',
            },
        },
        {
            $group: {
                _id: '$productId',
                unitsSold: { $sum: '$quantity' },
                movements: { $sum: 1 },
            },
        },
        {
            $lookup: {
                from: 'products', localField: '_id', foreignField: '_id', as: 'product',
            },
        },
        { $unwind: '$product' },
        { $match: { 'product.deletedAt': null, 'product.canBeSold': true } },
        {
            $project: {
                productId: '$product._id',
                productCode: '$product.productCode',
                productName: '$product.name',
                unitsSold: 1,
                movements: 1,
                unitPrice: '$product.basePrice',
                revenue: { $multiply: ['$unitsSold', '$product.basePrice'] },
            },
        },
        { $sort: { revenue: -1 } },
    ]);

    // Total revenue
    const totalRevenue = revenueByProduct.reduce((s, r) => s + r.revenue, 0);

    // ABC classification
    // A = top 80% of revenue, B = next 15%, C = bottom 5%
    let cumulativeRevenue = 0;
    const classified = revenueByProduct.map((r) => {
        cumulativeRevenue += r.revenue;
        const percentCumulative = totalRevenue > 0 ? (cumulativeRevenue / totalRevenue) * 100 : 0;
        let abcClass;
        if (percentCumulative <= 80) abcClass = 'A';
        else if (percentCumulative <= 95) abcClass = 'B';
        else abcClass = 'C';
        return { ...r, revenue: +r.revenue.toFixed(2), cumulativePercent: +percentCumulative.toFixed(1), abcClass };
    });

    // Products with NO sales in the period (slow/dead movers)
    const soldProductIds = new Set(revenueByProduct.map((r) => r._id.toString()));
    const allSellable = await Product.find({
        deletedAt: null, canBeSold: true, status: 'active',
    }).select('_id productCode name basePrice');
    const deadMovers = allSellable
        .filter((p) => !soldProductIds.has(p._id.toString()))
        .map((p) => ({
            productId: p._id, productCode: p.productCode,
            productName: p.name, unitsSold: 0, revenue: 0, abcClass: 'D',
        }));

    res.json({
        success: true,
        data: {
            period: { days: Number(days), since },
            totalRevenue: +totalRevenue.toFixed(2),
            classification: {
                A: classified.filter((c) => c.abcClass === 'A'),
                B: classified.filter((c) => c.abcClass === 'B'),
                C: classified.filter((c) => c.abcClass === 'C'),
                D: deadMovers, // dead stock
            },
            summary: {
                fastMovers: classified.filter((c) => c.abcClass === 'A').length,
                mediumMovers: classified.filter((c) => c.abcClass === 'B').length,
                slowMovers: classified.filter((c) => c.abcClass === 'C').length,
                deadStock: deadMovers.length,
            },
        },
    });
});

/**
 * GET /api/reports/inventory/low-stock
 */
export const getLowStockReport = asyncHandler(async (req, res) => {
    const data = await StockItem.aggregate([
        {
            $group: {
                _id: '$productId',
                totalOnHand: { $sum: '$quantities.onHand' },
                totalReserved: { $sum: '$quantities.reserved' },
            },
        },
        {
            $lookup: {
                from: 'products', localField: '_id', foreignField: '_id', as: 'product',
            },
        },
        { $unwind: '$product' },
        { $match: { 'product.deletedAt': null } },
        {
            $project: {
                productId: '$_id',
                productCode: '$product.productCode',
                productName: '$product.name',
                productType: '$product.productType',
                onHand: '$totalOnHand',
                reserved: '$totalReserved',
                available: { $subtract: ['$totalOnHand', '$totalReserved'] },
                reorderLevel: '$product.stockLevels.reorderLevel',
                minimumStock: '$product.stockLevels.minimumStock',
            },
        },
        {
            $addFields: {
                shortage: { $subtract: ['$reorderLevel', '$available'] },
                isCritical: { $lte: ['$available', '$minimumStock'] },
            },
        },
        { $match: { $expr: { $lte: ['$available', '$reorderLevel'] } } },
        { $sort: { shortage: -1 } },
    ]);

    res.json({ success: true, data });
});