import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import KpiCard from '../../components/ui/KpiCard';
import Badge from '../../components/ui/Badge';
import ReportExportButtons from '../../components/ui/ReportExportButtons';
import { useReturnsSummary, useDamagesReport } from '../../features/reports/useReports';
import { useSettings } from '../../features/settings/useSettings';
import { exportToExcel, exportToPDF } from '../../utils/dataExport';

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#8b5cf6'];

export default function ReturnsReportPage() {
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const now = new Date();
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const { data: returnsData, isLoading: isReturnsLoading, refetch: refetchReturns } = useReturnsSummary({ startDate, endDate });
    const { data: damagesData, isLoading: isDamagesLoading, refetch: refetchDamages } = useDamagesReport({ startDate, endDate });

    const r = returnsData?.data;
    const d = damagesData?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const handleRefreshAll = () => {
        refetchReturns();
        refetchDamages();
    };

    const handleExportExcel = () => {
        const rows = [];
        // Returns by customer
        if (r?.byCustomer?.length) {
            r.byCustomer.forEach(c => {
                rows.push({
                    'Category': 'Customer Return',
                    'Reference / Name': c.customerName,
                    'Code': c.customerCode,
                    'Count / Incidents': c.returnCount,
                    'Financial Impact (LKR)': c.totalValue
                });
            });
        }
        // Damages by source
        if (d?.bySource?.length) {
            d.bySource.forEach(s => {
                rows.push({
                    'Category': 'Damage Incident',
                    'Reference / Name': s._id?.replace(/_/g, ' ') || 'General',
                    'Code': '—',
                    'Count / Incidents': s.count,
                    'Financial Impact (LKR)': s.value
                });
            });
        }

        if (!rows.length) return;
        exportToExcel(rows, `Returns_and_Damages_Audit_${startDate}_to_${endDate}`, 'Returns & Damages');
    };

    const handleExportPDF = () => {
        const rows = [];
        if (r?.byCustomer?.length) {
            r.byCustomer.forEach(c => {
                rows.push({
                    type: 'Customer Return',
                    entity: c.customerName,
                    code: c.customerCode,
                    incidents: c.returnCount,
                    val: fmt(c.totalValue)
                });
            });
        }
        if (d?.bySource?.length) {
            d.bySource.forEach(s => {
                rows.push({
                    type: 'Damage by Source',
                    entity: s._id?.replace(/_/g, ' ') || 'General',
                    code: '—',
                    incidents: s.count,
                    val: fmt(s.value)
                });
            });
        }

        if (!rows.length) return;

        const columns = [
            { header: 'Audit Stream', dataKey: 'type' },
            { header: 'Customer / Source Origin', dataKey: 'entity' },
            { header: 'Code', dataKey: 'code' },
            { header: 'Incidents Count', dataKey: 'incidents', isNumeric: true },
            { header: 'Financial Value Lost', dataKey: 'val', isNumeric: true },
        ];

        const summaryCards = [
            { label: 'Returns Recorded', value: String(r?.summary?.totalReturns || 0) },
            { label: 'Returns Valuation', value: fmt(r?.summary?.totalValue) },
            { label: 'Damage Incidents', value: String(d?.summary?.count || 0) },
            { label: 'Damages Value', value: fmt(d?.summary?.totalValue) },
        ];

        exportToPDF('Returns & Damages Audit Report', columns, rows, `Returns_and_Damages_Audit_${startDate}_to_${endDate}`, {
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
                title="Returns & Damages Reports"
                description="Quality control audit of client return reasons, transit damages, and financial write-offs"
                actions={
                    <ReportExportButtons
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        onRefresh={handleRefreshAll}
                        disabled={!r && !d}
                        loading={isReturnsLoading || isDamagesLoading}
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
                </div>
            </Card>

            {r && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <KpiCard label="Customer Returns" value={r.summary.totalReturns || 0} subtext="Total processed returns" trend={-1} />
                        <KpiCard label="Return Inventory Value" value={fmt(r.summary.totalValue)} subtext="Merchandise value" trend={-1} />
                        <KpiCard label="Total Refunded Amount" value={fmt(r.summary.totalRefunded)} subtext="Disbursed credit / cash" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Return Reasons Breakdown</h3>
                            {r.byReason.length === 0 ? (
                                <p className="text-center text-slate-400 py-12 text-sm">No recorded return reasons in this period</p>
                            ) : (
                                <ResponsiveContainer width="100%" height={240}>
                                    <PieChart>
                                        <Pie
                                            data={r.byReason}
                                            dataKey="count"
                                            nameKey="_id"
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            label={(e) => e._id?.replace(/_/g, ' ')}
                                        >
                                            {r.byReason.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}
                        </Card>

                        <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Highest Return Customers</h3>
                            {r.byCustomer.length === 0 ? (
                                <p className="text-center text-slate-400 py-12 text-sm">No return records found</p>
                            ) : (
                                <div className="space-y-3">
                                    {r.byCustomer.slice(0, 8).map((c) => (
                                        <div key={c._id} className="flex justify-between items-center p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                            <div>
                                                <p className="font-semibold text-slate-900 text-sm">{c.customerName}</p>
                                                <p className="text-xs text-slate-400 font-mono">{c.customerCode}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-rose-700">{c.returnCount} returns</p>
                                                <p className="text-xs text-slate-500 font-mono">{fmt(c.totalValue)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Card>
                    </div>
                </>
            )}

            {d && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <KpiCard label="Internal Damage Incidents" value={d.summary.count || 0} subtext="Logged damage reports" trend={-1} />
                        <KpiCard label="Financial Value Written Off" value={fmt(d.summary.totalValue)} subtext="Direct scrap loss" trend={-1} />
                    </div>

                    <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Damages Breakdown by Operational Source</h3>
                        </div>
                        <Table
                            columns={[
                                { key: '_id', label: 'Damage Source / Department', render: (r) => <Badge variant="outline" className="capitalize">{r._id?.replace(/_/g, ' ')}</Badge> },
                                { key: 'count', label: 'Incidents Count', render: (r) => <span className="font-semibold text-slate-900">{r.count}</span> },
                                { key: 'value', label: 'Financial Write-off (LKR)', render: (r) => <span className="font-bold text-rose-600">{fmt(r.value)}</span> },
                            ]}
                            data={d.bySource}
                        />
                    </Card>
                </>
            )}
        </div>
    );
}