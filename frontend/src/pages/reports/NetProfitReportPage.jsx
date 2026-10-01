import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import KpiCard from '../../components/ui/KpiCard';
import Input from '../../components/ui/Input';
import ReportExportButtons from '../../components/ui/ReportExportButtons';
import { useDynamicPnLReport } from '../../features/reports/useReports';
import { useSettings } from '../../features/settings/useSettings';
import { exportToExcel } from '../../utils/dataExport';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function NetProfitReportPage() {
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    const [startDate, setStartDate] = useState(monthStart);
    const [endDate, setEndDate] = useState(today);

    const { data: pnlRes, isLoading, refetch } = useDynamicPnLReport({ startDate, endDate });
    const pnl = pnlRes?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtShort = (n) => new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

    const handleDownloadExcel = () => {
        if (!pnl) return;
        const b = pnl.expenses?.pettyBreakdown || {};
        const totalExp = pnl.expenses?.total || 1;

        const rows = [
            { 'Statement Section': 'Summary P&L', 'Account / Line Item': 'Commercial Invoiced Revenue', 'Amount (LKR)': pnl.revenue, 'Share %': '100.0%' },
            { 'Statement Section': 'Summary P&L', 'Account / Line Item': 'Direct Supplier Bills (COGS)', 'Amount (LKR)': pnl.expenses.bills, 'Share %': `${((pnl.expenses.bills / (pnl.revenue || 1)) * 100).toFixed(1)}%` },
            { 'Statement Section': 'Summary P&L', 'Account / Line Item': 'Gross Profit Margin', 'Amount (LKR)': pnl.revenue - pnl.expenses.bills, 'Share %': `${(((pnl.revenue - pnl.expenses.bills) / (pnl.revenue || 1)) * 100).toFixed(1)}%` },
            { 'Statement Section': 'Summary P&L', 'Account / Line Item': 'Operational Expenses (Petty Cash)', 'Amount (LKR)': pnl.expenses.pettyCash, 'Share %': `${((pnl.expenses.pettyCash / (pnl.revenue || 1)) * 100).toFixed(1)}%` },
            { 'Statement Section': 'Summary P&L', 'Account / Line Item': 'Net Operating Profit', 'Amount (LKR)': pnl.netProfit, 'Share %': `${pnl.marginPercent.toFixed(1)}%` },
            // Breakdowns
            ...Object.entries(b).map(([k, val]) => ({
                'Statement Section': 'Petty Cash Expense Breakdown',
                'Account / Line Item': k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
                'Amount (LKR)': val,
                'Share %': `${((val / totalExp) * 100).toFixed(1)}%`
            }))
        ];

        exportToExcel(rows, `Profit_Loss_Statement_${startDate}_to_${endDate}`, 'P&L Statement');
    };

    const handleDownloadPDF = () => {
        if (!pnl) return;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pageWidth = doc.internal.pageSize.width;
        
        // 1. Header (Deep Emerald Brand Header)
        doc.setFillColor(6, 78, 59); // Emerald 800
        doc.rect(0, 0, pageWidth, 36, 'F');

        doc.setFillColor(16, 185, 129); // Emerald 500 accent line
        doc.rect(0, 36, pageWidth, 2, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text((settings?.companyName || 'EXPORT LANKA (PVT) LTD').toUpperCase(), 14, 15);
        
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(209, 250, 229);
        doc.text(settings?.companyTagline || 'Enterprise Resource Planning & Production Operations System', 14, 22);
        
        const contactInfo = [
            settings?.companyAddress,
            settings?.companyPhone ? `Tel: ${settings.companyPhone}` : '',
            settings?.companyEmail ? `Email: ${settings.companyEmail}` : ''
        ].filter(Boolean).join('  |  ');
        if (contactInfo) {
            doc.setFontSize(7.5);
            doc.text(contactInfo, 14, 28);
        }

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('PROFIT & LOSS STATEMENT', pageWidth - 14, 15, { align: 'right' });
        
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(209, 250, 229);
        doc.text(`Period: ${startDate} to ${endDate}`, pageWidth - 14, 22, { align: 'right' });
        doc.text(`Generated: ${new Date().toLocaleDateString('en-LK')}`, pageWidth - 14, 28, { align: 'right' });

        // 2. Summary Table
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('FINANCIAL STATEMENT CONSOLIDATION', 14, 46);
        
        const summaryColumns = ['Financial Account Line Item', 'Amount (LKR)', 'Margin %'];
        const grossMargin = pnl.revenue - pnl.expenses.bills;
        const summaryRows = [
            ['Total Sales Revenue (Commercial Invoices)', fmtShort(pnl.revenue), '100.0%'],
            ['Direct Cost of Goods Sold (Supplier Bills)', `(${fmtShort(pnl.expenses.bills)})`, `${((pnl.expenses.bills / (pnl.revenue || 1)) * 100).toFixed(1)}%`],
            ['Gross Profit Margin', fmtShort(grossMargin), `${((grossMargin / (pnl.revenue || 1)) * 100).toFixed(1)}%`],
            ['Operating Expenses (Petty Cash Vouchers)', `(${fmtShort(pnl.expenses.pettyCash)})`, `${((pnl.expenses.pettyCash / (pnl.revenue || 1)) * 100).toFixed(1)}%`],
            ['Net Profit Before Tax', fmtShort(pnl.netProfit), `${pnl.marginPercent.toFixed(1)}%`]
        ];

        autoTable(doc, {
            startY: 50,
            head: [summaryColumns],
            body: summaryRows,
            theme: 'grid',
            headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
            columnStyles: {
                0: { fontStyle: 'normal' },
                1: { halign: 'right', fontStyle: 'bold' },
                2: { halign: 'right', fontStyle: 'bold' }
            },
            styles: { fontSize: 8, cellPadding: 2.5 },
            margin: { left: 14, right: 14 }
        });

        // 3. Petty Cash Expense Breakdowns
        const expenseY = doc.lastAutoTable.finalY + 8;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.text('OPERATIONAL EXPENSE DISBURSEMENTS (PETTY CASH)', 14, expenseY);

        const breakdownColumns = ['Expense Category', 'Disbursed (LKR)', '% Share of Expenses'];
        const totalExp = pnl.expenses.total || 1;
        const b = pnl.expenses.pettyBreakdown || {};
        
        const breakdownRows = Object.entries(b).map(([k, val]) => [
            k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            fmtShort(val),
            `${((val / totalExp) * 100).toFixed(1)}%`
        ]);

        autoTable(doc, {
            startY: expenseY + 3,
            head: [breakdownColumns],
            body: breakdownRows,
            theme: 'striped',
            headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            columnStyles: {
                1: { halign: 'right' },
                2: { halign: 'right' }
            },
            styles: { fontSize: 7.5, cellPadding: 2 },
            margin: { left: 14, right: 14 }
        });

        // 4. Signatures
        const bottomY = doc.internal.pageSize.height - 25;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, bottomY, 64, bottomY);
        doc.line(pageWidth - 64, bottomY, pageWidth - 14, bottomY);
        
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text('Prepared By / Financial Accountant', 39, bottomY + 4, { align: 'center' });
        doc.text('Approved By / Managing Director', pageWidth - 39, bottomY + 4, { align: 'center' });

        doc.save(`Profit_Loss_Statement_${startDate}_to_${endDate}.pdf`);
    };

    const applyPreset = (type) => {
        const todayStr = new Date().toISOString().slice(0, 10);
        if (type === 'thisMonth') {
            const startStr = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
            setStartDate(startStr);
            setEndDate(todayStr);
        } else if (type === 'last30') {
            const d = new Date();
            d.setDate(d.getDate() - 30);
            setStartDate(d.toISOString().slice(0, 10));
            setEndDate(todayStr);
        } else if (type === 'thisYear') {
            const startStr = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
            setStartDate(startStr);
            setEndDate(todayStr);
        } else if (type === 'allTime') {
            setStartDate('2020-01-01');
            setEndDate(todayStr);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader 
                title="Profit & Loss (P&L) Statement" 
                description="Consolidated statement computed dynamically from sales invoices, supplier bills, and petty cash operational expenses"
                actions={
                    <ReportExportButtons
                        onExportExcel={handleDownloadExcel}
                        onExportPDF={handleDownloadPDF}
                        onRefresh={() => refetch()}
                        disabled={!pnl}
                        loading={isLoading}
                        pdfLabel="PDF Statement"
                    />
                }
            />

            {/* Filter Toolbar */}
            <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-40">
                        <Input label="From Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="w-40">
                        <Input label="To Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <div className="flex flex-wrap gap-1.5 ml-auto">
                        <Button variant="outline" size="sm" onClick={() => applyPreset('thisMonth')}>This Month</Button>
                        <Button variant="outline" size="sm" onClick={() => applyPreset('last30')}>Last 30d</Button>
                        <Button variant="outline" size="sm" onClick={() => applyPreset('thisYear')}>This Year</Button>
                        <Button variant="outline" size="sm" onClick={() => applyPreset('allTime')}>All Time</Button>
                    </div>
                </div>
            </Card>

            {isLoading ? (
                <div className="py-20 text-center bg-white rounded-xl border border-slate-200">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
                    <p className="text-slate-500 font-medium text-sm">Auditing ledger transactions and computing Net Profit...</p>
                </div>
            ) : !pnl ? (
                <div className="py-20 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                    <p className="font-semibold text-slate-700">No transactions recorded in the selected period</p>
                    <p className="text-xs text-slate-400 mt-1">Try expanding the date filter range</p>
                </div>
            ) : (
                <>
                    {/* KPI Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <KpiCard label="Revenue (Sales)" value={fmt(pnl.revenue)} subtext="Total gross invoices" />
                        <KpiCard label="COGS (Supplier Bills)" value={fmt(pnl.expenses.bills)} subtext="Direct material cost" />
                        <KpiCard label="Petty Cash Overheads" value={fmt(pnl.expenses.pettyCash)} subtext="Approved operating costs" />
                        <KpiCard 
                            label="Net Profit" 
                            value={fmt(pnl.netProfit)} 
                            subtext={pnl.netProfit >= 0 ? "Operating surplus" : "Operating deficit"}
                            trend={pnl.netProfit >= 0 ? 1 : -1} 
                        />
                        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col justify-between">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Profit Margin</span>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-2xl font-black font-mono ${pnl.netProfit >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                    {pnl.marginPercent.toFixed(1)}%
                                </span>
                                {pnl.netProfit >= 0 ? (
                                    <TrendingUp className="text-emerald-500" size={20} />
                                ) : (
                                    <TrendingDown className="text-rose-500" size={20} />
                                )}
                            </div>
                            <span className="text-[11px] text-slate-400 mt-1 font-medium">Net Profit ÷ Revenue</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* P&L Statement Structure */}
                        <Card className="lg:col-span-2 p-6 bg-white rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-3 mb-4">Consolidated Profit & Loss Schedule</h3>
                            <div className="space-y-3.5 text-sm">
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="font-semibold text-slate-800">1. Total Revenue from Operations</span>
                                    <span className="font-mono text-slate-900 font-bold">{fmt(pnl.revenue)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100 pl-4 text-slate-600">
                                    <span>Less: Cost of Sales (Approved Supplier Bills)</span>
                                    <span className="font-mono text-rose-600 font-medium">({fmt(pnl.expenses.bills)})</span>
                                </div>
                                <div className="flex justify-between items-center py-2.5 border-b border-slate-200 bg-slate-50/80 px-3 rounded-lg">
                                    <span className="font-bold text-slate-900">Gross Margin Profit</span>
                                    <span className="font-mono text-slate-900 font-black">{fmt(pnl.revenue - pnl.expenses.bills)}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100 pl-4 text-slate-600">
                                    <span>Less: Operating Expenses (Petty Cash Overheads)</span>
                                    <span className="font-mono text-rose-600 font-medium">({fmt(pnl.expenses.pettyCash)})</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-t-2 border-slate-900 bg-emerald-50/50 px-3 rounded-lg mt-4">
                                    <span className="text-base font-black text-slate-900">Net Profit / (Loss) Before Tax</span>
                                    <span className={`font-mono text-xl font-black ${pnl.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                                        {fmt(pnl.netProfit)}
                                    </span>
                                </div>
                            </div>
                        </Card>

                        {/* Petty Cash Expense Categories */}
                        <Card className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b pb-3 mb-4">Operating Expense Distribution</h3>
                            <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1 text-sm">
                                {Object.entries(pnl.expenses.pettyBreakdown).map(([key, value]) => {
                                    const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                                    const percent = pnl.expenses.total > 0 ? (value / pnl.expenses.total) * 100 : 0;
                                    return (
                                        <div key={key} className="space-y-1 p-2 rounded-lg bg-slate-50/60 border border-slate-100">
                                            <div className="flex justify-between text-slate-700 text-xs font-semibold">
                                                <span>{label}</span>
                                                <span className="font-mono font-bold text-slate-900">{fmt(value)}</span>
                                            </div>
                                            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-emerald-600 h-full" style={{ width: `${percent}%` }} />
                                            </div>
                                            <div className="text-[10px] text-slate-400 text-right font-medium">{percent.toFixed(1)}% of total expenses</div>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}
