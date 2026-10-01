import asyncHandler from 'express-async-handler';
import Settings from '../models/Settings.js';

import { COMPANY_BRANDING } from '../assets/branding.js';

// @desc    Get system settings
// @route   GET /api/settings
// @access  Private
export const getSettings = asyncHandler(async (req, res) => {
    let settings = await Settings.findOne();
    if (!settings) {
        settings = await Settings.create({
            companyName: COMPANY_BRANDING.name,
            companyTagline: COMPANY_BRANDING.tagline,
            companyAddress: COMPANY_BRANDING.address,
            companyPhone: COMPANY_BRANDING.phone,
            companyEmail: COMPANY_BRANDING.email,
            companyWebsite: COMPANY_BRANDING.website,
            companyLogo: COMPANY_BRANDING.logoUrl,
            taxId: COMPANY_BRANDING.vatNumber,
            businessRegNo: COMPANY_BRANDING.businessRegNumber,
            bankDetails: COMPANY_BRANDING.bankDetails,
            currency: 'LKR',
            currencySymbol: 'Rs.',
            defaultTaxRate: 0,
            lowStockThreshold: 10,
        });
    } else if (!settings.companyTagline || !settings.companyWebsite || settings.companyName === 'Wholesale ERP' || settings.companyName === 'Export Lanka') {
        settings.companyName = COMPANY_BRANDING.name;
        settings.companyTagline = settings.companyTagline || COMPANY_BRANDING.tagline;
        settings.companyAddress = settings.companyAddress || COMPANY_BRANDING.address;
        settings.companyPhone = settings.companyPhone || COMPANY_BRANDING.phone;
        settings.companyEmail = settings.companyEmail || COMPANY_BRANDING.email;
        settings.companyWebsite = settings.companyWebsite || COMPANY_BRANDING.website;
        settings.companyLogo = settings.companyLogo || COMPANY_BRANDING.logoUrl;
        settings.taxId = settings.taxId || COMPANY_BRANDING.vatNumber;
        settings.businessRegNo = settings.businessRegNo || COMPANY_BRANDING.businessRegNumber;
        settings.bankDetails = settings.bankDetails || COMPANY_BRANDING.bankDetails;
        await settings.save();
    }
    res.json({ success: true, data: settings });
});

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Private/Admin
export const updateSettings = asyncHandler(async (req, res) => {
    let settings = await Settings.findOne();
    
    if (!settings) {
        settings = new Settings(req.body);
    } else {
        Object.assign(settings, req.body);
    }

    settings.updatedBy = req.user._id;
    await settings.save();

    res.json({ success: true, data: settings });
});
