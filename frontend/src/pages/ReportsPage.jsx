import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp, Package, Factory, RotateCcw, DollarSign, Users, ArrowRight, XCircle, Download
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

    return (
        <div>
            <PageHeader title="Reports & Analytics" description="Business intelligence for your operations" />

            <div className="space-y-8 mt-6">
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
                                        if (r.isExporter) {
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

            {/* Exporter Modal */}
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