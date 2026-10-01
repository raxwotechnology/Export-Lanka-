import asyncHandler from 'express-async-handler';
import SalesOrder from '../../models/SalesOrder.js';
import Invoice from '../../models/Invoice.js';
import Payment from '../../models/Payment.js';

/**
 * GET /api/reports/sales/summary?startDate=&endDate=
 */
export const getSalesSummary = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    // 1. Sales orders in period
    const ordersAgg = await SalesOrder.aggregate([
        {
            $match: {
                deletedAt: null,
                orderDate: { $gte: start, $lte: end },
                status: { $nin: ['draft', 'cancelled'] },
            },
        },
        {
            $group: {
                _id: null,
                totalOrders: { $sum: 1 },
                totalValue: { $sum: '$grandTotal' },
                avgOrderValue: { $avg: '$grandTotal' },
            },
        },
    ]);

    // Status breakdown
    const statusBreakdown = await SalesOrder.aggregate([
        {
            $match: {
                deletedAt: null,
                orderDate: { $gte: start, $lte: end },
            },
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                value: { $sum: '$grandTotal' },
            },
        },
    ]);

    // 2. Invoice & payment info
    const [invoicesAgg, paymentsAgg, invoiceStatusBreakdown] = await Promise.all([
        Invoice.aggregate([
            {
                $match: {
                    deletedAt: null,
                    invoiceType: { $ne: 'proforma' },
                    status: { $nin: ['cancelled', 'draft'] },
                    invoiceDate: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$grandTotal' },
                    paid: { $sum: '$amountPaid' },
                    balance: { $sum: '$balanceDue' },
                    count: { $sum: 1 },
                },
            },
        ]),
        Payment.aggregate([
            {
                $match: {
                    deletedAt: null,
                    direction: 'received',
                    paymentDate: { $gte: start, $lte: end },
                },
            },
            {
                $group: {
                    _id: null,
                    collected: { $sum: '$amount' },
                    count: { $sum: 1 },
                },
            },
        ]),
        Invoice.aggregate([
            {
                $match: {
                    deletedAt: null,
                    invoiceType: { $ne: 'proforma' },
                    invoiceDate: { $gte: start, $lte: end }
                }
            },
            {
                $group: {
                    _id: '$paymentStatus',
                    count: { $sum: 1 },
                    value: { $sum: '$grandTotal' }
                }
            }
        ])
    ]);

    const invoices = invoicesAgg[0] || { total: 0, paid: 0, balance: 0, count: 0 };
    const payments = paymentsAgg[0] || { collected: 0, count: 0 };

    // If no sales orders recorded, fallback summary to commercial invoices
    const ordersData = ordersAgg[0] || {
        totalOrders: invoices.count,
        totalValue: invoices.total,
        avgOrderValue: invoices.count > 0 ? (invoices.total / invoices.count) : 0
    };

    const finalStatusBreakdown = statusBreakdown.length > 0 ? statusBreakdown : invoiceStatusBreakdown;

    const collectionEfficiency = invoices.total > 0
        ? +((payments.collected / invoices.total) * 100).toFixed(1)
        : 0;

    res.json({
        success: true,
        data: {
            period: { startDate: start, endDate: end },
            orders: {
                totalOrders: ordersData.totalOrders || 0,
                totalValue: +(ordersData.totalValue || 0).toFixed(2),
                avgOrderValue: +(ordersData.avgOrderValue || 0).toFixed(2)
            },
            statusBreakdown: finalStatusBreakdown,
            invoices: {
                ...invoices,
                total: +invoices.total.toFixed(2),
                paid: +invoices.paid.toFixed(2),
                balance: +invoices.balance.toFixed(2),
            },
            payments: {
                collected: +payments.collected.toFixed(2),
                count: payments.count,
            },
            collectionEfficiency,
        },
    });
});

/**
 * GET /api/reports/sales/by-product?startDate=&endDate=&limit=50
 */
export const getSalesByProduct = asyncHandler(async (req, res) => {
    const { startDate, endDate, limit = 50 } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const [orderProducts, invoiceProducts] = await Promise.all([
        SalesOrder.aggregate([
            {
                $match: {
                    deletedAt: null,
                    orderDate: { $gte: start, $lte: end },
                    status: { $nin: ['draft', 'cancelled'] },
                },
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: { $ifNull: ['$items.productName', '$items.productCode'] },
                    productCode: { $first: '$items.productCode' },
                    productName: { $first: '$items.productName' },
                    quantitySold: { $sum: '$items.orderedQuantity' },
                    grossRevenue: { $sum: { $multiply: ['$items.orderedQuantity', '$items.unitPrice'] } },
                    totalDiscount: { $sum: { $multiply: ['$items.orderedQuantity', '$items.unitPrice', { $divide: [{ $ifNull: ['$items.discountPercent', 0] }, 100] }] } },
                    orderCount: { $sum: 1 },
                },
            }
        ]),
        Invoice.aggregate([
            {
                $match: {
                    deletedAt: null,
                    invoiceType: { $ne: 'proforma' },
                    status: { $nin: ['cancelled', 'draft'] },
                    invoiceDate: { $gte: start, $lte: end },
                    salesOrderIds: { $size: 0 } // avoid double counting if linked to sales orders
                }
            },
            { $unwind: '$items' },
            {
                $group: {
                    _id: { $ifNull: ['$items.productName', '$items.productCode'] },
                    productCode: { $first: '$items.productCode' },
                    productName: { $first: '$items.productName' },
                    quantitySold: { $sum: '$items.quantity' },
                    grossRevenue: { $sum: { $ifNull: ['$items.lineSubtotal', { $multiply: ['$items.quantity', '$items.unitPrice'] }] } },
                    totalDiscount: { $sum: { $ifNull: ['$items.lineDiscount', 0] } },
                    orderCount: { $sum: 1 },
                }
            }
        ])
    ]);

    const productMap = new Map();

    const addProducts = (list) => {
        list.forEach(p => {
            const key = (p.productName || p.productCode || 'Unknown').trim();
            if (productMap.has(key)) {
                const cur = productMap.get(key);
                cur.quantitySold += p.quantitySold || 0;
                cur.grossRevenue += p.grossRevenue || 0;
                cur.totalDiscount += p.totalDiscount || 0;
                cur.orderCount += p.orderCount || 0;
                if (!cur.productCode && p.productCode) cur.productCode = p.productCode;
            } else {
                productMap.set(key, {
                    _id: key,
                    productCode: p.productCode || `PRD-${key.slice(0, 3).toUpperCase()}`,
                    productName: key,
                    quantitySold: p.quantitySold || 0,
                    grossRevenue: p.grossRevenue || 0,
                    totalDiscount: p.totalDiscount || 0,
                    orderCount: p.orderCount || 0
                });
            }
        });
    };

    addProducts(orderProducts);
    addProducts(invoiceProducts);

    const data = Array.from(productMap.values()).map(p => {
        const netRevenue = p.grossRevenue - p.totalDiscount;
        const avgPrice = p.quantitySold > 0 ? (p.grossRevenue / p.quantitySold) : 0;
        return {
            _id: p._id,
            productCode: p.productCode,
            productName: p.productName,
            quantitySold: +p.quantitySold.toFixed(2),
            avgPrice: +avgPrice.toFixed(2),
            grossRevenue: +p.grossRevenue.toFixed(2),
            totalDiscount: +p.totalDiscount.toFixed(2),
            netRevenue: +netRevenue.toFixed(2),
            orderCount: p.orderCount
        };
    }).sort((a, b) => b.netRevenue - a.netRevenue).slice(0, Number(limit));

    res.json({ success: true, data });
});

/**
 * GET /api/reports/sales/by-customer?startDate=&endDate=&limit=50
 */
export const getSalesByCustomer = asyncHandler(async (req, res) => {
    const { startDate, endDate, limit = 50 } = req.query;
    const start = startDate ? new Date(startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    const [orderCustomers, invoiceCustomers] = await Promise.all([
        SalesOrder.aggregate([
            {
                $match: {
                    deletedAt: null,
                    orderDate: { $gte: start, $lte: end },
                    status: { $nin: ['draft', 'cancelled'] },
                },
            },
            {
                $group: {
                    _id: '$customerId',
                    customerCode: { $first: '$customerSnapshot.code' },
                    customerName: { $first: '$customerSnapshot.name' },
                    orderCount: { $sum: 1 },
                    totalOrdered: { $sum: '$grandTotal' },
                },
            },
        ]),
        Invoice.aggregate([
            {
                $match: {
                    deletedAt: null,
                    invoiceType: { $ne: 'proforma' },
                    status: { $nin: ['cancelled', 'draft'] },
                    invoiceDate: { $gte: start, $lte: end },
                    salesOrderIds: { $size: 0 }
                }
            },
            {
                $group: {
                    _id: '$customerId',
                    customerCode: { $first: '$customerSnapshot.code' },
                    customerName: { $first: '$customerSnapshot.name' },
                    orderCount: { $sum: 1 },
                    totalOrdered: { $sum: '$grandTotal' },
                }
            }
        ])
    ]);

    const customerMap = new Map();

    const addCustomers = (list) => {
        list.forEach(c => {
            const key = (c._id ? c._id.toString() : null) || c.customerName || 'Unknown';
            if (customerMap.has(key)) {
                const cur = customerMap.get(key);
                cur.orderCount += c.orderCount || 0;
                cur.totalOrdered += c.totalOrdered || 0;
            } else {
                customerMap.set(key, {
                    _id: c._id || key,
                    customerCode: c.customerCode || 'CUST',
                    customerName: c.customerName || 'Direct Customer',
                    orderCount: c.orderCount || 0,
                    totalOrdered: c.totalOrdered || 0
                });
            }
        });
    };

    addCustomers(orderCustomers);
    addCustomers(invoiceCustomers);

    const data = Array.from(customerMap.values());

    // Get payment & invoice info for these customers
    const customerIds = data.map((c) => c._id).filter(id => id && String(id).length === 24);
    const paymentsPerCustomer = await Invoice.aggregate([
        {
            $match: {
                deletedAt: null,
                customerId: { $in: customerIds },
                invoiceDate: { $gte: start, $lte: end },
            },
        },
        {
            $group: {
                _id: '$customerId',
                invoiced: { $sum: '$grandTotal' },
                paid: { $sum: '$amountPaid' },
                outstanding: { $sum: '$balanceDue' },
            },
        },
    ]);
    const paymentMap = new Map(paymentsPerCustomer.map((p) => [p._id.toString(), p]));

    const enriched = data.map((d) => {
        const idKey = d._id ? d._id.toString() : '';
        const pay = paymentMap.get(idKey) || { invoiced: d.totalOrdered, paid: 0, outstanding: d.totalOrdered };
        return {
            ...d,
            totalOrdered: +d.totalOrdered.toFixed(2),
            avgOrderValue: d.orderCount > 0 ? +(d.totalOrdered / d.orderCount).toFixed(2) : 0,
            invoiced: +(pay.invoiced || d.totalOrdered).toFixed(2),
            paid: +(pay.paid || 0).toFixed(2),
            outstanding: +(pay.outstanding || d.totalOrdered).toFixed(2),
        };
    }).sort((a, b) => b.totalOrdered - a.totalOrdered).slice(0, Number(limit));

    res.json({ success: true, data: enriched });
});

/**
 * GET /api/reports/sales/trend?startDate=&endDate=&groupBy=day|week|month
 */
export const getSalesTrend = asyncHandler(async (req, res) => {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    end.setHours(23, 59, 59, 999);

    let groupExprOrder;
    let groupExprInvoice;
    if (groupBy === 'month') {
        groupExprOrder = { year: { $year: '$orderDate' }, month: { $month: '$orderDate' } };
        groupExprInvoice = { year: { $year: '$invoiceDate' }, month: { $month: '$invoiceDate' } };
    } else if (groupBy === 'week') {
        groupExprOrder = { year: { $year: '$orderDate' }, week: { $week: '$orderDate' } };
        groupExprInvoice = { year: { $year: '$invoiceDate' }, week: { $week: '$invoiceDate' } };
    } else {
        groupExprOrder = {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' },
            day: { $dayOfMonth: '$orderDate' },
        };
        groupExprInvoice = {
            year: { $year: '$invoiceDate' },
            month: { $month: '$invoiceDate' },
            day: { $dayOfMonth: '$invoiceDate' },
        };
    }

    const [orderTrend, invoiceTrend] = await Promise.all([
        SalesOrder.aggregate([
            {
                $match: {
                    deletedAt: null,
                    orderDate: { $gte: start, $lte: end },
                    status: { $nin: ['draft', 'cancelled'] },
                },
            },
            {
                $group: {
                    _id: groupExprOrder,
                    count: { $sum: 1 },
                    total: { $sum: '$grandTotal' },
                },
            }
        ]),
        Invoice.aggregate([
            {
                $match: {
                    deletedAt: null,
                    invoiceType: { $ne: 'proforma' },
                    status: { $nin: ['cancelled', 'draft'] },
                    invoiceDate: { $gte: start, $lte: end },
                    salesOrderIds: { $size: 0 }
                }
            },
            {
                $group: {
                    _id: groupExprInvoice,
                    count: { $sum: 1 },
                    total: { $sum: '$grandTotal' }
                }
            }
        ])
    ]);

    const trendMap = new Map();

    const addTrends = (list) => {
        list.forEach(d => {
            let label;
            if (groupBy === 'month') {
                label = `${d._id.year}-${String(d._id.month).padStart(2, '0')}`;
            } else if (groupBy === 'week') {
                label = `${d._id.year}-W${d._id.week}`;
            } else {
                label = `${d._id.year}-${String(d._id.month).padStart(2, '0')}-${String(d._id.day).padStart(2, '0')}`;
            }

            if (trendMap.has(label)) {
                const cur = trendMap.get(label);
                cur.count += d.count || 0;
                cur.total += d.total || 0;
            } else {
                trendMap.set(label, { label, count: d.count || 0, total: d.total || 0 });
            }
        });
    };

    addTrends(orderTrend);
    addTrends(invoiceTrend);

    const result = Array.from(trendMap.values())
        .map(t => ({ ...t, total: +t.total.toFixed(2) }))
        .sort((a, b) => a.label.localeCompare(b.label));

    res.json({ success: true, data: result });
});