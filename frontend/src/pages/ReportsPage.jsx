import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, Package, Factory, RotateCcw, DollarSign, Users, ArrowRight, XCircle, Download, FileSpreadsheet, Calendar, Sparkles, CheckCircle2
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import api from '../api/axios';
import toast from 'react-hot-toast';

const reportGroups = [
    {
        category: 'Sales',
        barColor: 'bg-blue-600',
        badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
        cardBorder: 'hover:border-blue-400 hover:shadow-lg hover:shadow-blue-500/10 hover:bg-blue-50/20',
        iconBg: 'bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white',
        hoverText: 'group-hover:text-blue-700',
        reports: [
            { title: 'Sales Summary', description: 'Overall sales metrics for a period', path: '/reports/sales', icon: TrendingUp },
            { title: 'Sales by Product', description: 'Top and bottom performing products', path: '/reports/sales-by-product', icon: Package },
            { title: 'Sales by Customer', description: 'Customer revenue and outstanding balances', path: '/reports/sales-by-customer', icon: Users },
            { title: 'AI Predictions & Forecasting', description: 'Regression sales trajectories, depletion dates & burn rates', path: '/reports/predictions', icon: TrendingUp },
        ],
    },
    {
        category: 'Inventory',
        barColor: 'bg-emerald-600',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        cardBorder: 'hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-500/10 hover:bg-emerald-50/20',
        iconBg: 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white',
        hoverText: 'group-hover:text-emerald-700',
        reports: [
            { title: 'Stock Valuation', description: 'Total inventory value per product and warehouse', path: '/reports/stock-valuation', icon: DollarSign },
            { title: 'Slow & Fast Movers', description: 'ABC analysis + identify dead stock', path: '/reports/slow-fast-movers', icon: TrendingUp },
            { title: 'Low Stock Items', description: 'Products at or below reorder level', path: '/reports/inventory/low-stock', icon: Package },
            { title: 'Stock Movement Log', description: 'Audit trail of all stock movements', path: '/reports/stock-movement', icon: Factory },
            { title: 'Daily Stock Status', description: 'Opening, received, issued, closing stock status ledger', path: '/reports/daily-stock-status', icon: Factory },
        ],
    },
    {
        category: 'Production',
        barColor: 'bg-purple-600',
        badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
        cardBorder: 'hover:border-purple-400 hover:shadow-lg hover:shadow-purple-500/10 hover:bg-purple-50/20',
        iconBg: 'bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white',
        hoverText: 'group-hover:text-purple-700',
        reports: [
            { title: 'Production Summary', description: 'Output, yield, cost variance, wastage', path: '/reports/production', icon: Factory },
            { title: 'Yield & Resource Forecaster', description: 'Predict output, wastage, firewood & power using history', path: '/reports/yield-forecaster', icon: TrendingUp },
        ],
    },
    {
        category: 'Returns & Damages',
        barColor: 'bg-amber-600',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        cardBorder: 'hover:border-amber-400 hover:shadow-lg hover:shadow-amber-500/10 hover:bg-amber-50/20',
        iconBg: 'bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white',
        hoverText: 'group-hover:text-amber-700',
        reports: [
            { title: 'Returns & Damages', description: 'Return reasons, damage sources, value lost', path: '/reports/returns-damages', icon: RotateCcw },
        ],
    },
    {
        category: 'Financial',
        barColor: 'bg-teal-600',
        badgeClass: 'bg-teal-100 text-teal-800 border-teal-200',
        cardBorder: 'hover:border-teal-400 hover:shadow-lg hover:shadow-teal-500/10 hover:bg-teal-50/20',
        iconBg: 'bg-teal-100 text-teal-700 group-hover:bg-teal-600 group-hover:text-white',
        hoverText: 'group-hover:text-teal-700',
        reports: [
            { title: 'Financial Snapshot', description: 'Revenue vs expenses, A/R + A/P aging, cash flow', path: '/reports/financial', icon: DollarSign },
            { title: 'Net Profit (P&L) Report', description: 'Dynamic Profit & Loss report matching invoices, bills, and petty cash', path: '/reports/net-profit', icon: TrendingUp },
            { title: 'Daily P&L Master', description: 'Direct CRUD for Daily Profit & Loss records', path: '/reports/daily-pnl', icon: TrendingUp },
            { title: 'Variance & Sales Comparator', description: 'Monthly targets vs actual and growth comparator', path: '/reports/variance-comparator', icon: TrendingUp },
            { title: 'Master Enterprise Report (.xlsx)', description: 'Export 6-Sheet Executive Audit Workbook (BE Analysis, Sales, Inventory, Production & P&L)', isMasterExporter: true, icon: FileSpreadsheet },
            { title: 'Monthly Performance Excel Exporter', description: 'Download complete Monthly Performance report (Sales, Production, Petty Cash, P&L)', isExporter: true, icon: Download },
        ],
    },
    {
        category: 'Human Resources',
        barColor: 'bg-rose-600',
        badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
        cardBorder: 'hover:border-rose-400 hover:shadow-lg hover:shadow-rose-500/10 hover:bg-rose-50/20',
        iconBg: 'bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white',
        hoverText: 'group-hover:text-rose-700',
        reports: [
            { title: 'HR Reports', description: 'Headcount, attendance, leave patterns, payroll summary', path: '/reports/hr', icon: Users },
            { title: 'Shift Operations Logs', description: 'Attendance, yield, and logistics split by shifts', path: '/reports/shift-wise', icon: Users },
        ],
    },
];

export default function ReportsPage() {
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [exporting, setExporting] = useState(false);

    // Master Enterprise Report State
    const [isMasterModalOpen, setIsMasterModalOpen] = useState(false);
    const [startDate, setStartDate] = useState('2026-09-30');
    const [endDate, setEndDate] = useState('2026-10-31');
    const [masterExporting, setMasterExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const response = await api.get(
                `/export/monthly-performance`,
                {
                    params: { month: selectedMonth },
                    responseType: 'blob'
                }
            );
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Monthly-Performance-Report-${selectedMonth}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('✅ Excel report downloaded successfully');
            setIsModalOpen(false);
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('❌ Failed to export performance report');
        } finally {
            setExporting(false);
        }
    };

    const handleMasterExport = async () => {
        setMasterExporting(true);
        try {
            const response = await api.get(
                `/export/master-report`,
                {
                    params: { startDate, endDate },
                    responseType: 'blob'
                }
            );
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Export-Lanka-Master-Report-${startDate}_to_${endDate}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => window.URL.revokeObjectURL(url), 1000);
            toast.success('✅ Master Enterprise Report (.xlsx) downloaded successfully');
            setIsMasterModalOpen(false);
        } catch (error) {
            console.error('Master export failed:', error);
            if (error.response?.data instanceof Blob) {
                try {
                    const errText = await error.response.data.text();
                    const errJson = JSON.parse(errText);
                    toast.error(`❌ ${errJson.message || 'Export failed'}`);
                } catch {
                    toast.error('❌ Failed to export Master Enterprise Report');
                }
            } else {
                toast.error('❌ Failed to export Master Enterprise Report');
            }
        } finally {
            setMasterExporting(false);
        }
    };

    const setPresetDates = (preset) => {
        const today = new Date();
        if (preset === 'audit') {
            setStartDate('2026-09-30');
            setEndDate('2026-10-31');
        } else if (preset === 'oct2026') {
            setStartDate('2026-10-01');
            setEndDate('2026-10-31');
        } else if (preset === 'thisMonth') {
            const y = today.getFullYear();
            const m = today.getMonth();
            const first = new Date(y, m, 1).toISOString().slice(0, 10);
            const last = new Date(y, m + 1, 0).toISOString().slice(0, 10);
            setStartDate(first);
            setEndDate(last);
        } else if (preset === 'last30Days') {
            const past = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10);
            setStartDate(past);
            setEndDate(today.toISOString().slice(0, 10));
        }
    };

    return (
        <div>
            <PageHeader title="Reports & Analytics" description="Business intelligence for your operations" />

            {/* Top Enterprise Master Report Hero Banner */}
            <div className="mt-6 bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 sm:p-7 shadow-xl border border-emerald-700/30 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="max-w-xl space-y-2.5">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-semibold">
                            <Sparkles size={13} className="text-emerald-400" />
                            <span>Executive Consolidated Audit</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
                            <FileSpreadsheet className="text-emerald-400" size={26} />
                            Master Enterprise Report Generator
                        </h2>
                        <p className="text-sm text-slate-300 leading-relaxed">
                            Generate the complete 6-Sheet executive workbook: <b>BE Expense Analysis</b> (DHY & Farm), <b>Executive Overview</b>, <b>Sales Invoices</b>, <b>Inventory Valuation</b>, <b>Production & Yield</b>, and <b>Daily P&L Ledger</b>.
                        </p>

                        <div className="flex flex-wrap gap-2 pt-1 text-xs">
                            <span className="bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-md text-emerald-200">✓ BE Expense Analysis</span>
                            <span className="bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-md text-emerald-200">✓ Executive Overview</span>
                            <span className="bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-md text-emerald-200">✓ Sales Invoices</span>
                            <span className="bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-md text-emerald-200">✓ Inventory Valuation</span>
                            <span className="bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-md text-emerald-200">✓ Production & Yield</span>
                            <span className="bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-md text-emerald-200">✓ Daily P&L</span>
                        </div>
                    </div>

                    <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 sm:p-5 rounded-2xl flex flex-col gap-3 min-w-[300px] lg:max-w-sm">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-200 pb-1 border-b border-white/10">
                            <span className="flex items-center gap-1.5"><Calendar size={14} className="text-emerald-400" /> Select Date Range</span>
                            <span className="text-[11px] text-emerald-300">Custom Period</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                                <label className="text-[11px] text-slate-300 block mb-1 font-medium">Start Date</label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/20 rounded-lg text-white font-medium focus:ring-2 focus:ring-emerald-400 outline-none text-xs"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] text-slate-300 block mb-1 font-medium">End Date</label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/20 rounded-lg text-white font-medium focus:ring-2 focus:ring-emerald-400 outline-none text-xs"
                                />
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                            <button
                                type="button"
                                onClick={() => setPresetDates('audit')}
                                className="px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded text-[11px] text-emerald-300 font-medium transition-colors"
                            >
                                Sep-Oct Audit
                            </button>
                            <button
                                type="button"
                                onClick={() => setPresetDates('oct2026')}
                                className="px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded text-[11px] text-slate-200 font-medium transition-colors"
                            >
                                Oct 2026
                            </button>
                            <button
                                type="button"
                                onClick={() => setPresetDates('thisMonth')}
                                className="px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded text-[11px] text-slate-200 font-medium transition-colors"
                            >
                                This Month
                            </button>
                            <button
                                type="button"
                                onClick={() => setPresetDates('last30Days')}
                                className="px-2 py-0.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded text-[11px] text-slate-200 font-medium transition-colors"
                            >
                                30 Days
                            </button>
                        </div>

                        <button
                            onClick={handleMasterExport}
                            disabled={masterExporting}
                            className="w-full mt-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.99] text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-950/40 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                            <Download size={17} className={masterExporting ? 'animate-bounce' : ''} />
                            {masterExporting ? 'Generating 6 Sheets...' : 'Download Master Report (.xlsx)'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="space-y-8 mt-8">
                {reportGroups.map((group) => (
                    <div key={group.category} className="space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span className={`w-2 h-5 rounded-full ${group.barColor}`} />
                            <h3 className="text-sm font-bold tracking-tight text-slate-800">{group.category}</h3>
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${group.badgeClass}`}>
                                {group.reports.length} Reports
                            </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {group.reports.map((r) => (
                                <Card
                                    key={r.title}
                                    className={`p-4 rounded-xl border border-slate-200 transition-all duration-200 cursor-pointer group hover:-translate-y-0.5 ${group.cardBorder}`}
                                    onClick={() => {
                                        if (r.isMasterExporter) {
                                            setIsMasterModalOpen(true);
                                        } else if (r.isExporter) {
                                            setIsModalOpen(true);
                                        } else {
                                            navigate(r.path);
                                        }
                                    }}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${group.iconBg}`}>
                                            <r.icon size={19} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1">
                                                <h4 className={`font-semibold text-sm text-slate-800 transition-colors ${group.hoverText}`}>
                                                    {r.title}
                                                </h4>
                                                <ArrowRight size={13} className="text-slate-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                                            </div>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                                {r.description}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Master Enterprise Report Dedicated Modal */}
            {isMasterModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
                        <div className="flex items-center justify-between p-5 bg-gradient-to-r from-emerald-800 to-teal-800 text-white">
                            <div className="flex items-center gap-2.5">
                                <FileSpreadsheet className="text-emerald-300" size={22} />
                                <div>
                                    <h3 className="text-base font-bold">Enterprise Master Report (.xlsx)</h3>
                                    <p className="text-xs text-emerald-200">Consolidated 6-Sheet Executive Audit</p>
                                </div>
                            </div>
                            <button onClick={() => setIsMasterModalOpen(false)} className="p-1.5 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-2">Select Audit Period</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <span className="text-[11px] text-gray-500 block mb-1">Start Date</span>
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[11px] text-gray-500 block mb-1">End Date</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2 mt-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setPresetDates('audit')}
                                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold"
                                    >
                                        Sep-Oct Audit Range
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPresetDates('oct2026')}
                                        className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold"
                                    >
                                        Oct 2026
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPresetDates('thisMonth')}
                                        className="px-2.5 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold"
                                    >
                                        This Month
                                    </button>
                                </div>
                            </div>

                            <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl space-y-1.5">
                                <span className="text-xs font-bold text-slate-700 block">Sheets Included in Download:</span>
                                <div className="grid grid-cols-2 gap-1.5 text-xs text-slate-600">
                                    <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" /> 1. BE Expense Analysis</span>
                                    <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" /> 2. Executive Overview</span>
                                    <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" /> 3. Sales Invoices</span>
                                    <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" /> 4. Inventory Valuation</span>
                                    <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" /> 5. Production & Yield</span>
                                    <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-600 flex-shrink-0" /> 6. Daily P&L Ledger</span>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsMasterModalOpen(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleMasterExport}
                                    disabled={masterExporting}
                                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Download size={16} />
                                    {masterExporting ? 'Generating 6 Sheets...' : 'Generate & Download (.xlsx)'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Monthly Performance Exporter Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-lg font-bold text-gray-900">📊 Export Performance Report</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <XCircle size={20} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-600 block mb-1">Select Month *</label>
                                <input
                                    type="month"
                                    value={selectedMonth}
                                    onChange={(e) => setSelectedMonth(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
                                <button onClick={handleExport} disabled={exporting}
                                    className="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 disabled:opacity-50 flex items-center gap-1.5">
                                    <Download size={16} /> {exporting ? 'Exporting...' : 'Export to Excel'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}