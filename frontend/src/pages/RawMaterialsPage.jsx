import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { Search, Boxes, AlertTriangle, RefreshCw, Plus, Layers, Workflow } from 'lucide-react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import ProductFormModal from '../features/products/ProductFormModal';

import InventoryConverterPage from './InventoryConverterPage';

export default function RawMaterialsPage({ initialTab = 'stock' }) {
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
        if (newTab === 'stock') {
            navigate('/inventory/raw-materials');
        } else if (newTab === 'converter') {
            navigate('/inventory/converter');
        }
    };

    const [stockItems, setStockItems] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);

    const [search, setSearch] = useState('');
    const [warehouseFilter, setWarehouseFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [stockRes, whRes] = await Promise.all([
                api.get('/stock?limit=250'),
                api.get('/warehouses')
            ]);
            
            // Filter only raw materials
            const rawItems = (stockRes.data.data || []).filter(item => {
                return item.productId?.productType === 'raw_material';
            });

            setStockItems(rawItems);
            setWarehouses(whRes.data.data || []);
        } catch (err) {
            toast.error('Failed to load raw material inventory');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    const getStockStatus = (item) => {
        const onHand = item.quantities?.onHand || 0;
        const reorder = item.productId?.stockLevels?.reorderLevel || 0;
        const min = item.productId?.stockLevels?.minimumLevel || 0;

        if (onHand <= 0) return { variant: 'danger', label: 'Out of stock' };
        if (onHand <= min) return { variant: 'danger', label: 'Critical' };
        if (reorder && onHand <= reorder) return { variant: 'warning', label: 'Low' };
        return { variant: 'success', label: 'In stock' };
    };

    // Filter items locally for responsive search/filter feel
    const filteredItems = stockItems.filter(item => {
        const matchesSearch = 
            item.productName?.toLowerCase().includes(search.toLowerCase()) || 
            item.productCode?.toLowerCase().includes(search.toLowerCase()) ||
            (item.batchNumber && item.batchNumber.toLowerCase().includes(search.toLowerCase()));

        const matchesWarehouse = !warehouseFilter || item.warehouseId?._id === warehouseFilter;

        const statusInfo = getStockStatus(item);
        const matchesStatus = !statusFilter || 
            (statusFilter === 'low' && (statusInfo.variant === 'warning' || statusInfo.variant === 'danger')) ||
            (statusFilter === 'in_stock' && statusInfo.variant === 'success') ||
            (statusFilter === 'out_of_stock' && item.quantities?.onHand <= 0);

        return matchesSearch && matchesWarehouse && matchesStatus;
    });

    const totalWeight = filteredItems.reduce((sum, item) => sum + (item.quantities?.onHand || 0), 0);
    const totalValue = filteredItems.reduce((sum, item) => sum + (item.totalValue || 0), 0);
    const lowStockCount = filteredItems.filter(item => {
        const s = getStockStatus(item);
        return s.variant === 'danger' || s.variant === 'warning';
    }).length;

    const columns = [
        { 
            key: 'productName', 
            label: 'Material Name', 
            render: (r) => (
                <div>
                    <span className="font-bold text-gray-900 block">{r.productName}</span>
                    <span className="text-gray-500 text-xs font-mono">{r.productCode}</span>
                </div>
            ) 
        },
        { key: 'warehouse', label: 'Warehouse', render: (r) => r.warehouseId?.name || '—' },
        { 
            key: 'batchNumber', 
            label: 'Batch / Lot No', 
            render: (r) => r.batchNumber ? (
                <span className="font-mono text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
                    {r.batchNumber}
                </span>
            ) : <span className="text-gray-400 text-xs">Standard</span>
        },
        { 
            key: 'quantity', 
            label: 'On Hand Stock', 
            render: (r) => (
                <div>
                    <span className="font-bold text-gray-900">{(r.quantities?.onHand || 0).toLocaleString()}</span>
                    <span className="text-xs text-gray-500 ml-1">{r.unitOfMeasure || 'Kg'}</span>
                </div>
            ) 
        },
        { 
            key: 'cost', 
            label: 'Unit Cost', 
            render: (r) => (
                <span className="text-gray-700 font-mono text-xs">
                    Rs. {(r.costPerUnit || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
            ) 
        },
        { 
            key: 'totalValue', 
            label: 'Total Value', 
            render: (r) => (
                <span className="font-bold text-gray-900 font-mono text-xs">
                    Rs. {(r.totalValue || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                </span>
            ) 
        },
        {
            key: 'status',
            label: 'Status',
            render: (r) => {
                const s = getStockStatus(r);
                return <Badge variant={s.variant}>{s.label}</Badge>;
            }
        }
    ];

    return (
        <div className="space-y-6">
            {/* ─── EXECUTIVE HEADER ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Raw Materials Hub
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">Inventory & Yield Conversion</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Raw Materials & Processing</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Manage raw agricultural supplies, live lot balances, and convert raw materials using production formulas.
                    </p>
                </div>
                {activeTab === 'stock' && (
                    <Button variant="primary" onClick={() => setIsFormOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 shadow-xs">
                        <Plus size={16} className="mr-1.5" /> Add Raw Material
                    </Button>
                )}
            </div>

            {/* ─── 2 COLOR-CODED MODULE BUTTONS / CARDS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* 1. Raw Materials Stock (Emerald Green) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('stock')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'stock'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'stock'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                            }`}
                        >
                            <Layers size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Bulk Stock
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Raw Materials Stock
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'stock' ? 'text-emerald-100' : 'text-slate-500'}`}>
                                Batches & warehouse balances
                            </p>
                        </div>
                    </div>
                    {filteredItems.length > 0 && (
                        <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                activeTab === 'stock'
                                    ? 'bg-white text-emerald-800'
                                    : 'bg-emerald-100 text-emerald-800'
                            }`}
                        >
                            {filteredItems.length}
                        </span>
                    )}
                </button>

                {/* 2. BOM / Formula Converter (Purple / Indigo) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('converter')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'converter'
                            ? 'bg-gradient-to-r from-purple-600 to-indigo-700 text-white border-purple-600 shadow-lg shadow-purple-600/20 ring-2 ring-purple-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'converter'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white'
                            }`}
                        >
                            <Workflow size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Processing & Yield
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                BOM / Formula Converter
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'converter' ? 'text-purple-100' : 'text-slate-500'}`}>
                                Recipe & direct conversion
                            </p>
                        </div>
                    </div>
                </button>
            </div>

            {/* ─── TAB CONTENT AREA ─── */}
            {activeTab === 'stock' && (
                <>
                    {/* Stats strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Card className="p-4 flex flex-col justify-between">
                            <div>
                                <span className="text-gray-500 text-xs font-semibold uppercase block mb-1">Total Stock Weight</span>
                                <span className="text-2xl font-extrabold text-gray-900">{totalWeight.toLocaleString()} Kg</span>
                            </div>
                        </Card>
                        <Card className="p-4 flex flex-col justify-between">
                            <div>
                                <span className="text-gray-500 text-xs font-semibold uppercase block mb-1">Total Stock Value</span>
                                <span className="text-2xl font-extrabold text-emerald-600">Rs. {totalValue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </Card>
                        <Card className="p-4 flex flex-col justify-between">
                            <div>
                                <span className="text-gray-500 text-xs font-semibold uppercase block mb-1">Under-Stocked Materials</span>
                                <span className={`text-2xl font-extrabold ${lowStockCount > 0 ? 'text-amber-600' : 'text-gray-900'}`}>{lowStockCount} Items</span>
                            </div>
                        </Card>
                    </div>

                    <Card className="p-4">
                        {/* Search & Filters */}
                        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between mb-4">
                            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-150 w-full sm:w-80">
                                <Search size={16} className="text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search by material, code or batch..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm w-full"
                                />
                            </div>

                            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                                <select
                                    value={warehouseFilter}
                                    onChange={(e) => setWarehouseFilter(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                >
                                    <option value="">All Warehouses</option>
                                    {warehouses.map(w => (
                                        <option key={w._id} value={w._id}>{w.name}</option>
                                    ))}
                                </select>

                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                                >
                                    <option value="">All Stock Levels</option>
                                    <option value="in_stock">In Stock</option>
                                    <option value="low">Low & Critical</option>
                                    <option value="out_of_stock">Out of Stock</option>
                                </select>

                                <button onClick={fetchAllData} className="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition" title="Refresh">
                                    <RefreshCw size={16} className="text-gray-500" />
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="py-16 text-center text-gray-500">Loading raw material levels...</div>
                        ) : filteredItems.length === 0 ? (
                            <EmptyState
                                icon={Boxes}
                                title="No raw materials in inventory"
                                description="Record a Goods Receipt Note (GRN) or Farm Harvest to receive raw materials into stock."
                            />
                        ) : (
                            <Table columns={columns} data={filteredItems} />
                        )}
                    </Card>

                    <ProductFormModal
                        isOpen={isFormOpen}
                        onClose={() => {
                            setIsFormOpen(false);
                            fetchAllData();
                        }}
                        forceProductType="raw_material"
                    />
                </>
            )}

            {activeTab === 'converter' && (
                <InventoryConverterPage embedded={true} />
            )}
        </div>
    );
}
