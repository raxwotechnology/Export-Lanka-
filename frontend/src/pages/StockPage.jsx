import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
    Search, Boxes, AlertTriangle, PackagePlus, ArrowRightLeft, 
    Settings2, History, Edit, Trash2, Sliders, Filter, X, 
    Layers, PackageCheck, Building2, Tag, ChevronDown, RotateCcw
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import ConfirmDialog from '../components/ui/ConfirmDialog';

import { useStockItems, useReleaseStock, useUpdateStockItem, useDeleteStockItem } from '../features/stock/useStock';
import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useCategories } from '../features/products/useProducts';
import { useAuthStore } from '../store/authStore';
import { usePermission } from '../hooks/usePermission';

import StockTransferPage from './StockTransferPage';
import StockAdjustmentPage from './StockAdjustmentPage';
import OpeningStockPage from './OpeningStockPage';
import StockMovementsPage from './StockMovementsPage';

const PRODUCT_TYPE_OPTIONS = [
    { value: '', label: 'All Product Types' },
    { value: 'finished_good', label: 'Finished Goods (sellable)' },
    { value: 'raw_material', label: 'Raw Materials' },
    { value: 'semi_finished', label: 'Semi-Finished' },
    { value: 'packaging', label: 'Packaging' },
    { value: 'consumable', label: 'Consumable' },
    { value: 'service', label: 'Service' },
];

const STOCK_STATUS_OPTIONS = [
    { value: '', label: 'All Stock Status' },
    { value: 'in_stock', label: 'In Stock (> 0)' },
    { value: 'low_stock', label: 'Low / Critical Stock' },
    { value: 'out_of_stock', label: 'Out of Stock (0)' },
];

export default function StockPage({ initialTab = 'balances' }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const urlTab = searchParams.get('tab') || initialTab;
    const [activeTab, setActiveTab] = useState(urlTab);

    // Synchronize active tab with initialTab prop or URL search param
    useEffect(() => {
        const target = searchParams.get('tab') || initialTab;
        if (target && target !== activeTab) {
            setActiveTab(target);
        }
    }, [initialTab, searchParams]);

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        if (newTab === 'balances') {
            navigate('/stock');
        } else {
            navigate(`/stock?tab=${newTab}`);
        }
    };

    const { user } = useAuthStore();
    const { hasPermission } = usePermission();
    const canAdjust = hasPermission('inventory.adjust') || ['super_admin', 'admin', 'manager', 'warehouse_manager', 'warehouse_staff'].includes(user?.role);

    const [filters, setFilters] = useState({
        search: '',
        warehouseId: '',
        productType: '',
        categoryId: '',
        stockStatus: '',
        stockType: '', // 'open' or 'balance' or ''
        lowStock: '',
        page: 1,
        limit: 20,
    });

    const [isReleaseModalOpen, setIsReleaseModalOpen] = useState(false);
    const [selectedItemForRelease, setSelectedItemForRelease] = useState(null);
    const [releaseQty, setReleaseQty] = useState('');
    const [releaseNotes, setReleaseNotes] = useState('');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedItemForEdit, setSelectedItemForEdit] = useState(null);
    const [editFormData, setEditFormData] = useState({
        batchNumber: '',
        openStock: '',
        balanceStock: '',
        costPerUnit: '',
        expiryDate: '',
    });

    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [selectedItemForDelete, setSelectedItemForDelete] = useState(null);

    const { data, isLoading } = useStockItems(filters);
    const { data: warehousesData } = useWarehouses();
    const { data: categoriesData } = useCategories();
    const releaseMutation = useReleaseStock();
    const updateMutation = useUpdateStockItem();
    const deleteMutation = useDeleteStockItem();

    const handleOpenEditModal = (item) => {
        setSelectedItemForEdit(item);
        setEditFormData({
            batchNumber: item.batchNumber || '',
            openStock: item.quantities.openStock || 0,
            balanceStock: item.quantities.balanceStock || 0,
            costPerUnit: item.costPerUnit || 0,
            expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString().split('T')[0] : '',
        });
        setIsEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!selectedItemForEdit) return;
        try {
            await updateMutation.mutateAsync({
                id: selectedItemForEdit._id,
                data: {
                    batchNumber: editFormData.batchNumber,
                    openStock: Number(editFormData.openStock),
                    balanceStock: Number(editFormData.balanceStock),
                    costPerUnit: Number(editFormData.costPerUnit),
                    expiryDate: editFormData.expiryDate || null,
                }
            });
            setIsEditModalOpen(false);
        } catch (err) {}
    };

    const handleOpenDeleteConfirm = (item) => {
        setSelectedItemForDelete(item);
        setIsDeleteConfirmOpen(true);
    };

    const handleDeleteSubmit = async () => {
        if (!selectedItemForDelete) return;
        try {
            await deleteMutation.mutateAsync(selectedItemForDelete._id);
            setIsDeleteConfirmOpen(false);
        } catch (err) {}
    };

    const items = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const warehouseOptions = [
        { value: '', label: 'All Warehouses' },
        ...(warehousesData?.data || []).map((w) => ({
            value: w._id,
            label: `${w.name} (${w.warehouseCode})`,
        })),
    ];

    const categoryOptions = [
        { value: '', label: 'All Categories' },
        ...(categoriesData?.data || []).map((c) => ({
            value: c._id,
            label: `${c.name} (${c.code})`,
        })),
    ];

    const isFiltered = Boolean(
        filters.search ||
        filters.warehouseId ||
        filters.productType ||
        filters.categoryId ||
        filters.stockStatus ||
        filters.stockType ||
        filters.lowStock
    );

    const handleResetFilters = () => {
        setFilters({
            search: '',
            warehouseId: '',
            productType: '',
            categoryId: '',
            stockStatus: '',
            stockType: '',
            lowStock: '',
            page: 1,
            limit: 20,
        });
    };

    const handleOpenReleaseModal = (item) => {
        setSelectedItemForRelease(item);
        setReleaseQty('');
        setReleaseNotes('');
        setIsReleaseModalOpen(true);
    };

    const handleReleaseSubmit = async (e) => {
        e.preventDefault();
        if (!selectedItemForRelease) return;
        if (!releaseQty || Number(releaseQty) <= 0) {
            return toast.error('Please enter a valid quantity');
        }
        if (Number(releaseQty) > selectedItemForRelease.quantities.balanceStock) {
            return toast.error(`Insufficient balance stock. Max available: ${selectedItemForRelease.quantities.balanceStock}`);
        }

        try {
            await releaseMutation.mutateAsync({
                productId: selectedItemForRelease.productId?._id,
                warehouseId: selectedItemForRelease.warehouseId?._id,
                batchNumber: selectedItemForRelease.batchNumber,
                quantity: Number(releaseQty),
                notes: releaseNotes
            });
            setIsReleaseModalOpen(false);
        } catch (err) {
            // Toast handled by mutation hook
        }
    };

    const fmt = (n) => new Intl.NumberFormat('en-LK', { minimumFractionDigits: 2 }).format(n || 0);
    const fmtMoney = (n) => new Intl.NumberFormat('en-LK', {
        style: 'currency', currency: 'LKR', minimumFractionDigits: 2,
    }).format(n || 0);

    const getStockStatus = (item) => {
        const onHand = item.quantities.onHand;
        const reorder = item.productId?.stockLevels?.reorderLevel || 0;
        const min = item.productId?.stockLevels?.minimumLevel || 0;

        if (onHand <= 0) return { variant: 'danger', label: 'Out of stock' };
        if (onHand <= min) return { variant: 'danger', label: 'Critical' };
        if (reorder && onHand <= reorder) return { variant: 'warning', label: 'Low' };
        return { variant: 'success', label: 'In stock' };
    };

    const totalValue = items.reduce((s, i) => s + (i.totalValue || 0), 0);
    const lowStockCount = items.filter(i => {
        const s = getStockStatus(i);
        return s.variant === 'danger' || s.variant === 'warning';
    }).length;

    return (
        <div>
            {/* ─── PAGE HEADER ─── */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Inventory Operations Hub
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">Live Stock & Warehouse Control</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Stock Overview & Management</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Manage live warehouse inventory balances, inter-warehouse transfers, physical adjustments, and audit movements.
                    </p>
                </div>
            </div>

            {/* ─── 5 COLOR-CODED MODULE BUTTONS / CARDS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-6">
                {/* 1. Stock Balances (Emerald Green) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('balances')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'balances'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'balances'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                            }`}
                        >
                            <Boxes size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Live Stock
                            </span>
                            <h3 className="font-extrabold text-sm sm:text-base tracking-tight truncate leading-tight">
                                Stock Balances
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'balances' ? 'text-emerald-100' : 'text-slate-500'}`}>
                                Batches & release
                            </p>
                        </div>
                    </div>
                    {total > 0 && (
                        <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                activeTab === 'balances'
                                    ? 'bg-white text-emerald-800'
                                    : 'bg-emerald-100 text-emerald-800'
                            }`}
                        >
                            {total}
                        </span>
                    )}
                </button>

                {/* 2. Stock Transfer (Royal Blue) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('transfer')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'transfer'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-blue-600 shadow-lg shadow-blue-600/20 ring-2 ring-blue-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'transfer'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'
                            }`}
                        >
                            <ArrowRightLeft size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Relocation
                            </span>
                            <h3 className="font-extrabold text-sm sm:text-base tracking-tight truncate leading-tight">
                                Stock Transfer
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'transfer' ? 'text-blue-100' : 'text-slate-500'}`}>
                                Move warehouses
                            </p>
                        </div>
                    </div>
                </button>

                {/* 3. Stock Adjustment (Warm Amber / Gold) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('adjustment')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'adjustment'
                            ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/25 ring-2 ring-yellow-400/40 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/60 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'adjustment'
                                    ? 'bg-slate-950/15 text-slate-950 font-bold'
                                    : 'bg-amber-100 text-amber-800 group-hover:bg-amber-500 group-hover:text-slate-950'
                            }`}
                        >
                            <Sliders size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Auditing
                            </span>
                            <h3 className="font-extrabold text-sm sm:text-base tracking-tight truncate leading-tight">
                                Stock Adjustment
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'adjustment' ? 'text-amber-950/80 font-medium' : 'text-slate-500'}`}>
                                Count corrections
                            </p>
                        </div>
                    </div>
                </button>

                {/* 4. Opening Stock (Vibrant Purple) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('opening')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'opening'
                            ? 'bg-gradient-to-r from-purple-600 to-violet-700 text-white border-purple-600 shadow-lg shadow-purple-600/20 ring-2 ring-purple-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'opening'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white'
                            }`}
                        >
                            <PackagePlus size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Initial Setup
                            </span>
                            <h3 className="font-extrabold text-sm sm:text-base tracking-tight truncate leading-tight">
                                Opening Stock
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'opening' ? 'text-purple-100' : 'text-slate-500'}`}>
                                Bulk initial intake
                            </p>
                        </div>
                    </div>
                </button>

                {/* 5. Stock Movements (Teal / Cyan) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('movements')}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'movements'
                            ? 'bg-gradient-to-r from-teal-600 to-cyan-700 text-white border-teal-600 shadow-lg shadow-teal-600/20 ring-2 ring-teal-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'movements'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-teal-100 text-teal-700 group-hover:bg-teal-600 group-hover:text-white'
                            }`}
                        >
                            <History size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Audit Trail
                            </span>
                            <h3 className="font-extrabold text-sm sm:text-base tracking-tight truncate leading-tight">
                                Stock Movements
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'movements' ? 'text-teal-100' : 'text-slate-500'}`}>
                                Transaction log
                            </p>
                        </div>
                    </div>
                </button>
            </div>

            {/* ─── TAB CONTENT PANELS ─── */}
            {activeTab === 'balances' && (
                <>

            {/* ─── SUMMARY STRIP ─── */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
                <Card className="p-4">
                    <p className="text-xs text-gray-500 mb-1">Total Items</p>
                    <p className="text-2xl font-bold text-gray-800">{total}</p>
                </Card>
                <Card className={`p-4 transition border ${filters.productType === 'finished_good' ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-400/20' : ''}`}>
                    <p className="text-xs text-gray-500 mb-1 flex items-center justify-between">
                        <span>Finished Goods</span>
                        <PackageCheck size={14} className="text-emerald-600" />
                    </p>
                    <button
                        type="button"
                        className={`text-xl font-bold text-left hover:underline cursor-pointer ${filters.productType === 'finished_good' ? 'text-emerald-700' : 'text-slate-800'}`}
                        onClick={() => setFilters(f => ({ ...f, productType: f.productType === 'finished_good' ? '' : 'finished_good', page: 1 }))}
                    >
                        {filters.productType === 'finished_good' ? `${total} Filtered` : 'Filter Finished'}
                    </button>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-gray-500 mb-1">Page Value</p>
                    <p className="text-xl font-bold text-gray-800 truncate">{fmtMoney(totalValue)}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-xs text-gray-500 mb-1">Warehouses</p>
                    <p className="text-2xl font-bold text-gray-800">{warehouseOptions.length - 1}</p>
                </Card>
                <Card className={`p-4 transition border ${filters.stockStatus === 'low_stock' || filters.lowStock === 'true' ? 'bg-amber-100/70 border-amber-300 ring-2 ring-amber-400/20' : 'bg-amber-50 border-amber-200'}`}>
                    <p className="text-xs text-amber-600 flex items-center gap-1 mb-1">
                        <AlertTriangle size={12} /> Low / Critical
                    </p>
                    <button
                        className="text-2xl font-bold text-amber-700 hover:underline cursor-pointer"
                        onClick={() => setFilters((f) => ({ ...f, stockStatus: f.stockStatus === 'low_stock' ? '' : 'low_stock', lowStock: f.lowStock === 'true' ? '' : 'true', page: 1 }))}
                    >
                        {lowStockCount > 0 ? lowStockCount : 'View'}
                    </button>
                </Card>
            </div>

            {/* ─── FILTERS + TABLE ─── */}
            <Card>
                {/* ─── PROFESSIONAL FILTER TOOLBAR ─── */}
                <div className="p-4 sm:p-5 border-b border-slate-200/90 bg-gradient-to-b from-slate-50/70 to-white">
                    {/* Header: Filter title & Quick View Tabs */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200/80">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shadow-xs">
                                <Filter size={15} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Filter Inventory</h4>
                                    {isFiltered && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                            Filters Active
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-400 font-medium">Search & refine stock records across all facilities</p>
                            </div>
                        </div>

                        {/* Quick View Pills */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1 hidden sm:inline">Quick View:</span>
                            <button
                                type="button"
                                onClick={() => setFilters(f => ({ ...f, productType: '', lowStock: '', stockStatus: '', page: 1 }))}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                    !filters.productType && !filters.lowStock && !filters.stockStatus
                                        ? 'bg-slate-900 text-white shadow-xs'
                                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                            >
                                <Boxes size={13} />
                                All Stock
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilters(f => ({ ...f, productType: f.productType === 'finished_good' ? '' : 'finished_good', page: 1 }))}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                    filters.productType === 'finished_good'
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/60'
                                }`}
                            >
                                <PackageCheck size={13} className={filters.productType === 'finished_good' ? 'text-white' : 'text-emerald-600'} />
                                <span>Finished Goods</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilters(f => ({ ...f, productType: f.productType === 'raw_material' ? '' : 'raw_material', page: 1 }))}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                    filters.productType === 'raw_material'
                                        ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20 ring-2 ring-amber-500/30'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/60'
                                }`}
                            >
                                <Layers size={13} className={filters.productType === 'raw_material' ? 'text-white' : 'text-amber-600'} />
                                <span>Raw Materials</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFilters(f => ({ ...f, stockStatus: f.stockStatus === 'low_stock' ? '' : 'low_stock', lowStock: f.lowStock === 'true' ? '' : 'true', page: 1 }))}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                                    filters.stockStatus === 'low_stock' || filters.lowStock === 'true'
                                        ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20 ring-2 ring-rose-500/30'
                                        : 'bg-white border border-slate-200 text-slate-700 hover:border-rose-300 hover:bg-rose-50/60'
                                }`}
                            >
                                <AlertTriangle size={13} className={filters.stockStatus === 'low_stock' || filters.lowStock === 'true' ? 'text-white' : 'text-rose-600'} />
                                <span>Low Stock</span>
                            </button>
                        </div>
                    </div>

                    {/* Symmetrical 3x2 Grid for Controls */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {/* 1. Search Box */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                                <Search size={12} className="text-emerald-600" />
                                Search Product / Batch
                            </label>
                            <div className="relative">
                                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search by name, SKU, code, batch..."
                                    value={filters.search}
                                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                                    className="w-full h-10 pl-10 pr-8 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-slate-400 transition"
                                />
                                {filters.search && (
                                    <button
                                        type="button"
                                        onClick={() => setFilters((f) => ({ ...f, search: '', page: 1 }))}
                                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-100 transition"
                                        title="Clear search"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* 2. Warehouse */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                                <Building2 size={12} className="text-emerald-600" />
                                Warehouse Facility
                            </label>
                            <div className="relative">
                                <select
                                    value={filters.warehouseId}
                                    onChange={(e) => setFilters((f) => ({ ...f, warehouseId: e.target.value, page: 1 }))}
                                    className="w-full h-10 pl-3.5 pr-8 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-slate-400 transition appearance-none cursor-pointer"
                                >
                                    {warehouseOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* 3. Product Type */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                                <PackageCheck size={12} className="text-emerald-600" />
                                Product Type
                            </label>
                            <div className="relative">
                                <select
                                    value={filters.productType}
                                    onChange={(e) => setFilters((f) => ({ ...f, productType: e.target.value, page: 1 }))}
                                    className="w-full h-10 pl-3.5 pr-8 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-slate-400 transition appearance-none cursor-pointer"
                                >
                                    {PRODUCT_TYPE_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* 4. Category */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                                <Tag size={12} className="text-emerald-600" />
                                Category
                            </label>
                            <div className="relative">
                                <select
                                    value={filters.categoryId}
                                    onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value, page: 1 }))}
                                    className="w-full h-10 pl-3.5 pr-8 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-slate-400 transition appearance-none cursor-pointer"
                                >
                                    {categoryOptions.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* 5. Stock Status */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                                <AlertTriangle size={12} className="text-emerald-600" />
                                Stock Availability
                            </label>
                            <div className="relative">
                                <select
                                    value={filters.stockStatus}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFilters((f) => ({
                                            ...f,
                                            stockStatus: val,
                                            lowStock: val === 'low_stock' ? 'true' : '',
                                            page: 1,
                                        }));
                                    }}
                                    className="w-full h-10 pl-3.5 pr-8 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-slate-400 transition appearance-none cursor-pointer"
                                >
                                    {STOCK_STATUS_OPTIONS.map((opt) => (
                                        <option key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>

                        {/* 6. Stock Bucket / Type */}
                        <div>
                            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                                <Layers size={12} className="text-emerald-600" />
                                Stock Bucket
                            </label>
                            <div className="relative">
                                <select
                                    value={filters.stockType}
                                    onChange={(e) => setFilters((f) => ({ ...f, stockType: e.target.value, page: 1 }))}
                                    className="w-full h-10 pl-3.5 pr-8 bg-white border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 hover:border-slate-400 transition appearance-none cursor-pointer"
                                >
                                    <option value="">All Stock Types</option>
                                    <option value="open">Open Stock (POS Available)</option>
                                    <option value="balance">Balance Stock (Unreleased)</option>
                                </select>
                                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Active Filter Chips Bar */}
                    {isFiltered && (
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200/80 mt-3 text-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-bold text-slate-500 flex items-center gap-1">
                                    Active Filters:
                                </span>
                                {filters.search && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
                                        Search: "{filters.search}"
                                        <button type="button" onClick={() => setFilters(f => ({ ...f, search: '', page: 1 }))} className="hover:text-rose-600 cursor-pointer ml-0.5">×</button>
                                    </span>
                                )}
                                {filters.warehouseId && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 font-semibold border border-blue-200">
                                        Warehouse: {warehouseOptions.find(o => o.value === filters.warehouseId)?.label || 'Selected'}
                                        <button type="button" onClick={() => setFilters(f => ({ ...f, warehouseId: '', page: 1 }))} className="hover:text-rose-600 cursor-pointer ml-0.5">×</button>
                                    </span>
                                )}
                                {filters.productType && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                                        Type: {PRODUCT_TYPE_OPTIONS.find(o => o.value === filters.productType)?.label || filters.productType}
                                        <button type="button" onClick={() => setFilters(f => ({ ...f, productType: '', page: 1 }))} className="hover:text-rose-600 cursor-pointer ml-0.5">×</button>
                                    </span>
                                )}
                                {filters.categoryId && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-800 font-semibold border border-purple-200">
                                        Category: {categoryOptions.find(o => o.value === filters.categoryId)?.label || 'Selected'}
                                        <button type="button" onClick={() => setFilters(f => ({ ...f, categoryId: '', page: 1 }))} className="hover:text-rose-600 cursor-pointer ml-0.5">×</button>
                                    </span>
                                )}
                                {filters.stockStatus && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                                        Status: {STOCK_STATUS_OPTIONS.find(o => o.value === filters.stockStatus)?.label || filters.stockStatus}
                                        <button type="button" onClick={() => setFilters(f => ({ ...f, stockStatus: '', lowStock: '', page: 1 }))} className="hover:text-rose-600 cursor-pointer ml-0.5">×</button>
                                    </span>
                                )}
                                {filters.stockType && (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 font-semibold border border-teal-200">
                                        Stock: {filters.stockType === 'open' ? 'Open Stock only' : 'Balance Stock only'}
                                        <button type="button" onClick={() => setFilters(f => ({ ...f, stockType: '', page: 1 }))} className="hover:text-rose-600 cursor-pointer ml-0.5">×</button>
                                    </span>
                                )}
                            </div>

                            <button
                                type="button"
                                onClick={handleResetFilters}
                                className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1 rounded-lg transition flex items-center gap-1.5 cursor-pointer ml-auto"
                            >
                                <RotateCcw size={12} /> Clear All Filters
                            </button>
                        </div>
                    )}
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading stock data...</div>
                ) : items.length === 0 ? (
                    <EmptyState
                        icon={Boxes}
                        title={isFiltered ? "No matching stock items" : "No stock data"}
                        description={
                            isFiltered
                                ? "Try adjusting or clearing your filters to see more inventory items."
                                : "Enter opening stock to get started"
                        }
                        action={
                            isFiltered ? (
                                <Button variant="outline" onClick={handleResetFilters}>
                                    <X size={16} className="mr-1.5" /> Clear All Filters
                                </Button>
                            ) : canAdjust && (
                                <Button variant="primary" onClick={() => navigate('/stock/opening')}>
                                    <PackagePlus size={16} className="mr-1.5" /> Enter Opening Stock
                                </Button>
                            )
                        }
                    />
                ) : (
                    <>
                        {/* Desktop table */}
                        <div className="hidden sm:block overflow-x-auto">
                            <table className="w-full min-w-[640px]">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Warehouse</th>
                                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Batch</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Open Stock (Avail / Res)</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Balance Stock</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Stock</th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Value</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {items.map((r) => {
                                        const s = getStockStatus(r);
                                        return (
                                            <tr key={r._id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-5 py-3">
                                                    <p className="font-semibold text-sm text-gray-900">{r.productName}</p>
                                                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                        <span className="text-xs font-mono text-gray-400">{r.productCode}</span>
                                                        {r.productId?.productType === 'finished_good' && (
                                                            <Badge variant="success" size="sm">Finished Good</Badge>
                                                        )}
                                                        {r.productId?.productType === 'raw_material' && (
                                                            <Badge variant="warning" size="sm">Raw Material</Badge>
                                                        )}
                                                        {r.productId?.productType === 'semi_finished' && (
                                                            <Badge variant="info" size="sm">Semi-Finished</Badge>
                                                        )}
                                                        {r.productId?.productType === 'packaging' && (
                                                            <Badge variant="default" size="sm">Packaging</Badge>
                                                        )}
                                                        {r.productId?.categoryId?.name && (
                                                            <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                                                {r.productId.categoryId.name}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="text-sm text-gray-700">{r.warehouseId?.name}</p>
                                                    <p className="text-xs font-mono text-gray-400">{r.warehouseId?.warehouseCode}</p>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                                    {r.batchNumber ? (
                                                        <Badge variant="warning">{r.batchNumber}</Badge>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">Standard</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-800 whitespace-nowrap">
                                                    <div>
                                                        <span>{fmt(r.quantities.openStock)}</span>{' '}
                                                        <span className="text-xs text-gray-400">{r.unitOfMeasure}</span>
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 mt-0.5">
                                                        Avail: <span className="text-green-700 font-semibold">{fmt(Math.max(0, r.quantities.openStock - r.quantities.reserved))}</span>
                                                        {r.quantities.reserved > 0 && (
                                                            <> · Res: <span className="text-amber-600 font-medium">{fmt(r.quantities.reserved)}</span></>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-600 whitespace-nowrap">
                                                    {fmt(r.quantities.balanceStock)} <span className="text-xs text-gray-400">{r.unitOfMeasure}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm font-semibold text-gray-800 whitespace-nowrap">
                                                    {fmt(r.quantities.onHand)} <span className="text-xs text-gray-400">{r.unitOfMeasure}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-sm text-gray-600 whitespace-nowrap">
                                                    {fmtMoney(r.totalValue)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <Badge variant={s.variant}>{s.label}</Badge>
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <div className="flex items-center justify-center gap-1.5">
                                                        {canAdjust && (r.quantities.balanceStock || 0) > 0 && (
                                                            <Button
                                                                variant="primary"
                                                                size="sm"
                                                                onClick={() => handleOpenReleaseModal(r)}
                                                            >
                                                                Release
                                                            </Button>
                                                        )}
                                                        {canAdjust && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleOpenEditModal(r)}
                                                                    className="p-1 text-gray-500 hover:text-primary-600 hover:bg-gray-50 rounded border border-gray-100 flex items-center gap-1 text-xs px-2 py-1"
                                                                    title="Edit Stock Item"
                                                                >
                                                                    <Edit size={14} /> Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => handleOpenDeleteConfirm(r)}
                                                                    className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded border border-red-100 flex items-center gap-1 text-xs px-2 py-1"
                                                                    title="Delete Stock Item"
                                                                >
                                                                    <Trash2 size={14} /> Delete
                                                                </button>
                                                            </>
                                                        )}
                                                        {!canAdjust && <span className="text-xs text-gray-400">—</span>}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile cards */}
                        <div className="sm:hidden divide-y divide-gray-100">
                            {items.map((r) => {
                                const s = getStockStatus(r);
                                const available = Math.max(0, r.quantities.openStock - r.quantities.reserved);
                                return (
                                    <div key={r._id} className="px-4 py-4">
                                        {/* Header row */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="min-w-0 flex-1">
                                                <p className="font-semibold text-sm text-gray-800 truncate">{r.productName}</p>
                                                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                    <span className="text-xs font-mono text-gray-400">{r.productCode}</span>
                                                    {r.productId?.productType === 'finished_good' && (
                                                        <Badge variant="success" size="sm">Finished Good</Badge>
                                                    )}
                                                    {r.productId?.productType === 'raw_material' && (
                                                        <Badge variant="warning" size="sm">Raw Material</Badge>
                                                    )}
                                                    {r.productId?.productType === 'semi_finished' && (
                                                        <Badge variant="info" size="sm">Semi-Finished</Badge>
                                                    )}
                                                    {r.productId?.categoryId?.name && (
                                                        <span className="text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                                            {r.productId.categoryId.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge variant={s.variant} className="ml-2 flex-shrink-0">{s.label}</Badge>
                                        </div>

                                        {/* Warehouse & Batch */}
                                        <div className="flex justify-between items-center text-xs text-gray-500 mb-3">
                                            <span>📦 {r.warehouseId?.name}{r.warehouseId?.warehouseCode && ` · ${r.warehouseId.warehouseCode}`}</span>
                                            <span>Batch: <span className="font-semibold text-gray-700">{r.batchNumber || "Standard"}</span></span>
                                        </div>

                                        {/* Quantities grid */}
                                        <div className="grid grid-cols-3 gap-2 text-xs">
                                            <div className="bg-blue-50 rounded-lg p-2 text-center">
                                                <p className="text-blue-500 mb-0.5 font-medium">Open Stock</p>
                                                <p className="font-bold text-blue-950 text-sm">{fmt(r.quantities.openStock)}</p>
                                                <p className="text-[10px] text-blue-600">Avail: {fmt(available)}</p>
                                            </div>
                                            <div className="bg-amber-50 rounded-lg p-2 text-center">
                                                <p className="text-amber-500 mb-0.5 font-medium">Balance Stock</p>
                                                <p className="font-bold text-amber-700 text-sm">{fmt(r.quantities.balanceStock)}</p>
                                                <p className="text-[10px] text-gray-400">{r.unitOfMeasure}</p>
                                            </div>
                                            <div className="bg-gray-50 rounded-lg p-2 text-center">
                                                <p className="text-gray-500 mb-0.5 font-medium">Total Stock</p>
                                                <p className="font-bold text-gray-800 text-sm">{fmt(r.quantities.onHand)}</p>
                                                <p className="text-[10px] text-gray-400">{r.unitOfMeasure}</p>
                                            </div>
                                        </div>

                                        {/* Mobile Release Action */}
                                        {canAdjust && (r.quantities.balanceStock || 0) > 0 && (
                                            <div className="mt-3">
                                                <Button
                                                    fullWidth
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenReleaseModal(r)}
                                                >
                                                    Release Stock to POS
                                                </Button>
                                            </div>
                                        )}

                                        {/* Value */}
                                        <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-gray-100">
                                            <span className="text-xs text-gray-400">Stock Value</span>
                                            <span className="text-sm font-semibold text-gray-700">{fmtMoney(r.totalValue)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <Pagination
                            page={filters.page} totalPages={totalPages} total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                        />

                        {/* Release Stock Modal */}
                        <Modal
                            isOpen={isReleaseModalOpen}
                            onClose={() => setIsReleaseModalOpen(false)}
                            title="Release Stock to POS"
                            size="md"
                        >
                            <form onSubmit={handleReleaseSubmit} className="space-y-4">
                                {selectedItemForRelease && (
                                    <>
                                        <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-1">
                                            <p>
                                                <span className="text-gray-500">Product:</span>{' '}
                                                <span className="font-semibold text-gray-800">
                                                    {selectedItemForRelease.productName}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-gray-500">Warehouse:</span>{' '}
                                                <span className="text-gray-700">
                                                    {selectedItemForRelease.warehouseId?.name}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-gray-500">Batch Code:</span>{' '}
                                                <span className="font-mono text-gray-700">
                                                    {selectedItemForRelease.batchNumber || 'Standard'}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-gray-500">Current Balance Stock:</span>{' '}
                                                <span className="font-bold text-amber-700">
                                                    {fmt(selectedItemForRelease.quantities.balanceStock)} {selectedItemForRelease.unitOfMeasure}
                                                </span>
                                            </p>
                                            <p>
                                                <span className="text-gray-500">Current Open Stock:</span>{' '}
                                                <span className="font-bold text-blue-700">
                                                    {fmt(selectedItemForRelease.quantities.openStock)} {selectedItemForRelease.unitOfMeasure}
                                                </span>
                                            </p>
                                        </div>

                                        <Input
                                            label={`Quantity to Release (${selectedItemForRelease.unitOfMeasure})`}
                                            type="number"
                                            step="0.01"
                                            min="0.01"
                                            max={selectedItemForRelease.quantities.balanceStock}
                                            value={releaseQty}
                                            onChange={(e) => setReleaseQty(e.target.value)}
                                            placeholder="Enter quantity to release"
                                            required
                                        />

                                        <Textarea
                                            label="Notes"
                                            value={releaseNotes}
                                            onChange={(e) => setReleaseNotes(e.target.value)}
                                            placeholder="Optional notes..."
                                            rows={3}
                                        />

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button variant="outline" type="button" onClick={() => setIsReleaseModalOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button variant="primary" type="submit" loading={releaseMutation.isLoading}>
                                                Confirm Release
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </form>
                        </Modal>

                        {/* Edit Stock Modal */}
                        <Modal
                            isOpen={isEditModalOpen}
                            onClose={() => setIsEditModalOpen(false)}
                            title="Edit Stock Item"
                            size="md"
                        >
                            <form onSubmit={handleEditSubmit} className="space-y-4">
                                {selectedItemForEdit && (
                                    <>
                                        <div className="bg-gray-50 p-3 rounded-lg text-xs space-y-1">
                                            <p><span className="text-gray-500">Product:</span> <span className="font-semibold text-gray-800">{selectedItemForEdit.productName}</span></p>
                                            <p><span className="text-gray-500">Warehouse:</span> <span className="text-gray-700">{selectedItemForEdit.warehouseId?.name}</span></p>
                                        </div>

                                        <Input
                                            label="Batch Code"
                                            value={editFormData.batchNumber}
                                            onChange={(e) => setEditFormData(p => ({ ...p, batchNumber: e.target.value }))}
                                            placeholder="Standard/Batch code"
                                        />

                                        <div className="grid grid-cols-2 gap-3">
                                            <Input
                                                label={`Open Stock (${selectedItemForEdit.unitOfMeasure})`}
                                                type="number"
                                                step="any"
                                                value={editFormData.openStock}
                                                onChange={(e) => setEditFormData(p => ({ ...p, openStock: e.target.value }))}
                                                required
                                            />
                                            <Input
                                                label={`Balance Stock (${selectedItemForEdit.unitOfMeasure})`}
                                                type="number"
                                                step="any"
                                                value={editFormData.balanceStock}
                                                onChange={(e) => setEditFormData(p => ({ ...p, balanceStock: e.target.value }))}
                                                required
                                            />
                                        </div>

                                        <Input
                                            label="Cost per Unit (LKR)"
                                            type="number"
                                            step="0.01"
                                            value={editFormData.costPerUnit}
                                            onChange={(e) => setEditFormData(p => ({ ...p, costPerUnit: e.target.value }))}
                                            required
                                        />

                                        <Input
                                            label="Expiry Date"
                                            type="date"
                                            value={editFormData.expiryDate}
                                            onChange={(e) => setEditFormData(p => ({ ...p, expiryDate: e.target.value }))}
                                        />

                                        <div className="flex justify-end gap-2 pt-2">
                                            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
                                                Cancel
                                            </Button>
                                            <Button variant="primary" type="submit" loading={updateMutation.isLoading}>
                                                Save Changes
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </form>
                        </Modal>

                        {/* Delete Confirm Dialog */}
                        <ConfirmDialog
                            isOpen={isDeleteConfirmOpen}
                            onClose={() => setIsDeleteConfirmOpen(false)}
                            onConfirm={handleDeleteSubmit}
                            title="Delete Stock Item"
                            message={`Are you sure you want to delete this stock item record for "${selectedItemForDelete?.productName}"? This action cannot be undone.`}
                            confirmText="Delete"
                            variant="danger"
                            loading={deleteMutation.isLoading}
                        />
                    </>
                )}
            </Card>
            </>
            )}

            {activeTab === 'transfer' && (
                <StockTransferPage embedded={true} onSuccess={() => handleTabChange('balances')} />
            )}

            {activeTab === 'adjustment' && (
                <StockAdjustmentPage embedded={true} onSuccess={() => handleTabChange('balances')} />
            )}

            {activeTab === 'opening' && (
                <OpeningStockPage embedded={true} onSuccess={() => handleTabChange('balances')} />
            )}

            {activeTab === 'movements' && (
                <StockMovementsPage embedded={true} />
            )}
        </div>
    );
}