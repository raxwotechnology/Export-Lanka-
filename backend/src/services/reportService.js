import ExcelJS from 'exceljs';
import PdfPrinter from 'pdfkit-table';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { COMPANY_BRANDING } from '../assets/branding.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOGO_PATH = path.join(__dirname, '../assets/company_logo.jpg');

const fmtCurrency = (num, currency = 'LKR') => {
    const val = Number(num) || 0;
    return `${currency === 'USD' ? '$' : 'Rs.'} ${val.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (date) => {
    if (!date) return '—';
    try {
        return new Date(date).toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return String(date);
    }
};

/**
 * Normalizes system settings merged with default corporate branding
 */
const resolveCompanySettings = (settings) => {
    const s = settings && typeof settings.toObject === 'function' ? settings.toObject() : (settings || {});
    return {
        name: s.companyName || COMPANY_BRANDING.name || 'Authentic Lanka Exports (Pvt) Ltd',
        tagline: s.companyTagline || COMPANY_BRANDING.tagline || 'Premium Organic & Agricultural Exporters',
        address: s.companyAddress || COMPANY_BRANDING.address || 'No. 45/2, Temple Road, Colombo 03, Sri Lanka',
        phone: s.companyPhone || COMPANY_BRANDING.phone || '+94 11 234 5678 / +94 77 123 4567',
        email: s.companyEmail || COMPANY_BRANDING.email || 'info@authenticlanka.com',
        website: s.companyWebsite || COMPANY_BRANDING.website || 'www.authenticlanka.com',
        vatNumber: s.taxId || COMPANY_BRANDING.vatNumber || 'VAT 114567890-7000',
        businessRegNumber: s.businessRegNo || COMPANY_BRANDING.businessRegNumber || 'PV 00234567',
        logo: s.companyLogo || COMPANY_BRANDING.logoUrl || null,
        bankDetails: s.bankDetails || COMPANY_BRANDING.bankDetails || {},
        currency: s.currency || 'LKR',
        currencySymbol: s.currencySymbol || 'Rs.'
    };
};

/**
 * Safely renders the corporate logo from settings (Base64 data URL, file path, or default fallback)
 */
const renderCompanyLogo = (doc, brand, x = 30, y = 18, width = 52, height = 52) => {
    let drawn = false;

    // 1. Try brand.logo if provided (base64 data URL, disk path, or public folder)
    if (brand && brand.logo && typeof brand.logo === 'string') {
        try {
            if (brand.logo.startsWith('data:image')) {
                const base64Data = brand.logo.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                doc.image(buffer, x, y, { width, height, fit: [width, height] });
                drawn = true;
            } else if (fs.existsSync(brand.logo)) {
                doc.image(brand.logo, x, y, { width, height, fit: [width, height] });
                drawn = true;
            } else {
                const pubPath = path.join(__dirname, '../../../frontend/public', brand.logo.replace(/^\//, ''));
                if (fs.existsSync(pubPath)) {
                    doc.image(pubPath, x, y, { width, height, fit: [width, height] });
                    drawn = true;
                }
            }
        } catch (e) {
            console.warn('[PDF] Failed to draw custom logo:', e.message);
        }
    }

    // 2. Fallback to LOGO_PATH
    if (!drawn && fs.existsSync(LOGO_PATH)) {
        try {
            doc.image(LOGO_PATH, x, y, { width, height, fit: [width, height] });
            drawn = true;
        } catch (e) {
            console.warn('[PDF] Failed to draw fallback LOGO_PATH:', e.message);
        }
    }

    // 3. Fallback to COMPANY_BRANDING.logoBase64
    if (!drawn && COMPANY_BRANDING.logoBase64) {
        try {
            const buffer = Buffer.from(COMPANY_BRANDING.logoBase64.replace(/^data:image\/\w+;base64,/, ''), 'base64');
            doc.image(buffer, x, y, { width, height, fit: [width, height] });
            drawn = true;
        } catch (e) {
            console.warn('[PDF] Failed to draw base64 branding logo:', e.message);
        }
    }

    // 4. Fallback monogram badge if no image could be rendered
    if (!drawn) {
        doc.roundedRect(x, y, width, height, 6).fillAndStroke('#065F46', '#047857');
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#FFFFFF').text('ALE', x, y + 16, { width, align: 'center' });
    }

    return drawn;
};

/**
 * ReportService
 * Handles professional generation of Excel and PDF documents with Authentic Lanka Exports corporate branding.
 */
class ReportService {
    /**
     * Generate Excel File
     */
    async generateExcel(title, columns, data) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(title);

        worksheet.columns = columns.map(col => ({
            header: col.header,
            key: col.key,
            width: col.width || 20
        }));

        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF065F46' } // Emerald-800
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        worksheet.addRows(data);

        worksheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1 && rowNumber % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF0FDF4' } // Emerald-50
                };
            }
            row.eachCell(cell => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
                    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
                };
            });
        });

        return await workbook.xlsx.writeBuffer();
    }

    /**
     * Generate PDF Report (Tabular Summary Reports)
     */
    async generatePDF({ title, columns, data, user, settings }) {
        const brand = resolveCompanySettings(settings);
        const isLandscape = columns.length > 7;

        return new Promise((resolve, reject) => {
            const doc = new PdfPrinter({
                margin: 30,
                size: 'A4',
                layout: isLandscape ? 'landscape' : 'portrait'
            });

            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const pageWidth = doc.page.width;

            // 1. Top Decorative Brand Bar
            doc.rect(0, 0, pageWidth, 5).fill('#065F46'); // Deep Emerald

            // 2. Header with Logo & Corporate Info
            renderCompanyLogo(doc, brand, 30, 18, 48, 48);

            const headerLeft = 88;
            doc.font('Helvetica-Bold').fontSize(13).fillColor('#065F46').text(brand.name.toUpperCase(), headerLeft, 18);
            doc.font('Helvetica-Oblique').fontSize(8).fillColor('#047857').text(brand.tagline, headerLeft, 33);
            doc.font('Helvetica').fontSize(7.5).fillColor('#475569')
                .text(`${brand.address}  ·  Tel: ${brand.phone}`, headerLeft, 44)
                .text(`Email: ${brand.email}  ·  Web: ${brand.website}  ·  ${brand.vatNumber}  ·  BR: ${brand.businessRegNumber}`, headerLeft, 55);

            // Report Title & Meta on Right Side
            const rightWidth = isLandscape ? 300 : 220;
            const rightX = pageWidth - rightWidth - 30;
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#1E293B').text(title.toUpperCase(), rightX, 18, { align: 'right', width: rightWidth });
            doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(`Generated: ${new Date().toLocaleString('en-LK')}`, rightX, 36, { align: 'right', width: rightWidth });
            if (user) {
                doc.text(`Generated by: ${user.name || user.email} (${user.role || 'Staff'})`, rightX, 48, { align: 'right', width: rightWidth });
            }

            // Divider Line
            doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(30, 72).lineTo(pageWidth - 30, 72).stroke();

            // 3. Table
            const tableData = data.map(row => {
                const newRow = {};
                columns.forEach(col => {
                    const val = row[col.key];
                    if (val && typeof val === 'object' && !Array.isArray(val)) {
                        newRow[col.key] = val.name || val.code || val.displayName || JSON.stringify(val);
                    } else {
                        newRow[col.key] = val !== undefined && val !== null ? String(val) : '—';
                    }
                });
                return newRow;
            });

            const table = {
                title: '',
                headers: columns.map(c => ({ label: c.header, property: c.key, width: c.width || (isLandscape ? 90 : 70) })),
                datas: tableData,
                options: {
                    padding: 4,
                    columnSpacing: 6,
                    divider: {
                        header: { disabled: false, width: 1.5, opacity: 0.8 },
                        horizontal: { disabled: false, width: 0.5, opacity: 0.2 }
                    }
                }
            };

            doc.x = 30;
            doc.y = 80;

            const finish = () => {
                const range = doc.bufferedPageRange();
                for (let i = range.start; i < range.start + range.count; i++) {
                    doc.switchToPage(i);
                    doc.page.margins.bottom = 0;
                    doc.fontSize(7.5).fillColor('#94A3B8').text(
                        `${brand.name}  ·  Confidential & Proprietary  ·  Page ${i + 1} of ${range.count}`,
                        0,
                        doc.page.height - 20,
                        { align: 'center', width: doc.page.width, lineBreak: false }
                    );
                }
                doc.end();
            };

            try {
                const result = doc.table(table, {
                    x: 30,
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#065F46'),
                    prepareRow: () => doc.font('Helvetica').fontSize(8).fillColor('#1E293B'),
                });

                if (result instanceof Promise) {
                    result.then(finish).catch(reject);
                } else {
                    finish();
                }
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Generate Official Invoice PDF
     */
    async generateInvoicePDF(invoice, settings) {
        const brand = resolveCompanySettings(settings);
        const currency = invoice.currency || 'LKR';

        return new Promise((resolve, reject) => {
            const doc = new PdfPrinter({ margin: 30, size: 'A4' });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const pageWidth = doc.page.width;

            // 1. Top Decorative Brand Bar
            doc.rect(0, 0, pageWidth, 6).fill('#065F46');

            // 2. Company Logo & Corporate Header
            renderCompanyLogo(doc, brand, 30, 18, 52, 52);

            const headerLeft = 90;
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#065F46').text(brand.name.toUpperCase(), headerLeft, 18);
            doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#047857').text(brand.tagline, headerLeft, 34);
            doc.font('Helvetica').fontSize(7.5).fillColor('#475569')
                .text(brand.address, headerLeft, 46)
                .text(`Tel: ${brand.phone}  ·  Email: ${brand.email}`, headerLeft, 57)
                .text(`Web: ${brand.website}  ·  ${brand.vatNumber}  ·  BR: ${brand.businessRegNumber}`, headerLeft, 67);

            // Right side: Document Title & Identifiers
            const docTitle = invoice.invoiceType === 'proforma' ? 'PROFORMA INVOICE' : 'TAX INVOICE';
            doc.font('Helvetica-Bold').fontSize(20).fillColor('#1E293B').text(docTitle, 350, 20, { align: 'right', width: 215 });
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#065F46').text(invoice.invoiceNumber, 350, 44, { align: 'right', width: 215 });
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text(`STATUS: ${(invoice.status || 'ISSUED').toUpperCase()}`, 350, 58, { align: 'right', width: 215 });
            doc.font('Helvetica').fontSize(8).fillColor('#64748B').text(`Payment: ${(invoice.paymentStatus || 'unpaid').replace('_', ' ').toUpperCase()}`, 350, 70, { align: 'right', width: 215 });

            // Divider Line
            doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(30, 86).lineTo(pageWidth - 30, 86).stroke();

            // 3. Two Columns: Customer & Invoice Details
            const customer = invoice.customerSnapshot || {};
            const billingAddr = invoice.billingAddress || {};
            const clientName = customer.name || (typeof invoice.customerId === 'object' ? invoice.customerId?.displayName || invoice.customerId?.companyName : null) || 'Valued Client';
            const clientAddress = [
                billingAddr.line1,
                billingAddr.line2,
                billingAddr.city,
                billingAddr.country || 'Sri Lanka'
            ].filter(Boolean).join(', ');

            // Left: Client Details
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#065F46').text('INVOICED TO (CLIENT):', 30, 96);
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A').text(clientName, 30, 108);
            doc.font('Helvetica').fontSize(8).fillColor('#475569');
            let cy = 120;
            if (customer.code) { doc.text(`Customer Code: ${customer.code}`, 30, cy); cy += 11; }
            if (clientAddress) { doc.text(clientAddress, 30, cy, { width: 240 }); cy += 13; }
            if (customer.phone) { doc.text(`Tel: ${customer.phone}`, 30, cy); cy += 11; }
            if (customer.email) { doc.text(`Email: ${customer.email}`, 30, cy); cy += 11; }
            if (customer.taxRegistrationNumber) { doc.text(`Tax / VAT No: ${customer.taxRegistrationNumber}`, 30, cy); cy += 11; }

            // Right: Invoice Metadata
            const metaX = 350;
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#065F46').text('INVOICE METADATA:', metaX, 96, { align: 'right', width: 215 });
            doc.font('Helvetica').fontSize(8).fillColor('#475569');
            doc.text(`Invoice Date: ${formatDate(invoice.invoiceDate)}`, metaX, 108, { align: 'right', width: 215 });
            doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, metaX, 120, { align: 'right', width: 215 });
            if (invoice.salesOrderId?.orderNumber || invoice.salesOrderIds?.[0]?.orderNumber) {
                const soRef = invoice.salesOrderId?.orderNumber || invoice.salesOrderIds?.[0]?.orderNumber;
                doc.text(`Sales Order Ref: ${soRef}`, metaX, 132, { align: 'right', width: 215 });
            }
            if (invoice.paymentTerms?.type) {
                const termsText = invoice.paymentTerms.type === 'credit'
                    ? `${invoice.paymentTerms.creditDays || 30} Days Credit`
                    : invoice.paymentTerms.type.toUpperCase();
                doc.text(`Payment Terms: ${termsText}`, metaX, 144, { align: 'right', width: 215 });
            }
            doc.text(`Currency: ${currency}`, metaX, 156, { align: 'right', width: 215 });

            // 4. Line Items Table
            const tableStartY = Math.max(cy + 10, 175);
            const items = invoice.items || [];
            const rows = items.map((it, idx) => {
                const lineSub = (it.quantity || 0) * (it.unitPrice || 0);
                const lineDisc = lineSub * ((it.discountPercent || 0) / 100);
                const taxableBase = it.taxable ? (lineSub - lineDisc) : 0;
                const lineTax = taxableBase * ((it.taxRate || 0) / 100);
                const lineTotal = lineSub - lineDisc + lineTax;

                const pName = it.productName || 'Export Agricultural Item';
                const fullDesc = it.subCategory ? `${pName} (${it.subCategory})` : pName;

                return {
                    num: String(idx + 1),
                    desc: fullDesc,
                    qty: `${it.quantity} ${it.unitOfMeasure || ''}`,
                    unitPrice: fmtCurrency(it.unitPrice, currency),
                    disc: `${it.discountPercent || 0}%`,
                    tax: `${it.taxRate || 0}%`,
                    total: fmtCurrency(lineTotal, currency)
                };
            });

            const table = {
                title: '',
                headers: [
                    { label: '#', property: 'num', width: 25 },
                    { label: 'Item & Description', property: 'desc', width: 215 },
                    { label: 'Qty', property: 'qty', width: 65 },
                    { label: 'Unit Price', property: 'unitPrice', width: 75 },
                    { label: 'Disc%', property: 'disc', width: 45 },
                    { label: 'Tax%', property: 'tax', width: 45 },
                    { label: 'Amount', property: 'total', width: 85 }
                ],
                datas: rows,
                options: {
                    padding: 5,
                    columnSpacing: 4,
                    divider: {
                        header: { disabled: false, width: 1.5, opacity: 0.9 },
                        horizontal: { disabled: false, width: 0.5, opacity: 0.2 }
                    }
                }
            };

            doc.x = 30;
            doc.y = tableStartY;

            const drawInvoiceFooterAndFinish = () => {
                let currentY = doc.y + 10;
                if (currentY > 640) {
                    doc.addPage();
                    currentY = 40;
                }

                // Summary / Totals block (Right-aligned)
                const sumX = 360;
                const sumValX = pageWidth - 30;
                doc.font('Helvetica').fontSize(8.5).fillColor('#475569');

                doc.text('Subtotal:', sumX, currentY);
                doc.text(fmtCurrency(invoice.subtotal, currency), 360, currentY, { align: 'right', width: sumValX - sumX });
                currentY += 13;

                if (invoice.totalDiscount > 0) {
                    doc.text('Total Discount:', sumX, currentY);
                    doc.text(`-${fmtCurrency(invoice.totalDiscount, currency)}`, 360, currentY, { align: 'right', width: sumValX - sumX });
                    currentY += 13;
                }

                if (invoice.totalTax > 0) {
                    doc.text('VAT / Taxes:', sumX, currentY);
                    doc.text(fmtCurrency(invoice.totalTax, currency), 360, currentY, { align: 'right', width: sumValX - sumX });
                    currentY += 13;
                }

                if (invoice.shippingCost > 0) {
                    doc.text('Freight / Shipping:', sumX, currentY);
                    doc.text(fmtCurrency(invoice.shippingCost, currency), 360, currentY, { align: 'right', width: sumValX - sumX });
                    currentY += 13;
                }

                // Grand Total Row
                doc.rect(sumX - 8, currentY - 3, sumValX - sumX + 16, 20).fill('#065F46');
                doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF');
                doc.text('GRAND TOTAL:', sumX, currentY + 3);
                doc.text(fmtCurrency(invoice.grandTotal, currency), sumX, currentY + 3, { align: 'right', width: sumValX - sumX });
                currentY += 26;

                const paid = Number(invoice.paidAmount || invoice.amountPaid || 0);
                if (paid > 0) {
                    doc.font('Helvetica').fontSize(8.5).fillColor('#15803D');
                    doc.text('Amount Paid:', sumX, currentY);
                    doc.text(fmtCurrency(paid, currency), 360, currentY, { align: 'right', width: sumValX - sumX });
                    currentY += 13;

                    const balanceDue = Number(invoice.balanceDue !== undefined ? invoice.balanceDue : (invoice.grandTotal - paid));
                    doc.font('Helvetica-Bold').fontSize(9).fillColor(balanceDue > 0 ? '#B91C1C' : '#15803D');
                    doc.text('Balance Due:', sumX, currentY);
                    doc.text(fmtCurrency(balanceDue, currency), 360, currentY, { align: 'right', width: sumValX - sumX });
                    currentY += 18;
                }

                // Notes
                let footerStartY = currentY + 15;
                if (invoice.notes) {
                    doc.font('Helvetica-Bold').fontSize(8).fillColor('#065F46').text('SPECIAL INSTRUCTIONS / TERMS:', 30, footerStartY);
                    doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(invoice.notes, 30, footerStartY + 10, { width: pageWidth - 60 });
                    footerStartY += 28;
                }

                // Signatures & Stamp section
                const sigY = Math.max(footerStartY, doc.page.height - 95);
                doc.font('Helvetica-Bold').fontSize(8).fillColor('#1E293B').text(`For ${brand.name.toUpperCase()}`, 40, sigY + 5);
                doc.strokeColor('#CBD5E1').lineWidth(0.8);
                doc.moveTo(40, sigY + 40).lineTo(190, sigY + 40).stroke();
                doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Authorized Signatory', 40, sigY + 45, { width: 150, align: 'center' });
                doc.font('Helvetica').fontSize(7).fillColor('#94A3B8').text('Export Documentation & Finance', 40, sigY + 55, { width: 150, align: 'center' });

                // Official Corporate Seal Stamp Frame
                doc.rect(pageWidth - 170, sigY, 130, 58).strokeColor('#CBD5E1').lineWidth(0.8).stroke();
                doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8').text('Official Corporate Seal / Stamp', pageWidth - 170, sigY + 24, { width: 130, align: 'center' });

                // Bottom Page Numbering
                const range = doc.bufferedPageRange();
                for (let i = range.start; i < range.start + range.count; i++) {
                    doc.switchToPage(i);
                    doc.page.margins.bottom = 0;
                    doc.fontSize(7).fillColor('#94A3B8').text(
                        `${brand.name}  ·  Tax Registration: ${brand.vatNumber || '—'}  ·  Page ${i + 1} of ${range.count}`,
                        0,
                        doc.page.height - 18,
                        { align: 'center', width: doc.page.width, lineBreak: false }
                    );
                }

                doc.end();
            };

            try {
                const result = doc.table(table, {
                    x: 30,
                    width: 535,
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('#065F46'),
                    prepareRow: () => doc.font('Helvetica').fontSize(7.5).fillColor('#1E293B'),
                });

                if (result instanceof Promise) {
                    result.then(drawInvoiceFooterAndFinish).catch(reject);
                } else {
                    drawInvoiceFooterAndFinish();
                }
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Generate Official Quotation PDF
     */
    async generateQuotationPDF(quote, settings) {
        const brand = resolveCompanySettings(settings);
        const currency = quote.currency || 'LKR';

        return new Promise((resolve, reject) => {
            const doc = new PdfPrinter({ margin: 30, size: 'A4' });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const pageWidth = doc.page.width;

            // 1. Top Decorative Brand Bar
            doc.rect(0, 0, pageWidth, 6).fill('#065F46');

            // 2. Company Logo & Corporate Header
            renderCompanyLogo(doc, brand, 30, 18, 52, 52);

            const headerLeft = 90;
            doc.font('Helvetica-Bold').fontSize(14).fillColor('#065F46').text(brand.name.toUpperCase(), headerLeft, 18);
            doc.font('Helvetica-Oblique').fontSize(8.5).fillColor('#047857').text(brand.tagline, headerLeft, 34);
            doc.font('Helvetica').fontSize(7.5).fillColor('#475569')
                .text(brand.address, headerLeft, 46)
                .text(`Tel: ${brand.phone}  ·  Email: ${brand.email}`, headerLeft, 57)
                .text(`Web: ${brand.website}  ·  ${brand.vatNumber}  ·  BR: ${brand.businessRegNumber}`, headerLeft, 67);

            // Right side: Document Title & Identifiers
            doc.font('Helvetica-Bold').fontSize(20).fillColor('#1E293B').text('QUOTATION', 350, 20, { align: 'right', width: 215 });
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#065F46').text(quote.quoteNumber, 350, 44, { align: 'right', width: 215 });
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#334155').text(`STATUS: ${(quote.status || 'draft').toUpperCase()}`, 350, 58, { align: 'right', width: 215 });

            // Divider Line
            doc.strokeColor('#CBD5E1').lineWidth(1).moveTo(30, 86).lineTo(pageWidth - 30, 86).stroke();

            // 3. Client & Quotation Metadata
            const clientName = quote.customerName || (typeof quote.customerId === 'object' ? quote.customerId?.displayName || quote.customerId?.companyName : null) || 'Valued Client';

            // Left: Client Details
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#065F46').text('QUOTED TO (CLIENT):', 30, 96);
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A').text(clientName, 30, 108);
            doc.font('Helvetica').fontSize(8).fillColor('#475569');
            let cy = 120;
            if (quote.customerAddress) { doc.text(quote.customerAddress, 30, cy, { width: 240 }); cy += 13; }
            if (quote.customerPhone) { doc.text(`Tel: ${quote.customerPhone}`, 30, cy); cy += 11; }
            if (quote.customerEmail) { doc.text(`Email: ${quote.customerEmail}`, 30, cy); cy += 11; }

            // Right: Quotation Details
            const metaX = 350;
            doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#065F46').text('QUOTE METADATA:', metaX, 96, { align: 'right', width: 215 });
            doc.font('Helvetica').fontSize(8).fillColor('#475569');
            doc.text(`Date: ${formatDate(quote.createdAt || new Date())}`, metaX, 108, { align: 'right', width: 215 });
            doc.text(`Expiry Date: ${formatDate(quote.expiryDate)}`, metaX, 120, { align: 'right', width: 215 });
            doc.text(`Incoterms: ${quote.incoterms || 'FOB'}`, metaX, 132, { align: 'right', width: 215 });
            doc.text(`Port of Loading: ${quote.portOfLoading || 'Colombo (CMB)'}`, metaX, 144, { align: 'right', width: 215 });
            doc.text(`Currency: ${currency}`, metaX, 156, { align: 'right', width: 215 });

            // 4. Items Table
            const tableStartY = Math.max(cy + 10, 175);
            const items = quote.items || [];
            const rows = items.map((it, idx) => ({
                num: String(idx + 1),
                desc: it.productName || (it.product && it.product.name) || 'Organic Export Commodity',
                qty: `${it.quantity} ${it.unitOfMeasure || 'Kg'}`,
                unitPrice: fmtCurrency(it.unitPrice, currency),
                total: fmtCurrency(it.subtotal, currency)
            }));

            const table = {
                title: '',
                headers: [
                    { label: '#', property: 'num', width: 25 },
                    { label: 'Product Description', property: 'desc', width: 275 },
                    { label: 'Quantity', property: 'qty', width: 75 },
                    { label: 'Unit Price', property: 'unitPrice', width: 80 },
                    { label: 'Subtotal', property: 'total', width: 100 }
                ],
                datas: rows,
                options: {
                    padding: 5,
                    columnSpacing: 4,
                    divider: {
                        header: { disabled: false, width: 1.5, opacity: 0.9 },
                        horizontal: { disabled: false, width: 0.5, opacity: 0.2 }
                    }
                }
            };

            doc.x = 30;
            doc.y = tableStartY;

            const drawQuotationFooterAndFinish = () => {
                let currentY = doc.y + 10;
                if (currentY > 640) {
                    doc.addPage();
                    currentY = 40;
                }

                // Summary / Totals block (Right-aligned)
                const sumX = 360;
                const sumValX = pageWidth - 30;
                doc.font('Helvetica').fontSize(8.5).fillColor('#475569');

                doc.text('Subtotal:', sumX, currentY);
                doc.text(fmtCurrency(quote.totalAmount, currency), 360, currentY, { align: 'right', width: sumValX - sumX });
                currentY += 13;

                if (quote.discount > 0) {
                    doc.text('Discount:', sumX, currentY);
                    doc.text(`-${fmtCurrency(quote.discount, currency)}`, 360, currentY, { align: 'right', width: sumValX - sumX });
                    currentY += 13;
                }

                if (quote.tax > 0) {
                    doc.text('Tax / VAT:', sumX, currentY);
                    doc.text(fmtCurrency(quote.tax, currency), 360, currentY, { align: 'right', width: sumValX - sumX });
                    currentY += 13;
                }

                // Grand Total Row
                doc.rect(sumX - 8, currentY - 3, sumValX - sumX + 16, 20).fill('#065F46');
                doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF');
                doc.text('GRAND TOTAL:', sumX, currentY + 3);
                doc.text(fmtCurrency(quote.grandTotal, currency), sumX, currentY + 3, { align: 'right', width: sumValX - sumX });
                currentY += 30;

                // Notes / Terms
                if (quote.notes) {
                    doc.font('Helvetica-Bold').fontSize(8).fillColor('#065F46').text('QUOTATION TERMS & INSTRUCTIONS:', 30, currentY);
                    doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(quote.notes, 30, currentY + 10, { width: pageWidth - 60 });
                    currentY += 35;
                }

                // Signatures (Prepared By & Client Acceptance)
                const sigY = Math.max(currentY + 10, doc.page.height - 95);
                doc.strokeColor('#CBD5E1').lineWidth(0.8);

                // Prepared By
                doc.moveTo(40, sigY + 30).lineTo(200, sigY + 30).stroke();
                doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Prepared By / Sales Representative', 40, sigY + 35, { width: 160, align: 'center' });
                doc.font('Helvetica').fontSize(7).fillColor('#94A3B8').text('Authentic Lanka Exports (Pvt) Ltd', 40, sigY + 45, { width: 160, align: 'center' });

                // Client Acceptance
                doc.moveTo(pageWidth - 200, sigY + 30).lineTo(pageWidth - 40, sigY + 30).stroke();
                doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569').text('Client Acceptance Signature & Seal', pageWidth - 200, sigY + 35, { width: 160, align: 'center' });
                doc.font('Helvetica').fontSize(7).fillColor('#94A3B8').text('Date: ________________________', pageWidth - 200, sigY + 45, { width: 160, align: 'center' });

                // Page numbering footer
                const range = doc.bufferedPageRange();
                for (let i = range.start; i < range.start + range.count; i++) {
                    doc.switchToPage(i);
                    doc.page.margins.bottom = 0;
                    doc.fontSize(7).fillColor('#94A3B8').text(
                        `${brand.name}  ·  Quotation ${quote.quoteNumber || '—'}  ·  Page ${i + 1} of ${range.count}`,
                        0,
                        doc.page.height - 18,
                        { align: 'center', width: doc.page.width, lineBreak: false }
                    );
                }

                doc.end();
            };

            try {
                const result = doc.table(table, {
                    x: 30,
                    width: 535,
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('#065F46'),
                    prepareRow: () => doc.font('Helvetica').fontSize(7.5).fillColor('#1E293B'),
                });

                if (result instanceof Promise) {
                    result.then(drawQuotationFooterAndFinish).catch(reject);
                } else {
                    drawQuotationFooterAndFinish();
                }
            } catch (err) {
                reject(err);
            }
        });
    }

    /**
     * Generate Official Purchase Order PDF
     */
    async generatePurchaseOrderPDF(po, settings) {
        const brand = resolveCompanySettings(settings);
        const currency = po.currency || brand.currency || 'LKR';
        const currencySymbol = brand.currencySymbol || (currency === 'USD' ? '$' : 'Rs.');

        return new Promise((resolve, reject) => {
            const doc = new PdfPrinter({ margin: 30, size: 'A4' });
            const buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', reject);

            const pageWidth = doc.page.width;

            // 1. Top Decorative Brand Bar
            doc.rect(0, 0, pageWidth, 6).fill('#065F46');

            // 2. Company Logo & Corporate Header
            renderCompanyLogo(doc, brand, 30, 18, 52, 52);

            const headerLeft = 90;
            doc.font('Helvetica-Bold').fontSize(13.5).fillColor('#065F46').text(brand.name.toUpperCase(), headerLeft, 18);
            doc.font('Helvetica-Oblique').fontSize(8).fillColor('#047857').text(brand.tagline, headerLeft, 33);
            doc.font('Helvetica').fontSize(7.5).fillColor('#475569')
                .text(brand.address, headerLeft, 44)
                .text(`Tel: ${brand.phone}  ·  Email: ${brand.email}`, headerLeft, 55)
                .text(`Web: ${brand.website}  ·  ${brand.vatNumber}  ·  BR: ${brand.businessRegNumber}`, headerLeft, 66);

            // Right side: Document Title & Identifiers
            const docTitle = 'PURCHASE ORDER';
            doc.font('Helvetica-Bold').fontSize(20).fillColor('#0F172A').text(docTitle, 350, 18, { align: 'right', width: 215 });
            doc.font('Helvetica-Bold').fontSize(11).fillColor('#065F46').text(po.poNumber || 'PO-DRAFT', 350, 42, { align: 'right', width: 215 });

            // Status Pill Badge
            const statusKey = (po.status || 'draft').toLowerCase();
            const statusLabel = statusKey.replace('_', ' ').toUpperCase();
            let statusBg = '#64748B'; // slate
            if (['approved', 'fully_received', 'received', 'closed'].includes(statusKey)) {
                statusBg = '#065F46'; // emerald
            } else if (['partially_received', 'sent'].includes(statusKey)) {
                statusBg = '#0284C7'; // sky
            } else if (['pending_approval'].includes(statusKey)) {
                statusBg = '#D97706'; // amber
            } else if (['cancelled'].includes(statusKey)) {
                statusBg = '#DC2626'; // red
            }
            
            const badgeW = 95;
            const badgeH = 15;
            const badgeX = pageWidth - 30 - badgeW;
            const badgeY = 57;
            doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 3).fill(statusBg);
            doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#FFFFFF').text(statusLabel, badgeX, badgeY + 3.5, { align: 'center', width: badgeW });

            // Divider Line
            doc.strokeColor('#E2E8F0').lineWidth(1).moveTo(30, 80).lineTo(pageWidth - 30, 80).stroke();

            // 3. Two Columns: Supplier Details (Left) and PO Specifications (Right)
            const supplier = po.supplierId || {};
            const snapshot = po.supplierSnapshot || {};
            const supplierName = snapshot.name || supplier.displayName || supplier.companyName || po.supplierName || 'Primary Supplier';
            const supplierCode = snapshot.code || supplier.supplierCode || '';
            const supplierTax = snapshot.taxRegistrationNumber || supplier.taxRegistrationNumber || '';
            const contactPerson = snapshot.contactName || supplier.primaryContact?.name || '';
            const supplierPhone = snapshot.phone || supplier.primaryContact?.phone || supplier.phone || '';
            const supplierEmail = supplier.primaryContact?.email || supplier.email || '';

            const billingAddr = po.supplierBillingAddress || supplier.billingAddress || {};
            const supplierAddress = [
                billingAddr.line1,
                billingAddr.line2,
                billingAddr.city,
                billingAddr.country || 'Sri Lanka'
            ].filter(Boolean).join(', ');

            // Left Block: Supplier Card
            const colWidth = 260;
            doc.rect(30, 88, colWidth, 18).fill('#F1F5F9');
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#065F46').text('VENDOR / SUPPLIER DETAILS', 38, 93);

            doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A').text(supplierName, 30, 112);
            doc.font('Helvetica').fontSize(7.5).fillColor('#475569');
            let cy = 125;
            if (supplierCode) { doc.text(`Vendor Code: ${supplierCode}`, 30, cy); cy += 10.5; }
            if (supplierTax) { doc.text(`VAT / Tax Reg: ${supplierTax}`, 30, cy); cy += 10.5; }
            if (contactPerson) { doc.text(`Contact Person: ${contactPerson}`, 30, cy); cy += 10.5; }
            if (supplierPhone) { doc.text(`Tel / Mobile: ${supplierPhone}`, 30, cy); cy += 10.5; }
            if (supplierEmail) { doc.text(`Email: ${supplierEmail}`, 30, cy); cy += 10.5; }
            if (supplierAddress) { doc.text(supplierAddress, 30, cy, { width: colWidth }); cy += 12; }

            // Right Block: PO Specifications
            const rightX = 305;
            doc.rect(rightX, 88, colWidth, 18).fill('#F1F5F9');
            doc.font('Helvetica-Bold').fontSize(8).fillColor('#065F46').text('PO SPECIFICATIONS & DELIVERY', rightX + 8, 93);

            let ry = 112;
            const drawMetaRow = (label, val) => {
                doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#475569').text(label, rightX, ry);
                doc.font('Helvetica').fontSize(7.5).fillColor('#0F172A').text(val || '—', rightX + 85, ry, { width: colWidth - 85 });
                ry += 11;
            };

            drawMetaRow('PO Date:', formatDate(po.createdAt || po.orderDate || new Date()));
            drawMetaRow('Delivery Due:', formatDate(po.expectedDeliveryDate));

            const whName = po.deliverTo?.warehouseName || po.deliverTo?.warehouseId?.name || 'Central Facility';
            drawMetaRow('Ship To Location:', whName);

            const pTerms = po.paymentTerms?.type ? (po.paymentTerms.type === 'credit' ? `${po.paymentTerms.creditDays || 30} Days Credit` : po.paymentTerms.type.toUpperCase()) : 'Cash on Delivery';
            drawMetaRow('Payment Terms:', pTerms);
            drawMetaRow('Order Currency:', `${currency} (${currencySymbol})`);

            // 4. Line Items Table
            const tableStartY = Math.max(cy, ry) + 10;
            const items = po.items || [];
            const rows = items.map((it, idx) => {
                const pName = it.productName || (it.productId && it.productId.name) || 'Raw Material / Supply Item';
                const pCode = it.productCode || (it.productId && it.productId.productCode) || '';
                const desc = pCode ? `${pName} (${pCode})` : pName;
                const qtyNum = Number(it.orderedQuantity ?? it.quantity ?? 0);
                const uom = it.unitOfMeasure || it.uom || 'Kg';
                const rate = Number(it.unitPrice || 0);
                const lineTotal = Number(it.lineTotal ?? (qtyNum * rate));

                return {
                    num: String(idx + 1),
                    desc: desc,
                    qty: `${qtyNum.toLocaleString('en-LK', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ${uom}`,
                    unitPrice: fmtCurrency(rate, currency),
                    total: fmtCurrency(lineTotal, currency)
                };
            });

            const table = {
                title: '',
                headers: [
                    { label: '#', property: 'num', width: 25, align: 'center', headerAlign: 'center' },
                    { label: 'Item & Material Description', property: 'desc', width: 230, align: 'left', headerAlign: 'left' },
                    { label: 'Ordered Qty', property: 'qty', width: 85, align: 'right', headerAlign: 'right' },
                    { label: 'Unit Rate', property: 'unitPrice', width: 95, align: 'right', headerAlign: 'right' },
                    { label: 'Line Total', property: 'total', width: 100, align: 'right', headerAlign: 'right' }
                ],
                datas: rows,
                options: {
                    padding: 5,
                    columnSpacing: 3,
                    divider: {
                        header: { disabled: false, width: 1.5, opacity: 0.9, color: '#065F46' },
                        horizontal: { disabled: false, width: 0.5, opacity: 0.25, color: '#CBD5E1' }
                    }
                }
            };

            doc.x = 30;
            doc.y = tableStartY;

            const drawPoFooterAndFinish = () => {
                let currentY = doc.y + 10;
                if (currentY > 640) {
                    doc.addPage();
                    currentY = 40;
                }

                // Summary / Totals block (Right-aligned)
                const sumBoxWidth = 210;
                const sumX = pageWidth - 30 - sumBoxWidth;
                doc.font('Helvetica').fontSize(8.5).fillColor('#475569');

                doc.text('Subtotal:', sumX, currentY);
                doc.text(fmtCurrency(po.subtotal || po.totalAmount || 0, currency), sumX, currentY, { align: 'right', width: sumBoxWidth });
                currentY += 13;

                if (po.taxAmount > 0 || po.totalTax > 0) {
                    doc.text('VAT / Taxes:', sumX, currentY);
                    doc.text(fmtCurrency(po.taxAmount || po.totalTax, currency), sumX, currentY, { align: 'right', width: sumBoxWidth });
                    currentY += 13;
                }

                // Grand Total Highlighted Box
                doc.rect(sumX - 6, currentY - 3, sumBoxWidth + 6, 20).fill('#065F46');
                doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFFFFF');
                doc.text('TOTAL AMOUNT:', sumX, currentY + 3);
                doc.text(fmtCurrency(po.grandTotal || po.totalAmount || 0, currency), sumX, currentY + 3, { align: 'right', width: sumBoxWidth });
                currentY += 32;

                // Notes / Terms
                if (po.notes || po.termsAndConditions) {
                    doc.font('Helvetica-Bold').fontSize(8).fillColor('#065F46').text('SPECIAL INSTRUCTIONS & TERMS:', 30, currentY);
                    doc.font('Helvetica').fontSize(7.5).fillColor('#475569').text(po.notes || po.termsAndConditions, 30, currentY + 11, { width: 310 });
                }

                // Signatures & Official Stamp
                const sigY = Math.max(currentY + 25, doc.page.height - 95);
                doc.strokeColor('#CBD5E1').lineWidth(0.8);

                // 1. Procurement Officer
                doc.moveTo(35, sigY + 25).lineTo(180, sigY + 25).stroke();
                doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155').text('Procurement Officer', 35, sigY + 30, { width: 145, align: 'center' });
                doc.font('Helvetica').fontSize(7).fillColor('#64748B').text(brand.name, 35, sigY + 40, { width: 145, align: 'center' });

                // 2. Receiving / Warehouse Authority
                doc.moveTo(215, sigY + 25).lineTo(360, sigY + 25).stroke();
                doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155').text('Warehouse / Receiving QA', 215, sigY + 30, { width: 145, align: 'center' });
                doc.font('Helvetica').fontSize(7).fillColor('#64748B').text('Signature & Date', 215, sigY + 40, { width: 145, align: 'center' });

                // 3. Management Approval
                doc.moveTo(395, sigY + 25).lineTo(pageWidth - 35, sigY + 25).stroke();
                doc.font('Helvetica-Bold').fontSize(8).fillColor('#334155').text('Authorized Approval', 395, sigY + 30, { width: 165, align: 'center' });
                doc.font('Helvetica').fontSize(7).fillColor('#64748B').text('Management / Director', 395, sigY + 40, { width: 165, align: 'center' });

                // Multi-page Safe Footers
                const range = doc.bufferedPageRange();
                for (let i = range.start; i < range.start + range.count; i++) {
                    doc.switchToPage(i);
                    doc.page.margins.bottom = 0;
                    doc.strokeColor('#E2E8F0').lineWidth(0.5).moveTo(30, doc.page.height - 24).lineTo(pageWidth - 30, doc.page.height - 24).stroke();
                    doc.fontSize(6.5).fillColor('#94A3B8').text(
                        `${brand.name}  ·  PO No: ${po.poNumber || '—'}  ·  Page ${i + 1} of ${range.count}  ·  Generated on ${new Date().toLocaleDateString('en-LK')}`,
                        30,
                        doc.page.height - 18,
                        { align: 'center', width: pageWidth - 60, lineBreak: false }
                    );
                }

                doc.end();
            };

            try {
                const result = doc.table(table, {
                    x: 30,
                    width: 535,
                    padding: 5,
                    columnSpacing: 3,
                    prepareHeader: () => doc.font('Helvetica-Bold').fontSize(8).fillColor('#065F46'),
                    prepareRow: () => doc.font('Helvetica').fontSize(7.5).fillColor('#1E293B'),
                });

                if (result instanceof Promise) {
                    result.then(drawPoFooterAndFinish).catch(reject);
                } else {
                    drawPoFooterAndFinish();
                }
            } catch (err) {
                reject(err);
            }
        });
    }
}

export const reportService = new ReportService();
export const generateExcelReport = reportService.generateExcel.bind(reportService);
export const generatePDFReport = reportService.generatePDF.bind(reportService);
export const generateInvoicePDF = reportService.generateInvoicePDF.bind(reportService);
export const generateQuotationPDF = reportService.generateQuotationPDF.bind(reportService);
export const generatePurchaseOrderPDF = reportService.generatePurchaseOrderPDF.bind(reportService);
export default reportService;
