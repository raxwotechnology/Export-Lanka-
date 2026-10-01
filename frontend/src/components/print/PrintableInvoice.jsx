import { forwardRef } from 'react';
import { COMPANY_BRANDING } from '../../assets/branding';

const fmt = (n) => new Intl.NumberFormat('en-LK', {
    style: 'currency', currency: 'LKR', minimumFractionDigits: 2,
}).format(n || 0);

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-LK', {
    year: 'numeric', month: 'short', day: 'numeric',
}) : '—';

/**
 * Printable invoice — renders inside print preview modal and native browser print dialog.
 * Designed for standard A4 portrait at high fidelity.
 *
 * companyInfo: { name, address, taxNumber, phone, email, logo }
 * invoice: full populated invoice doc
 * payments: array of payments allocated to this invoice
 */
const PrintableInvoice = forwardRef(({ companyInfo, invoice, payments = [] }, ref) => {
    if (!invoice) return null;

    const brand = { ...COMPANY_BRANDING, ...(companyInfo || {}) };
    const customer = invoice.customerSnapshot || {};
    const billingAddr = invoice.billingAddress || {};

    const totalPaid = payments.reduce((sum, p) => {
        const alloc = p.allocations?.find((a) =>
            (a.documentId?._id?.toString() || a.documentId?.toString()) === invoice._id.toString()
        );
        return sum + (alloc?.amount || 0);
    }, 0);

    const balanceDue = (invoice.grandTotal || 0) - totalPaid;
    const logoSrc = brand.logoUrl || '/company_logo.jpg';

    return (
        <div ref={ref} className="print-container bg-white text-gray-900 p-8 sm:p-10 max-w-[820px] mx-auto font-sans leading-normal">
            {/* Top Brand Accent Bar */}
            <div className="h-1.5 bg-emerald-800 rounded-t mb-6"></div>

            {/* Header */}
            <div className="flex justify-between items-start mb-6 pb-5 border-b border-gray-200">
                <div className="flex items-start gap-4">
                    <img 
                        src={logoSrc} 
                        alt="Authentic Lanka Exports Logo" 
                        className="w-16 h-16 object-contain rounded-lg border border-gray-100 p-0.5 flex-shrink-0" 
                    />
                    <div>
                        <h1 className="text-xl sm:text-2xl font-black text-emerald-950 tracking-wider">
                            {brand.name}
                        </h1>
                        <p className="text-xs font-semibold text-emerald-700 italic mt-0.5">
                            {brand.tagline}
                        </p>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                            {brand.address}
                        </p>
                        <p className="text-xs text-gray-500">
                            Tel: {brand.phone} &nbsp;·&nbsp; Email: {brand.email}
                        </p>
                        <p className="text-[11px] text-gray-500 mt-0.5">
                            Web: {brand.website} &nbsp;·&nbsp; {brand.vatNumber} &nbsp;·&nbsp; BR: {brand.businessRegNumber}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">
                        {invoice.invoiceType === 'proforma' ? 'PROFORMA INVOICE' : 'TAX INVOICE'}
                    </h2>
                    <p className="text-sm font-mono font-bold text-emerald-800 mt-1">{invoice.invoiceNumber}</p>
                    <span className="inline-block mt-1 px-2.5 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-100 text-slate-700 border border-slate-200">
                        {invoice.status || 'Issued'}
                    </span>
                    <p className="text-[11px] text-gray-500 mt-1">
                        Status: <span className="font-semibold uppercase text-emerald-800">{invoice.paymentStatus?.replace('_', ' ') || 'Unpaid'}</span>
                    </p>
                </div>
            </div>

            {/* Consignee / Bill To & Export Metadata */}
            <div className="grid grid-cols-2 gap-6 mb-6 text-xs">
                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-emerald-800 mb-1.5 tracking-wider">Billed To (Consignee / Importer)</p>
                    <p className="font-bold text-sm text-gray-900">{customer.name || 'Valued Client'}</p>
                    {customer.code && <p className="text-gray-500 font-mono text-[11px]">Customer ID: {customer.code}</p>}
                    {billingAddr.line1 && <p className="text-gray-600 mt-1">{billingAddr.line1}</p>}
                    {billingAddr.line2 && <p className="text-gray-600">{billingAddr.line2}</p>}
                    {(billingAddr.city || billingAddr.state) && (
                        <p className="text-gray-600">{billingAddr.city}{billingAddr.state ? `, ${billingAddr.state}` : ''}{billingAddr.country ? `, ${billingAddr.country}` : ''}</p>
                    )}
                    {customer.taxRegistrationNumber && (
                        <p className="text-gray-700 font-semibold mt-1">VAT/Tax Reg: {customer.taxRegistrationNumber}</p>
                    )}
                    {customer.phone && <p className="text-gray-600">Tel: {customer.phone}</p>}
                    {customer.email && <p className="text-gray-600">Email: {customer.email}</p>}
                </div>

                <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-emerald-800 mb-1.5 tracking-wider">Invoice & Shipping Information</p>
                    <table className="w-full text-xs">
                        <tbody>
                            <tr><td className="text-gray-500 py-0.5">Invoice Date:</td><td className="text-right font-medium">{formatDate(invoice.invoiceDate)}</td></tr>
                            <tr><td className="text-gray-500 py-0.5">Due Date:</td><td className="text-right font-bold text-gray-900">{formatDate(invoice.dueDate)}</td></tr>
                            {(invoice.salesOrderId?.orderNumber || invoice.salesOrderIds?.[0]?.orderNumber) && (
                                <tr>
                                    <td className="text-gray-500 py-0.5">Order Ref:</td>
                                    <td className="text-right font-mono font-medium">{invoice.salesOrderId?.orderNumber || invoice.salesOrderIds?.[0]?.orderNumber}</td>
                                </tr>
                            )}
                            {invoice.paymentTerms?.type && (
                                <tr>
                                    <td className="text-gray-500 py-0.5">Payment Terms:</td>
                                    <td className="text-right font-medium">
                                        {invoice.paymentTerms.type === 'credit'
                                            ? `${invoice.paymentTerms.creditDays || 30} Days Credit`
                                            : invoice.paymentTerms.type.toUpperCase()}
                                    </td>
                                </tr>
                            )}
                            <tr>
                                <td className="text-gray-500 py-0.5">Country of Origin:</td>
                                <td className="text-right font-semibold text-gray-800">Sri Lanka</td>
                            </tr>
                            <tr>
                                <td className="text-gray-500 py-0.5">Currency:</td>
                                <td className="text-right font-bold text-emerald-800">{invoice.currency || 'LKR'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Line items Table */}
            <table className="w-full mb-6 text-xs">
                <thead className="bg-slate-100 text-gray-700 font-bold border-y border-gray-300">
                    <tr>
                        <th className="text-left p-2.5 w-8">#</th>
                        <th className="text-left p-2.5">Description of Goods</th>
                        <th className="text-right p-2.5 w-20">Quantity</th>
                        <th className="text-right p-2.5 w-24">Unit Rate</th>
                        <th className="text-right p-2.5 w-16">Disc%</th>
                        <th className="text-right p-2.5 w-16">Tax%</th>
                        <th className="text-right p-2.5 w-28">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                    {(invoice.items || []).map((item, idx) => {
                        const lineSub = (item.quantity || 0) * (item.unitPrice || 0);
                        const lineDisc = lineSub * ((item.discountPercent || 0) / 100);
                        const taxableBase = item.taxable ? (lineSub - lineDisc) : 0;
                        const lineTax = taxableBase * ((item.taxRate || 0) / 100);
                        const lineTotal = lineSub - lineDisc + lineTax;

                        return (
                            <tr key={idx}>
                                <td className="p-2.5 text-gray-400 font-mono">{idx + 1}</td>
                                <td className="p-2.5">
                                    <div className="font-semibold text-gray-900">
                                        {item.productName}
                                        {item.subCategory && <span className="ml-1.5 text-emerald-800 font-bold">({item.subCategory})</span>}
                                    </div>
                                    {item.productCode && <div className="text-[10px] text-gray-400 font-mono">{item.productCode}</div>}
                                </td>
                                <td className="p-2.5 text-right font-medium">{item.quantity} {item.unitOfMeasure || ''}</td>
                                <td className="p-2.5 text-right font-mono">{fmt(item.unitPrice)}</td>
                                <td className="p-2.5 text-right font-mono text-gray-600">{item.discountPercent || 0}%</td>
                                <td className="p-2.5 text-right font-mono text-gray-600">{item.taxRate || 0}%</td>
                                <td className="p-2.5 text-right font-mono font-bold text-gray-900">{fmt(lineTotal)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Financial Summary */}
            <div className="flex justify-end mb-6">
                <table className="text-xs w-72">
                        <tbody>
                            <tr>
                                <td className="text-gray-500 py-1">Subtotal:</td>
                                <td className="text-right py-1 font-mono font-medium">{fmt(invoice.subtotal)}</td>
                            </tr>
                            {invoice.totalDiscount > 0 && (
                                <tr>
                                    <td className="text-gray-500 py-1">Discount:</td>
                                    <td className="text-right py-1 font-mono text-red-600">-{fmt(invoice.totalDiscount)}</td>
                                </tr>
                            )}
                            <tr>
                                <td className="text-gray-500 py-1">Tax (VAT):</td>
                                <td className="text-right py-1 font-mono font-medium">{fmt(invoice.totalTax)}</td>
                            </tr>
                            {invoice.shippingCost > 0 && (
                                <tr>
                                    <td className="text-gray-500 py-1">Freight / Shipping:</td>
                                    <td className="text-right py-1 font-mono font-medium">{fmt(invoice.shippingCost)}</td>
                                </tr>
                            )}
                            <tr className="border-t-2 border-emerald-900">
                                <td className="font-black py-2 text-sm text-gray-900">Grand Total:</td>
                                <td className="text-right font-black py-2 text-sm font-mono text-emerald-900">{fmt(invoice.grandTotal)}</td>
                            </tr>
                            {totalPaid > 0 && (
                                <>
                                    <tr>
                                        <td className="text-gray-500 py-1">Amount Paid:</td>
                                        <td className="text-right py-1 font-mono text-emerald-700 font-semibold">{fmt(totalPaid)}</td>
                                    </tr>
                                    <tr className="border-t border-gray-300">
                                        <td className="font-bold py-1.5 text-xs">Balance Due:</td>
                                        <td className={`text-right font-bold py-1.5 font-mono text-xs ${balanceDue > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                                            {fmt(balanceDue)}
                                        </td>
                                    </tr>
                                </>
                            )}
                        </tbody>
                    </table>
                </div>

            {/* Notes if any */}
            {invoice.notes && (
                <div className="mb-6 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs">
                    <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Special Terms & Instructions</p>
                    <p className="text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
                </div>
            )}

            {/* Official Signatures & Seal Block */}
            <div className="flex justify-between items-end mt-10 pt-6 border-t border-gray-300 text-xs">
                <div>
                    <p className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                        For and on behalf of {brand.name}
                    </p>
                    <div className="border-b border-gray-400 w-56 h-12 mb-1"></div>
                    <span className="font-bold text-gray-700 block">Authorized Signatory</span>
                    <span className="text-[10px] text-gray-400">Export Documentation & Finance</span>
                </div>

                <div className="w-40 h-24 border border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-center p-2">
                    <span className="text-[9px] text-gray-400 uppercase font-bold tracking-wider">Official Corporate Seal / Stamp</span>
                </div>
            </div>

            <div className="text-center text-[10px] text-gray-400 pt-6 mt-6 border-t border-gray-200">
                Authentic Lanka Exports (Pvt) Ltd &nbsp;·&nbsp; Premium Organic & Agricultural Exporters &nbsp;·&nbsp; {brand.vatNumber} &nbsp;·&nbsp; www.authenticlanka.com
            </div>
        </div>
    );
});

PrintableInvoice.displayName = 'PrintableInvoice';
export default PrintableInvoice;