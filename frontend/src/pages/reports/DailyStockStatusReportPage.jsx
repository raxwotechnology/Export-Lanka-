import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import KpiCard from '../../components/ui/KpiCard';
import ReportExportButtons from '../../components/ui/ReportExportButtons';
import { useDailyStockStatus } from '../../features/reports/useReports';
import { useWarehouses } from '../../features/warehouses/useWarehouses';
import { useSettings } from '../../features/settings/useSettings';
import { exportToExcel, exportToPDF } from '../../utils/dataExport';

export default function DailyStockStatusReportPage() {
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const [startDate, setStartDate] = useState(() => {
        return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [warehouseId, setWarehouseId] = useState('');

    const { data, isLoading, refetch } = useDailyStockStatus({
        startDate,
        endDate,
        warehouseId: warehouseId || undefined
    });

    const { data: warehousesData } = useWarehouses({ isActive: true });

    const reportItems = data?.data || [];
    const warehouses = warehousesData?.data || [];
    const warehouseOptions = [
        { value: '', label: 'All Warehouses' },
        ...warehouses.map((w) => ({ value: w._id, label: w.name }))
    ];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtNum = (n) => new Intl.NumberFormat('en-LK', { maximumFractionDigits: 2 }).format(n || 0);

    // Summaries
    const totalOpening = reportItems.reduce((acc, item) => acc + (item.openingStock || 0), 0);
    const totalReceived = reportItems.reduce((acc, item) => acc + (item.received || 0), 0);
    const totalIssued = reportItems.reduce((acc, item) => acc + (item.issued || 0), 0);
    const totalClosing = reportItems.reduce((acc, item) => acc + (item.closingStock || 0), 0);
    const totalClosingValue = reportItems.reduce((acc, item) => acc + (item.closingValue || 0), 0);

    const handleExportExcel = () => {
        if (!reportItems.length) return;
        const columns = [
            { header: 'Product Code', dataKey: 'productCode' },
            { header: 'Product Name', dataKey: 'productName' },
            { header: 'Product Type', dataKey: (r) => r.productType?.replace(/_/g, ' ') || '' },
            { header: 'UOM', dataKey: 'unitOfMeasure' },
            { header: 'Opening Stock', dataKey: 'openingStock', format: (v) => Number(v) || 0 },
            { header: 'Received (+)', dataKey: 'received', format: (v) => Number(v) || 0 },
            { header: 'Issued (-)', dataKey: 'issued', format: (v) => Number(v) || 0 },
            { header: 'Closing Stock', dataKey: 'closingStock', format: (v) => Number(v) || 0 },
            { header: 'Cost per Unit (LKR)', dataKey: 'costPerUnit', format: (v) => Number(v) || 0 },
            { header: 'Closing Value (LKR)', dataKey: 'closingValue', format: (v) => Number(v) || 0 },
        ];
        exportToExcel(reportItems, `Daily_Stock_Status_${startDate}_to_${endDate}`, 'Daily Stock Status', columns);
    };

    const handleExportPDF = () => {
        if (!reportItems.length) return;
        const exportColumns = [
            { header: 'Code', dataKey: 'productCode' },
            { header: 'Product Name', dataKey: 'productName' },
            { header: 'UOM', dataKey: (r) => r.unitOfMeasure || 'kg' },
            { header: 'Opening', dataKey: 'openingStock', isNumeric: true, format: (v) => fmtNum(v) },
            { header: 'Received', dataKey: 'received', isNumeric: true, format: (v) => `+${fmtNum(v)}` },
            { header: 'Issued', dataKey: 'issued', isNumeric: true, format: (v) => `-${fmtNum(v)}` },
            { header: 'Closing', dataKey: 'closingStock', isNumeric: true, format: (v) => fmtNum(v) },
            { header: 'Cost/Unit', dataKey: 'costPerUnit', isNumeric: true, format: (v) => fmt(v) },
            { header: 'Closing Value (LKR)', dataKey: 'closingValue', isNumeric: true, format: (v) => fmt(v) },
        ];

        const summaryCards = [
            { label: 'Opening Qty', value: fmtNum(totalOpening) },
            { label: 'Received (+)', value: `+${fmtNum(totalReceived)}` },
            { label: 'Issued (-)', value: `-${fmtNum(totalIssued)}` },
            { label: 'Closing Qty', value: fmtNum(totalClosing) },
            { label: 'Closing Value', value: fmt(totalClosingValue) },
        ];

        exportToPDF('Daily Stock Status Ledger Report', exportColumns, reportItems, `Daily_Stock_Status_${startDate}_to_${endDate}`, {
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
        { key: 'productCode', label: 'Code', render: (r) => <span className="font-mono text-xs font-semibold text-slate-800">{r.productCode}</span> },
        { key: 'productName', label: 'Product Name', render: (r) => <span className="font-medium text-slate-900">{r.productName}</span> },
        { key: 'productType', label: 'Type', render: (r) => <Badge variant="outline" className="capitalize">{r.productType?.replace(/_/g, ' ')}</Badge> },
        { key: 'unitOfMeasure', label: 'UOM', render: (r) => <span className="text-slate-500 text-xs uppercase">{r.unitOfMeasure || 'kg'}</span> },
        { key: 'openingStock', label: 'Opening Stock', render: (r) => <span className="text-slate-700">{fmtNum(r.openingStock)}</span> },
        { key: 'received', label: 'Received (+)', render: (r) => <span className="text-emerald-700 font-semibold">+{fmtNum(r.received)}</span> },
        { key: 'issued', label: 'Issued (-)', render: (r) => <span className="text-rose-700 font-semibold">-{fmtNum(r.issued)}</span> },
        { key: 'closingStock', label: 'Closing Stock', render: (r) => <span className="font-bold text-slate-900">{fmtNum(r.closingStock)}</span> },
        { key: 'costPerUnit', label: 'Cost/Unit', render: (r) => fmt(r.costPerUnit) },
        { key: 'closingValue', label: 'Closing Value', render: (r) => <span className="font-bold text-emerald-800">{fmt(r.closingValue)}</span> },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Daily Stock Status Report"
                description="Audited opening, receipt additions, dispatch deductions, and closing inventory values"
                actions={
                    <ReportExportButtons
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        onRefresh={() => refetch()}
                        disabled={!reportItems.length}
                        loading={isLoading}
                    />
                }
            />

            {/* Filters */}
            <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-40">
                        <Input label="From Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="w-40">
                        <Input label="To Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                    <div className="w-64">
                        <Select
                            label="Warehouse Location"
                            options={warehouseOptions}
                            value={warehouseId}
                            onChange={(e) => setWarehouseId(e.target.value)}
                        />
                    </div>
                </div>
            </Card>

            {isLoading ? (
                <div className="py-20 text-center bg-white rounded-xl border border-slate-200">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
                    <p className="text-slate-500 font-medium text-sm">Aggregating daily stock movements...</p>
                </div>
            ) : (
                <>
                    {/* Summary Widgets */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        <KpiCard label="Opening Stock" value={fmtNum(totalOpening)} subtext="Initial period balance" />
                        <KpiCard label="Received (+)" value={`+${fmtNum(totalReceived)}`} subtext="Inward receipts" trend={1} />
                        <KpiCard label="Issued (-)" value={`-${fmtNum(totalIssued)}`} subtext="Outward dispatches" trend={-1} />
                        <KpiCard label="Closing Stock" value={fmtNum(totalClosing)} subtext="Final balance on floor" />
                        <KpiCard label="Closing Valuation" value={fmt(totalClosingValue)} subtext="Total asset valuation" />
                    </div>

                    {/* Ledger Table */}
                    <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                        <Table columns={columns} data={reportItems} />
                    </Card>
                </>
            )}
        </div>
    );
}
