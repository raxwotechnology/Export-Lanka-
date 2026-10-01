import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, CheckCircle, XCircle, Ban, Plane, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import Pagination from '../components/ui/Pagination';

import { useLeaves, useCreateLeave, useLeaveActions, useEmployees, useLeaveStructures, useHolidays } from '../features/hr/useHr';
import { useAuthStore } from '../store/authStore';

import LeaveStructuresPage from './LeaveStructuresPage';
import HolidaysPage from './HolidaysPage';

const statusVariant = {
    pending: 'warning', approved: 'success', rejected: 'danger', cancelled: 'default',
};

export default function LeaveRequestsPage({ initialTab = 'leaves' }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const urlTab = searchParams.get('tab') || initialTab;
    const [activeTab, setActiveTab] = useState(urlTab);

    const { user } = useAuthStore();
    const canApprove = ['admin', 'manager'].includes(user?.role);

    // Sync tab when initialTab or searchParams change
    useEffect(() => {
        const target = searchParams.get('tab') || initialTab;
        if (target && target !== activeTab) {
            setActiveTab(target);
        }
    }, [initialTab, searchParams]);

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        if (newTab === 'leaves') {
            navigate('/leaves');
        } else {
            navigate(`/leaves?tab=${newTab}`);
        }
    };

    const [filters, setFilters] = useState({ status: '', page: 1, limit: 20 });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [actionModal, setActionModal] = useState(null);
    const [rejectReason, setRejectReason] = useState('');

    const [form, setForm] = useState({
        employeeId: '', leaveType: 'annual', fromDate: '', toDate: '',
        isHalfDay: false, reason: '',
    });

    const { data } = useLeaves(filters);
    const { data: empData } = useEmployees({ status: 'active', limit: 500 });
    const { data: structuresData } = useLeaveStructures();
    const { data: holidaysData } = useHolidays({ year: new Date().getFullYear() });

    const createM = useCreateLeave();
    const actions = useLeaveActions();

    const leaves = data?.data || [];
    const totalLeaves = data?.total || leaves.length;
    const structuresCount = structuresData?.data?.length || 0;
    const holidaysCount = holidaysData?.data?.length || 0;

    const empOptions = (empData?.data || []).map((e) => ({ value: e._id, label: `${e.firstName} ${e.lastName} (${e.employeeCode})` }));

    const computeDays = () => {
        if (!form.fromDate || !form.toDate) return 0;
        if (form.isHalfDay) return 0.5;
        const from = new Date(form.fromDate); const to = new Date(form.toDate);
        return Math.floor((to - from) / (1000 * 60 * 60 * 24)) + 1;
    };

    const submitLeave = async () => {
        if (!form.employeeId || !form.fromDate || !form.toDate || !form.reason) {
            toast.error('All fields required'); return;
        }
        try {
            await createM.mutateAsync(form);
            setIsFormOpen(false);
            setForm({ employeeId: '', leaveType: 'annual', fromDate: '', toDate: '', isHalfDay: false, reason: '' });
        } catch { }
    };

    const handleAction = async () => {
        const { type, leave } = actionModal;
        try {
            if (type === 'approve') await actions.approve.mutateAsync(leave._id);
            else if (type === 'reject') await actions.reject.mutateAsync({ id: leave._id, reason: rejectReason });
            else if (type === 'cancel') await actions.cancel.mutateAsync(leave._id);
            setActionModal(null); setRejectReason('');
        } catch { }
    };

    const columns = [
        { key: 'leaveNumber', label: 'Ref', render: (r) => <span className="font-mono text-xs font-semibold">{r.leaveNumber}</span> },
        {
            key: 'employee', label: 'Employee', render: (r) => (
                <div>
                    <p className="font-semibold text-sm text-gray-900">{r.employeeName}</p>
                    <p className="text-xs text-gray-500 font-mono">{r.employeeCode}</p>
                </div>
            )
        },
        { key: 'type', label: 'Type', render: (r) => <Badge>{r.leaveType}</Badge> },
        {
            key: 'dates', label: 'Dates', render: (r) => (
                <div>
                    <p className="text-sm font-medium">{new Date(r.fromDate).toLocaleDateString('en-LK')} — {new Date(r.toDate).toLocaleDateString('en-LK')}</p>
                    <p className="text-xs text-gray-500">{r.numberOfDays} day{r.numberOfDays > 1 ? 's' : ''}{r.isHalfDay ? ' (half)' : ''}</p>
                </div>
            )
        },
        { key: 'reason', label: 'Reason', render: (r) => <p className="text-xs text-gray-600 max-w-xs truncate">{r.reason}</p> },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status]}>{r.status}</Badge> },
        {
            key: 'actions', label: '', width: '120px', render: (r) => (
                <div className="flex gap-1 justify-end">
                    {r.status === 'pending' && canApprove && (
                        <>
                            <button onClick={() => setActionModal({ type: 'approve', leave: r })}
                                className="p-1 hover:bg-emerald-50 text-emerald-600 rounded" title="Approve"><CheckCircle size={16} /></button>
                            <button onClick={() => setActionModal({ type: 'reject', leave: r })}
                                className="p-1 hover:bg-red-50 text-red-600 rounded" title="Reject"><XCircle size={16} /></button>
                        </>
                    )}
                    {['pending', 'approved'].includes(r.status) && (
                        <button onClick={() => setActionModal({ type: 'cancel', leave: r })}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500" title="Cancel"><Ban size={16} /></button>
                    )}
                </div>
            )
        },
    ];

    return (
        <div className="space-y-6">
            {/* ─── EXECUTIVE HEADER ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            Time & Leave Management
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">Applications, Quotas & Public Holidays</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Leave & Holiday Management</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Manage employee leave requests, approve absences, set annual leave structures, and monitor public holidays.
                    </p>
                </div>

                {activeTab === 'leaves' && (
                    <Button variant="primary" onClick={() => setIsFormOpen(true)} className="shadow-sm">
                        <Plus size={16} className="mr-1.5" /> Request Leave
                    </Button>
                )}
            </div>

            {/* ─── 3 COLOR-CODED MODULE BUTTONS / CARDS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Leave Requests Button (Royal Blue) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('leaves')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'leaves'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-blue-600 shadow-lg shadow-blue-600/20 ring-2 ring-blue-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'leaves'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'
                            }`}
                        >
                            <Plane size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Applications
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Leave Requests
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'leaves' ? 'text-blue-100' : 'text-slate-500'}`}>
                                Requests & approvals
                            </p>
                        </div>
                    </div>
                    {totalLeaves > 0 && (
                        <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                                activeTab === 'leaves'
                                    ? 'bg-white text-blue-900'
                                    : 'bg-blue-100 text-blue-800'
                            }`}
                        >
                            {totalLeaves}
                        </span>
                    )}
                </button>

                {/* 2. Leave Structures Button (Vibrant Purple) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('structures')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'structures'
                            ? 'bg-gradient-to-r from-purple-600 to-violet-700 text-white border-purple-600 shadow-lg shadow-purple-600/20 ring-2 ring-purple-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'structures'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white'
                            }`}
                        >
                            <FileText size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Templates
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Leave Structures
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'structures' ? 'text-purple-100' : 'text-slate-500'}`}>
                                Annual quota policies
                            </p>
                        </div>
                    </div>
                    {structuresCount > 0 && (
                        <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                                activeTab === 'structures'
                                    ? 'bg-white text-purple-900'
                                    : 'bg-purple-100 text-purple-800'
                            }`}
                        >
                            {structuresCount}
                        </span>
                    )}
                </button>

                {/* 3. Public Holidays Button (Teal / Cyan) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('holidays')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'holidays'
                            ? 'bg-gradient-to-r from-teal-600 to-cyan-700 text-white border-teal-600 shadow-lg shadow-teal-600/20 ring-2 ring-teal-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'holidays'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-teal-100 text-teal-700 group-hover:bg-teal-600 group-hover:text-white'
                            }`}
                        >
                            <Calendar size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Calendar
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Public Holidays
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'holidays' ? 'text-teal-100' : 'text-slate-500'}`}>
                                Company & bank holidays
                            </p>
                        </div>
                    </div>
                    {holidaysCount > 0 && (
                        <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                                activeTab === 'holidays'
                                    ? 'bg-white text-teal-900'
                                    : 'bg-teal-100 text-teal-800'
                            }`}
                        >
                            {holidaysCount}
                        </span>
                    )}
                </button>
            </div>

            {/* ─── TAB 1: LEAVE REQUESTS CONTENT ─── */}
            {activeTab === 'leaves' && (
                <Card>
                    <div className="p-4 border-b flex gap-3">
                        <div className="w-48">
                            <Select placeholder="All Statuses"
                                options={[
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'approved', label: 'Approved' },
                                    { value: 'rejected', label: 'Rejected' },
                                    { value: 'cancelled', label: 'Cancelled' },
                                ]}
                                value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} />
                        </div>
                    </div>
                    {leaves.length === 0
                        ? <EmptyState icon={Plane} title="No leave requests" description="Submit a leave request to get started" />
                        : <>
                            <Table columns={columns} data={leaves} />
                            <Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0}
                                onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                        </>}
                </Card>
            )}

            {/* ─── TAB 2: LEAVE STRUCTURES CONTENT ─── */}
            {activeTab === 'structures' && (
                <LeaveStructuresPage embedded={true} />
            )}

            {/* ─── TAB 3: PUBLIC HOLIDAYS CONTENT ─── */}
            {activeTab === 'holidays' && (
                <HolidaysPage embedded={true} />
            )}

            {/* ─── REQUEST LEAVE MODAL ─── */}
            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="New Leave Request" size="md">
                <div className="p-6 space-y-4">
                    <Select label="Employee *" options={empOptions} value={form.employeeId}
                        onChange={(e) => setForm((f) => ({ ...f, employeeId: e.target.value }))} required />
                    <Select label="Leave Type *"
                        options={[
                            { value: 'annual', label: 'Annual Leave' },
                            { value: 'casual', label: 'Casual Leave' },
                            { value: 'sick', label: 'Sick Leave' },
                            { value: 'maternity', label: 'Maternity Leave' },
                            { value: 'paternity', label: 'Paternity Leave' },
                            { value: 'unpaid', label: 'Unpaid Leave' },
                        ]}
                        value={form.leaveType} onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value }))} required />
                    <div className="grid grid-cols-2 gap-3">
                        <Input label="From Date *" type="date" value={form.fromDate}
                            onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))} required />
                        <Input label="To Date *" type="date" value={form.toDate}
                            onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))} required />
                    </div>
                    {computeDays() > 0 && (
                        <p className="text-xs text-gray-500 font-medium">Duration: <strong>{computeDays()} day(s)</strong></p>
                    )}
                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                        <input type="checkbox" checked={form.isHalfDay}
                            onChange={(e) => setForm((f) => ({ ...f, isHalfDay: e.target.checked }))} className="rounded" />
                        Half-day leave
                    </label>
                    <Textarea label="Reason *" placeholder="Reason for leave..." value={form.reason}
                        onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} rows={2} required />
                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button variant="primary" onClick={submitLeave} loading={createM.isLoading}>Submit Request</Button>
                    </div>
                </div>
            </Modal>

            {/* ─── ACTION CONFIRM MODAL ─── */}
            <Modal isOpen={!!actionModal} onClose={() => { setActionModal(null); setRejectReason(''); }}
                title={`${actionModal?.type === 'approve' ? 'Approve' : actionModal?.type === 'reject' ? 'Reject' : 'Cancel'} Leave Request`} size="sm">
                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600">
                        Are you sure you want to {actionModal?.type} the leave request for <strong>{actionModal?.leave?.employeeName}</strong>?
                    </p>
                    {actionModal?.type === 'reject' && (
                        <Textarea label="Reason for rejection *" placeholder="Explain why this request is rejected..."
                            value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} required />
                    )}
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => { setActionModal(null); setRejectReason(''); }}>Cancel</Button>
                        <Button variant={actionModal?.type === 'approve' ? 'primary' : 'danger'} onClick={handleAction}
                            loading={actions.approve.isLoading || actions.reject.isLoading || actions.cancel.isLoading}>
                            Confirm
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}