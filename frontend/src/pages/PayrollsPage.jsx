import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Play, Eye, DollarSign, Calculator } from 'lucide-react';
import toast from 'react-hot-toast';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import EmptyState from '../components/ui/EmptyState';

import { usePayrolls, useProcessPayroll, useSalaryStructures } from '../features/hr/useHr';
import SalaryStructuresPage from './SalaryStructuresPage';

const months = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const statusVariant = {
    draft: 'default', processed: 'warning', approved: 'info', paid: 'success', closed: 'default',
};

export default function PayrollsPage({ initialTab = 'payroll' }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const urlTab = searchParams.get('tab') || initialTab;
    const [activeTab, setActiveTab] = useState(urlTab);

    // Sync tab when initialTab or searchParams change
    useEffect(() => {
        const target = searchParams.get('tab') || initialTab;
        if (target && target !== activeTab) {
            setActiveTab(target);
        }
    }, [initialTab, searchParams]);

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        if (newTab === 'payroll') {
            navigate('/payroll');
        } else {
            navigate(`/payroll?tab=${newTab}`);
        }
    };

    const [year, setYear] = useState(new Date().getFullYear());
    const { data, isLoading } = usePayrolls({ year });
    const { data: structuresData } = useSalaryStructures();
    const processM = useProcessPayroll();

    const [isProcessOpen, setIsProcessOpen] = useState(false);
    const [processMonth, setProcessMonth] = useState(new Date().getMonth() + 1);
    const [processYear, setProcessYear] = useState(new Date().getFullYear());
    const [overtimeRate, setOvertimeRate] = useState(0);

    const payrolls = data?.data || [];
    const structuresCount = structuresData?.data?.length || 0;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const submitProcess = async () => {
        try {
            const result = await processM.mutateAsync({
                periodMonth: +processMonth,
                periodYear: +processYear,
                overtimeRatePerHour: +overtimeRate || 0,
            });
            setIsProcessOpen(false);
            navigate(`/payroll/${result.data._id}`);
        } catch { }
    };

    const columns = [
        { key: 'payrollNumber', label: 'Ref', render: (r) => <span className="font-mono text-xs font-semibold">{r.payrollNumber}</span> },
        { key: 'period', label: 'Period', render: (r) => <span className="font-semibold text-gray-900">{months[r.periodMonth - 1]?.label} {r.periodYear}</span> },
        { key: 'employees', label: 'Employees', render: (r) => r.totalEmployees },
        { key: 'gross', label: 'Gross', render: (r) => <span className="font-mono font-medium">{fmt(r.totalGrossEarnings)}</span> },
        { key: 'deductions', label: 'Deductions', render: (r) => <span className="font-mono text-red-600 font-medium">{fmt(r.totalDeductions)}</span> },
        { key: 'net', label: 'Net Pay', render: (r) => <span className="font-mono font-bold text-emerald-700">{fmt(r.totalNetPay)}</span> },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge> },
        {
            key: 'actions', label: '', width: '80px', render: (r) => (
                <button onClick={() => navigate(`/payroll/${r._id}`)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition" title="View Details">
                    <Eye size={16} />
                </button>
            )
        },
    ];

    return (
        <div className="space-y-6">
            {/* ─── EXECUTIVE HEADER ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Finance & Compensation
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">Monthly Runs & Salary Formulas</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Payroll & Compensation</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Process monthly employee wages, manage pay slips, and configure salary structure formulas.
                    </p>
                </div>

                {activeTab === 'payroll' && (
                    <Button variant="primary" onClick={() => setIsProcessOpen(true)} className="shadow-sm">
                        <Play size={16} className="mr-1.5" /> Run Payroll
                    </Button>
                )}
            </div>

            {/* ─── 2 COLOR-CODED MODULE BUTTONS / CARDS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Payroll Processing Button (Emerald Green) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('payroll')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'payroll'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'payroll'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                            }`}
                        >
                            <DollarSign size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Monthly Runs
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Payroll Processing
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'payroll' ? 'text-emerald-100' : 'text-slate-500'}`}>
                                Pay runs & slip disbursements
                            </p>
                        </div>
                    </div>
                    {payrolls.length > 0 && (
                        <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                                activeTab === 'payroll'
                                    ? 'bg-white text-emerald-800'
                                    : 'bg-emerald-100 text-emerald-800'
                            }`}
                        >
                            {payrolls.length}
                        </span>
                    )}
                </button>

                {/* 2. Salary Structures Button (Warm Amber / Gold) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('structures')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'structures'
                            ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/25 ring-2 ring-yellow-400/40 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/60 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'structures'
                                    ? 'bg-slate-950/15 text-slate-950 font-bold'
                                    : 'bg-amber-100 text-amber-800 group-hover:bg-amber-500 group-hover:text-slate-950'
                            }`}
                        >
                            <Calculator size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Formulas & Allowances
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Salary Structures
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'structures' ? 'text-amber-950/80 font-medium' : 'text-slate-500'}`}>
                                Earnings & deduction templates
                            </p>
                        </div>
                    </div>
                    {structuresCount > 0 && (
                        <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                                activeTab === 'structures'
                                    ? 'bg-slate-950 text-yellow-300 shadow-xs'
                                    : 'bg-amber-100 text-amber-900 border border-amber-200/60'
                            }`}
                        >
                            {structuresCount}
                        </span>
                    )}
                </button>
            </div>

            {/* ─── TAB 1: PAYROLL PROCESSING CONTENT ─── */}
            {activeTab === 'payroll' && (
                <Card>
                    <div className="p-4 border-b flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-700">Filter Year:</span>
                            <select 
                                value={year} 
                                onChange={(e) => setYear(+e.target.value)} 
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white"
                            >
                                {[2023, 2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    {isLoading ? (
                        <div className="py-16 text-center text-gray-500">Loading payroll runs...</div>
                    ) : payrolls.length === 0 ? (
                        <EmptyState 
                            icon={DollarSign} 
                            title="No payroll runs found" 
                            description="Run payroll for the current month to calculate employee salaries" 
                            action={
                                <Button variant="primary" onClick={() => setIsProcessOpen(true)}>
                                    <Play size={16} className="mr-1.5" /> Run Payroll
                                </Button>
                            } 
                        />
                    ) : (
                        <Table columns={columns} data={payrolls} onRowClick={(r) => navigate(`/payroll/${r._id}`)} />
                    )}
                </Card>
            )}

            {/* ─── TAB 2: SALARY STRUCTURES CONTENT ─── */}
            {activeTab === 'structures' && (
                <SalaryStructuresPage embedded={true} />
            )}

            {/* ─── PROCESS PAYROLL MODAL ─── */}
            <Modal isOpen={isProcessOpen} onClose={() => setIsProcessOpen(false)} title="Run Monthly Payroll" size="sm">
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">
                        This calculates earnings, deductions, and EPF/ETF statutory contributions for all active employees.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        <Select label="Month *" options={months} value={processMonth}
                            onChange={(e) => setProcessMonth(+e.target.value)} required />
                        <Input label="Year *" type="number" value={processYear}
                            onChange={(e) => setProcessYear(+e.target.value)} required />
                    </div>
                    <Input label="OT Rate per Hour (LKR)" type="number" min="0" value={overtimeRate}
                        onChange={(e) => setOvertimeRate(e.target.value)} />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsProcessOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={submitProcess} loading={processM.isLoading}>Process & Review</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}