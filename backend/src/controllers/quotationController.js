import asyncHandler from 'express-async-handler';
import Quotation from '../models/Quotation.js';
import Inquiry from '../models/Inquiry.js';
import SalesOrder from '../models/SalesOrder.js';
import Customer from '../models/Customer.js';
import Warehouse from '../models/Warehouse.js';
import Settings from '../models/Settings.js';
import { createAuditLog } from '../utils/auditLogger.js';
import { generateQuotationPDF } from '../services/reportService.js';

const sanitizeQuotationPayload = (body) => {
    if (!body.customerId || body.customerId === '') delete body.customerId;
    if (!body.inquiryId || body.inquiryId === '') delete body.inquiryId;
    if (!body.inquiry || body.inquiry === '') delete body.inquiry;
    if (!body.salesOrderId || body.salesOrderId === '') delete body.salesOrderId;
    if (Array.isArray(body.items)) {
        body.items.forEach(it => {
            if (!it.product || it.product === '') delete it.product;
        });
    }
};

/**
 * @desc    Create a quotation from an inquiry
 * @route   POST /api/quotations
 * @access  Private
 */
export const createQuotation = asyncHandler(async (req, res) => {
    sanitizeQuotationPayload(req.body);

    // Auto-register unregistered customer if customerName is provided but customerId is not
    if (!req.body.customerId && req.body.customerName) {
        const { default: Customer } = await import('../models/Customer.js');
        let customer = await Customer.findOne({
            displayName: { $regex: new RegExp('^' + req.body.customerName.trim() + '$', 'i') }
        });
        if (!customer) {
            customer = new Customer({
                displayName: req.body.customerName.trim(),
                companyName: req.body.customerName.trim(),
                primaryContact: {
                    email: req.body.customerEmail || undefined,
                    phone: req.body.customerPhone || undefined
                },
                billingAddress: req.body.customerAddress ? {
                    line1: req.body.customerAddress,
                    city: '',
                    country: 'Sri Lanka'
                } : undefined,
                status: 'active',
                createdBy: req.user._id
            });
            await customer.save();
        }
        req.body.customerId = customer._id;
    }

    const quotation = await Quotation.create({
        ...req.body,
        createdBy: req.user._id,
        version: 1
    });

    // If linked to an inquiry, update inquiry status
    if (quotation.inquiryId) {
        await Inquiry.findByIdAndUpdate(quotation.inquiryId, { status: 'quoted' });
    }

    createAuditLog({
        action: 'create',
        module: 'crm',
        documentId: quotation._id,
        documentCode: quotation.quoteNumber,
        description: `Generated quotation ${quotation.quoteNumber} for inquiry ${quotation.inquiryId || 'manual'}`,
        req
    });

    res.status(201).json({ success: true, data: quotation });
});

/**
 * @desc    Get quotations
 * @route   GET /api/quotations
 * @access  Private
 */
export const getQuotations = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = { deletedAt: null };
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [quotations, total] = await Promise.all([
        Quotation.find(filter)
            .populate('customerId', 'displayName companyName')
            .populate('items.product', 'name productCode')
            .populate('salesOrderId', 'orderNumber status grandTotal')
            .populate('inquiryId', 'inquiryCode companyName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit)),
        Quotation.countDocuments(filter)
    ]);

    res.json({
        success: true,
        data: quotations,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
    });
});

/**
 * @desc    Get quotation by ID
 * @route   GET /api/quotations/:id
 * @access  Private
 */
export const getQuotationById = asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id)
        .populate('customerId', 'displayName companyName primaryContact billingAddress')
        .populate('items.product', 'name productCode uom basePrice sku')
        .populate('salesOrderId', 'orderNumber status grandTotal')
        .populate('inquiryId', 'inquiryCode companyName')
        .populate('createdBy', 'firstName lastName');

    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    res.json({ success: true, data: quotation });
});

/**
 * @desc    Update a quotation
 * @route   PUT /api/crm/quotations/:id
 * @access  Private
 */
export const updateQuotation = asyncHandler(async (req, res) => {
    sanitizeQuotationPayload(req.body);

    // Auto-register unregistered customer if customerName is provided but customerId is not
    if (!req.body.customerId && req.body.customerName) {
        const { default: Customer } = await import('../models/Customer.js');
        let customer = await Customer.findOne({
            displayName: { $regex: new RegExp('^' + req.body.customerName.trim() + '$', 'i') }
        });
        if (!customer) {
            customer = new Customer({
                displayName: req.body.customerName.trim(),
                companyName: req.body.customerName.trim(),
                primaryContact: {
                    email: req.body.customerEmail || undefined,
                    phone: req.body.customerPhone || undefined
                },
                billingAddress: req.body.customerAddress ? {
                    line1: req.body.customerAddress,
                    city: '',
                    country: 'Sri Lanka'
                } : undefined,
                status: 'active',
                createdBy: req.user._id
            });
            await customer.save();
        }
        req.body.customerId = customer._id;
    }

    const quotation = await Quotation.findByIdAndUpdate(
        req.params.id,
        { ...req.body, updatedBy: req.user._id },
        { new: true, runValidators: true }
    );

    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    createAuditLog({
        action: 'update',
        module: 'crm',
        documentId: quotation._id,
        description: `Updated quotation ${quotation.quoteNumber}`,
        req
    });

    res.json({ success: true, data: quotation });
});

/**
 * @desc    Delete a quotation (soft)
 * @route   DELETE /api/crm/quotations/:id
 * @access  Private
 */
export const deleteQuotation = asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }
    quotation.deletedAt = new Date();
    await quotation.save();

    createAuditLog({
        action: 'delete',
        module: 'crm',
        documentId: quotation._id,
        description: `Deleted quotation ${quotation.quoteNumber}`,
        req
    });

    res.json({ success: true, message: 'Quotation deleted' });
});

/**
 * @desc    Convert quotation to sales order
 * @route   POST /api/crm/quotations/:id/convert
 * @access  Private
 */
export const convertQuotationToOrder = asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    if (quotation.status === 'converted' && quotation.salesOrderId) {
        const existingOrder = await SalesOrder.findById(quotation.salesOrderId);
        if (existingOrder) {
            return res.json({
                success: true,
                message: `Quotation already converted to Sales Order ${existingOrder.orderNumber}`,
                data: quotation,
                salesOrder: existingOrder
            });
        }
    }

    // Resolve or auto-register customer
    let customerId = quotation.customerId;
    let customerDoc = null;
    if (customerId) {
        customerDoc = await Customer.findById(customerId);
    }
    if (!customerDoc && quotation.customerName) {
        customerDoc = await Customer.findOne({
            displayName: { $regex: new RegExp('^' + quotation.customerName.trim() + '$', 'i') }
        });
        if (!customerDoc) {
            customerDoc = await Customer.create({
                displayName: quotation.customerName.trim(),
                companyName: quotation.customerName.trim(),
                primaryContact: {
                    name: quotation.customerName.trim(),
                    email: quotation.customerEmail || undefined,
                    phone: quotation.customerPhone || undefined,
                },
                billingAddress: quotation.customerAddress ? {
                    line1: quotation.customerAddress,
                    country: 'Sri Lanka',
                } : undefined,
                status: 'active',
                createdBy: req.user._id,
            });
        }
        customerId = customerDoc._id;
        quotation.customerId = customerId;
    }

    // Find default source warehouse for fulfillment
    const defaultWarehouse = await Warehouse.findOne({ isActive: { $ne: false } });

    // Build line items for SalesOrder
    const lineItems = (quotation.items || []).map((it, idx) => {
        const qty = Number(it.quantity) || 1;
        const price = Number(it.unitPrice) || 0;
        const subtotal = +(qty * price).toFixed(2);
        return {
            lineNumber: idx + 1,
            productId: it.product || null,
            productName: it.productName || 'Line Item',
            description: it.description || '',
            orderedQuantity: qty,
            dispatchedQuantity: 0,
            deliveredQuantity: 0,
            unitOfMeasure: 'Kg',
            listPrice: price,
            unitPrice: price,
            lineSubtotal: subtotal,
            lineTotal: subtotal,
            lineStatus: 'pending',
        };
    });

    const salesOrder = new SalesOrder({
        source: 'quotation',
        customer: customerId || undefined,
        customerId: customerId || undefined,
        sourceWarehouseId: defaultWarehouse?._id,
        sourceWarehouseSnapshot: defaultWarehouse ? {
            name: defaultWarehouse.name,
            warehouseCode: defaultWarehouse.warehouseCode,
        } : undefined,
        customerSnapshot: {
            name: quotation.customerName || customerDoc?.displayName || 'Customer',
            code: customerDoc?.customerCode || '',
            taxRegistrationNumber: customerDoc?.taxRegistrationNumber || '',
            contactName: quotation.customerName || customerDoc?.primaryContact?.name || '',
            phone: quotation.customerPhone || customerDoc?.primaryContact?.phone || '',
        },
        billingAddress: customerDoc?.billingAddress || {
            line1: quotation.customerAddress || '',
        },
        shippingAddress: customerDoc?.shippingAddresses?.[0] || customerDoc?.billingAddress || {
            line1: quotation.customerAddress || '',
        },
        orderDate: new Date(),
        currency: quotation.currency || 'LKR',
        items: lineItems,
        subtotal: quotation.totalAmount || lineItems.reduce((s, i) => s + i.lineSubtotal, 0),
        totalDiscount: quotation.discount || 0,
        totalTax: quotation.tax || 0,
        grandTotal: quotation.grandTotal || (quotation.totalAmount + (quotation.tax || 0) - (quotation.discount || 0)),
        paymentTerms: {
            type: quotation.terms?.paymentTerms || customerDoc?.paymentTerms?.type || 'cod',
            creditDays: customerDoc?.paymentTerms?.creditDays || 0,
        },
        specialInstructions: quotation.terms?.incoterm ? `Incoterm: ${quotation.terms.incoterm}` : '',
        customerNotes: quotation.notes || '',
        status: 'draft',
        quotationId: quotation._id,
        quotationNumber: quotation.quoteNumber || quotation.quotationCode,
        inquiryId: quotation.inquiryId || quotation.inquiry || null,
        createdBy: req.user._id,
    });

    await salesOrder.save();

    // Update Quotation status & reference
    quotation.status = 'converted';
    quotation.acceptedAt = quotation.acceptedAt || new Date();
    quotation.salesOrderId = salesOrder._id;
    quotation.salesOrderNumber = salesOrder.orderNumber;
    await quotation.save();

    // If quotation was linked to an inquiry, update inquiry status as well
    if (quotation.inquiryId) {
        await Inquiry.findByIdAndUpdate(quotation.inquiryId, {
            status: 'order_confirmed',
            salesOrderId: salesOrder._id,
            salesOrderNumber: salesOrder.orderNumber,
        });
    }

    createAuditLog({
        action: 'create',
        module: 'crm',
        documentId: quotation._id,
        description: `Converted quotation ${quotation.quoteNumber} to sales order ${salesOrder.orderNumber}`,
        req
    });

    res.json({
        success: true,
        message: `Quotation converted to Sales Order ${salesOrder.orderNumber}`,
        data: quotation,
        salesOrder
    });
});

/**
 * @desc    Generate / Download Quotation PDF
 * @route   GET /api/crm/quotations/:id/pdf
 * @access  Private
 */
export const getQuotationPDF = asyncHandler(async (req, res) => {
    const quotation = await Quotation.findById(req.params.id)
        .populate('customerId', 'displayName companyName primaryContact billingAddress')
        .populate('inquiryId', 'inquiryNumber leadTitle')
        .populate('items.product', 'name code sku');

    if (!quotation) {
        res.status(404);
        throw new Error('Quotation not found');
    }

    const settings = await Settings.findOne();
    const pdfBuffer = await generateQuotationPDF(quotation, settings);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Quotation_${quotation.quoteNumber || quotation._id}.pdf`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
});

