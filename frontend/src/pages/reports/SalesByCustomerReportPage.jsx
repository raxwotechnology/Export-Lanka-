import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import KpiCard from '../../components/ui/KpiCard';
import ReportExportButtons from '../../components/ui/ReportExportButtons';
import { useSalesByCustomer } from '../../features/reports/useReports';
import { useSettings } from '../../features/settings/useSettings';
import { exportToExcel, exportToPDF } from '../../utils/dataExport';

export default function SalesByCustomerReportPage() {
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const now = new Date();
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const { data, isLoading, refetch } = useSalesByCustomer({ startDate, endDate, limit: 100 });
    const customers = data?.data || [];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const totals = customers.reduce(
        (s, c) => ({
            orders: s.orders + (c.orderCount || 0),
            ordered: s.ordered + (c.totalOrdered || 0),
            invoiced: s.invoiced + (c.invoiced || 0),
            paid: s.paid + (c.paid || 0),
            outstanding: s.outstanding + (c.outstanding || 0),
        }),
        { orders: 0, ordered: 0, invoiced: 0, paid: 0, outstanding: 0 }
    );

    const handleExportExcel = () => {
        if (!customers.length) return;
        const columns = [
            { header: 'Rank', dataKey: (_c, idx) => idx + 1 },
            { header: 'Customer Code', dataKey: 'customerCode' },
            { header: 'Customer Name', dataKey: 'customerName' },
            { header: 'Orders Count', dataKey: 'orderCount', format: (v) => Number(v) || 0 },
            { header: 'Total Ordered (LKR)', dataKey: 'totalOrdered', format: (v) => Number(v) || 0 },
            { header: 'Avg Order Value (LKR)', dataKey: 'avgOrderValue', format: (v) => Number(v) || 0 },
            { header: 'Invoiced Amount (LKR)', dataKey: 'invoiced', format: (v) => Number(v) || 0 },
            { header: 'Paid Amount (LKR)', dataKey: 'paid', format: (v) => Number(v) || 0 },
            { header: 'Outstanding Balance (LKR)', dataKey: 'outstanding', format: (v) => Number(v) || 0 },
        ];
        exportToExcel(customers, `Sales_By_Customer_${startDate}_to_${endDate}`, 'Sales By Customer', columns);
    };

    const handleExportPDF = () => {
        if (!customers.length) return;
        const columns = [
            { header: '#', dataKey: (_c, idx) => idx + 1, halign: 'center' },
            { header: 'Code', dataKey: 'customerCode' },
            { header: 'Customer Name', dataKey: 'customerName' },
            { header: 'Orders', dataKey: 'orderCount', isNumeric: true },
            { header: 'Total Ordered (LKR)', dataKey: 'totalOrdered', isNumeric: true, format: (v) => fmt(v) },
            { header: 'Invoiced', dataKey: 'invoiced', isNumeric: true, format: (v) => fmt(v) },
            { header: 'Paid', dataKey: 'paid', isNumeric: true, format: (v) => fmt(v) },
            { header: 'Outstanding', dataKey: 'outstanding', isNumeric: true, format: (v) => fmt(v) },
        ];

        const summaryCards = [
            { label: 'Active Clients', value: String(customers.length) },
            { label: 'Total Ordered', value: fmt(totals.ordered) },
            { label: 'Total Invoiced', value: fmt(totals.invoiced) },
            { label: 'Paid Revenue', value: fmt(totals.paid) },
            { label: 'Outstanding Balance', value: fmt(totals.outstanding) },
        ];

        exportToPDF('Sales by Customer Report', columns, customers, `Sales_By_Customer_${startDate}_to_${endDate}`, {
            period: `${startDate} to ${endDate}`,
            companyName: settings?.companyName,
            companyTagline: settings?.companyTagline,
            companyAddress: settings?.companyAddress,
            companyPhone: settings?.companyPhone,
            companyEmail: settings?.companyEmail,
            summaryCards,
            orientation: 'landscape'
        });
    };

    const columns = [
        { key: 'rank', label: '#', width: '45px', render: (_r, idx) => <span className="text-slate-400 font-mono text-xs">{idx + 1}</span> },
        { key: 'customerCode', label: 'Code', render: (r) => <span className="font-mono text-xs font-semibold text-slate-800">{r.customerCode}</span> },
        { key: 'customerName', label: 'Customer', render: (r) => <span className="font-medium text-slate-900">{r.customerName}</span> },
        { key: 'orderCount', label: 'Orders', render: (r) => <span className="text-slate-600">{r.orderCount}</span> },
        { key: 'totalOrdered', label: 'Total Ordered', render: (r) => fmt(r.totalOrdered) },
        { key: 'avgOrderValue', label: 'Avg Order', render: (r) => fmt(r.avgOrderValue) },
        { key: 'invoiced', label: 'Invoiced', render: (r) => fmt(r.invoiced) },
        { key: 'paid', label: 'Paid', render: (r) => <span className="text-emerald-700 font-semibold">{fmt(r.paid)}</span> },
        {
            key: 'outstanding', label: 'Outstanding', render: (r) =>
                r.outstanding > 0 ? <span className="text-amber-700 font-bold">{fmt(r.outstanding)}</span> : <span className="text-slate-400">—</span>
        },
    ];

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
                title="Sales by Customer"
                description="Client revenue performance, billing realization, and outstanding balances"
                actions={
                    <ReportExportButtons
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        onRefresh={() => refetch()}
                        disabled={customers.length === 0}
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

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard label="Buying Clients" value={customers.length} subtext={`${totals.orders} total orders`} />
                <KpiCard label="Total Ordered" value={fmt(totals.ordered)} subtext="Agreed order volume" />
                <KpiCard label="Total Realized Paid" value={fmt(totals.paid)} subtext="Received cash & cheques" trend={1} />
                <KpiCard label="Outstanding Balance" value={fmt(totals.outstanding)} subtext="Pending collection" trend={totals.outstanding > 0 ? -1 : 1} />
            </div>

            {/* Table */}
            <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                {isLoading ? (
                    <div className="py-20 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
                        <p className="text-slate-500 font-medium text-sm">Loading customer ledger...</p>
                    </div>
                ) : customers.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                        <p className="text-base font-semibold text-slate-700">No customer sales data found</p>
                        <p className="text-xs text-slate-400 mt-1">Try expanding the date range</p>
                    </div>
                ) : (
                    <Table columns={columns} data={customers} />
                )}
            </Card>
        </div>
    );
}