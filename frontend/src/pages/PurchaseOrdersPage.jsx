import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Eye, ShoppingBag, Truck, RotateCcw } from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import { usePurchaseOrders } from '../features/purchaseOrders/usePurchaseOrders';
import { useAuthStore } from '../store/authStore';

import SuppliersPage from './SuppliersPage';
import SupplierReturnsPage from './SupplierReturnsPage';

const statusVariant = {
    draft: 'default',
    pending_approval: 'warning',
    approved: 'info',
    sent: 'info',
    partially_received: 'warning',
    fully_received: 'success',
    closed: 'success',
    cancelled: 'danger',
};

export default function PurchaseOrdersPage({ initialTab = 'orders' }) {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlTab = searchParams.get('tab') || initialTab;
    const [activeTab, setActiveTab] = useState(urlTab);

    useEffect(() => {
        const target = searchParams.get('tab') || initialTab;
        if (target && target !== activeTab) {
            setActiveTab(target);
        }
    }, [initialTab, searchParams]);

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        if (newTab === 'orders') {
            navigate('/purchase-orders');
        } else if (newTab === 'suppliers') {
            navigate('/suppliers');
        } else if (newTab === 'returns') {
            navigate('/supplier-returns');
        }
    };

    const { user } = useAuthStore();
    const canCreate = ['admin', 'manager', 'accountant'].includes(user?.role);

    const [filters, setFilters] = useState({ search: '', status: '', page: 1, limit: 10 });
    const { data, isLoading } = usePurchaseOrders(filters);

    const orders = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

    const columns = [
        { key: 'poNumber', label: 'PO #', width: '120px', render: (r) => <span className="font-mono text-xs">{r.poNumber}</span> },
        { key: 'poDate', label: 'Date', render: (r) => fmtDate(r.poDate) },
        {
            key: 'supplier', label: 'Supplier',
            render: (r) => (
                <div>
                    <p className="font-medium">{r.supplierSnapshot?.name}</p>
                    <p className="text-xs text-gray-500">{r.supplierSnapshot?.code}</p>
                </div>
            ),
        },
        { key: 'warehouse', label: 'Deliver To', render: (r) => r.deliverTo?.warehouseName || '—' },
        { key: 'items', label: 'Items', render: (r) => r.items?.length || 0 },
        { key: 'grandTotal', label: 'Total', render: (r) => <span className="font-medium">{fmt(r.grandTotal)}</span> },
        {
            key: 'receipt', label: 'Received',
            render: (r) => (
                <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500" style={{ width: `${r.receiptCompletionPercent || 0}%` }} />
                    </div>
                    <span className="text-xs">{Math.round(r.receiptCompletionPercent || 0)}%</span>
                </div>
            ),
        },
        { key: 'status', label: 'Status', render: (r) => <Badge variant={statusVariant[r.status]}>{r.status.replace('_', ' ')}</Badge> },
        {
            key: 'actions', label: '', width: '60px',
            render: (r) => (
                <button onClick={(e) => { e.stopPropagation(); navigate(`/purchase-orders/${r._id}`); }}
                    className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded" title="View">
                    <Eye size={16} />
                </button>
            ),
        },
    ];

    return (
        <div>
            {/* ─── EXECUTIVE HEADER ─── */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                            Procurement & Supply Hub
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">Vendors, Orders & Returns</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Purchasing & Suppliers</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Manage vendor relationships, purchase requisitions, supplier dispatches, and return debit memos.
                    </p>
                </div>
                {activeTab === 'orders' && canCreate && (
                    <Button variant="primary" onClick={() => navigate('/purchase-orders/new')} className="bg-blue-600 hover:bg-blue-700 shadow-xs">
                        <Plus size={16} className="mr-1.5" /> New PO
                    </Button>
                )}
            </div>

            {/* ─── 3 COLOR-CODED MODULE BUTTONS / CARDS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mb-6">
                {/* 1. Purchase Orders (Royal Blue) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('orders')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'orders'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-blue-600 shadow-lg shadow-blue-600/20 ring-2 ring-blue-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'orders'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'
                            }`}
                        >
                            <ShoppingBag size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Procurement
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Purchase Orders
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'orders' ? 'text-blue-100' : 'text-slate-500'}`}>
                                Orders & receipts
                            </p>
                        </div>
                    </div>
                    {total > 0 && (
                        <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                activeTab === 'orders'
                                    ? 'bg-white text-blue-800'
                                    : 'bg-blue-100 text-blue-800'
                            }`}
                        >
                            {total}
                        </span>
                    )}
                </button>

                {/* 2. Suppliers Master (Emerald Green) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('suppliers')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'suppliers'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'suppliers'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                            }`}
                        >
                            <Truck size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Vendor Network
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Suppliers Master
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'suppliers' ? 'text-emerald-100' : 'text-slate-500'}`}>
                                Directory & balances
                            </p>
                        </div>
                    </div>
                </button>

                {/* 3. Supplier Returns (Warm Amber) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('returns')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'returns'
                            ? 'bg-gradient-to-r from-amber-600 to-orange-700 text-white border-amber-600 shadow-lg shadow-amber-600/20 ring-2 ring-amber-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'returns'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white'
                            }`}
                        >
                            <RotateCcw size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Claims & Defects
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Supplier Returns
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'returns' ? 'text-amber-100' : 'text-slate-500'}`}>
                                Debit notes & credits
                            </p>
                        </div>
                    </div>
                </button>
            </div>

            {/* ─── TAB CONTENT AREA ─── */}
            {activeTab === 'orders' && (
                <Card>
                    <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search by PO number or supplier..."
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                                value={filters.search}
                                onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))} />
                        </div>
                        <div className="w-56">
                            <Select placeholder="All Statuses"
                                options={[
                                    { value: 'draft', label: 'Draft' },
                                    { value: 'approved', label: 'Approved' },
                                    { value: 'sent', label: 'Sent to Supplier' },
                                    { value: 'partially_received', label: 'Partially Received' },
                                    { value: 'fully_received', label: 'Fully Received' },
                                    { value: 'closed', label: 'Closed' },
                                    { value: 'cancelled', label: 'Cancelled' },
                                ]}
                                value={filters.status}
                                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))} />
                        </div>
                    </div>

                    {isLoading ? (
                        <div className="py-16 text-center text-gray-500">Loading...</div>
                    ) : orders.length === 0 ? (
                        <EmptyState icon={ShoppingBag} title="No purchase orders" description="Create your first PO"
                            action={canCreate && <Button variant="primary" onClick={() => navigate('/purchase-orders/new')}>
                                <Plus size={16} className="mr-1.5" /> New PO
                            </Button>} />
                    ) : (
                        <>
                            <Table columns={columns} data={orders} onRowClick={(r) => navigate(`/purchase-orders/${r._id}`)} />
                            <Pagination page={filters.page} totalPages={totalPages} total={total}
                                onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} />
                        </>
                    )}
                </Card>
            )}

            {activeTab === 'suppliers' && (
                <SuppliersPage embedded={true} />
            )}

            {activeTab === 'returns' && (
                <SupplierReturnsPage embedded={true} />
            )}
        </div>
    );
}