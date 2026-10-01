import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus, XCircle, Info } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import ReportExportButtons from '../../components/ui/ReportExportButtons';
import { useSlowFastMovers } from '../../features/reports/useReports';
import { useSettings } from '../../features/settings/useSettings';
import { exportToExcel, exportToPDF } from '../../utils/dataExport';

const classBadges = {
    A: { variant: 'success', icon: TrendingUp, label: 'Fast Mover (A)', desc: 'Top 80% Revenue' },
    B: { variant: 'info', icon: Minus, label: 'Medium Mover (B)', desc: 'Next 15% Revenue' },
    C: { variant: 'warning', icon: TrendingDown, label: 'Slow Mover (C)', desc: 'Bottom 5% Revenue' },
    D: { variant: 'danger', icon: XCircle, label: 'Dead Stock (D)', desc: 'Zero Sales in Period' },
};

export default function SlowFastMoversReportPage() {
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const [days, setDays] = useState(90);
    const [classFilter, setClassFilter] = useState('all');
    const { data, isLoading, refetch } = useSlowFastMovers({ days });

    const report = data?.data;
    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtNum = (n) => new Intl.NumberFormat('en-LK', { maximumFractionDigits: 0 }).format(n || 0);

    const filteredItems = !report ? [] : (
        classFilter === 'all'
            ? [...(report.classification?.A || []), ...(report.classification?.B || []), ...(report.classification?.C || []), ...(report.classification?.D || [])]
            : report.classification[classFilter] || []
    );

    const handleExportExcel = () => {
        if (!filteredItems.length) return;
        const columns = [
            { header: 'Product Code', dataKey: 'productCode' },
            { header: 'Product Name', dataKey: 'productName' },
            { header: 'ABC Class', dataKey: 'abcClass' },
            { header: 'Units Sold', dataKey: 'unitsSold', format: (v) => Number(v) || 0 },
            { header: 'Revenue (LKR)', dataKey: 'revenue', format: (v) => Number(v) || 0 },
            { header: 'Cumulative %', dataKey: (r) => r.cumulativePercent ? `${r.cumulativePercent}%` : '0%' },
        ];
        exportToExcel(filteredItems, `ABC_Analysis_Slow_Fast_Movers_${days}d`, 'ABC Analysis', columns);
    };

    const handleExportPDF = () => {
        if (!filteredItems.length) return;
        const columns = [
            { header: 'Code', dataKey: 'productCode' },
            { header: 'Product Name', dataKey: 'productName' },
            { header: 'ABC Class', dataKey: 'abcClass', halign: 'center' },
            { header: 'Units Sold', dataKey: 'unitsSold', isNumeric: true, format: (v) => fmtNum(v) },
            { header: 'Revenue (LKR)', dataKey: 'revenue', isNumeric: true, format: (v) => fmt(v) },
            { header: 'Cumulative %', dataKey: (r) => r.cumulativePercent ? `${r.cumulativePercent}%` : '—', halign: 'right' },
        ];

        const summaryCards = report ? [
            { label: 'Class A (Fast)', value: `${report.summary?.fastMovers || 0} items` },
            { label: 'Class B (Medium)', value: `${report.summary?.mediumMovers || 0} items` },
            { label: 'Class C (Slow)', value: `${report.summary?.slowMovers || 0} items` },
            { label: 'Class D (Dead)', value: `${report.summary?.deadStock || 0} items` },
        ] : [];

        exportToPDF('Slow & Fast Movers Report (ABC Analysis)', columns, filteredItems, `ABC_Analysis_Slow_Fast_Movers_${days}d`, {
            period: `Evaluation Period: Last ${days} Days (${classFilter.toUpperCase()} items)`,
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
        {
            key: 'abcClass', label: 'Classification', render: (r) => {
                const b = classBadges[r.abcClass] || { variant: 'info', label: r.abcClass };
                return <Badge variant={b.variant}>{b.label}</Badge>;
            }
        },
        { key: 'unitsSold', label: 'Units Sold', render: (r) => <span className="font-semibold text-slate-800">{fmtNum(r.unitsSold)}</span> },
        { key: 'revenue', label: 'Turnover Revenue', render: (r) => <span className="font-bold text-emerald-700">{fmt(r.revenue)}</span> },
        { key: 'cumulativePercent', label: 'Pareto Share', render: (r) => <span className="text-slate-500 font-mono text-xs">{r.cumulativePercent ? `${r.cumulativePercent}%` : '—'}</span> },
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Slow & Fast Movers (ABC Analysis)"
                description="Pareto inventory intelligence — optimize working capital by identifying fast runners and dead stock"
                actions={
                    <ReportExportButtons
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        onRefresh={() => refetch()}
                        disabled={!filteredItems.length}
                        loading={isLoading}
                    />
                }
            />

            {/* Filter Toolbar */}
            <Card className="p-4 bg-white border border-slate-200 shadow-sm rounded-xl">
                <div className="flex flex-wrap items-end gap-3">
                    <div className="w-40">
                        <Input
                            label="Analysis Window (days)"
                            type="number"
                            min="7"
                            max="365"
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value) || 30)}
                        />
                    </div>
                    <div className="flex gap-1.5 ml-auto">
                        <Button variant={days === 30 ? 'primary' : 'outline'} size="sm" onClick={() => setDays(30)}>30 Days</Button>
                        <Button variant={days === 60 ? 'primary' : 'outline'} size="sm" onClick={() => setDays(60)}>60 Days</Button>
                        <Button variant={days === 90 ? 'primary' : 'outline'} size="sm" onClick={() => setDays(90)}>90 Days</Button>
                        <Button variant={days === 180 ? 'primary' : 'outline'} size="sm" onClick={() => setDays(180)}>180 Days</Button>
                    </div>
                </div>
            </Card>

            {isLoading || !report ? (
                <div className="py-20 text-center bg-white rounded-xl border border-slate-200">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mb-3" />
                    <p className="text-slate-500 font-medium text-sm">Computing ABC Pareto classifications...</p>
                </div>
            ) : (
                <>
                    {/* Interactive Filter Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {Object.entries(classBadges).map(([key, b]) => {
                            const count = report.summary[
                                key === 'A' ? 'fastMovers' : key === 'B' ? 'mediumMovers' : key === 'C' ? 'slowMovers' : 'deadStock'
                            ] || 0;
                            const isSelected = classFilter === key;

                            return (
                                <Card
                                    key={key}
                                    className={`p-4 cursor-pointer transition-all duration-200 border rounded-xl hover:shadow-md ${
                                        isSelected ? 'ring-2 ring-emerald-600 border-emerald-500 bg-emerald-50/20' : 'border-slate-200 bg-white'
                                    }`}
                                    onClick={() => setClassFilter(classFilter === key ? 'all' : key)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                            key === 'A' ? 'bg-emerald-100 text-emerald-700'
                                                : key === 'B' ? 'bg-blue-100 text-blue-700'
                                                    : key === 'C' ? 'bg-amber-100 text-amber-700'
                                                        : 'bg-rose-100 text-rose-700'
                                        }`}>
                                            <b.icon size={20} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-500">{b.label}</p>
                                            <p className="text-xl font-bold text-slate-900">{count} <span className="text-xs font-normal text-slate-400">items</span></p>
                                            <p className="text-[11px] text-slate-400">{b.desc}</p>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {/* Informative Guidance Banner */}
                    <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-start gap-3">
                        <Info size={18} className="text-emerald-700 mt-0.5 shrink-0" />
                        <div className="text-xs text-emerald-900 leading-relaxed">
                            <strong>Inventory Pareto Rule:</strong> <strong>Class A</strong> products generate 80% of revenue — maintain buffer safety stocks and avoid stockouts. <strong>Class B</strong> accounts for 15% — standard replenishment. <strong>Class C</strong> accounts for 5% — review margins. <strong>Class D</strong> has zero sales in the last {days} days — initiate promotions or clearance to release locked liquidity.
                        </div>
                    </div>

                    {/* Table */}
                    <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                        {filteredItems.length === 0 ? (
                            <div className="py-20 text-center text-slate-500">
                                <p className="text-base font-semibold text-slate-700">No items found in Class {classFilter.toUpperCase()}</p>
                                <p className="text-xs text-slate-400 mt-1">Select another class or widen the time frame</p>
                            </div>
                        ) : (
                            <Table columns={columns} data={filteredItems} />
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}