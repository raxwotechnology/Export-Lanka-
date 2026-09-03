import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

const addressSchema = z.object({
    label: z.string().optional().nullable(),
    attentionTo: z.string().optional().nullable(),
    line1: z.string().optional().nullable(),
    line2: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    postalCode: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    deliveryInstructions: z.string().optional().nullable(),
    isDefault: z.boolean().optional().nullable(),
});

const contactSchema = z.object({
    name: z.string().optional().nullable(),
    designation: z.string().optional().nullable(),
    email: z.string().email().optional().nullable().or(z.literal('')),
    phone: z.string().optional().nullable(),
    role: z.enum(['owner', 'purchasing', 'accounts', 'logistics', 'other']).optional().nullable(),
    isPrimary: z.boolean().optional().nullable(),
    notes: z.string().optional().nullable(),
});

export const createCustomerGroupSchema = z.object({
    name: z.string().min(1).max(100),
    code: z.string().min(1).max(20),
    description: z.string().max(500).optional().nullable(),
    defaultPaymentTerms: z.object({
        type: z.enum(['advance', 'cod', 'credit']).optional().nullable(),
        creditDays: z.number().min(0).optional().nullable(),
        defaultCreditLimit: z.number().min(0).optional().nullable(),
    }).optional().nullable(),
    defaultDiscountPercent: z.number().min(0).max(100).optional().nullable(),
    priority: z.number().optional().nullable(),
    color: z.string().optional().nullable(),
    isActive: z.boolean().optional().nullable(),
});

export const updateCustomerGroupSchema = createCustomerGroupSchema.partial();

export const createCustomerSchema = z.object({
    customerType: z.enum(['company', 'individual']).optional().nullable(),
    businessType: z.enum(['wholesaler', 'retailer', 'distributor', 'reseller', 'end_user', 'other']).optional().nullable(),

    companyName: z.string().max(200).optional().nullable(),
    displayName: z.string().min(1, 'Display name required').max(100),
    firstName: z.string().optional().nullable(),
    lastName: z.string().optional().nullable(),

    customerGroupId: objectId.optional().nullable().or(z.literal('')),
    tags: z.array(z.string()).optional().nullable(),

    businessRegistrationNumber: z.string().optional().nullable(),
    taxRegistrationNumber: z.string().optional().nullable(),
    industry: z.string().optional().nullable(),

    primaryContact: z.object({
        name: z.string().optional().nullable(),
        email: z.string().email().optional().nullable().or(z.literal('')),
        phone: z.string().optional().nullable(),
        mobile: z.string().optional().nullable(),
    }).optional().nullable(),

    contacts: z.array(contactSchema).optional().nullable(),
    billingAddress: addressSchema.optional().nullable(),
    shippingAddresses: z.array(addressSchema).optional().nullable(),

    assignedSalesRep: objectId.optional().nullable().or(z.literal('')),

    paymentTerms: z.object({
        type: z.enum(['advance', 'cod', 'credit']).optional().nullable(),
        creditDays: z.number().min(0).optional().nullable(),
        creditLimit: z.number().min(0).optional().nullable(),
    }).optional().nullable(),

    defaultDiscountPercent: z.number().min(0).max(100).optional().nullable(),

    status: z.enum(['active', 'inactive', 'blacklisted', 'on_hold', 'prospect']).optional().nullable(),
    blacklistReason: z.string().optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    internalNotes: z.string().max(2000).optional().nullable(),
});

export const updateCustomerSchema = createCustomerSchema.partial();