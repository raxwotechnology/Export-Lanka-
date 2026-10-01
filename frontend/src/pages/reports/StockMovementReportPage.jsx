import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import KpiCard from '../../components/ui/KpiCard';
import ReportExportButtons from '../../components/ui/ReportExportButtons';
import { useStockMovement } from '../../features/reports/useReports';
import { useSettings } from '../../features/settings/useSettings';
import { exportToExcel, exportToPDF } from '../../utils/dataExport';

export default function StockMovementReportPage() {
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [startDate, setStartDate] = useState(weekAgo);
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const { data, isLoading, refetch } = useStockMovement({ startDate, endDate, limit: 500 });
    const movements = data?.data || [];

    const fmt = (n) => new Intl.NumberFormat('en-LK', { maximumFractionDigits: 2 }).format(n || 0);

    const totalIn = movements.filter(m => m.direction === 'in').reduce((s, m) => s + (m.quantity || 0), 0);
    const totalOut = movements.filter(m => m.direction === 'out').reduce((s, m) => s + (m.quantity || 0), 0);

    const handleExportExcel = () => {
        if (!movements.length) return;
        const columns = [
            { header: 'Timestamp', dataKey: (r) => new Date(r.createdAt).toLocaleString('en-LK') },
            { header: 'Movement Ref', dataKey: 'movementNumber' },
            { header: 'Product Code', dataKey: (r) => r.productId?.productCode || r.productCode || '' },
            { header: 'Product Name', dataKey: (r) => r.productId?.name || r.productName || '' },
            { header: 'Warehouse', dataKey: (r) => r.warehouseId?.name || '' },
            { header: 'Type', dataKey: (r) => r.movementType?.replace(/_/g, ' ') || '' },
            { header: 'Direction', dataKey: (r) => r.direction?.toUpperCase() || '' },
            { header: 'Quantity', dataKey: 'quantity', format: (v) => Number(v) || 0 },
            { header: 'Balance After', dataKey: 'balanceAfter', format: (v) => Number(v) || 0 },
            { header: 'Source Doc', dataKey: (r) => r.sourceDocument?.number || '' },
            { header: 'Logged By', dataKey: (r) => r.performedBy ? `${r.performedBy.firstName || ''} ${r.performedBy.lastName || ''}`.trim() : '' },
        ];
        exportToExcel(movements, `Stock_Movement_Log_${startDate}_to_${endDate}`, 'Movement Audit Log', columns);
    };

    const handleExportPDF = () => {
        if (!movements.length) return;
        const columns = [
            { header: 'Date', dataKey: (r) => new Date(r.createdAt).toLocaleDateString('en-LK') },
            { header: 'Ref', dataKey: 'movementNumber' },
            { header: 'Product', dataKey: (r) => r.productId?.name || r.productName || '' },
            { header: 'Warehouse', dataKey: (r) => r.warehouseId?.name || '—' },
            { header: 'Type', dataKey: (r) => r.movementType?.replace(/_/g, ' ') || '' },
            { header: 'Dir', dataKey: (r) => r.direction?.toUpperCase() || '', halign: 'center' },
            { header: 'Qty', dataKey: 'quantity', isNumeric: true, format: (v) => fmt(v) },
            { header: 'Balance', dataKey: 'balanceAfter', isNumeric: true, format: (v) => fmt(v) },
            { header: 'Source', dataKey: (r) => r.sourceDocument?.number || '—' },
        ];

        const summaryCards = [
            { label: 'Movement Events', value: `${movements.length} logs` },
            { label: 'Inward Volume', value: `+${fmt(totalIn)} units` },
            { label: 'Outward Dispatched', value: `-${fmt(totalOut)} units` },
        ];

        exportToPDF('Stock Movement Audit Trail Report', columns, movements, `Stock_Movement_Log_${startDate}_to_${endDate}`, {
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
        { key: 'createdAt', label: 'Date & Time', render: (r) => <span className="text-xs text-slate-600">{new Date(r.createdAt).toLocaleString('en-LK', { dateStyle: 'short', timeStyle: 'short' })}</span> },
        { key: 'movementNumber', label: 'Movement Ref', render: (r) => <span className="font-mono text-xs font-semibold text-slate-800">{r.movementNumber}</span> },
        {
            key: 'product', label: 'Product Details', render: (r) => (
                <div>
                    <p className="text-sm font-medium text-slate-900">{r.productId?.name || r.productName}</p>
                    <p className="text-xs font-mono text-slate-400">{r.productId?.productCode || r.productCode}</p>
                </div>
            )
        },
        { key: 'warehouse', label: 'Warehouse', render: (r) => <span className="text-slate-600 text-sm">{r.warehouseId?.name || '—'}</span> },
        { key: 'type', label: 'Type', render: (r) => <Badge variant="outline" className="capitalize">{r.movementType?.replace(/_/g, ' ')}</Badge> },
        {
            key: 'direction', label: 'Flow', render: (r) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                    r.direction === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}>
                    {r.direction === 'in' ? '↑ INWARD' : '↓ OUTWARD'}
                </span>
            )
        },
        { key: 'quantity', label: 'Quantity', render: (r) => <span className="font-semibold text-slate-900">{fmt(r.quantity)}</span> },
        { key: 'balanceAfter', label: 'Balance After', render: (r) => <span className="font-mono text-xs text-slate-700">{fmt(r.balanceAfter)}</span> },
        { key: 'source', label: 'Source Ref', render: (r) => <span className="font-mono text-xs text-slate-500">{r.sourceDocument?.number || '—'}</span> },
        { key: 'performedBy', label: 'Logged By', render: (r) => <span className="text-xs text-slate-600">{r.performedBy ? `${r.performedBy.firstName} ${r.performedBy.lastName}` : 'System'}</span> },
    ];

    const applyPreset = (days) => {
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - days);
        setStartDate(start.toISOString().slice(0, 10));
        setEndDate(end.toISOString().slice(0, 10));
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Stock Movement Log"
                description="Immutable audit trail of all warehouse receipts, transfers, adjustments, and dispatches"
                actions={
                    <ReportExportButtons
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        onRefresh={() => refetch()}
                        disabled={movements.length === 0}
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
                        <Button variant="outline" size="sm" onClick={() => applyPreset(7)}>Last 7d</Button>
                        <Button variant="outline" size="sm" onClick={() => applyPreset(14)}>Last 14d</Button>
                        <Button variant="outline" size="sm" onClick={() => applyPreset(30)}>Last 30d</Button>
                    </div>
                </div>
            </Card>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KpiCard label="Logged Transactions" value={movements.length} subtext="Total movement records" />
                <KpiCard label="Cumulative Inflow" value={`+${fmt(totalIn)}`} subtext="Goods received / produced" trend={1} />
                <KpiCard label="Cumulative Outflow" value={`-${fmt(totalOut)}`} subtext="Goods dispatched / consumed" trend={-1} />
            </div>

            {/* Table */}
            <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                {isLoading ? (
                    <div className="py-20 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
                        <p className="text-slate-500 font-medium text-sm">Loading movement audit log...</p>
                    </div>
                ) : movements.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                        <p className="text-base font-semibold text-slate-700">No stock movements found in this period</p>
                        <p className="text-xs text-slate-400 mt-1">Select a wider date range to inspect audit events</p>
                    </div>
                ) : (
                    <Table columns={columns} data={movements} />
                )}
            </Card>
        </div>
    );
}