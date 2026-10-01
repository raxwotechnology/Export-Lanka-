import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Table from '../../components/ui/Table';
import KpiCard from '../../components/ui/KpiCard';
import Badge from '../../components/ui/Badge';
import ReportExportButtons from '../../components/ui/ReportExportButtons';
import {
    useHeadcountReport, useAttendanceReport, useLeavePatternsReport, usePayrollSummaryReport,
} from '../../features/reports/useReports';
import { useSettings } from '../../features/settings/useSettings';
import { exportToExcel, exportToPDF } from '../../utils/dataExport';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function HrReportsPage() {
    const navigate = useNavigate();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const { data: headData, isLoading: isHeadLoading, refetch: refetchHead } = useHeadcountReport();
    const { data: attData, isLoading: isAttLoading, refetch: refetchAtt } = useAttendanceReport({ startDate, endDate });
    const { data: leaveData, refetch: refetchLeave } = useLeavePatternsReport({ year });
    const { data: payrollData, isLoading: isPayrollLoading, refetch: refetchPayroll } = usePayrollSummaryReport({ year });

    const head = headData?.data;
    const att = attData?.data;
    const leave = leaveData?.data;
    const payroll = payrollData?.data;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 0 }).format(n || 0);

    const handleRefreshAll = () => {
        refetchHead();
        refetchAtt();
        refetchLeave();
        refetchPayroll();
    };

    const handleExportExcel = () => {
        const rows = [];
        // Attendance
        if (att?.byEmployee?.length) {
            att.byEmployee.forEach(e => {
                rows.push({
                    'Report Section': 'Attendance Logs',
                    'Employee Code': e.employeeCode,
                    'Employee Name': e.employeeName,
                    'Metric / Present': `${e.present || 0} days`,
                    'Absent': `${e.absent || 0} days`,
                    'Late Minutes': e.totalLateMinutes || 0,
                    'OT Hours': Number((e.totalOvertimeMinutes / 60).toFixed(1)) || 0,
                    'Net Pay / Value (LKR)': '—'
                });
            });
        }
        // Payroll
        if (payroll?.monthly?.length) {
            payroll.monthly.forEach(m => {
                rows.push({
                    'Report Section': 'Payroll Summary',
                    'Employee Code': '—',
                    'Employee Name': `${monthNames[m.periodMonth - 1]} ${m.periodYear}`,
                    'Metric / Present': `${m.totalEmployees} Employees`,
                    'Absent': '—',
                    'Late Minutes': 0,
                    'OT Hours': 0,
                    'Net Pay / Value (LKR)': m.totalNetPay || 0
                });
            });
        }

        if (!rows.length) return;
        exportToExcel(rows, `HR_Workforce_Report_${year}`, 'HR & Payroll Summary');
    };

    const handleExportPDF = () => {
        const rows = [];
        if (payroll?.monthly?.length) {
            payroll.monthly.forEach(m => {
                rows.push({
                    period: `${monthNames[m.periodMonth - 1]} ${m.periodYear}`,
                    empCount: String(m.totalEmployees),
                    gross: fmt(m.totalGrossEarnings),
                    epf: fmt((m.totalEpfEmployee || 0) + (m.totalEpfEmployer || 0)),
                    etf: fmt(m.totalEtf),
                    net: fmt(m.totalNetPay),
                    status: m.status?.toUpperCase() || 'PROCESSED'
                });
            });
        } else if (att?.byEmployee?.length) {
            att.byEmployee.forEach(e => {
                rows.push({
                    period: e.employeeCode,
                    empCount: e.employeeName,
                    gross: `${e.present || 0} Present`,
                    epf: `${e.absent || 0} Absent`,
                    etf: `${e.totalLateMinutes || 0} min late`,
                    net: `${(e.totalOvertimeMinutes / 60).toFixed(1)} hrs OT`,
                    status: 'ATTENDANCE'
                });
            });
        }

        if (!rows.length) return;

        const columns = [
            { header: 'Period / Month', dataKey: 'period' },
            { header: 'Employees', dataKey: 'empCount', halign: 'center' },
            { header: 'Gross Earnings (LKR)', dataKey: 'gross', halign: 'right' },
            { header: 'Total EPF (20%)', dataKey: 'epf', halign: 'right' },
            { header: 'Total ETF (3%)', dataKey: 'etf', halign: 'right' },
            { header: 'Disbursed Net Pay', dataKey: 'net', halign: 'right' },
            { header: 'Status', dataKey: 'status', halign: 'center' },
        ];

        const summaryCards = payroll ? [
            { label: 'Total Headcount', value: String(head?.total || 0) },
            { label: 'YTD Gross Pay', value: fmt(payroll.yearTotals?.gross) },
            { label: 'YTD Net Disbursed', value: fmt(payroll.yearTotals?.netPay) },
            { label: 'YTD Statutory EPF', value: fmt((payroll.yearTotals?.epfEmployee || 0) + (payroll.yearTotals?.epfEmployer || 0)) },
        ] : [];

        exportToPDF('Human Resources & Payroll Compliance Report', columns, rows, `HR_Workforce_Report_${year}`, {
            period: `Fiscal Year: ${year}`,
            companyName: settings?.companyName,
            companyTagline: settings?.companyTagline,
            companyAddress: settings?.companyAddress,
            companyPhone: settings?.companyPhone,
            companyEmail: settings?.companyEmail,
            summaryCards,
            orientation: 'landscape'
        });
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Human Resources & Payroll Reports"
                description="Staff headcount metrics, employee attendance compliance, leave tracking, and statutory payroll schedules"
                actions={
                    <ReportExportButtons
                        onExportExcel={handleExportExcel}
                        onExportPDF={handleExportPDF}
                        onRefresh={handleRefreshAll}
                        disabled={!head && !payroll}
                        loading={isHeadLoading || isAttLoading || isPayrollLoading}
                    />
                }
            />

            {/* Headcount Section */}
            {head && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KpiCard label="Total Headcount" value={head.total} subtext="Total registered personnel" />
                        <KpiCard label="Functional Departments" value={head.byDepartment.length} subtext="Active cost centers" />
                        <KpiCard label="Active Status" value={head.byStatus.find((s) => s._id === 'active')?.count || 0} subtext="Full-time active on floor" trend={1} />
                        <KpiCard label="Probationary Staff" value={head.byStatus.find((s) => s._id === 'probation')?.count || 0} subtext="Evaluation period" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Staff Count by Department</h3>
                            </div>
                            <Table
                                columns={[
                                    { key: 'name', label: 'Department', render: (r) => <span className="font-medium text-slate-800">{r.name || 'Unassigned'}</span> },
                                    { key: 'count', label: 'Headcount', render: (r) => <span className="font-semibold text-slate-900">{r.count}</span> },
                                ]}
                                data={head.byDepartment}
                            />
                        </Card>
                        <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Employment Terms Distribution</h3>
                            </div>
                            <Table
                                columns={[
                                    { key: '_id', label: 'Contract Type', render: (r) => <Badge variant="outline" className="capitalize">{r._id?.replace(/_/g, ' ')}</Badge> },
                                    { key: 'count', label: 'Employee Count', render: (r) => <span className="font-semibold text-slate-900">{r.count}</span> },
                                ]}
                                data={head.byEmploymentType}
                            />
                        </Card>
                    </div>
                </>
            )}

            {/* Attendance Summary */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Attendance Performance Audit</h3>
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

                {att && att.byEmployee && att.byEmployee.length > 0 && (
                    <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                        <Table
                            columns={[
                                { key: 'employee', label: 'Employee', render: (r) => <div><p className="text-sm font-medium text-slate-900">{r.employeeName}</p><p className="text-xs text-slate-400 font-mono">{r.employeeCode}</p></div> },
                                { key: 'present', label: 'Days Present', render: (r) => <span className="font-semibold text-emerald-700">{r.present}</span> },
                                { key: 'absent', label: 'Absences', render: (r) => r.absent > 0 ? <span className="text-rose-600 font-bold">{r.absent}</span> : <span className="text-slate-400">0</span> },
                                { key: 'late', label: 'Late Incidents', render: (r) => r.late > 0 ? <span className="text-amber-600">{r.late}</span> : <span className="text-slate-400">0</span> },
                                { key: 'leave', label: 'Leaves', render: (r) => r.leave || 0 },
                                { key: 'halfDay', label: 'Half Days', render: (r) => r.halfDay || 0 },
                                { key: 'lateMin', label: 'Total Late (Min)', render: (r) => <span className="font-mono text-xs text-slate-600">{r.totalLateMinutes || 0}</span> },
                                { key: 'otHours', label: 'OT Hours', render: (r) => <span className="font-semibold text-slate-800">{((r.totalOvertimeMinutes || 0) / 60).toFixed(1)} hrs</span> },
                            ]}
                            data={att.byEmployee}
                        />
                    </Card>
                )}
            </div>

            {/* Leave Patterns */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Leave Entitlement & Utilization ({year})</h3>
                    <div className="w-32">
                        <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value) || 2026)} />
                    </div>
                </div>

                {leave && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Leaves by Classification</h3>
                            </div>
                            <Table
                                columns={[
                                    { key: '_id', label: 'Leave Policy Type', render: (r) => <Badge variant="outline" className="capitalize">{r._id}</Badge> },
                                    { key: 'count', label: 'Applications', render: (r) => <span className="font-semibold text-slate-800">{r.count}</span> },
                                    { key: 'totalDays', label: 'Cumulative Days', render: (r) => <span className="font-bold text-slate-900">{r.totalDays}</span> },
                                ]}
                                data={leave.byType}
                            />
                        </Card>
                        <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
                                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Top Leave Utilization</h3>
                            </div>
                            <Table
                                columns={[
                                    { key: 'employee', label: 'Employee', render: (r) => <div><p className="text-sm font-medium text-slate-900">{r.employeeName}</p><p className="text-xs text-slate-400 font-mono">{r.employeeCode}</p></div> },
                                    { key: 'leaveCount', label: 'Leave Requests', render: (r) => <span className="text-slate-600">{r.leaveCount}</span> },
                                    { key: 'totalDays', label: 'Days Off', render: (r) => <span className="font-bold text-rose-700">{r.totalDays} days</span> },
                                ]}
                                data={leave.topTakers}
                            />
                        </Card>
                    </div>
                )}
            </div>

            {/* Payroll Summary */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Statutory Payroll & Compliance Summary ({year})</h3>
                {payroll && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <KpiCard label="YTD Gross Earnings" value={fmt(payroll.yearTotals.gross)} subtext="Total wages calculated" />
                            <KpiCard label="YTD Net Disbursed" value={fmt(payroll.yearTotals.netPay)} subtext="Direct payroll payout" />
                            <KpiCard label="YTD Total EPF (20%)" value={fmt(payroll.yearTotals.epfEmployee + payroll.yearTotals.epfEmployer)} subtext="Employee 8% + Employer 12%" />
                            <KpiCard label="YTD APIT Withheld" value={fmt(payroll.yearTotals.apit)} subtext="Inland Revenue tax remittance" />
                        </div>
                        <Card className="overflow-hidden bg-white border border-slate-200 shadow-sm rounded-xl">
                            <Table
                                columns={[
                                    { key: 'period', label: 'Period Month', render: (r) => <span className="font-semibold text-slate-900">{monthNames[r.periodMonth - 1]} {r.periodYear}</span> },
                                    { key: 'totalEmployees', label: 'Headcount', render: (r) => <span className="font-mono text-xs">{r.totalEmployees}</span> },
                                    { key: 'gross', label: 'Gross Pay', render: (r) => fmt(r.totalGrossEarnings) },
                                    { key: 'epfEmp', label: 'EPF Emp (8%)', render: (r) => fmt(r.totalEpfEmployee) },
                                    { key: 'epfEmpr', label: 'EPF Empr (12%)', render: (r) => fmt(r.totalEpfEmployer) },
                                    { key: 'etf', label: 'ETF (3%)', render: (r) => fmt(r.totalEtf) },
                                    { key: 'apit', label: 'APIT', render: (r) => fmt(r.totalApit) },
                                    { key: 'net', label: 'Net Disbursed', render: (r) => <span className="font-bold text-emerald-800">{fmt(r.totalNetPay)}</span> },
                                    { key: 'status', label: 'Payroll Status', render: (r) => <Badge variant={r.status === 'paid' ? 'success' : 'warning'}>{r.status}</Badge> },
                                ]}
                                data={payroll.monthly}
                            />
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}