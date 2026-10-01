import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api/axios';
import toast from 'react-hot-toast';
import { 
    Plus, Check, Clock, Search, RefreshCw, Calendar, Eye, Trash2, Edit, Home, Layers, PackageCheck
} from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ProductAutocompleteSelect from '../components/ui/ProductAutocompleteSelect';
import { useAuthStore } from '../store/authStore';

export default function FarmsPage({ initialTab = 'harvests' }) {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const urlTab = searchParams.get('tab') || initialTab;
    const [activeTab, setActiveTab] = useState(urlTab);

    const { user } = useAuthStore();
    const canManage = ['admin', 'manager', 'production_staff', 'procurement_staff'].includes(user?.role);

    // Sync tab when initialTab or searchParams change
    useEffect(() => {
        const target = searchParams.get('tab') || initialTab;
        if (target && target !== activeTab) {
            setActiveTab(target);
        }
    }, [initialTab, searchParams]);

    const handleTabChange = (newTab) => {
        setActiveTab(newTab);
        if (newTab === 'farms') {
            navigate('/farms?tab=farms');
        } else {
            navigate('/farms/harvests');
        }
    };

    // ── Global Shared Data ────────────────────────────────────────────────────────
    const [farms, setFarms] = useState([]);
    const [harvests, setHarvests] = useState([]);
    const [warehouses, setWarehouses] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    // ── Harvest Tab States ───────────────────────────────────────────────────────
    const [isHarvestFormOpen, setIsHarvestFormOpen] = useState(false);
    const [isHarvestViewOpen, setIsHarvestViewOpen] = useState(false);
    const [selectedHarvest, setSelectedHarvest] = useState(null);
    const [harvestFormData, setHarvestFormData] = useState({
        farmId: '',
        warehouseId: '',
        harvestDate: new Date().toISOString().split('T')[0],
        notes: '',
        status: 'draft',
        items: []
    });
    const [newCropItem, setNewCropItem] = useState({
        productId: '',
        quantity: '',
        unitPrice: ''
    });

    // ── Farm Registry Tab States ─────────────────────────────────────────────────
    const [farmSearch, setFarmSearch] = useState('');
    const [farmStatusFilter, setFarmStatusFilter] = useState('');
    const [isFarmFormOpen, setIsFarmFormOpen] = useState(false);
    const [editingFarm, setEditingFarm] = useState(null);
    const [deletingFarm, setDeletingFarm] = useState(null);
    const [farmFormData, setFarmFormData] = useState({
        name: '',
        location: '',
        contactNumber: '',
        notes: '',
        status: 'active'
    });

    // ── Fetch All Data ───────────────────────────────────────────────────────────
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        try {
            const [harvestRes, farmRes, whRes, prodRes] = await Promise.all([
                api.get('/farm-harvests'),
                api.get('/farms'),
                api.get('/warehouses'),
                api.get('/products')
            ]);
            setHarvests(harvestRes.data.data || []);
            setFarms(farmRes.data.data || []);
            setWarehouses(whRes.data.data || []);
            
            const rawProds = (prodRes.data.data || []).filter(p => p.productType === 'raw_material');
            setProducts(rawProds);
        } catch (err) {
            toast.error('Failed to load farms and harvest data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Active farms for dropdowns
    const activeFarms = useMemo(() => farms.filter(f => f.status === 'active'), [farms]);

    // Filtered farms for registry table
    const filteredFarms = useMemo(() => {
        return farms.filter(f => {
            const matchesSearch = !farmSearch || 
                f.name?.toLowerCase().includes(farmSearch.toLowerCase()) || 
                f.farmCode?.toLowerCase().includes(farmSearch.toLowerCase()) ||
                f.location?.toLowerCase().includes(farmSearch.toLowerCase());
            const matchesStatus = !farmStatusFilter || f.status === farmStatusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [farms, farmSearch, farmStatusFilter]);

    // ── Farm Operations Handlers ─────────────────────────────────────────────────
    const openFarmForm = (farm = null) => {
        setEditingFarm(farm);
        if (farm) {
            setFarmFormData({
                name: farm.name || '',
                location: farm.location || '',
                contactNumber: farm.contactNumber || '',
                notes: farm.notes || '',
                status: farm.status || 'active'
            });
        } else {
            setFarmFormData({
                name: '',
                location: '',
                contactNumber: '',
                notes: '',
                status: 'active'
            });
        }
        setIsFarmFormOpen(true);
    };

    const handleFarmFormSubmit = async (e) => {
        e.preventDefault();
        if (!farmFormData.name) {
            return toast.error('Farm name is required');
        }

        try {
            if (editingFarm) {
                await api.put(`/farms/${editingFarm._id}`, farmFormData);
                toast.success('Farm updated successfully');
            } else {
                await api.post('/farms', farmFormData);
                toast.success('Farm registered successfully');
            }
            setIsFarmFormOpen(false);
            setEditingFarm(null);
            fetchAllData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save farm details');
        }
    };

    const handleFarmDelete = async () => {
        if (!deletingFarm) return;
        try {
            await api.delete(`/farms/${deletingFarm._id}`);
            toast.success('Farm deleted successfully');
            setDeletingFarm(null);
            fetchAllData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete farm');
        }
    };

    // ── Harvest Operations Handlers ──────────────────────────────────────────────
    const openHarvestForm = () => {
        setHarvestFormData({
            farmId: activeFarms[0]?._id || farms[0]?._id || '',
            warehouseId: warehouses[0]?._id || '',
            harvestDate: new Date().toISOString().split('T')[0],
            notes: '',
            status: 'draft',
            items: []
        });
        setNewCropItem({ productId: '', quantity: '', unitPrice: '' });
        setIsHarvestFormOpen(true);
    };

    const handleAddCropItem = () => {
        if (!newCropItem.productId || !newCropItem.quantity || Number(newCropItem.quantity) <= 0) {
            toast.error('Please select a product and enter a valid quantity');
            return;
        }

        const selectedProd = products.find(p => p._id === newCropItem.productId);
        if (!selectedProd) return;

        if (harvestFormData.items.some(item => item.productId === newCropItem.productId)) {
            toast.error('Product already added to list');
            return;
        }

        setHarvestFormData(p => ({
            ...p,
            items: [
                ...p.items,
                {
                    productId: newCropItem.productId,
                    productName: selectedProd.name,
                    productCode: selectedProd.productCode,
                    quantity: Number(newCropItem.quantity),
                    unitOfMeasure: selectedProd.unitOfMeasure,
                    unitPrice: Number(newCropItem.unitPrice) || selectedProd.basePrice || 0
                }
            ]
        }));

        setNewCropItem({ productId: '', quantity: '', unitPrice: '' });
    };

    const handleRemoveCropItem = (index) => {
        setHarvestFormData(p => ({
            ...p,
            items: p.items.filter((_, i) => i !== index)
        }));
    };

    const handleHarvestFormSubmit = async (e) => {
        e.preventDefault();
        if (!harvestFormData.farmId) return toast.error('Please select a farm');
        if (!harvestFormData.warehouseId) return toast.error('Please select a warehouse');
        if (harvestFormData.items.length === 0) return toast.error('Please add at least one crop item');

        try {
            await api.post('/farm-harvests', harvestFormData);
            toast.success('Farm harvest logged successfully');
            setIsHarvestFormOpen(false);
            fetchAllData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to record harvest');
        }
    };

    const handleApproveHarvest = async (id) => {
        try {
            await api.post(`/farm-harvests/${id}/approve`);
            toast.success('✅ Harvest approved and stock increased successfully');
            setIsHarvestViewOpen(false);
            fetchAllData();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Approval failed');
        }
    };

    const viewHarvest = (harvest) => {
        setSelectedHarvest(harvest);
        setIsHarvestViewOpen(true);
    };

    // ── Table Column Definitions ─────────────────────────────────────────────────
    const harvestColumns = [
        { key: 'harvestNumber', label: 'Harvest No', render: (r) => <span className="font-bold text-gray-800 font-mono">{r.harvestNumber}</span> },
        { key: 'farmName', label: 'Farm', render: (r) => r.farmName || r.farmId?.name || '—' },
        { key: 'warehouseName', label: 'Intake Warehouse', render: (r) => r.warehouseId?.name || '—' },
        { key: 'harvestDate', label: 'Harvest Date', render: (r) => new Date(r.harvestDate).toLocaleDateString('en-LK', { day: '2-digit', month: 'short', year: 'numeric' }) },
        {
            key: 'totalValue',
            label: 'Total Value',
            render: (r) => <span className="font-semibold text-gray-900">Rs. {(r.totalValue || 0).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</span>
        },
        {
            key: 'status',
            label: 'Status',
            render: (r) => (
                <Badge variant={r.status === 'approved' ? 'success' : 'default'}>
                    {r.status === 'approved' ? 'Approved & Stocked' : 'Draft'}
                </Badge>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            render: (r) => (
                <div className="flex gap-2">
                    <button onClick={() => viewHarvest(r)} className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg border border-gray-200 flex items-center gap-1 text-xs px-2.5 py-1 transition font-medium">
                        <Eye size={13} /> View
                    </button>
                    {r.status === 'draft' && canManage && (
                        <button onClick={() => handleApproveHarvest(r._id)} className="p-1.5 text-emerald-700 hover:text-white hover:bg-emerald-600 rounded-lg border border-emerald-300 flex items-center gap-1 text-xs px-2.5 py-1 transition font-semibold">
                            <Check size={13} /> Approve
                        </button>
                    )}
                </div>
            )
        }
    ];

    const farmColumns = [
        { key: 'farmCode', label: 'Code', render: (r) => <span className="font-bold text-gray-800 font-mono">{r.farmCode}</span> },
        { key: 'name', label: 'Farm Name', render: (r) => <span className="font-semibold text-gray-900">{r.name}</span> },
        { key: 'location', label: 'Location', render: (r) => r.location || '—' },
        { key: 'contactNumber', label: 'Contact Number', render: (r) => r.contactNumber || '—' },
        {
            key: 'status',
            label: 'Status',
            render: (r) => (
                <Badge variant={r.status === 'active' ? 'success' : 'default'}>
                    {r.status === 'active' ? 'Active' : 'Inactive'}
                </Badge>
            )
        },
        {
            key: 'actions',
            label: 'Actions',
            width: '120px',
            render: (r) => (
                <div className="flex gap-1.5">
                    {canManage && (
                        <>
                            <button onClick={() => openFarmForm(r)} title="Edit Farm" className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg border border-gray-200 transition">
                                <Edit size={14} />
                            </button>
                            <button onClick={() => setDeletingFarm(r)} title="Delete Farm" className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg border border-gray-200 transition">
                                <Trash2 size={14} />
                            </button>
                        </>
                    )}
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            {/* ─── EXECUTIVE HEADER ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Agricultural Operations
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">Company Farms & Harvest Intake</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Farms & Harvests (GRN)</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Manage company-owned agricultural farms and record crop harvest intake directly into warehouse inventory.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={fetchAllData} 
                        title="Refresh all data"
                        className="p-2.5 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 text-slate-600 transition shadow-xs"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin text-emerald-600' : ''} />
                    </button>

                    {canManage && activeTab === 'harvests' && (
                        <Button variant="primary" onClick={openHarvestForm} className="shadow-sm">
                            <Plus size={16} className="mr-1.5" /> Log Harvest
                        </Button>
                    )}

                    {canManage && activeTab === 'farms' && (
                        <Button variant="primary" onClick={() => openFarmForm()} className="shadow-sm">
                            <Plus size={16} className="mr-1.5" /> Register Farm
                        </Button>
                    )}
                </div>
            </div>

            {/* ─── 2 COLOR-CODED MODULE CARDS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Farm Harvests (GRN) Button */}
                <button
                    type="button"
                    onClick={() => handleTabChange('harvests')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'harvests'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'harvests'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                            }`}
                        >
                            <Calendar size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Crop Intake (GRN)
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Farm Harvests
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'harvests' ? 'text-emerald-100' : 'text-slate-500'}`}>
                                Yield logs & stock intake
                            </p>
                        </div>
                    </div>
                    {harvests.length > 0 && (
                        <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                                activeTab === 'harvests'
                                    ? 'bg-white text-emerald-800'
                                    : 'bg-emerald-100 text-emerald-800'
                            }`}
                        >
                            {harvests.length}
                        </span>
                    )}
                </button>

                {/* 2. Farms Registry Button */}
                <button
                    type="button"
                    onClick={() => handleTabChange('farms')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'farms'
                            ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/25 ring-2 ring-yellow-400/40 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/60 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'farms'
                                    ? 'bg-slate-950/15 text-slate-950 font-bold'
                                    : 'bg-amber-100 text-amber-800 group-hover:bg-amber-500 group-hover:text-slate-950'
                            }`}
                        >
                            <Home size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Master Network
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Farms Registry
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'farms' ? 'text-amber-950/80 font-medium' : 'text-slate-500'}`}>
                                Farm locations & profiles
                            </p>
                        </div>
                    </div>
                    {farms.length > 0 && (
                        <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                                activeTab === 'farms'
                                    ? 'bg-slate-950 text-yellow-300 shadow-xs'
                                    : 'bg-amber-100 text-amber-900 border border-amber-200/60'
                            }`}
                        >
                            {farms.length}
                        </span>
                    )}
                </button>
            </div>

            {/* ─── TAB 1: FARM HARVESTS CONTENT ─── */}
            {activeTab === 'harvests' && (
                <Card className="p-4">
                    {loading ? (
                        <div className="py-16 text-center text-gray-500">Loading harvest logs...</div>
                    ) : harvests.length === 0 ? (
                        <EmptyState
                            icon={Calendar}
                            title="No harvests logged yet"
                            description="Log harvests from company farms to receive agricultural materials into warehouse inventory."
                            action={canManage && (
                                <Button variant="primary" onClick={openHarvestForm}>
                                    <Plus size={16} className="mr-1.5" /> Log Harvest
                                </Button>
                            )}
                        />
                    ) : (
                        <Table columns={harvestColumns} data={harvests} />
                    )}
                </Card>
            )}

            {/* ─── TAB 2: FARMS REGISTRY CONTENT ─── */}
            {activeTab === 'farms' && (
                <Card className="p-4">
                    {/* Filters bar */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pb-3 border-b border-gray-100">
                        <div className="md:col-span-3 relative">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                            <Input
                                placeholder="Search by farm name, code, or location..."
                                value={farmSearch}
                                onChange={(e) => setFarmSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div>
                            <Select
                                value={farmStatusFilter}
                                onChange={(e) => setFarmStatusFilter(e.target.value)}
                            >
                                <option value="">All Statuses</option>
                                <option value="active">Active Only</option>
                                <option value="inactive">Inactive Only</option>
                            </Select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-16 text-center text-gray-500">Loading farms registry...</div>
                    ) : filteredFarms.length === 0 ? (
                        <EmptyState
                            icon={Home}
                            title="No farms found"
                            description={farmSearch || farmStatusFilter ? "No farms matched your filter criteria." : "Register company-owned or contracted farms to track crops and harvests."}
                            action={canManage && !farmSearch && !farmStatusFilter && (
                                <Button variant="primary" onClick={() => openFarmForm()}>
                                    <Plus size={16} className="mr-1.5" /> Register Farm
                                </Button>
                            )}
                        />
                    ) : (
                        <Table columns={farmColumns} data={filteredFarms} />
                    )}
                </Card>
            )}

            {/* ─── MODAL: VIEW HARVEST DETAILS ─── */}
            <Modal
                isOpen={isHarvestViewOpen}
                onClose={() => setIsHarvestViewOpen(false)}
                title={`Harvest Details: ${selectedHarvest?.harvestNumber}`}
                size="lg"
            >
                {selectedHarvest && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-sm border border-gray-150">
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Source Farm</span>
                                <span className="font-bold text-gray-800">{selectedHarvest.farmName || selectedHarvest.farmId?.name}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Intake Warehouse</span>
                                <span className="font-bold text-gray-800">{selectedHarvest.warehouseId?.name}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Harvest Date</span>
                                <span className="font-medium text-gray-800">{new Date(selectedHarvest.harvestDate).toLocaleDateString()}</span>
                            </div>
                            <div>
                                <span className="text-gray-500 block text-xs font-semibold uppercase">Status</span>
                                <Badge variant={selectedHarvest.status === 'approved' ? 'success' : 'default'}>
                                    {selectedHarvest.status === 'approved' ? 'Approved & Stocked' : 'Draft'}
                                </Badge>
                            </div>
                            {selectedHarvest.notes && (
                                <div className="col-span-2 border-t border-gray-200 pt-2 mt-2">
                                    <span className="text-gray-500 block text-xs font-semibold uppercase">Notes</span>
                                    <p className="text-gray-750 text-xs italic">{selectedHarvest.notes}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <h4 className="text-sm font-bold text-gray-700 mb-2">Harvested Crops</h4>
                            <div className="overflow-x-auto border border-gray-150 rounded-xl">
                                <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
                                    <thead className="bg-gray-50 text-gray-500 font-semibold text-xs uppercase">
                                        <tr>
                                            <th className="px-4 py-3">Product</th>
                                            <th className="px-4 py-3">Code</th>
                                            <th className="px-4 py-3">Quantity</th>
                                            <th className="px-4 py-3">Estimated Price</th>
                                            <th className="px-4 py-3">Tracking Batch Code</th>
                                            <th className="px-4 py-3 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-150 text-gray-700">
                                        {selectedHarvest.items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 font-semibold text-gray-900">{item.productName}</td>
                                                <td className="px-4 py-3 text-gray-500">{item.productCode}</td>
                                                <td className="px-4 py-3">{item.quantity} {item.unitOfMeasure}</td>
                                                <td className="px-4 py-3">Rs. {Number(item.unitPrice || 0).toFixed(2)}</td>
                                                <td className="px-4 py-3 font-mono text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-block mt-1">{item.batchNumber || '—'}</td>
                                                <td className="px-4 py-3 text-right font-bold text-gray-900">Rs. {(item.quantity * item.unitPrice).toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-gray-50 font-bold text-gray-900 border-t border-gray-200">
                                        <tr>
                                            <td colSpan="5" className="px-4 py-3 text-right uppercase text-xs tracking-wider">Grand Total:</td>
                                            <td className="px-4 py-3 text-right text-base text-emerald-600">Rs. {selectedHarvest.totalValue.toLocaleString('en-LK', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button type="button" variant="default" onClick={() => setIsHarvestViewOpen(false)}>Close</Button>
                            {selectedHarvest.status === 'draft' && canManage && (
                                <Button type="button" variant="primary" onClick={() => handleApproveHarvest(selectedHarvest._id)}>
                                    <Check size={16} className="mr-1.5" /> Approve & Stock Intake
                                </Button>
                            )}
                        </div>
                    </div>
                )}
            </Modal>

            {/* ─── MODAL: LOG NEW HARVEST ─── */}
            <Modal
                isOpen={isHarvestFormOpen}
                onClose={() => setIsHarvestFormOpen(false)}
                title="Log Own Farm Harvest"
                size="lg"
            >
                <form onSubmit={handleHarvestFormSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Select
                            label="Source Farm *"
                            value={harvestFormData.farmId}
                            onChange={(e) => setHarvestFormData(p => ({ ...p, farmId: e.target.value }))}
                            required
                        >
                            <option value="">Select Farm...</option>
                            {activeFarms.map(f => (
                                <option key={f._id} value={f._id}>{f.name} ({f.farmCode})</option>
                            ))}
                        </Select>

                        <Select
                            label="Intake Warehouse *"
                            value={harvestFormData.warehouseId}
                            onChange={(e) => setHarvestFormData(p => ({ ...p, warehouseId: e.target.value }))}
                            required
                        >
                            <option value="">Select Warehouse...</option>
                            {warehouses.map(w => (
                                <option key={w._id} value={w._id}>{w.name}</option>
                            ))}
                        </Select>

                        <Input
                            label="Harvest Date *"
                            type="date"
                            value={harvestFormData.harvestDate}
                            onChange={(e) => setHarvestFormData(p => ({ ...p, harvestDate: e.target.value }))}
                            required
                        />
                    </div>

                    <div className="border border-gray-150 p-4 rounded-xl bg-gray-50 space-y-4">
                        <h4 className="text-xs font-bold text-gray-600 uppercase tracking-wider">Add Harvested Crop</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                            <div className="md:col-span-2">
                                <ProductAutocompleteSelect
                                    placeholder="Type to search raw material crop..."
                                    products={products}
                                    value={newCropItem.productId}
                                    onChange={(val) => {
                                        const prod = products.find(p => p._id === val);
                                        setNewCropItem(p => ({
                                            ...p,
                                            productId: val,
                                            unitPrice: prod?.basePrice || prod?.costs?.lastPurchaseCost || ''
                                        }));
                                    }}
                                />
                            </div>
                            <Input
                                placeholder="Qty"
                                type="number"
                                min="0.01"
                                step="any"
                                value={newCropItem.quantity}
                                onChange={(e) => setNewCropItem(p => ({ ...p, quantity: e.target.value }))}
                            />
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Est. Price"
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={newCropItem.unitPrice}
                                    onChange={(e) => setNewCropItem(p => ({ ...p, unitPrice: e.target.value }))}
                                />
                                <Button type="button" variant="primary" onClick={handleAddCropItem} className="shrink-0">
                                    <Plus size={16} />
                                </Button>
                            </div>
                        </div>

                        {harvestFormData.items.length > 0 && (
                            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mt-3">
                                <table className="min-w-full divide-y divide-gray-200 text-xs">
                                    <thead className="bg-gray-100 font-semibold text-gray-600">
                                        <tr>
                                            <th className="px-3 py-2 text-left">Crop</th>
                                            <th className="px-3 py-2 text-left">Qty</th>
                                            <th className="px-3 py-2 text-left">Price</th>
                                            <th className="px-3 py-2 text-right">Subtotal</th>
                                            <th className="px-3 py-2 text-center w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {harvestFormData.items.map((it, idx) => (
                                            <tr key={idx}>
                                                <td className="px-3 py-2 font-medium">{it.productName}</td>
                                                <td className="px-3 py-2">{it.quantity} {it.unitOfMeasure}</td>
                                                <td className="px-3 py-2">Rs. {it.unitPrice}</td>
                                                <td className="px-3 py-2 text-right font-bold">Rs. {(it.quantity * it.unitPrice).toFixed(2)}</td>
                                                <td className="px-3 py-2 text-center">
                                                    <button type="button" onClick={() => handleRemoveCropItem(idx)} className="text-red-500 hover:text-red-700">
                                                        <Trash2 size={13} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <Textarea
                        label="Harvest Notes / Weather Observations"
                        placeholder="e.g. Morning pick, organic block A yield..."
                        value={harvestFormData.notes}
                        onChange={(e) => setHarvestFormData(p => ({ ...p, notes: e.target.value }))}
                    />

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button type="button" variant="default" onClick={() => setIsHarvestFormOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">Record Harvest Draft</Button>
                    </div>
                </form>
            </Modal>

            {/* ─── MODAL: REGISTER / EDIT FARM ─── */}
            <Modal
                isOpen={isFarmFormOpen}
                onClose={() => setIsFarmFormOpen(false)}
                title={editingFarm ? 'Edit Farm Details' : 'Register Agricultural Farm'}
                size="md"
            >
                <form onSubmit={handleFarmFormSubmit} className="space-y-4">
                    <Input
                        label="Farm Name *"
                        placeholder="e.g. Kandy Organic Herbal Estate"
                        value={farmFormData.name}
                        onChange={(e) => setFarmFormData(p => ({ ...p, name: e.target.value }))}
                        required
                    />

                    <Input
                        label="Location / Region"
                        placeholder="e.g. Matale District, Central Province"
                        value={farmFormData.location}
                        onChange={(e) => setFarmFormData(p => ({ ...p, location: e.target.value }))}
                    />

                    <Input
                        label="Contact Number"
                        placeholder="e.g. +94 77 123 4567"
                        value={farmFormData.contactNumber}
                        onChange={(e) => setFarmFormData(p => ({ ...p, contactNumber: e.target.value }))}
                    />

                    <Select
                        label="Status"
                        value={farmFormData.status}
                        onChange={(e) => setFarmFormData(p => ({ ...p, status: e.target.value }))}
                    >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </Select>

                    <Textarea
                        label="Notes / Agronomy details"
                        placeholder="Soil type, organic certifications, acreage..."
                        value={farmFormData.notes}
                        onChange={(e) => setFarmFormData(p => ({ ...p, notes: e.target.value }))}
                    />

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button type="button" variant="default" onClick={() => setIsFarmFormOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary">{editingFarm ? 'Save Changes' : 'Register Farm'}</Button>
                    </div>
                </form>
            </Modal>

            {/* ─── CONFIRM DIALOG: DELETE FARM ─── */}
            <ConfirmDialog
                isOpen={!!deletingFarm}
                onClose={() => setDeletingFarm(null)}
                onConfirm={handleFarmDelete}
                title="Delete Farm"
                message={`Are you sure you want to delete the farm "${deletingFarm?.name}"? Any harvest logs linked to this farm will remain in the database.`}
                confirmText="Delete"
                variant="danger"
            />
        </div>
    );
}
