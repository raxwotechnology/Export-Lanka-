import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    Plus, Search, Eye, Users, Mail, Phone, Building2, Award, Trophy 
} from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';

import { useEmployees, useDepartments, useDesignations } from '../features/hr/useHr';
import DepartmentsPage from './DepartmentsPage';
import DesignationsPage from './DesignationsPage';
import EmployeeOfMonthPage from './EmployeeOfMonthPage';

const statusVariant = {
    active: 'success', on_leave: 'warning', probation: 'info',
    suspended: 'danger', terminated: 'default', resigned: 'default', retired: 'default',
};

export default function EmployeesPage({ initialTab = 'employees' }) {
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
        if (newTab === 'employees') {
            navigate('/employees');
        } else {
            navigate(`/employees?tab=${newTab}`);
        }
    };

    const [filters, setFilters] = useState({ search: '', departmentId: '', status: 'active', page: 1, limit: 20 });

    const { data, isLoading } = useEmployees(filters);
    const { data: deptsData } = useDepartments();
    const { data: desigsData } = useDesignations();

    const employees = data?.data || [];
    const totalEmployees = data?.total || employees.length;
    const depts = deptsData?.data || [];
    const desigs = desigsData?.data || [];
    const deptOptions = depts.map((d) => ({ value: d._id, label: d.name }));

    const columns = [
        { key: 'employeeCode', label: 'ID', width: '100px', render: (r) => <span className="font-mono text-xs font-semibold">{r.employeeCode}</span> },
        {
            key: 'name', label: 'Name',
            render: (r) => (
                <div>
                    <p className="font-semibold text-gray-900">{r.firstName} {r.lastName}</p>
                    <p className="text-xs text-gray-500">
                        {r.email && <span className="inline-flex items-center gap-1 mr-2"><Mail size={10} />{r.email}</span>}
                        {r.phone && <span className="inline-flex items-center gap-1"><Phone size={10} />{r.phone}</span>}
                    </p>
                </div>
            ),
        },
        { key: 'department', label: 'Department', render: (r) => r.departmentId?.name || '—' },
        { key: 'designation', label: 'Designation', render: (r) => r.designationId?.name || '—' },
        { key: 'employmentType', label: 'Type', render: (r) => <Badge>{r.employmentType?.replace(/_/g, ' ')}</Badge> },
        { key: 'dateOfJoining', label: 'Joined', render: (r) => r.dateOfJoining ? new Date(r.dateOfJoining).toLocaleDateString('en-LK') : '—' },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status]}>{r.status?.replace(/_/g, ' ')}</Badge> },
        {
            key: 'actions', label: '', width: '50px', render: (r) => (
                <button onClick={() => navigate(`/employees/${r._id}`)} className="p-1.5 hover:bg-gray-100 rounded text-gray-600 transition"><Eye size={16} /></button>
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
                            Human Resources
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">Staff & Organization Master</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Staff & Organization</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Manage company personnel, departmental divisions, job designations, and employee recognition.
                    </p>
                </div>

                {activeTab === 'employees' && (
                    <Button variant="primary" onClick={() => navigate('/employees/new')} className="shadow-sm">
                        <Plus size={16} className="mr-1.5" /> Add Employee
                    </Button>
                )}
            </div>

            {/* ─── 4 COLOR-CODED MODULE BUTTONS / CARDS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* 1. Employees Button (Emerald Green) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('employees')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'employees'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'employees'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                            }`}
                        >
                            <Users size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Personnel
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Employees
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'employees' ? 'text-emerald-100' : 'text-slate-500'}`}>
                                Profiles & details
                            </p>
                        </div>
                    </div>
                    {totalEmployees > 0 && (
                        <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                activeTab === 'employees'
                                    ? 'bg-white text-emerald-800'
                                    : 'bg-emerald-100 text-emerald-800'
                            }`}
                        >
                            {totalEmployees}
                        </span>
                    )}
                </button>

                {/* 2. Departments Button (Amber / Gold) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('departments')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'departments'
                            ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/25 ring-2 ring-yellow-400/40 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/60 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'departments'
                                    ? 'bg-slate-950/15 text-slate-950 font-bold'
                                    : 'bg-amber-100 text-amber-800 group-hover:bg-amber-500 group-hover:text-slate-950'
                            }`}
                        >
                            <Building2 size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Structure
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Departments
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'departments' ? 'text-amber-950/80 font-medium' : 'text-slate-500'}`}>
                                Divisions & units
                            </p>
                        </div>
                    </div>
                    {depts.length > 0 && (
                        <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                activeTab === 'departments'
                                    ? 'bg-slate-950 text-yellow-300'
                                    : 'bg-amber-100 text-amber-900 border border-amber-200/60'
                            }`}
                        >
                            {depts.length}
                        </span>
                    )}
                </button>

                {/* 3. Designations Button (Vibrant Purple) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('designations')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'designations'
                            ? 'bg-gradient-to-r from-purple-600 to-violet-700 text-white border-purple-600 shadow-lg shadow-purple-600/20 ring-2 ring-purple-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'designations'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white'
                            }`}
                        >
                            <Award size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Roles
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Designations
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'designations' ? 'text-purple-100' : 'text-slate-500'}`}>
                                Job titles & hierarchy
                            </p>
                        </div>
                    </div>
                    {desigs.length > 0 && (
                        <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                activeTab === 'designations'
                                    ? 'bg-white text-purple-900'
                                    : 'bg-purple-100 text-purple-800'
                            }`}
                        >
                            {desigs.length}
                        </span>
                    )}
                </button>

                {/* 4. Employee of Month Button (Royal Blue) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('month')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'month'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-blue-600 shadow-lg shadow-blue-600/20 ring-2 ring-blue-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'month'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'
                            }`}
                        >
                            <Trophy size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Recognition
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Employee of Month
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'month' ? 'text-blue-100' : 'text-slate-500'}`}>
                                Top performers
                            </p>
                        </div>
                    </div>
                    <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                            activeTab === 'month'
                                ? 'bg-white text-blue-900'
                                : 'bg-blue-100 text-blue-800'
                        }`}
                    >
                        🥇
                    </span>
                </button>
            </div>

            {/* ─── TAB 1: EMPLOYEES CONTENT ─── */}
            {activeTab === 'employees' && (
                <Card>
                    <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search by name, code, email..."
                                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                                value={filters.search}
                                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} 
                            />
                        </div>
                        <div className="w-full sm:w-48">
                            <Select 
                                placeholder="All Departments" 
                                options={deptOptions}
                                value={filters.departmentId}
                                onChange={(e) => setFilters((f) => ({ ...f, departmentId: e.target.value, page: 1 }))} 
                            />
                        </div>
                        <div className="w-full sm:w-40">
                            <Select 
                                placeholder="All Statuses"
                                options={[
                                    { value: 'active', label: 'Active' },
                                    { value: 'on_leave', label: 'On Leave' },
                                    { value: 'probation', label: 'Probation' },
                                    { value: 'suspended', label: 'Suspended' },
                                    { value: 'terminated', label: 'Terminated' },
                                    { value: 'resigned', label: 'Resigned' },
                                ]}
                                value={filters.status}
                                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} 
                            />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-16 text-center text-gray-500">Loading employees...</div>
                    ) : employees.length === 0 ? (
                        <EmptyState 
                            icon={Users} 
                            title="No employees found" 
                            description="Add your first employee to get started"
                            action={<Button variant="primary" onClick={() => navigate('/employees/new')}>Add Employee</Button>} 
                        />
                    ) : (
                        <>
                            <Table columns={columns} data={employees} onRowClick={(r) => navigate(`/employees/${r._id}`)} />
                            <Pagination 
                                page={filters.page} 
                                totalPages={data.totalPages} 
                                total={data.total}
                                onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} 
                            />
                        </>
                    )}
                </Card>
            )}

            {/* ─── TAB 2: DEPARTMENTS CONTENT ─── */}
            {activeTab === 'departments' && (
                <DepartmentsPage embedded={true} />
            )}

            {/* ─── TAB 3: DESIGNATIONS CONTENT ─── */}
            {activeTab === 'designations' && (
                <DesignationsPage embedded={true} />
            )}

            {/* ─── TAB 4: EMPLOYEE OF MONTH CONTENT ─── */}
            {activeTab === 'month' && (
                <EmployeeOfMonthPage />
            )}
        </div>
    );
}