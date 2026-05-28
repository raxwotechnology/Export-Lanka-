import asyncHandler from 'express-async-handler';
import mongoose from 'mongoose';
import Payment from '../models/Payment.js';
import Invoice from '../models/Invoice.js';
import Bill from '../models/Bill.js';
import Customer from '../models/Customer.js';
import { updateCustomerBalance } from './invoiceController.js';

/**
 * POST /api/payments
 * Record a payment (received from customer or paid to supplier)
 */
export const createPayment = asyncHandler(async (req, res) => {
    const { direction, customerId, supplierId, allocations = [], ...rest } = req.body;

    if (direction === 'received' && !customerId) {
        res.status(400); throw new Error('customerId required for received payments');
    }
    if (direction === 'paid' && !supplierId) {
        res.status(400); throw new Error('supplierId required for paid payments');
    }

    const session = await mongoose.startSession();
    let payment;

    try {
        await session.withTransaction(async () => {
            // Validate & adjust allocations
            for (const alloc of allocations) {
                if (alloc.documentType === 'invoice') {
                    const inv = await Invoice.findById(alloc.documentId).session(session);
                    if (!inv) throw new Error(`Invoice ${alloc.documentId} not found`);
                    if (alloc.amount > inv.balanceDue) {
                        throw new Error(`Cannot allocate ${alloc.amount} to invoice ${inv.invoiceNumber}, balance is ${inv.balanceDue}`);
                    }
                    alloc.documentNumber = inv.invoiceNumber;
                } else if (alloc.documentType === 'bill') {
                    const bill = await Bill.findById(alloc.documentId).session(session);
                    if (!bill) throw new Error(`Bill ${alloc.documentId} not found`);
                    if (alloc.amount > bill.balanceDue) {
                        throw new Error(`Cannot allocate ${alloc.amount} to bill ${bill.billNumber}, balance is ${bill.balanceDue}`);
                    }
                    alloc.documentNumber = bill.billNumber;
                }
            }

            // Get party name
            let partyName = '';
            if (direction === 'received') {
                const c = await Customer.findById(customerId).session(session);
                partyName = c?.displayName;
            } else {
                const Supplier = (await import('../models/Supplier.js')).default;
                const s = await Supplier.findById(supplierId).session(session);
                partyName = s?.displayName;
            }

            payment = new Payment({
                direction,
                customerId: direction === 'received' ? customerId : undefined,
                supplierId: direction === 'paid' ? supplierId : undefined,
                partyName,
                allocations,
                receivedBy: req.user._id,
                createdBy: req.user._id,
                ...rest,
            });

            await payment.save({ session });

            // Apply allocations to invoices/bills
            for (const alloc of allocations) {
                if (alloc.documentType === 'invoice') {
                    const inv = await Invoice.findById(alloc.documentId).session(session);
                    inv.amountPaid = +(inv.amountPaid + alloc.amount).toFixed(2);
                    inv.lastPaymentDate = payment.paymentDate;
                    await inv.save({ session });
                } else if (alloc.documentType === 'bill') {
                    const bill = await Bill.findById(alloc.documentId).session(session);
                    bill.amountPaid = +(bill.amountPaid + alloc.amount).toFixed(2);
                    bill.lastPaymentDate = payment.paymentDate;
                    await bill.save({ session });
                }
            }

            // Update customer balance if received
            if (direction === 'received') {
                await updateCustomerBalance(customerId, session);
            }
        });

        const populated = await Payment.findById(payment._id)
            .populate('customerId', 'displayName customerCode')
            .populate('supplierId', 'displayName supplierCode');

        res.status(201).json({ success: true, data: populated });
    } catch (err) {
        res.status(400);
        throw new Error(err.message || 'Failed to create payment');
    } finally {
        session.endSession();
    }
});

export const getPayments = asyncHandler(async (req, res) => {
    const {
        direction, customerId, supplierId, method, status,
        startDate, endDate,
        page = 1, limit = 20,
    } = req.query;

    const { documentId } = req.query;

    const filter = {};
    if (direction) filter.direction = direction;
    if (customerId) filter.customerId = customerId;
    if (documentId) {
        filter['allocations.documentId'] = documentId;
    }
    if (supplierId) filter.supplierId = supplierId;
    if (method) filter.method = method;
    if (status) filter.status = status;
    if (startDate || endDate) {
        filter.paymentDate = {};
        if (startDate) filter.paymentDate.$gte = new Date(startDate);
        if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payments, total] = await Promise.all([
        Payment.find(filter)
            .populate('customerId', 'displayName customerCode')
            .populate('supplierId', 'displayName supplierCode')
            .populate('receivedBy', 'firstName lastName')
            .sort({ paymentDate: -1 }).skip(skip).limit(Number(limit)),
        Payment.countDocuments(filter),
    ]);

    res.json({
        success: true,
        count: payments.length, total,
        page: Number(page), totalPages: Math.ceil(total / Number(limit)),
        data: payments,
    });
});

export const getPaymentById = asyncHandler(async (req, res) => {
    const payment = await Payment.findById(req.params.id)
        .populate('customerId', 'displayName customerCode')
        .populate('supplierId', 'displayName supplierCode')
        .populate('receivedBy', 'firstName lastName')
        .populate('createdBy', 'firstName lastName');
    if (!payment) { res.status(404); throw new Error('Payment not found'); }
    res.json({ success: true, data: payment });
});