import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import KpiCard from '../../components/ui/KpiCard';
import ReportExportButtons from '../../components/ui/ReportExportButtons';
import { useStockValuation } from '../../features/reports/useReports';
import { useWarehouses } from '../../features/warehouses/useWarehouses';
import { useSettings } from '../../features/settings/useSettings';
import { exportToExcel, exportToPDF } from '../../utils/dataExport';

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export default function StockValuationReportPage() {
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const [warehouseId, setWarehouseId] = useState('');
    const { data, isLoading, refetch } = useStockValuation({ warehouseId: warehouseId || undefined });
    const { data: warehousesData } = useWarehouses({ isActive: true });

    const report = data?.data;
    const warehouses = warehousesData?.data || [];
    const warehouseOptions = [{ value: '', label: 'All Warehouses' }, ...warehouses.map((w) => ({ value: w._id, label: w.name }))];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtNum = (n) => new Intl.NumberFormat('en-LK', { maximumFractionDigits: 2 }).format(n || 0);

    const handleExportExcel = () => {
        if (!report?.items?.length) return;
        const columns = [
            { header: 'Product Code', dataKey: 'productCode' },
            { header: 'Product Name', dataKey: 'productName' },
            { header: 'Type', dataKey: (r) => r.productType?.replace(/_/g, ' ') || '' },
            { header: 'Warehouse', dataKey: 'warehouseName' },
            { header: 'On Hand Qty', dataKey: 'onHand', format: (v) => Number(v) || 0 },
            { header: 'Reserved Qty', dataKey: 'reserved', format: (v) => Number(v) || 0 },
            { header: 'Available Qty', dataKey: 'available', format: (v) => Number(v) || 0 },
            { header: 'Cost per Unit (LKR)', dataKey: 'costPerUnit', format: (v) => Number(v) || 0 },
            { header: 'Total Value (LKR)', dataKey: 'totalValue', format: (v) => Number(v) || 0 },
        ];
        const selectedWarehouseName = warehouses.find(w => w._id === warehouseId)?.name || 'All_Warehouses';
        exportToExcel(report.items, `Stock_Valuation_${selectedWarehouseName}_${new Date().toISOString().slice(0, 10)}`, 'Stock Valuation', columns);
    };

    const handleExportPDF = () => {
        if (!report?.items?.length) return;
        const exportColumns = [
            { header: 'Code', dataKey: 'productCode' },
            { header: 'Product', dataKey: 'productName' },
            { header: 'Type', dataKey: (r) => r.productType?.replace(/_/g, ' ') || '' },
            { header: 'Warehouse', dataKey: 'warehouseName' },
            { header: 'On Hand', dataKey: 'onHand', isNumeric: true, format: (v) => fmtNum(v) },
            { header: 'Reserved', dataKey: 'reserved', isNumeric: true, format: (v) => fmtNum(v) },
            { header: 'Available', dataKey: 'available', isNumeric: true, format: (v) => fmtNum(v) },
            { header: 'Cost/Unit', dataKey: 'costPerUnit', isNumeric: true, format: (v) => fmt(v) },
            { header: 'Total Value (LKR)', dataKey: 'totalValue', isNumeric: true, format: (v) => fmt(v) },
        ];

        const summaryCards = [
            { label: 'Total Inventory Value', value: fmt(report.summary.totalValue) },
            { label: 'Physical Units On Hand', value: fmtNum(report.summary.totalUnits) },
            { label: 'Catalog Stock Items', value: String(report.summary.productCount) },
        ];

        const selectedWarehouseName = warehouses.find(w => w._id === warehouseId)?.name || 'All Warehouses';

        exportToPDF('Stock Valuation Report', exportColumns, report.items, `Stock_Valuation_${new Date().toISOString().slice(0, 10)}`, {
            period: `Location: ${selectedWarehouseName} (${new Date().toLocaleDateString('en-LK')})`,
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
        { key: 'productCode', label: 'Code', render: (r) => <span className="font-mono text-xs font-semibold text-slate-800">{r.productCode}</span> },
        { key: 'productName', label: 'Product Name', render: (r) => <span className="font-medium text-slate-900">{r.productName}</span> },
        { key: 'productType', label: 'Category Type', render: (r) => <Badge variant="outline" className="capitalize">{r.productType?.replace(/_/g, ' ')}</Badge> },
        { key: 'warehouseName', label: 'Warehouse', render: (r) => <span className="text-slate-600 text-sm">{r.warehouseName || '—'}</span> },
        { key: 'onHand', label: 'On Hand', render: (r) => <span className="font-medium text-slate-900">{fmtNum(r.onHand)}</span> },
        { key: 'reserved', label: 'Reserved', render: (r) => <span className="text-slate-500">{fmtNum(r.reserved)}</span> },
        { key: 'available', label: 'Available', render: (r) => <span className="font-medium text-emerald-700">{fmtNum(r.available)}</span> },
        { key: 'costPerUnit', label: 'Cost/Unit', render: (r) => fmt(r.costPerUnit) },
        { key: 'totalValue', label: 'Total Value', render: (r) => <span className="font-bold text-slate-900">{fmt(r.totalValue)}</span> },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Stock Valuation"
                description="Comprehensive real-time inventory assets valuation across all storage locations"
                actions={
                    <ReportExportButtons
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        onRefresh={() => refetch()}
                        disabled={!report || !report.items?.length}
                        loading={isLoading}
                    />
                }
            />

            {/* Warehouse Filter */}
            <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
                <div className="w-full sm:w-72">
                    <Select
                        label="Filter by Warehouse Location"
                        options={warehouseOptions}
                        value={warehouseId}
                        onChange={(e) => setWarehouseId(e.target.value)}
                    />
                </div>
            </Card>

            {isLoading || !report ? (
                <div className="py-20 text-center bg-white rounded-xl border border-slate-200">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
                    <p className="text-slate-500 font-medium text-sm">Calculating inventory valuation ledger...</p>
                </div>
            ) : (
                <>
                    {/* Executive KPI Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <KpiCard
                            label="Total Stock Valuation"
                            value={fmt(report.summary.totalValue)}
                            subtext="Cumulative cost value"
                        />
                        <KpiCard
                            label="Total Physical Units"
                            value={fmtNum(report.summary.totalUnits)}
                            subtext="Units on warehouse floors"
                        />
                        <KpiCard
                            label="Catalog Item Count"
                            value={String(report.summary.productCount)}
                            subtext="Monitored SKUs"
                        />
                    </div>

                    {/* Breakdown & Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <Card className="p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Value by Product Type</h3>
                            <ResponsiveContainer width="100%" height={240}>
                                <PieChart>
                                    <Pie
                                        data={report.byProductType}
                                        dataKey="value"
                                        nameKey="type"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        label={({ type, percent }) => `${type?.replace(/_/g, ' ')}: ${(percent * 100).toFixed(0)}%`}
                                    >
                                        {report.byProductType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip formatter={(v) => fmt(v)} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card className="col-span-2 p-6 bg-white border border-slate-200 shadow-sm rounded-xl">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Asset Value Breakdown</h3>
                            <div className="space-y-3">
                                {report.byProductType.map((t) => (
                                    <div key={t.type} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <Badge variant="outline" className="capitalize">{t.type?.replace(/_/g, ' ')}</Badge>
                                            <span className="text-xs text-slate-500 font-medium">{t.items} unique item{t.items !== 1 ? 's' : ''}</span>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-slate-900">{fmt(t.value)}</p>
                                            <p className="text-xs text-slate-500 font-mono">{fmtNum(t.units)} total units</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>

                    {/* Inventory Table */}
                    <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                        <Table columns={columns} data={report.items} />
                    </Card>
                </>
            )}
        </div>
    );
}