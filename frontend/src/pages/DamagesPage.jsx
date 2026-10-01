import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, AlertTriangle, Wrench } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Textarea from '../components/ui/Textarea';
import { useDamages, useCreateDamage, useDamageSummary } from '../features/returns/useReturns';
import { productsApi } from '../features/products/productsApi';
import { useWarehouses } from '../features/warehouses/useWarehouses';
import ProductAutocompleteSelect from '../components/ui/ProductAutocompleteSelect';

import RepairsPage from './RepairsPage';

export default function DamagesPage({ initialTab = 'damages' }) {
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
        if (newTab === 'damages') {
            navigate('/damages');
        } else if (newTab === 'repairs') {
            navigate('/repairs');
        }
    };

    const [filters, setFilters] = useState({ source: '', page: 1, limit: 15 });
    const [isFormOpen, setIsFormOpen] = useState(false);

    const [productId, setProductId] = useState('');
    const [quantity, setQuantity] = useState(0);
    const [warehouseId, setWarehouseId] = useState('');
    const [source, setSource] = useState('warehouse_damage');
    const [description, setDescription] = useState('');
    const [disposition, setDisposition] = useState('pending');
    const [costPerUnit, setCostPerUnit] = useState(0);
    const [adjustStock, setAdjustStock] = useState(true);

    const { data, isLoading } = useDamages(filters);
    const { data: summaryData } = useDamageSummary();
    const { data: productsData } = useQuery({ queryKey: ['products', 'all'], queryFn: () => productsApi.list({ limit: 500 }) });
    const { data: warehousesData } = useWarehouses({ isActive: true });
    const createMutation = useCreateDamage();

    const damages = data?.data || [];
    const summary = summaryData?.data || { bySource: [], totalCount: 0, totalValue: 0 };

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);
    const fmtDate = (d) => new Date(d).toLocaleDateString('en-LK');

    const columns = [
        { key: 'damageNumber', label: 'Ref #', render: (r) => <span className="font-mono text-xs">{r.damageNumber}</span> },
        { key: 'createdAt', label: 'Date', render: (r) => fmtDate(r.createdAt) },
        { key: 'product', label: 'Product', render: (r) => <div><p className="text-sm">{r.productName}</p><p className="text-xs text-gray-500 font-mono">{r.productCode}</p></div> },
        { key: 'quantity', label: 'Qty', render: (r) => `${r.quantity} ${r.unitOfMeasure || ''}` },
        { key: 'value', label: 'Value', render: (r) => fmt(r.totalValue) },
        { key: 'source', label: 'Source', render: (r) => <Badge>{r.source.replace(/_/g, ' ')}</Badge> },
        { key: 'disposition', label: 'Disposition', render: (r) => r.disposition.replace(/_/g, ' ') },
        { key: 'writtenOff', label: 'Written off', render: (r) => r.writtenOff ? <Badge variant="danger">Yes</Badge> : <Badge>No</Badge> },
    ];

    const submit = async () => {
        if (!productId || !quantity || !warehouseId) { toast.error('Required fields missing'); return; }
        try {
            await createMutation.mutateAsync({
                productId, quantity: +quantity, warehouseId, source, description,
                disposition, costPerUnit: +costPerUnit, adjustStock,
            });
            setIsFormOpen(false);
            setProductId(''); setQuantity(0); setWarehouseId(''); setDescription('');
        } catch { }
    };

    return (
        <div>
            {/* ─── EXECUTIVE HEADER ─── */}
            <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                            Quality & Incident Hub
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">Damage Control & Servicing</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Damages & Repairs</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Track damaged goods across warehousing and transit, manage write-offs, and monitor workshop repairs.
                    </p>
                </div>
                {activeTab === 'damages' && (
                    <Button variant="primary" onClick={() => setIsFormOpen(true)} className="bg-rose-600 hover:bg-rose-700 shadow-xs">
                        <Plus size={16} className="mr-1.5" /> Record Damage
                    </Button>
                )}
            </div>

            {/* ─── 2 COLOR-CODED MODULE BUTTONS / CARDS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
                {/* 1. Damages & Scrap (Rose / Red) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('damages')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'damages'
                            ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white border-rose-600 shadow-lg shadow-rose-600/20 ring-2 ring-rose-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-rose-400 hover:bg-rose-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'damages'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white'
                            }`}
                        >
                            <AlertTriangle size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Waste & Scrap
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Damage & Waste Records
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'damages' ? 'text-rose-100' : 'text-slate-500'}`}>
                                Write-offs & loss tracking
                            </p>
                        </div>
                    </div>
                    {summary.totalCount > 0 && (
                        <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                                activeTab === 'damages'
                                    ? 'bg-white text-rose-800'
                                    : 'bg-rose-100 text-rose-800'
                            }`}
                        >
                            {summary.totalCount}
                        </span>
                    )}
                </button>

                {/* 2. Repairs Workshop (Blue / Cyan) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('repairs')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'repairs'
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-700 text-white border-blue-600 shadow-lg shadow-blue-600/20 ring-2 ring-blue-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'repairs'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'
                            }`}
                        >
                            <Wrench size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Restoration
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Repairs Workshop
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'repairs' ? 'text-blue-100' : 'text-slate-500'}`}>
                                Servicing & technical repair
                            </p>
                        </div>
                    </div>
                </button>
            </div>

            {/* ─── TAB CONTENT AREA ─── */}
            {activeTab === 'damages' && (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                        <Card className="p-4"><p className="text-sm text-gray-600">Total Damages Recorded</p><p className="text-2xl font-semibold">{summary.totalCount}</p></Card>
                        <Card className="p-4"><p className="text-sm text-gray-600">Total Value Lost</p><p className="text-2xl font-semibold text-red-600">{fmt(summary.totalValue)}</p></Card>
                        <Card className="p-4 bg-amber-50 border-amber-200"><p className="text-sm text-amber-700">Top Source</p>
                            <p className="text-lg font-semibold text-amber-900">
                                {summary.bySource[0]?._id?.replace(/_/g, ' ') || '—'}
                            </p>
                        </Card>
                    </div>

                    <Card>
                        <div className="p-4 border-b flex gap-3">
                            <div className="w-56">
                                <Select placeholder="All Sources"
                                    options={[
                                        { value: 'production_reject', label: 'Production reject' },
                                        { value: 'warehouse_damage', label: 'Warehouse damage' },
                                        { value: 'customer_return', label: 'Customer return' },
                                        { value: 'supplier_delivery', label: 'Supplier delivery' },
                                        { value: 'transit', label: 'Transit' },
                                        { value: 'expired', label: 'Expired' },
                                        { value: 'theft', label: 'Theft' },
                                        { value: 'other', label: 'Other' },
                                    ]}
                                    value={filters.source} onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value, page: 1 }))} />
                            </div>
                        </div>
                        {isLoading ? <div className="py-16 text-center text-gray-500">Loading...</div>
                            : damages.length === 0 ? <EmptyState icon={AlertTriangle} title="No damages" description="Record damage when found" />
                                : <><Table columns={columns} data={damages} />
                                    <Pagination page={filters.page} totalPages={data?.totalPages || 1} total={data?.total || 0}
                                        onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))} /></>}
                    </Card>

                    <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Record Damage" size="md">
                        <div className="p-6 space-y-4">
                            <ProductAutocompleteSelect
                                label="Product *"
                                placeholder="Search or type product..."
                                products={productsData?.data || []}
                                value={productId}
                                onChange={(val, selectedProd) => {
                                    setProductId(val);
                                    if (selectedProd) {
                                        const cost = selectedProd.costs?.averageCost || selectedProd.costs?.lastPurchaseCost || selectedProd.basePrice || 0;
                                        if (cost) setCostPerUnit(cost);
                                    }
                                }}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Quantity" required type="number" step="0.01" min="0.01"
                                    value={quantity} onChange={(e) => setQuantity(e.target.value)} />
                                <Input label="Cost per unit" type="number" step="0.01" min="0"
                                    value={costPerUnit} onChange={(e) => setCostPerUnit(e.target.value)} />
                            </div>
                            <Select label="Warehouse" required placeholder="Select..."
                                options={(warehousesData?.data || []).map((w) => ({ value: w._id, label: `${w.name} (${w.warehouseCode})` }))}
                                value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} />
                            <Select label="Source" required
                                options={[
                                    { value: 'warehouse_damage', label: 'Warehouse damage' },
                                    { value: 'production_reject', label: 'Production reject' },
                                    { value: 'transit', label: 'Transit' },
                                    { value: 'expired', label: 'Expired' },
                                    { value: 'theft', label: 'Theft' },
                                    { value: 'other', label: 'Other' },
                                ]}
                                value={source} onChange={(e) => setSource(e.target.value)} />
                            <Select label="Disposition"
                                options={[
                                    { value: 'pending', label: 'Pending' },
                                    { value: 'scrap', label: 'Scrap' },
                                    { value: 'repair', label: 'Send to repair' },
                                    { value: 'return_to_supplier', label: 'Return to supplier' },
                                    { value: 'write_off', label: 'Write off' },
                                ]}
                                value={disposition} onChange={(e) => setDisposition(e.target.value)} />
                            <Textarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
                            <label className="flex items-center gap-2 text-sm">
                                <input type="checkbox" checked={adjustStock} onChange={(e) => setAdjustStock(e.target.checked)} />
                                Also decrement stock immediately
                            </label>
                        </div>
                        <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                            <Button variant="outline" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                            <Button variant="primary" onClick={submit} loading={createMutation.isPending}>Record</Button>
                        </div>
                    </Modal>
                </>
            )}

            {activeTab === 'repairs' && (
                <RepairsPage embedded={true} />
            )}
        </div>
    );
}