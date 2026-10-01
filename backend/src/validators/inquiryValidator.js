import { z } from 'zod';

const inquiryItemSchema = z.object({
    product: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable().or(z.literal('')),
    productName: z.string().min(1, 'Product name is required'),
    quantity: z.coerce.number().min(0.001, 'Quantity must be greater than 0'),
    uom: z.string().default('Kg'),
});

const baseInquirySchema = z.object({
    companyName: z.string().min(1, 'Company Name is required'),
    contactPerson: z.string().optional().or(z.literal('')),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    country: z.string().optional().or(z.literal('')),
    source: z.string().optional(),
    otherSource: z.string().optional().or(z.literal('')),
    status: z.string().optional(),
    currency: z.enum(['LKR', 'USD', 'EUR']).default('LKR').optional(),
    inquiryDate: z.string().or(z.date()).optional(),
    expectedDeliveryDate: z.string().or(z.date()).optional().nullable().or(z.literal('')),
    items: z.array(inquiryItemSchema).optional().default([]),
    productsInterested: z.string().optional().or(z.literal('')),
    sampleRequested: z.boolean().optional(),
    sampleDetails: z.object({
        sentDate: z.string().optional().nullable().or(z.literal('')),
        trackingNumber: z.string().optional().or(z.literal('')),
        feedback: z.string().optional().or(z.literal('')),
        approved: z.boolean().optional(),
    }).optional(),
    notes: z.string().optional().or(z.literal('')),
    assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/).optional().nullable().or(z.literal('')),
});

export const createInquirySchema = baseInquirySchema.refine(
    data => (data.contactPerson && data.contactPerson.trim().length > 0) ||
            (data.phone && data.phone.trim().length > 0) ||
            (data.email && data.email.trim().length > 0),
    {
        message: 'Please provide at least a Contact Person, Phone, or Email',
        path: ['phone'],
    }
);

export const updateInquirySchema = baseInquirySchema.partial();
