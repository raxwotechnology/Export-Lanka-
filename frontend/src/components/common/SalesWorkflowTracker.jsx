import React from 'react';
import { Link } from 'react-router-dom';
import { Check, UserCheck, FileText, ShoppingCart, Factory, Receipt, DollarSign } from 'lucide-react';

export default function SalesWorkflowTracker({
    currentStage = 'sales_order', // 'lead' | 'quotation' | 'sales_order' | 'production' | 'invoice' | 'payment'
    inquiry = null,
    quotation = null,
    salesOrder = null,
    productionOrder = null,
    invoice = null,
    paymentStatus = null, // 'unpaid' | 'partially_paid' | 'paid'
    className = ''
}) {
    // Normalise object or string representations
    const inqId = inquiry?._id || (typeof inquiry === 'string' ? inquiry : null);
    const inqCode = inquiry?.inquiryCode || (inqId ? 'Inquiry' : null);

    const quoId = quotation?._id || (typeof quotation === 'string' ? quotation : null);
    const quoCode = quotation?.quoteNumber || quotation?.quotationCode || (quoId ? 'Quote' : null);

    const soId = salesOrder?._id || (typeof salesOrder === 'string' ? salesOrder : null);
    const soCode = salesOrder?.orderNumber || (soId ? 'Order' : null);

    const poId = productionOrder?._id || (typeof productionOrder === 'string' ? productionOrder : null);
    const poCode = productionOrder?.productionNumber || (poId ? 'Factory PO' : null);

    const invId = invoice?._id || (typeof invoice === 'string' ? invoice : null);
    const invCode = invoice?.invoiceNumber || (invId ? 'Invoice' : null);

    const resolvedPayStatus = paymentStatus || invoice?.paymentStatus || (invoice?.balanceDue === 0 && invId ? 'paid' : 'unpaid');

    const hasInquiry = !!inqId;
    const hasQuotation = !!quoId;

    const stages = [
        {
            id: 'lead',
            label: 'Sales Lead',
            icon: UserCheck,
            docNumber: inqCode,
            link: inqId ? '/crm/inquiries' : null,
            isComplete: hasInquiry,
            isSkipped: !hasInquiry && (hasQuotation || soId),
            statusLabel: inquiry?.status ? inquiry.status.replace(/_/g, ' ') : (hasInquiry ? 'Created' : 'Direct Order'),
        },
        {
            id: 'quotation',
            label: 'Quotation',
            icon: FileText,
            docNumber: quoCode,
            link: quoId ? '/crm/quotations' : null,
            isComplete: hasQuotation,
            isSkipped: !hasQuotation && soId,
            statusLabel: quotation?.status ? quotation.status.replace(/_/g, ' ') : (hasQuotation ? 'Created' : 'Direct Order'),
        },
        {
            id: 'sales_order',
            label: 'Sales Order',
            icon: ShoppingCart,
            docNumber: soCode,
            link: soId ? `/sales-orders/${soId}` : null,
            isComplete: !!(poId || invId || ['production', 'invoice', 'payment'].includes(currentStage)),
            isSkipped: false,
            statusLabel: salesOrder?.status ? salesOrder.status.replace(/_/g, ' ') : null,
        },
        {
            id: 'production',
            label: 'Factory PO / Production',
            icon: Factory,
            docNumber: poCode,
            link: poId ? `/production-orders/${poId}` : null,
            isComplete: !!(productionOrder?.status === 'completed' || invId || ['invoice', 'payment'].includes(currentStage)),
            isSkipped: false,
            statusLabel: productionOrder?.status ? productionOrder.status.replace(/_/g, ' ') : (poId ? 'In Production' : null),
        },
        {
            id: 'invoice',
            label: 'Invoice',
            icon: Receipt,
            docNumber: invCode,
            link: invId ? `/invoices/${invId}` : null,
            isComplete: !!(resolvedPayStatus === 'paid' || currentStage === 'payment'),
            isSkipped: false,
            statusLabel: invoice?.status ? invoice.status.replace(/_/g, ' ') : null,
        },
        {
            id: 'payment',
            label: 'Payment',
            icon: DollarSign,
            docNumber: resolvedPayStatus ? resolvedPayStatus.replace(/_/g, ' ').toUpperCase() : 'UNPAID',
            link: invId ? `/invoices/${invId}` : null,
            isComplete: resolvedPayStatus === 'paid',
            isSkipped: false,
            statusLabel: resolvedPayStatus === 'paid' ? 'Fully Paid' : (resolvedPayStatus === 'partially_paid' ? 'Partial' : 'Pending'),
        }
    ];

    const currentStageIndex = stages.findIndex(s => s.id === currentStage);

    return (
        <div className={`bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-600 animate-pulse" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                        Linked Sales Workflow Lifecycle
                    </h3>
                </div>
                <span className="text-[11px] font-semibold text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                    Stage {currentStageIndex + 1} of {stages.length}
                </span>
            </div>

            {/* Horizontal step tracker */}
            <div className="overflow-x-auto pb-2">
                <div className="flex items-center min-w-[680px] justify-between relative">
                    {stages.map((stage, idx) => {
                        const isCurrent = stage.id === currentStage;
                        const isSkipped = stage.isSkipped;
                        const isPassed = !isSkipped && (stage.isComplete || (idx < currentStageIndex && !stages[idx].isSkipped));
                        const Icon = stage.icon;

                        return (
                            <React.Fragment key={stage.id}>
                                {/* Step Item */}
                                <div className="flex flex-col items-center text-center group min-w-[100px] z-10">
                                    {/* Icon circle */}
                                    <div
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 shadow-sm ${
                                            isPassed
                                                ? 'bg-emerald-500 text-white shadow-emerald-200'
                                                : isCurrent
                                                ? 'bg-primary-600 text-white ring-4 ring-primary-100 shadow-primary-200'
                                                : isSkipped
                                                ? 'bg-gray-50 text-gray-400 border border-dashed border-gray-300'
                                                : 'bg-gray-100 text-gray-400 border border-gray-200'
                                        }`}
                                    >
                                        {isPassed && !isCurrent ? (
                                            <Check size={18} strokeWidth={2.5} />
                                        ) : (
                                            <Icon size={18} />
                                        )}
                                    </div>

                                    {/* Label */}
                                    <span
                                        className={`text-xs mt-2 font-bold ${
                                            isCurrent
                                                ? 'text-primary-700'
                                                : isPassed
                                                ? 'text-gray-900'
                                                : 'text-gray-400'
                                        }`}
                                    >
                                        {stage.label}
                                    </span>

                                    {/* Document Number Link / Badge */}
                                    <div className="mt-1">
                                        {stage.link && stage.docNumber ? (
                                            <Link
                                                to={stage.link}
                                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md transition-colors inline-block ${
                                                    isCurrent
                                                        ? 'bg-primary-50 text-primary-700 border border-primary-200 hover:bg-primary-100'
                                                        : isPassed
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                                                        : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
                                                }`}
                                                title={`View ${stage.label}`}
                                            >
                                                {stage.docNumber}
                                            </Link>
                                        ) : stage.docNumber ? (
                                            <span
                                                className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${
                                                    stage.id === 'payment' && stage.isComplete
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : 'bg-gray-50 text-gray-500 border-gray-200'
                                                }`}
                                            >
                                                {stage.docNumber}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-gray-400 italic">Not created</span>
                                        )}
                                    </div>

                                    {/* Small status subtitle */}
                                    {stage.statusLabel && (
                                        <span className="text-[10px] text-gray-400 mt-0.5 capitalize">
                                            {stage.statusLabel}
                                        </span>
                                    )}
                                </div>

                                {/* Connecting line */}
                                {idx < stages.length - 1 && (
                                    <div className="flex-1 h-0.5 mx-1 relative top-[-18px] bg-gray-200">
                                        <div
                                            className={`h-full transition-all duration-300 ${
                                                !stages[idx].isSkipped && (idx < currentStageIndex || (stage.isComplete && stages[idx + 1].isComplete))
                                                    ? 'bg-emerald-500'
                                                    : idx === currentStageIndex
                                                    ? 'bg-primary-400'
                                                    : 'bg-gray-200'
                                            }`}
                                        />
                                    </div>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
