import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle, Package } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import KpiCard from '../../components/ui/KpiCard';
import ReportExportButtons from '../../components/ui/ReportExportButtons';
import { useLowStockReport } from '../../features/reports/useReports';
import { useSettings } from '../../features/settings/useSettings';
import { exportToExcel, exportToPDF } from '../../utils/dataExport';

export default function LowStockReportPage() {
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const { data, isLoading, refetch } = useLowStockReport();
    const items = data?.data || [];

    const criticalItems = items.filter(i => i.isCritical);
    const totalShortageUnits = items.reduce((sum, i) => sum + (Number(i.shortage) || 0), 0);

    const handleExportExcel = () => {
        if (!items.length) return;
        const columns = [
            { header: 'Product Code', dataKey: 'productCode' },
            { header: 'Product Name', dataKey: 'productName' },
            { header: 'Category Type', dataKey: (r) => r.productType?.replace(/_/g, ' ') || '' },
            { header: 'Available Qty', dataKey: 'available', format: (v) => Number(v) || 0 },
            { header: 'Reorder Level', dataKey: 'reorderLevel', format: (v) => Number(v) || 0 },
            { header: 'Minimum Safety Stock', dataKey: 'minimumStock', format: (v) => Number(v) || 0 },
            { header: 'Shortage Units Needed', dataKey: 'shortage', format: (v) => Number(v) || 0 },
            { header: 'Status', dataKey: (r) => r.isCritical ? 'CRITICAL DEFICIT' : 'BELOW REORDER LEVEL' },
        ];
        exportToExcel(items, `Low_Stock_Procurement_Alert_${new Date().toISOString().slice(0, 10)}`, 'Low Stock Alerts', columns);
    };

    const handleExportPDF = () => {
        if (!items.length) return;
        const columns = [
            { header: 'Code', dataKey: 'productCode' },
            { header: 'Product Name', dataKey: 'productName' },
            { header: 'Type', dataKey: (r) => r.productType?.replace(/_/g, ' ') || '' },
            { header: 'Available', dataKey: 'available', isNumeric: true },
            { header: 'Reorder At', dataKey: 'reorderLevel', isNumeric: true },
            { header: 'Min Safety', dataKey: 'minimumStock', isNumeric: true },
            { header: 'Shortage Qty', dataKey: 'shortage', isNumeric: true },
            { header: 'Severity', dataKey: (r) => r.isCritical ? 'CRITICAL' : 'WARNING' },
        ];

        const summaryCards = [
            { label: 'Deficit SKUs', value: `${items.length} items` },
            { label: 'Critical Outages', value: `${criticalItems.length} items` },
            { label: 'Replenishment Deficit', value: `${totalShortageUnits} units` },
        ];

        exportToPDF('Low Stock & Reorder Procurement Report', columns, items, `Low_Stock_Procurement_Alert_${new Date().toISOString().slice(0, 10)}`, {
            period: `Audit Date: ${new Date().toLocaleDateString('en-LK')}`,
            companyName: settings?.companyName,
            companyTagline: settings?.companyTagline,
            companyAddress: settings?.companyAddress,
            companyPhone: settings?.companyPhone,
            companyEmail: settings?.companyEmail,
            summaryCards
        });
    };

    const columns = [
        { key: 'productCode', label: 'Code', render: (r) => <span className="font-mono text-xs font-semibold text-slate-800">{r.productCode}</span> },
        { key: 'productName', label: 'Product Name', render: (r) => <span className="font-medium text-slate-900">{r.productName}</span> },
        { key: 'productType', label: 'Type', render: (r) => <Badge variant="outline" className="capitalize">{r.productType?.replace(/_/g, ' ')}</Badge> },
        {
            key: 'available', label: 'Available On Hand', render: (r) =>
                r.isCritical
                    ? <Badge variant="danger" className="font-bold">{r.available} (Zero / Outage)</Badge>
                    : <Badge variant="warning">{r.available} (Low)</Badge>
        },
        { key: 'reorderLevel', label: 'Reorder Threshold', render: (r) => <span className="text-slate-600 font-mono">{r.reorderLevel}</span> },
        { key: 'minimumStock', label: 'Min Safety Stock', render: (r) => <span className="text-slate-600 font-mono">{r.minimumStock}</span> },
        {
            key: 'shortage', label: 'Required Replenishment', render: (r) =>
                <span className="font-bold text-rose-700 font-mono">+{r.shortage} units</span>
        },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Low Stock & Reorder Alerts"
                description="Actionable procurement intelligence for products currently at or below safety stock threshold"
                actions={
                    <ReportExportButtons
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        onRefresh={() => refetch()}
                        disabled={items.length === 0}
                        loading={isLoading}
                    />
                }
            />

            {isLoading ? (
                <div className="py-20 text-center bg-white rounded-xl border border-slate-200">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
                    <p className="text-slate-500 font-medium text-sm">Evaluating warehouse inventory threshold levels...</p>
                </div>
            ) : items.length === 0 ? (
                <Card className="p-12 text-center bg-white border border-slate-200 shadow-sm rounded-xl">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <CheckCircle size={24} />
                    </div>
                    <p className="text-emerald-800 text-lg font-bold">All stock levels are optimal</p>
                    <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                        No catalog products are currently operating below designated reorder levels or safety thresholds.
                    </p>
                </Card>
            ) : (
                <>
                    {/* KPI Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <KpiCard
                            label="Attention Required"
                            value={String(items.length)}
                            subtext="Products below reorder level"
                            trend={-1}
                        />
                        <KpiCard
                            label="Critical Stockouts"
                            value={String(criticalItems.length)}
                            subtext="Immediate purchase order needed"
                            trend={-1}
                        />
                        <KpiCard
                            label="Replenishment Units"
                            value={String(totalShortageUnits)}
                            subtext="Units needed to reach safety stock"
                        />
                    </div>

                    {/* Alert Banner */}
                    <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-3">
                        <AlertTriangle size={18} className="text-amber-700 mt-0.5 shrink-0" />
                        <div className="text-xs text-amber-900 leading-relaxed">
                            <strong>Procurement Advisory:</strong> <strong>{items.length} items</strong> have reached or breached their minimum reorder point. Generate a <strong>Purchase Order (PO)</strong> from the Purchasing module to replenish supplier inventory before production disruptions occur.
                        </div>
                    </div>

                    {/* Table */}
                    <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                        <Table columns={columns} data={items} />
                    </Card>
                </>
            )}
        </div>
    );
}