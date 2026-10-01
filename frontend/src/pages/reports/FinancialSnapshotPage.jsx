import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import KpiCard from '../../components/ui/KpiCard';
import ReportExportButtons from '../../components/ui/ReportExportButtons';
import { useFinancialSnapshot } from '../../features/reports/useReports';
import { useSettings } from '../../features/settings/useSettings';
import { exportToExcel, exportToPDF } from '../../utils/dataExport';

export default function FinancialSnapshotPage() {
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const now = new Date();
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const { data, isLoading, refetch } = useFinancialSnapshot({ startDate, endDate });
    const f = data?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const handleExportExcel = () => {
        if (!f) return;
        const rows = [
            { 'Category': 'Executive Metric', 'Line Item': 'Commercial Revenue (Invoiced)', 'Amount (LKR)': f.revenue },
            { 'Category': 'Executive Metric', 'Line Item': 'Operating Expenses (Billed)', 'Amount (LKR)': f.expenses },
            { 'Category': 'Executive Metric', 'Line Item': 'Gross Operational Profit', 'Amount (LKR)': f.grossProfit },
            { 'Category': 'Executive Metric', 'Line Item': 'Customer Receipts Collected', 'Amount (LKR)': f.collected },
            { 'Category': 'Executive Metric', 'Line Item': 'Supplier Disbursements Paid', 'Amount (LKR)': f.paid },
            { 'Category': 'Executive Metric', 'Line Item': 'Net Working Cash Flow', 'Amount (LKR)': f.netCashFlow },
            // AR Aging
            { 'Category': 'A/R Receivables Aging', 'Line Item': 'Current (0-30 days)', 'Amount (LKR)': f.accountsReceivable?.current || 0 },
            { 'Category': 'A/R Receivables Aging', 'Line Item': 'Past Due 31-60 days', 'Amount (LKR)': f.accountsReceivable?.b31_60 || 0 },
            { 'Category': 'A/R Receivables Aging', 'Line Item': 'Past Due 61-90 days', 'Amount (LKR)': f.accountsReceivable?.b61_90 || 0 },
            { 'Category': 'A/R Receivables Aging', 'Line Item': 'Default Risk 91+ days', 'Amount (LKR)': f.accountsReceivable?.b91_plus || 0 },
            { 'Category': 'A/R Receivables Aging', 'Line Item': 'Total A/R Balance', 'Amount (LKR)': f.accountsReceivable?.total || 0 },
            // AP Aging
            { 'Category': 'A/P Payables Aging', 'Line Item': 'Current (0-30 days)', 'Amount (LKR)': f.accountsPayable?.current || 0 },
            { 'Category': 'A/P Payables Aging', 'Line Item': 'Past Due 31-60 days', 'Amount (LKR)': f.accountsPayable?.b31_60 || 0 },
            { 'Category': 'A/P Payables Aging', 'Line Item': 'Past Due 61-90 days', 'Amount (LKR)': f.accountsPayable?.b61_90 || 0 },
            { 'Category': 'A/P Payables Aging', 'Line Item': 'Critical 91+ days', 'Amount (LKR)': f.accountsPayable?.b91_plus || 0 },
            { 'Category': 'A/P Payables Aging', 'Line Item': 'Total A/P Balance', 'Amount (LKR)': f.accountsPayable?.total || 0 },
        ];
        exportToExcel(rows, `Financial_Snapshot_${startDate}_to_${endDate}`, 'Financial Snapshot');
    };

    const handleExportPDF = () => {
        if (!f) return;
        const rows = [
            { cat: 'Profitability', item: 'Total Invoiced Revenue', val: fmt(f.revenue) },
            { cat: 'Profitability', item: 'Direct Billed Expenses', val: fmt(f.expenses) },
            { cat: 'Profitability', item: 'Gross Profit', val: fmt(f.grossProfit) },
            { cat: 'Cash Flow', item: 'Realized Collections', val: fmt(f.collected) },
            { cat: 'Cash Flow', item: 'Paid Outflows', val: fmt(f.paid) },
            { cat: 'Cash Flow', item: 'Net Operational Cash Flow', val: fmt(f.netCashFlow) },
            { cat: 'Receivables (A/R)', item: 'Current (0-30d)', val: fmt(f.accountsReceivable?.current) },
            { cat: 'Receivables (A/R)', item: 'Overdue 31-60d', val: fmt(f.accountsReceivable?.b31_60) },
            { cat: 'Receivables (A/R)', item: 'Overdue 61-90d', val: fmt(f.accountsReceivable?.b61_90) },
            { cat: 'Receivables (A/R)', item: 'Overdue 91+d (High Risk)', val: fmt(f.accountsReceivable?.b91_plus) },
            { cat: 'Receivables (A/R)', item: 'Total Outstanding Claims', val: fmt(f.accountsReceivable?.total) },
            { cat: 'Payables (A/P)', item: 'Current (0-30d)', val: fmt(f.accountsPayable?.current) },
            { cat: 'Payables (A/P)', item: 'Pending 31-60d', val: fmt(f.accountsPayable?.b31_60) },
            { cat: 'Payables (A/P)', item: 'Pending 61-90d', val: fmt(f.accountsPayable?.b61_90) },
            { cat: 'Payables (A/P)', item: 'Overdue 91+d', val: fmt(f.accountsPayable?.b91_plus) },
            { cat: 'Payables (A/P)', item: 'Total Supplier Obligations', val: fmt(f.accountsPayable?.total) },
        ];

        const columns = [
            { header: 'Ledger Category', dataKey: 'cat' },
            { header: 'Financial Account / Metric', dataKey: 'item' },
            { header: 'Amount (LKR)', dataKey: 'val', isNumeric: true },
        ];

        const summaryCards = [
            { label: 'Invoiced Revenue', value: fmt(f.revenue) },
            { label: 'Billed Expenses', value: fmt(f.expenses) },
            { label: 'Gross Profit', value: fmt(f.grossProfit) },
            { label: 'Net Cash Flow', value: fmt(f.netCashFlow) },
        ];

        exportToPDF('Executive Financial Snapshot Report', columns, rows, `Financial_Snapshot_${startDate}_to_${endDate}`, {
            period: `${startDate} to ${endDate}`,
            companyName: settings?.companyName,
            companyTagline: settings?.companyTagline,
            companyAddress: settings?.companyAddress,
            companyPhone: settings?.companyPhone,
            companyEmail: settings?.companyEmail,
            summaryCards
        });
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
                title="Financial Snapshot"
                description="High-level operational revenue, cash realization, A/R customer debt aging, and A/P supplier commitments"
                actions={
                    <ReportExportButtons
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        onRefresh={() => refetch()}
                        disabled={!f}
                        loading={isLoading}
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

            {isLoading || !f ? (
                <div className="py-20 text-center bg-white rounded-xl border border-slate-200">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
                    <p className="text-slate-500 font-medium text-sm">Computing financial aggregates...</p>
                </div>
            ) : (
                <>
                    {/* Executive KPI Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard
                            label="Revenue (Invoiced)"
                            value={fmt(f.revenue)}
                            subtext="Total claimable turnover"
                        />
                        <KpiCard
                            label="Expenses (Billed)"
                            value={fmt(f.expenses)}
                            subtext="Approved supplier bills"
                        />
                        <KpiCard
                            label="Gross Operational Profit"
                            value={fmt(f.grossProfit)}
                            subtext={f.revenue > 0 ? `${((f.grossProfit / f.revenue) * 100).toFixed(1)}% gross margin` : '—'}
                            trend={f.grossProfit >= 0 ? 1 : -1}
                        />
                        <KpiCard
                            label="Net Operational Cash Flow"
                            value={fmt(f.netCashFlow)}
                            subtext={`${fmt(f.collected)} in / ${fmt(f.paid)} out`}
                            trend={f.netCashFlow >= 0 ? 1 : -1}
                        />
                    </div>

                    {/* Aging Schedules Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* A/R Aging */}
                        <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Accounts Receivable (A/R Aging)</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Customer payments due and default risk</p>
                                </div>
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">Assets</span>
                            </div>
                            <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-100">
                                    <span className="font-medium text-emerald-900">Current (0 - 30 days)</span>
                                    <span className="font-bold text-emerald-900">{fmt(f.accountsReceivable.current)}</span>
                                </div>
                                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-slate-700">Past Due (31 - 60 days)</span>
                                    <span className="font-semibold text-slate-900">{fmt(f.accountsReceivable.b31_60)}</span>
                                </div>
                                <div className="flex justify-between p-2.5 bg-amber-50/60 rounded-lg border border-amber-100">
                                    <span className="text-amber-900 font-medium">Overdue (61 - 90 days)</span>
                                    <span className="font-bold text-amber-900">{fmt(f.accountsReceivable.b61_90)}</span>
                                </div>
                                <div className="flex justify-between p-2.5 bg-rose-50/70 rounded-lg border border-rose-100">
                                    <span className="text-rose-900 font-bold">Default Risk (91+ days)</span>
                                    <span className="font-black text-rose-700">{fmt(f.accountsReceivable.b91_plus)}</span>
                                </div>
                                <div className="flex justify-between pt-3 border-t border-slate-200 font-bold text-base">
                                    <span className="text-slate-900">Total Receivables Balance</span>
                                    <span className="text-slate-900">{fmt(f.accountsReceivable.total)}</span>
                                </div>
                            </div>
                        </Card>

                        {/* A/P Aging */}
                        <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Accounts Payable (A/P Aging)</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">Supplier liabilities and pending payments</p>
                                </div>
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">Liabilities</span>
                            </div>
                            <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-slate-700">Current (0 - 30 days)</span>
                                    <span className="font-semibold text-slate-900">{fmt(f.accountsPayable.current)}</span>
                                </div>
                                <div className="flex justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-slate-700">Upcoming (31 - 60 days)</span>
                                    <span className="font-semibold text-slate-900">{fmt(f.accountsPayable.b31_60)}</span>
                                </div>
                                <div className="flex justify-between p-2.5 bg-amber-50/60 rounded-lg border border-amber-100">
                                    <span className="text-amber-900 font-medium">Pending Due (61 - 90 days)</span>
                                    <span className="font-bold text-amber-900">{fmt(f.accountsPayable.b61_90)}</span>
                                </div>
                                <div className="flex justify-between p-2.5 bg-rose-50/70 rounded-lg border border-rose-100">
                                    <span className="text-rose-900 font-bold">Past Due Critical (91+ days)</span>
                                    <span className="font-black text-rose-700">{fmt(f.accountsPayable.b91_plus)}</span>
                                </div>
                                <div className="flex justify-between pt-3 border-t border-slate-200 font-bold text-base">
                                    <span className="text-slate-900">Total Supplier Commitments</span>
                                    <span className="text-slate-900">{fmt(f.accountsPayable.total)}</span>
                                </div>
                            </div>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}