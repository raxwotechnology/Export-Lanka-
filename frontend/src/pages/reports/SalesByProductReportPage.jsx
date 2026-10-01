import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import KpiCard from '../../components/ui/KpiCard';
import ReportExportButtons from '../../components/ui/ReportExportButtons';
import { useSalesByProduct } from '../../features/reports/useReports';
import { useSettings } from '../../features/settings/useSettings';
import { exportToExcel, exportToPDF } from '../../utils/dataExport';

export default function SalesByProductReportPage() {
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const now = new Date();
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const { data, isLoading, refetch } = useSalesByProduct({ startDate, endDate, limit: 100 });
    const products = data?.data || [];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtNum = (n) => new Intl.NumberFormat('en-LK', { maximumFractionDigits: 2 }).format(n || 0);

    const totalRevenue = products.reduce((s, p) => s + (p.netRevenue || 0), 0);
    const totalQty = products.reduce((s, p) => s + (p.quantitySold || 0), 0);
    const totalGross = products.reduce((s, p) => s + (p.grossRevenue || 0), 0);
    const totalDiscount = products.reduce((s, p) => s + (p.totalDiscount || 0), 0);

    const handleExportExcel = () => {
        if (!products.length) return;
        const columns = [
            { header: 'Rank', dataKey: (_p, idx) => idx + 1 },
            { header: 'Product Code', dataKey: 'productCode' },
            { header: 'Product Name', dataKey: 'productName' },
            { header: 'Quantity Sold', dataKey: 'quantitySold', format: (v) => Number(v) || 0 },
            { header: 'Avg Unit Price (LKR)', dataKey: 'avgPrice', format: (v) => Number(v) || 0 },
            { header: 'Gross Revenue (LKR)', dataKey: 'grossRevenue', format: (v) => Number(v) || 0 },
            { header: 'Discount (LKR)', dataKey: 'totalDiscount', format: (v) => Number(v) || 0 },
            { header: 'Net Revenue (LKR)', dataKey: 'netRevenue', format: (v) => Number(v) || 0 },
            { header: 'Orders Count', dataKey: 'orderCount', format: (v) => Number(v) || 0 },
        ];
        exportToExcel(products, `Sales_By_Product_${startDate}_to_${endDate}`, 'Sales By Product', columns);
    };

    const handleExportPDF = () => {
        if (!products.length) return;
        const columns = [
            { header: '#', dataKey: (_p, idx) => idx + 1, halign: 'center' },
            { header: 'Code', dataKey: 'productCode' },
            { header: 'Product Name', dataKey: 'productName' },
            { header: 'Qty Sold', dataKey: 'quantitySold', isNumeric: true, format: (v) => fmtNum(v) },
            { header: 'Avg Price', dataKey: 'avgPrice', isNumeric: true, format: (v) => fmt(v) },
            { header: 'Gross Rev.', dataKey: 'grossRevenue', isNumeric: true, format: (v) => fmt(v) },
            { header: 'Discount', dataKey: 'totalDiscount', isNumeric: true, format: (v) => fmt(v) },
            { header: 'Net Revenue (LKR)', dataKey: 'netRevenue', isNumeric: true, format: (v) => fmt(v) },
            { header: 'Orders', dataKey: 'orderCount', isNumeric: true },
        ];

        const summaryCards = [
            { label: 'Products Sold', value: String(products.length) },
            { label: 'Total Units', value: fmtNum(totalQty) },
            { label: 'Gross Revenue', value: fmt(totalGross) },
            { label: 'Net Revenue', value: fmt(totalRevenue) },
        ];

        exportToPDF('Sales by Product Report', columns, products, `Sales_By_Product_${startDate}_to_${endDate}`, {
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
        { key: 'productCode', label: 'Code', render: (r) => <span className="font-mono text-xs font-semibold text-slate-800">{r.productCode}</span> },
        { key: 'productName', label: 'Product Name', render: (r) => <span className="font-medium text-slate-900">{r.productName}</span> },
        { key: 'quantitySold', label: 'Qty Sold', render: (r) => <span className="font-medium text-slate-700">{fmtNum(r.quantitySold)}</span> },
        { key: 'avgPrice', label: 'Avg Price', render: (r) => fmt(r.avgPrice) },
        { key: 'grossRevenue', label: 'Gross Rev.', render: (r) => fmt(r.grossRevenue) },
        { key: 'totalDiscount', label: 'Discount', render: (r) => <span className="text-red-600">-{fmt(r.totalDiscount)}</span> },
        { key: 'netRevenue', label: 'Net Revenue', render: (r) => <span className="font-bold text-emerald-700">{fmt(r.netRevenue)}</span> },
        { key: 'orderCount', label: 'Orders', render: (r) => <span className="text-slate-600">{r.orderCount}</span> },
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
                title="Sales by Product"
                description="Comprehensive product-level turnover, volumes, and revenue contributions"
                actions={
                    <ReportExportButtons
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        onRefresh={() => refetch()}
                        disabled={products.length === 0}
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
                <KpiCard label="SKUs Sold" value={products.length} subtext="Unique catalog items" />
                <KpiCard label="Total Units Dispatched" value={fmtNum(totalQty)} subtext="Physical volume" />
                <KpiCard label="Gross Sales Value" value={fmt(totalGross)} subtext={`Discounts: ${fmt(totalDiscount)}`} />
                <KpiCard label="Net Realized Sales" value={fmt(totalRevenue)} subtext="Net revenue after discounts" />
            </div>

            {/* Table */}
            <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                {isLoading ? (
                    <div className="py-20 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
                        <p className="text-slate-500 font-medium text-sm">Loading product breakdown...</p>
                    </div>
                ) : products.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                        <p className="text-base font-semibold text-slate-700">No product sales found</p>
                        <p className="text-xs text-slate-400 mt-1">Try expanding the date filter range</p>
                    </div>
                ) : (
                    <Table columns={columns} data={products} />
                )}
            </Card>
        </div>
    );
}