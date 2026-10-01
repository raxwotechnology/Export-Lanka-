import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import KpiCard from '../../components/ui/KpiCard';
import Badge from '../../components/ui/Badge';
import ReportExportButtons from '../../components/ui/ReportExportButtons';
import {
    useProductionSummary, useProductionByProduct, useProductionWastage,
} from '../../features/reports/useReports';
import { useSettings } from '../../features/settings/useSettings';
import { exportToExcel, exportToPDF } from '../../utils/dataExport';

export default function ProductionReportPage() {
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const now = new Date();
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const { data: summaryData, isLoading: isSummaryLoading, refetch: refetchSummary } = useProductionSummary({ startDate, endDate });
    const { data: byProductData, isLoading: isProductLoading, refetch: refetchProducts } = useProductionByProduct({ startDate, endDate });
    const { data: wastageData, refetch: refetchWastage } = useProductionWastage({ startDate, endDate });

    const s = summaryData?.data?.summary;
    const byProduct = byProductData?.data || [];
    const wastage = wastageData?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtNum = (n) => new Intl.NumberFormat('en-LK', { maximumFractionDigits: 2 }).format(n || 0);

    const handleRefreshAll = () => {
        refetchSummary();
        refetchProducts();
        refetchWastage();
    };

    const handleExportExcel = () => {
        if (!byProduct.length) return;
        const columns = [
            { header: 'Product Code', dataKey: 'productCode' },
            { header: 'Product Name', dataKey: 'productName' },
            { header: 'Production Orders Count', dataKey: 'orderCount', format: (v) => Number(v) || 0 },
            { header: 'Planned Quantity', dataKey: 'totalPlanned', format: (v) => Number(v) || 0 },
            { header: 'Actual Produced Quantity', dataKey: 'totalProduced', format: (v) => Number(v) || 0 },
            { header: 'Yield %', dataKey: 'yieldPercent', format: (v) => Number(v) || 0 },
            { header: 'Avg Cost per Unit (LKR)', dataKey: 'avgCostPerUnit', format: (v) => Number(v) || 0 },
            { header: 'Total Production Cost (LKR)', dataKey: 'totalActualCost', format: (v) => Number(v) || 0 },
        ];
        exportToExcel(byProduct, `Production_Report_${startDate}_to_${endDate}`, 'Production By Product', columns);
    };

    const handleExportPDF = () => {
        if (!byProduct.length) return;
        const columns = [
            { header: 'Code', dataKey: 'productCode' },
            { header: 'Product Name', dataKey: 'productName' },
            { header: 'Orders', dataKey: 'orderCount', isNumeric: true },
            { header: 'Planned Qty', dataKey: 'totalPlanned', isNumeric: true, format: (v) => fmtNum(v) },
            { header: 'Produced Qty', dataKey: 'totalProduced', isNumeric: true, format: (v) => fmtNum(v) },
            { header: 'Yield %', dataKey: (r) => `${r.yieldPercent}%`, halign: 'center' },
            { header: 'Cost/Unit', dataKey: 'avgCostPerUnit', isNumeric: true, format: (v) => fmt(v) },
            { header: 'Total Cost (LKR)', dataKey: 'totalActualCost', isNumeric: true, format: (v) => fmt(v) },
        ];

        const summaryCards = s ? [
            { label: 'Production Orders', value: String(s.totalOrders || 0) },
            { label: 'Units Produced', value: fmtNum(s.totalProducedQty) },
            { label: 'Average Yield', value: `${s.yieldPercent}%` },
            { label: 'Total Actual Cost', value: fmt(s.totalActualCost) },
            { label: 'Cost Variance', value: fmt(s.totalVariance) },
        ] : [];

        exportToPDF('Production & Manufacturing Performance Report', columns, byProduct, `Production_Report_${startDate}_to_${endDate}`, {
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

    const productColumns = [
        { key: 'productCode', label: 'Code', render: (r) => <span className="font-mono text-xs font-semibold text-slate-800">{r.productCode}</span> },
        { key: 'productName', label: 'Product Name', render: (r) => <span className="font-medium text-slate-900">{r.productName}</span> },
        { key: 'orderCount', label: 'Batches', render: (r) => <span className="text-slate-600 font-mono text-xs">{r.orderCount}</span> },
        { key: 'totalPlanned', label: 'Planned Qty', render: (r) => <span className="text-slate-600">{fmtNum(r.totalPlanned)}</span> },
        { key: 'totalProduced', label: 'Produced Qty', render: (r) => <span className="font-semibold text-slate-900">{fmtNum(r.totalProduced)}</span> },
        {
            key: 'yieldPercent', label: 'Yield Efficiency', render: (r) => (
                <Badge variant={r.yieldPercent >= 95 ? 'success' : r.yieldPercent >= 85 ? 'warning' : 'danger'}>
                    {r.yieldPercent}%
                </Badge>
            )
        },
        { key: 'avgCostPerUnit', label: 'Avg Cost/Unit', render: (r) => fmt(r.avgCostPerUnit) },
        { key: 'totalActualCost', label: 'Total Cost', render: (r) => <span className="font-bold text-slate-900">{fmt(r.totalActualCost)}</span> },
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
                title="Production Performance Report"
                description="Manufacturing batch outputs, material yield ratios, cost variances, and factory floor scrap"
                actions={
                    <ReportExportButtons
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        onRefresh={handleRefreshAll}
                        disabled={byProduct.length === 0}
                        loading={isSummaryLoading || isProductLoading}
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

            {s && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard label="Production Orders" value={s.totalOrders} subtext="Executed batch runs" />
                    <KpiCard
                        label="Units Produced"
                        value={fmtNum(s.totalProducedQty)}
                        subtext={`Average Yield: ${s.yieldPercent}%`}
                    />
                    <KpiCard
                        label="Total Production Cost"
                        value={fmt(s.totalActualCost)}
                        subtext={`Planned Cost: ${fmt(s.totalPlannedCost)}`}
                    />
                    <KpiCard
                        label="Cost Variance"
                        value={fmt(s.totalVariance)}
                        subtext={`${s.variancePercent}% vs BOM budget`}
                        trend={-s.variancePercent}
                    />
                </div>
            )}

            {/* Table By Product */}
            <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Manufacturing Yield Breakdown by SKU</h3>
                    <span className="text-xs text-slate-500 font-medium">{byProduct.length} products produced</span>
                </div>
                {isProductLoading ? (
                    <div className="py-20 text-center">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
                        <p className="text-slate-500 font-medium text-sm">Loading manufacturing batch summaries...</p>
                    </div>
                ) : byProduct.length === 0 ? (
                    <div className="py-20 text-center text-slate-500">
                        <p className="text-base font-semibold text-slate-700">No production runs recorded in this period</p>
                        <p className="text-xs text-slate-400 mt-1">Adjust the date range or create batches from the Production module</p>
                    </div>
                ) : (
                    <Table columns={productColumns} data={byProduct} />
                )}
            </Card>

            {/* Wastage Section */}
            {wastage && wastage.byProduct && wastage.byProduct.length > 0 && (
                <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                    <div className="px-6 py-4 border-b border-slate-100 bg-rose-50/40 flex justify-between items-center">
                        <div>
                            <h3 className="text-sm font-bold text-rose-900 uppercase tracking-wider">Production Scrap & Wastage Audit</h3>
                            <p className="text-xs text-rose-600 mt-0.5">Damaged materials during processing</p>
                        </div>
                        <span className="text-base font-bold text-rose-700">{fmt(wastage.totalWastageValue)}</span>
                    </div>
                    <Table
                        columns={[
                            { key: 'productName', label: 'Product Details', render: (r) => <div><p className="text-sm font-medium text-slate-900">{r.productName}</p><p className="text-xs font-mono text-slate-400">{r.productCode}</p></div> },
                            { key: 'count', label: 'Incident Logs', render: (r) => <span className="font-mono text-xs">{r.count}</span> },
                            { key: 'totalQuantity', label: 'Quantity Scrapped', render: (r) => <span className="font-semibold text-slate-800">{fmtNum(r.totalQuantity)}</span> },
                            { key: 'totalValue', label: 'Financial Loss', render: (r) => <span className="font-bold text-rose-600">{fmt(r.totalValue)}</span> },
                        ]}
                        data={wastage.byProduct}
                    />
                </Card>
            )}
        </div>
    );
}