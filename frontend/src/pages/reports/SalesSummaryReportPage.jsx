import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, LineChart, Line, Legend
} from 'recharts';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import KpiCard from '../../components/ui/KpiCard';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Badge from '../../components/ui/Badge';
import ReportExportButtons from '../../components/ui/ReportExportButtons';
import { useSalesSummary, useSalesTrend } from '../../features/reports/useReports';
import { useSettings } from '../../features/settings/useSettings';
import { exportToExcel, exportToPDF } from '../../utils/dataExport';

export default function SalesSummaryReportPage() {
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);

    const [startDate, setStartDate] = useState(monthStart);
    const [endDate, setEndDate] = useState(today);
    const [groupBy, setGroupBy] = useState('day');

    const { data: summaryData, isLoading, refetch } = useSalesSummary({ startDate, endDate });
    const { data: trendData } = useSalesTrend({ startDate, endDate, groupBy });

    const s = summaryData?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtNum = (n) => new Intl.NumberFormat('en-LK', { maximumFractionDigits: 0 }).format(n || 0);
    const fmtShort = (n) => n >= 1000000 ? `${(n / 1000000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(0)}k` : n;

    const applyPreset = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        setStartDate(start.toISOString().slice(0, 10));
        setEndDate(end.toISOString().slice(0, 10));
    };

    const handleExportExcel = () => {
        const trends = trendData?.data || [];
        const columns = [
            { header: 'Period / Date', dataKey: 'label' },
            { header: 'Orders Count', dataKey: 'count', format: (v) => Number(v) || 0 },
            { header: 'Total Value (LKR)', dataKey: 'total', format: (v) => Number(v) || 0 },
        ];
        exportToExcel(trends, `Sales_Summary_${startDate}_to_${endDate}`, 'Sales Summary', columns);
    };

    const handleExportPDF = () => {
        const trends = trendData?.data || [];
        const columns = [
            { header: 'Period / Date', dataKey: 'label' },
            { header: 'Order Count', dataKey: 'count', isNumeric: true },
            { header: 'Sales Value (LKR)', dataKey: 'total', isNumeric: true, format: (v) => fmt(v) },
        ];

        const summaryCards = s ? [
            { label: 'Total Orders', value: String(s.orders?.totalOrders || 0) },
            { label: 'Gross Value', value: fmt(s.orders?.totalValue) },
            { label: 'Invoiced Value', value: fmt(s.invoices?.total) },
            { label: 'Collected', value: fmt(s.payments?.collected) },
            { label: 'Collection Eff.', value: `${s.collectionEfficiency || 0}%` },
        ] : [];

        exportToPDF('Sales Summary Report', columns, trends, `Sales_Summary_${startDate}_to_${endDate}`, {
            period: `${startDate} to ${endDate}`,
            companyName: settings?.companyName,
            companyTagline: settings?.companyTagline,
            companyAddress: settings?.companyAddress,
            companyPhone: settings?.companyPhone,
            companyEmail: settings?.companyEmail,
            summaryCards
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Sales Summary Report"
                description="Executive overview of order volumes, billing trends, and collections"
                actions={
                    <ReportExportButtons
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        onRefresh={() => refetch()}
                        disabled={!s}
                        loading={isLoading}
                    />
                }
            />

            {/* Filters Toolbar */}
            <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-40">
                        <Input label="From Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="w-40">
                        <Input label="To Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <div className="w-36">
                        <Select
                            label="Group By"
                            options={[{ value: 'day', label: 'Daily' }, { value: 'week', label: 'Weekly' }, { value: 'month', label: 'Monthly' }]}
                            value={groupBy}
                            onChange={(e) => setGroupBy(e.target.value)}
                        />
                    </div>
                    <div className="flex flex-wrap gap-1.5 ml-auto">
                        <Button variant="outline" size="sm" onClick={() => applyPreset(7)}>Last 7d</Button>
                        <Button variant="outline" size="sm" onClick={() => applyPreset(30)}>Last 30d</Button>
                        <Button variant="outline" size="sm" onClick={() => applyPreset(90)}>Last 90d</Button>
                    </div>
                </div>
            </Card>

            {isLoading || !s ? (
                <div className="py-20 text-center bg-white rounded-xl border border-slate-200">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
                    <p className="text-slate-500 font-medium text-sm">Aggregating sales analytics...</p>
                </div>
            ) : (
                <>
                    {/* Executive KPI Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard
                            label="Total Orders"
                            value={fmtNum(s.orders.totalOrders)}
                            subtext={`Avg Order: ${fmt(s.orders.avgOrderValue)}`}
                        />
                        <KpiCard
                            label="Gross Order Value"
                            value={fmt(s.orders.totalValue)}
                            subtext="Cumulative book value"
                        />
                        <KpiCard
                            label="Total Invoiced"
                            value={fmt(s.invoices.total)}
                            subtext={`${s.invoices.count} total invoices`}
                        />
                        <KpiCard
                            label="Collected Revenue"
                            value={fmt(s.payments.collected)}
                            subtext={`${s.collectionEfficiency}% collection efficiency`}
                            trend={s.collectionEfficiency >= 70 ? 1 : -1}
                        />
                    </div>

                    {/* Chart and Status Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="col-span-2 p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Revenue & Order Volume Trend</h3>
                                <span className="text-xs text-slate-400">Grouped by {groupBy}</span>
                            </div>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={trendData?.data || []}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="#64748b" />
                                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={fmtShort} stroke="#64748b" />
                                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} stroke="#64748b" />
                                    <Tooltip
                                        formatter={(v, name) => name === 'Revenue (LKR)' ? fmt(v) : v}
                                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', color: '#fff', border: 'none' }}
                                    />
                                    <Legend />
                                    <Line yAxisId="left" type="monotone" dataKey="total" name="Revenue (LKR)"
                                        stroke="#059669" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
                                    <Line yAxisId="right" type="monotone" dataKey="count" name="Order Volume"
                                        stroke="#3b82f6" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Orders By Status</h3>
                            <div className="space-y-3">
                                {s.statusBreakdown && s.statusBreakdown.length > 0 ? (
                                    s.statusBreakdown.map((st) => (
                                        <div key={st._id} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                            <Badge variant="outline" className="capitalize">{st._id || 'Standard'}</Badge>
                                            <div className="text-right">
                                                <p className="font-semibold text-slate-900 text-sm">{st.count} orders</p>
                                                <p className="text-xs text-slate-500 font-mono">{fmt(st.value)}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-slate-400 py-6 text-center">No status breakdown available</p>
                                )}
                            </div>
                        </Card>
                    </div>

                    {/* Financial Flow Section */}
                    <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Cash Realization Flow</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4">
                                <p className="text-xs font-semibold text-blue-700 uppercase">Total Invoiced</p>
                                <p className="text-xl font-bold text-blue-900 mt-1">{fmt(s.invoices.total)}</p>
                                <p className="text-xs text-blue-600 mt-0.5">Commercial claims issued</p>
                            </div>
                            <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-4">
                                <p className="text-xs font-semibold text-emerald-700 uppercase">Realized & Collected</p>
                                <p className="text-xl font-bold text-emerald-900 mt-1">{fmt(s.payments.collected)}</p>
                                <p className="text-xs text-emerald-600 mt-0.5">Funds deposited in bank/cash</p>
                            </div>
                            <div className="bg-amber-50/60 border border-amber-100 rounded-xl p-4">
                                <p className="text-xs font-semibold text-amber-700 uppercase">Outstanding Receivables</p>
                                <p className="text-xl font-bold text-amber-900 mt-1">{fmt(s.invoices.balance)}</p>
                                <p className="text-xs text-amber-600 mt-0.5">Pending collection from buyers</p>
                            </div>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}