import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Boxes, AlertTriangle, PackagePlus, ArrowRightLeft, Settings2 } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';

import { useStockItems } from '../features/stock/useStock';
import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useAuthStore } from '../store/authStore';

export default function StockPage() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const canAdjust = ['admin', 'manager', 'warehouse_staff'].includes(user?.role);

    const [filters, setFilters] = useState({
        search: '', warehouseId: '', lowStock: '',
        page: 1, limit: 20,
    });

    const { data, isLoading } = useStockItems(filters);
    const { data: warehousesData } = useWarehouses();

    const items = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const warehouseOptions = (warehousesData?.data || []).map((w) => ({
        value: w._id, label: `${w.name} (${w.warehouseCode})`,
    }));

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

    const columns = [
        {
            key: 'product', label: 'Product',
            render: (r) => (
                <div>
                    <p className="font-medium text-gray-900">{r.productName}</p>
                    <p className="text-xs font-mono text-gray-500">{r.productCode}</p>
                </div>
            ),
        },
        {
            key: 'warehouse', label: 'Warehouse',
            render: (r) => (
                <div>
                    <p className="text-sm">{r.warehouseId?.name}</p>
                    <p className="text-xs font-mono text-gray-500">{r.warehouseId?.warehouseCode}</p>
                </div>
            ),
        },
        {
            key: 'onHand', label: 'On Hand',
            render: (r) => (
                <span className="font-medium">{fmt(r.quantities.onHand)} {r.unitOfMeasure}</span>
            ),
        },
        {
            key: 'reserved', label: 'Reserved',
            render: (r) => (
                <span className={r.quantities.reserved > 0 ? 'text-amber-600' : 'text-gray-400'}>
                    {fmt(r.quantities.reserved)}
                </span>
            ),
        },
        {
            key: 'available', label: 'Available',
            render: (r) => (
                <span className="font-medium text-green-700">
                    {fmt(r.quantities.onHand - r.quantities.reserved)}
                </span>
            ),
        },
        {
            key: 'value', label: 'Value',
            render: (r) => <span className="text-sm">{fmtMoney(r.totalValue)}</span>,
        },
        {
            key: 'status', label: 'Status',
            render: (r) => {
                const s = getStockStatus(r);
                return <Badge variant={s.variant}>{s.label}</Badge>;
            },
        },
    ];

    const totalValue = items.reduce((s, i) => s + (i.totalValue || 0), 0);

    return (
        <div>
            <PageHeader
                title="Stock Overview"
                description="Current inventory across all warehouses"
                actions={canAdjust && (
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => navigate('/stock/opening')}>
                            <PackagePlus size={16} className="mr-1.5" /> Opening Stock
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/stock/transfer')}>
                            <ArrowRightLeft size={16} className="mr-1.5" /> Transfer
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/stock/adjustment')}>
                            <Settings2 size={16} className="mr-1.5" /> Adjust
                        </Button>
                        <Button variant="outline" onClick={() => navigate('/stock/movements')}>
                            History
                        </Button>
                    </div>
                )}
            />

            {/* Summary strip */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <Card className="p-4">
                    <p className="text-sm text-gray-600">Total Items</p>
                    <p className="text-2xl font-semibold">{total}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-gray-600">Total Value (page)</p>
                    <p className="text-2xl font-semibold">{fmtMoney(totalValue)}</p>
                </Card>
                <Card className="p-4">
                    <p className="text-sm text-gray-600">Warehouses</p>
                    <p className="text-2xl font-semibold">{warehouseOptions.length}</p>
                </Card>
                <Card className="p-4 bg-amber-50 border-amber-200">
                    <p className="text-sm text-amber-700 flex items-center gap-1">
                        <AlertTriangle size={14} /> Low stock
                    </p>
                    <button
                        className="text-2xl font-semibold text-amber-700 hover:underline"
                        onClick={() => setFilters((f) => ({ ...f, lowStock: 'true', page: 1 }))}
                    >
                        View
                    </button>
                </Card>
            </div>

            <Card>
                <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search product..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="w-56">
                        <Select
                            placeholder="All Warehouses"
                            options={warehouseOptions}
                            value={filters.warehouseId}
                            onChange={(e) => setFilters((f) => ({ ...f, warehouseId: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="w-40">
                        <Select
                            placeholder="All Items"
                            options={[{ value: 'true', label: 'Low stock only' }]}
                            value={filters.lowStock}
                            onChange={(e) => setFilters((f) => ({ ...f, lowStock: e.target.value, page: 1 }))}
                        />
                    </div>
                </div>

                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading...</div>
                ) : items.length === 0 ? (
                    <EmptyState
                        icon={Boxes}
                        title="No stock data"
                        description="Enter opening stock to get started"
                        action={canAdjust && (
                            <Button variant="primary" onClick={() => navigate('/stock/opening')}>
                                <PackagePlus size={16} className="mr-1.5" /> Enter Opening Stock
                            </Button>
                        )}
                    />
                ) : (
                    <>
                        <Table columns={columns} data={items} />
                        <Pagination
                            page={filters.page} totalPages={totalPages} total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                        />
                    </>
                )}
            </Card>
        </div>
    );
}