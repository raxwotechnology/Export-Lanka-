import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Search, Filter, History, User as UserIcon,
    Database, Activity, ChevronLeft, ChevronRight,
    Eye, ExternalLink, Mail, CheckCircle2, XCircle,
    RefreshCw, Clock, Send, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

export default function AuditLogPage({ initialTab = 'audit' }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Determine current tab from URL path or search param
    const currentTabFromUrl = useMemo(() => {
        if (location.pathname.includes('/sms')) return 'sms';
        const tabParam = searchParams.get('tab');
        if (tabParam === 'sms') return 'sms';
        return initialTab || 'audit';
    }, [location.pathname, searchParams, initialTab]);

    const [activeTab, setActiveTab] = useState(currentTabFromUrl);

    useEffect(() => {
        setActiveTab(currentTabFromUrl);
    }, [currentTabFromUrl]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        if (tab === 'sms') {
            navigate('/audit-logs?tab=sms');
        } else {
            navigate('/audit-logs?tab=audit');
        }
    };

    // ─────────────────────────────────────────────────────────────────────────────
    // TAB 1: SYSTEM AUDIT LOGS STATE & LOGIC
    // ─────────────────────────────────────────────────────────────────────────────
    const [auditLogs, setAuditLogs] = useState([]);
    const [auditLoading, setAuditLoading] = useState(true);
    const [auditPage, setAuditPage] = useState(1);
    const [auditTotalPages, setAuditTotalPages] = useState(1);
    const [auditSearch, setAuditSearch] = useState('');
    const [auditFilters, setAuditFilters] = useState({
        module: '',
        action: '',
        userId: '',
    });

    const fetchAuditLogs = useCallback(async () => {
        setAuditLoading(true);
        try {
            const params = {
                ...auditFilters,
                page: auditPage,
                limit: 50
            };
            const { data } = await api.get('/audit', { params });
            setAuditLogs(data.data || []);
            setAuditTotalPages(data.pages || 1);
        } catch {
            toast.error('Failed to fetch audit logs');
        } finally {
            setAuditLoading(false);
        }
    }, [auditPage, auditFilters]);

    useEffect(() => {
        if (activeTab === 'audit') {
            fetchAuditLogs();
        }
    }, [activeTab, fetchAuditLogs]);

    const getActionBadge = (action) => {
        const styles = {
            create: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
            update: 'bg-blue-50 text-blue-700 border border-blue-200',
            delete: 'bg-red-50 text-red-700 border border-red-200',
            export: 'bg-purple-50 text-purple-700 border border-purple-200',
            login: 'bg-amber-50 text-amber-700 border border-amber-200',
            logout: 'bg-slate-100 text-slate-700 border border-slate-200',
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${styles[action] || 'bg-gray-100 text-gray-700'}`}>
                {action}
            </span>
        );
    };

    // Filter audit logs client-side if search text provided
    const filteredAuditLogs = useMemo(() => {
        if (!auditSearch.trim()) return auditLogs;
        const q = auditSearch.toLowerCase();
        return auditLogs.filter(log => {
            const userFull = log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'System';
            return (
                userFull.toLowerCase().includes(q) ||
                (log.description || '').toLowerCase().includes(q) ||
                (log.module || '').toLowerCase().includes(q) ||
                (log.action || '').toLowerCase().includes(q) ||
                (log.ipAddress || '').toLowerCase().includes(q)
            );
        });
    }, [auditLogs, auditSearch]);

    // ─────────────────────────────────────────────────────────────────────────────
    // TAB 2: SMS LOGS STATE & LOGIC
    // ─────────────────────────────────────────────────────────────────────────────
    const [smsLogs, setSmsLogs] = useState([]);
    const [smsLoading, setSmsLoading] = useState(true);
    const [smsSearchTerm, setSmsSearchTerm] = useState('');
    const [smsPage, setSmsPage] = useState(1);
    const [smsTotalPages, setSmsTotalPages] = useState(1);

    // Manual SMS States
    const [isSmsModalOpen, setIsSmsModalOpen] = useState(false);
    const [manualContact, setManualContact] = useState('');
    const [manualName, setManualName] = useState('');
    const [manualMessage, setManualMessage] = useState('');
    const [sendingSms, setSendingSms] = useState(false);

    const fetchSmsLogs = useCallback(async () => {
        setSmsLoading(true);
        try {
            const res = await api.get(`/audit/sms?page=${smsPage}&limit=20`);
            setSmsLogs(res.data.data || []);
            setSmsTotalPages(res.data.pages || 1);
        } catch {
            toast.error('Failed to load SMS logs');
        } finally {
            setSmsLoading(false);
        }
    }, [smsPage]);

    useEffect(() => {
        if (activeTab === 'sms') {
            fetchSmsLogs();
        }
    }, [activeTab, fetchSmsLogs]);

    const handleSendManualSms = async (e) => {
        e.preventDefault();
        if (!manualContact || !manualMessage) {
            toast.error('Mobile number and message are required');
            return;
        }

        setSendingSms(true);
        try {
            const res = await api.post('/audit/sms/send-manual', {
                contact: manualContact,
                recipientName: manualName,
                message: manualMessage
            });

            if (res.data?.success) {
                toast.success('SMS sent successfully via SMSlenz!');
                setIsSmsModalOpen(false);
                setManualContact('');
                setManualName('');
                setManualMessage('');
                fetchSmsLogs();
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || 'Failed to send manual SMS';
            toast.error(errMsg);
        } finally {
            setSendingSms(false);
        }
    };

    const filteredSmsLogs = useMemo(() => {
        if (!smsSearchTerm.trim()) return smsLogs;
        const q = smsSearchTerm.toLowerCase();
        return smsLogs.filter(log =>
            [log.supplierName, log.supplierPhone, log.message, log.grnId?.grnNumber].some(
                field => (field || '').toLowerCase().includes(q)
            )
        );
    }, [smsLogs, smsSearchTerm]);

    return (
        <div className="space-y-6">
            {/* ─── EXECUTIVE HEADER ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-white shadow-xs">
                            System Administration
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 font-medium">Compliance, Security & Notification History</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Audit & SMS Logs</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Centralized tracking for user activities, security changes, and automated SMS gateway deliveries.
                    </p>
                </div>

                <div className="flex items-center gap-2.5">
                    {activeTab === 'audit' ? (
                        <button
                            onClick={fetchAuditLogs}
                            className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 text-slate-700 text-sm font-semibold transition shadow-xs"
                            title="Refresh Audit Logs"
                        >
                            <RefreshCw size={15} className={auditLoading ? 'animate-spin text-zinc-700' : ''} />
                            Refresh
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={fetchSmsLogs}
                                className="p-2 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 text-slate-600 transition shadow-xs"
                                title="Refresh SMS Logs"
                            >
                                <RefreshCw size={16} className={smsLoading ? 'animate-spin text-zinc-700' : ''} />
                            </button>
                            <button
                                onClick={() => setIsSmsModalOpen(true)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-sm font-semibold rounded-xl hover:bg-zinc-800 transition shadow-sm"
                            >
                                <Mail size={16} />
                                Send Custom SMS
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ─── 2 CONSOLIDATED MODULE SELECTION CARDS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Tab 1: System Audit Logs */}
                <button
                    type="button"
                    onClick={() => handleTabChange('audit')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'audit'
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-md ring-2 ring-zinc-700/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-zinc-400 hover:bg-slate-50/80 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'audit'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-zinc-100 text-zinc-800 group-hover:bg-zinc-900 group-hover:text-white'
                            }`}
                        >
                            <History size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Activity & Security
                            </span>
                            <h2 className="text-base font-bold truncate">1. System Audit Logs</h2>
                            <p className={`text-xs truncate ${activeTab === 'audit' ? 'text-zinc-300' : 'text-slate-500'}`}>
                                User logins, records created, updated or deleted
                            </p>
                        </div>
                    </div>
                    <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                            activeTab === 'audit'
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-700 group-hover:bg-zinc-200'
                        }`}
                    >
                        {auditLogs.length} Records
                    </span>
                </button>

                {/* Tab 2: SMS Gateway Logs */}
                <button
                    type="button"
                    onClick={() => handleTabChange('sms')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'sms'
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-md ring-2 ring-zinc-700/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-zinc-400 hover:bg-slate-50/80 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'sms'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-zinc-100 text-zinc-800 group-hover:bg-zinc-900 group-hover:text-white'
                            }`}
                        >
                            <Mail size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                SMSlenz Gateway
                            </span>
                            <h2 className="text-base font-bold truncate">2. SMS Dispatch Logs</h2>
                            <p className={`text-xs truncate ${activeTab === 'sms' ? 'text-zinc-300' : 'text-slate-500'}`}>
                                Automated GRN alerts & custom supplier text messages
                            </p>
                        </div>
                    </div>
                    <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                            activeTab === 'sms'
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-700 group-hover:bg-zinc-200'
                        }`}
                    >
                        {smsLogs.length} Dispatches
                    </span>
                </button>
            </div>

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* VIEW 1: SYSTEM AUDIT LOGS CONTENT */}
            {/* ───────────────────────────────────────────────────────────────── */}
            {activeTab === 'audit' && (
                <div className="space-y-4">
                    {/* Filters & Search */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-wrap gap-4 items-center">
                        <div className="flex-1 min-w-[220px]">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Search Audit Logs</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by user, description, IP, action..."
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-700 transition"
                                    value={auditSearch}
                                    onChange={(e) => setAuditSearch(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="w-full sm:w-48">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Module</label>
                            <select
                                className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-700 transition"
                                value={auditFilters.module}
                                onChange={(e) => setAuditFilters({ ...auditFilters, module: e.target.value })}
                            >
                                <option value="">All Modules</option>
                                <option value="products">Products</option>
                                <option value="customers">Customers</option>
                                <option value="export">Exports</option>
                                <option value="auth">Auth</option>
                                <option value="sales">Sales</option>
                                <option value="inventory">Inventory</option>
                            </select>
                        </div>

                        <div className="w-full sm:w-48">
                            <label className="block text-xs font-semibold text-gray-500 mb-1">Action</label>
                            <select
                                className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-700 transition"
                                value={auditFilters.action}
                                onChange={(e) => setAuditFilters({ ...auditFilters, action: e.target.value })}
                            >
                                <option value="">All Actions</option>
                                <option value="create">Create</option>
                                <option value="update">Update</option>
                                <option value="delete">Delete</option>
                                <option value="export">Export</option>
                                <option value="login">Login</option>
                                <option value="logout">Logout</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                                    <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                    <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Module / Action</th>
                                    <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="px-6 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider">IP Address</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {auditLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan="5" className="px-6 py-4">
                                                <div className="h-4 bg-gray-100 rounded w-full"></div>
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredAuditLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-gray-400 italic">
                                            No audit logs found matching criteria
                                        </td>
                                    </tr>
                                ) : (
                                    filteredAuditLogs.map((log) => (
                                        <tr key={log._id} className="hover:bg-gray-50/70 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <p className="text-xs font-mono text-gray-800">
                                                    {log.createdAt ? format(new Date(log.createdAt), 'yyyy-MM-dd HH:mm:ss') : '—'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 bg-zinc-100 border border-zinc-200 rounded-full flex items-center justify-center flex-shrink-0">
                                                        <UserIcon size={13} className="text-zinc-700" />
                                                    </div>
                                                    <span className="text-sm font-semibold text-gray-800">
                                                        {log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'System'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2 py-0.5 rounded capitalize">
                                                        {log.module}
                                                    </span>
                                                    {getActionBadge(log.action)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-700 max-w-md">
                                                {log.description}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded border border-gray-200">
                                                    {log.ipAddress || '127.0.0.1'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        <div className="px-6 py-3.5 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <p className="text-xs font-medium text-gray-500">
                                Page {auditPage} of {auditTotalPages}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    disabled={auditPage === 1}
                                    onClick={() => setAuditPage(p => Math.max(1, p - 1))}
                                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-white disabled:opacity-40 transition shadow-2xs"
                                >
                                    Previous
                                </button>
                                <button
                                    disabled={auditPage === auditTotalPages}
                                    onClick={() => setAuditPage(p => Math.min(auditTotalPages, p + 1))}
                                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-white disabled:opacity-40 transition shadow-2xs"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ───────────────────────────────────────────────────────────────── */}
            {/* VIEW 2: SMS GATEWAY DISPATCH LOGS CONTENT */}
            {/* ───────────────────────────────────────────────────────────────── */}
            {activeTab === 'sms' && (
                <div className="space-y-4">
                    {/* Filters & Search */}
                    <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex justify-between items-center">
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search supplier, mobile, message, GRN..."
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-700 transition"
                                value={smsSearchTerm}
                                onChange={(e) => setSmsSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    <th className="px-5 py-3.5">Timestamp</th>
                                    <th className="px-5 py-3.5">Supplier Name</th>
                                    <th className="px-5 py-3.5">Mobile No.</th>
                                    <th className="px-5 py-3.5">SMS Message Content</th>
                                    <th className="px-5 py-3.5">Related GRN</th>
                                    <th className="px-5 py-3.5 text-center">Gateway Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700 text-sm">
                                {smsLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td colSpan="6" className="px-5 py-5">
                                                <div className="h-4 bg-gray-100 rounded w-full" />
                                            </td>
                                        </tr>
                                    ))
                                ) : filteredSmsLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-5 py-12 text-center text-gray-400 italic">
                                            No SMS dispatch logs found
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSmsLogs.map((log) => (
                                        <tr key={log._id} className="hover:bg-gray-50/70 transition">
                                            <td className="px-5 py-4 whitespace-nowrap text-xs font-mono text-gray-800">
                                                {log.date ? format(new Date(log.date), 'yyyy-MM-dd HH:mm:ss') : '—'}
                                            </td>
                                            <td className="px-5 py-4 font-bold text-gray-900 whitespace-nowrap">
                                                {log.supplierName}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap font-mono text-xs text-gray-700">
                                                {log.supplierPhone}
                                            </td>
                                            <td className="px-5 py-4 max-w-sm truncate text-gray-700" title={log.message}>
                                                {log.message}
                                            </td>
                                            <td className="px-5 py-4 whitespace-nowrap">
                                                {log.grnId ? (
                                                    <span className="font-mono text-xs font-semibold text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded border border-zinc-200">
                                                        {log.grnId.grnNumber}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">—</span>
                                                )}
                                            </td>
                                            <td className="px-5 py-4 text-center whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                    log.status === 'sent' 
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                                        : 'bg-red-50 text-red-700 border border-red-200'
                                                }`}>
                                                    {log.status === 'sent' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                                                    {log.status === 'sent' ? 'Sent' : 'Failed'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>

                        {/* Pagination */}
                        {smsTotalPages > 1 && (
                            <div className="flex justify-between items-center px-6 py-3.5 border-t border-gray-100 bg-gray-50/50">
                                <span className="text-xs text-gray-500 font-medium">Page {smsPage} of {smsTotalPages}</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setSmsPage(p => Math.max(1, p - 1))}
                                        disabled={smsPage === 1}
                                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-white transition"
                                    >
                                        Previous
                                    </button>
                                    <button
                                        onClick={() => setSmsPage(p => Math.min(smsTotalPages, p + 1))}
                                        disabled={smsPage === smsTotalPages}
                                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-white transition"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── MANUAL SMS MODAL ─── */}
            <Modal
                isOpen={isSmsModalOpen}
                onClose={() => {
                    if (!sendingSms) setIsSmsModalOpen(false);
                }}
                title="Send Custom Manual SMS"
                size="md"
            >
                <form onSubmit={handleSendManualSms} className="p-6 space-y-4">
                    <p className="text-xs text-gray-500 leading-normal">
                        Enter a Sri Lankan mobile number and message to manually dispatch via the SMSlenz gateway. The number will be formatted to international format automatically.
                    </p>

                    <Input
                        label="Recipient Mobile Number"
                        placeholder="e.g. 0772268608 or +94772268608"
                        required
                        value={manualContact}
                        onChange={(e) => setManualContact(e.target.value)}
                        disabled={sendingSms}
                    />

                    <Input
                        label="Recipient Name / Description"
                        placeholder="e.g. Golden Cafe Test (Optional)"
                        value={manualName}
                        onChange={(e) => setManualName(e.target.value)}
                        disabled={sendingSms}
                    />

                    <div className="space-y-1">
                        <Textarea
                            label="Message Content"
                            placeholder="Type your message here..."
                            required
                            rows={4}
                            value={manualMessage}
                            onChange={(e) => setManualMessage(e.target.value)}
                            disabled={sendingSms}
                            maxLength={1500}
                        />
                        <div className="flex justify-between text-[10px] text-gray-400">
                            <span>Max 1500 characters</span>
                            <span>{manualMessage.length} / 1500</span>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsSmsModalOpen(false)}
                            className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
                            disabled={sendingSms}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex items-center gap-1.5 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white text-sm font-semibold rounded-lg transition disabled:opacity-50"
                            disabled={sendingSms}
                        >
                            {sendingSms ? (
                                <>
                                    <RefreshCw className="animate-spin" size={14} />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    <Send size={14} />
                                    Send SMS
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}
