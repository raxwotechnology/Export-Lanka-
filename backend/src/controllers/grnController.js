import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import GoodsReceiptNote from '../models/GoodsReceiptNote.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import { increaseStock } from '../services/stockService.js';

/**
 * Create a GRN — receives goods and increases stock atomically.
 */
export const createGrn = asyncHandler(async (req, res) => {
    const { purchaseOrderId, warehouseId, items, ...rest } = req.body;

    const po = await PurchaseOrder.findById(purchaseOrderId);
    if (!po) { res.status(404); throw new Error('Purchase order not found'); }
    if (!['approved', 'sent', 'partially_received'].includes(po.status)) {
        res.status(400);
        throw new Error(`Cannot receive against PO with status '${po.status}'`);
    }

    // Validate items against PO
    const poItemsMap = new Map(po.items.map((i) => [i._id.toString(), i]));

    const session = await mongoose.startSession();
    let grn;

    try {
        await session.withTransaction(async () => {
            // Build GRN line items
            const grnItems = items.map((item) => {
                const poLine = item.poLineItemId ? poItemsMap.get(item.poLineItemId) : null;
                const accepted = item.acceptedQuantity ?? item.receivedQuantity;

                return {
                    poLineItemId: item.poLineItemId,
                    productId: item.productId,
                    productCode: poLine?.productCode || '',
                    productName: poLine?.productName || '',
                    orderedQuantity: poLine?.orderedQuantity || 0,
                    receivedQuantity: item.receivedQuantity,
                    acceptedQuantity: accepted,
                    rejectedQuantity: item.rejectedQuantity || 0,
                    damagedQuantity: item.damagedQuantity || 0,
                    unitOfMeasure: poLine?.unitOfMeasure || '',
                    unitPrice: item.unitPrice || poLine?.unitPrice || 0,
                    batchNumber: item.batchNumber || null,
                    manufactureDate: item.manufactureDate || null,
                    expiryDate: item.expiryDate || null,
                    rejectionReason: item.rejectionReason,
                    notes: item.notes,
                    qcStatus: item.rejectionReason || item.rejectedQuantity > 0 ? 'failed' : 'not_required',
                };
            });

            grn = new GoodsReceiptNote({
                purchaseOrderId: po._id,
                poNumber: po.poNumber,
                supplierId: po.supplierId,
                supplierName: po.supplierSnapshot?.name,
                warehouseId,
                items: grnItems,
                status: 'received',
                receivedBy: req.user._id,
                createdBy: req.user._id,
                ...rest,
            });

            await grn.save({ session });

            // Increase stock for each accepted item
            for (const grnItem of grn.items) {
                const qtyToStock = grnItem.acceptedQuantity;
                if (qtyToStock <= 0) continue;

                const result = await increaseStock({
                    productId: grnItem.productId,
                    warehouseId,
                    quantity: qtyToStock,
                    costPerUnit: grnItem.unitPrice,
                    movementType: 'purchase_receipt',
                    batchNumber: grnItem.batchNumber || null,
                    sourceDocument: {
                        type: 'purchase_receipt',
                        id: grn._id,
                        number: grn.grnNumber,
                    },
                    reason: `GRN against PO ${po.poNumber}`,
                    userId: req.user._id,
                    session,
                });

                // Link the movement
                grnItem.stockMovementId = result.movement._id;
            }

            await grn.save({ session });

            // Update PO: increment received quantities on lines
            for (const grnItem of grn.items) {
                if (!grnItem.poLineItemId) continue;
                const poLine = po.items.id(grnItem.poLineItemId);
                if (poLine) {
                    poLine.receivedQuantity = (poLine.receivedQuantity || 0) + grnItem.acceptedQuantity;
                }
            }
            po.grns = [...(po.grns || []), grn._id];
            await po.save({ session });
        });

        const populated = await GoodsReceiptNote.findById(grn._id)
            .populate('purchaseOrderId', 'poNumber')
            .populate('supplierId', 'displayName supplierCode')
            .populate('warehouseId', 'name warehouseCode')
            .populate('items.productId', 'name productCode');

        res.status(201).json({ success: true, message: 'Goods received and stock updated', data: populated });
    } catch (err) {
        res.status(400);
        throw new Error(err.message || 'Failed to create GRN');
    } finally {
        session.endSession();
    }
});

export const getGrns = asyncHandler(async (req, res) => {
    const {
        search, purchaseOrderId, supplierId, warehouseId, status,
        page = 1, limit = 20,
    } = req.query;

    const filter = {};
    if (search) filter.grnNumber = { $regex: search, $options: 'i' };
    if (purchaseOrderId) filter.purchaseOrderId = purchaseOrderId;
    if (supplierId) filter.supplierId = supplierId;
    if (warehouseId) filter.warehouseId = warehouseId;
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [grns, total] = await Promise.all([
        GoodsReceiptNote.find(filter)
            .populate('purchaseOrderId', 'poNumber')
            .populate('supplierId', 'displayName supplierCode')
            .populate('warehouseId', 'name warehouseCode')
            .sort({ receiptDate: -1 })
            .skip(skip).limit(Number(limit)),
        GoodsReceiptNote.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: grns.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: grns,
    });
});

export const getGrnById = asyncHandler(async (req, res) => {
    const grn = await GoodsReceiptNote.findById(req.params.id)
        .populate('purchaseOrderId', 'poNumber poDate')
        .populate('supplierId', 'displayName supplierCode')
        .populate('warehouseId', 'name warehouseCode')
        .populate('items.productId', 'name productCode')
        .populate('items.stockMovementId', 'movementNumber')
        .populate('receivedBy', 'firstName lastName')
        .populate('createdBy', 'firstName lastName');
    if (!grn) { res.status(404); throw new Error('GRN not found'); }
    res.json({ success: true, data: grn });
});