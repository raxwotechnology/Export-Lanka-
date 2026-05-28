import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft, Save, ArrowRightLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useTransferStock } from '../features/stock/useStock';
import { stockApi } from '../features/stock/stockApi';

export default function StockTransferPage() {
    const navigate = useNavigate();
    const [fromWarehouseId, setFromWarehouseId] = useState('');
    const [toWarehouseId, setToWarehouseId] = useState('');
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState([{ productId: '', quantity: '' }]);

    const { data: warehousesData } = useWarehouses({ isActive: true });
    const mutation = useTransferStock();

    // Load stock available at source warehouse
    const { data: stockData } = useQuery({
        queryKey: ['stock', 'source', fromWarehouseId],
        queryFn: () => stockApi.list({ warehouseId: fromWarehouseId, limit: 500 }),
        enabled: !!fromWarehouseId,
    });

    useEffect(() => {
        // Reset lines when source warehouse changes
        setLines([{ productId: '', quantity: '' }]);
    }, [fromWarehouseId]);

    const warehouseOptions = (warehousesData?.data || []).map((w) => ({
        value: w._id, label: `${w.name} (${w.warehouseCode})`,
    }));

    const availableProducts = (stockData?.data || [])
        .filter((s) => (s.quantities.onHand - s.quantities.reserved) > 0)
        .map((s) => ({
            value: s.productId._id,
            label: `${s.productName} — Available: ${s.quantities.onHand - s.quantities.reserved}`,
            available: s.quantities.onHand - s.quantities.reserved,
        }));

    const addLine = () => setLines([...lines, { productId: '', quantity: '' }]);
    const removeLine = (idx) => setLines(lines.filter((_, i) => i !== idx));
    const updateLine = (idx, field, value) => {
        const newLines = [...lines];
        newLines[idx] = { ...newLines[idx], [field]: value };
        setLines(newLines);
    };

    const handleSubmit = async () => {
        if (!fromWarehouseId || !toWarehouseId) { toast.error('Select source and destination'); return; }
        if (fromWarehouseId === toWarehouseId) { toast.error('Source and destination must differ'); return; }
        const items = lines.filter((l) => l.productId && l.quantity);
        if (items.length === 0) { toast.error('Add at least one item'); return; }

        try {
            await mutation.mutateAsync({
                fromWarehouseId, toWarehouseId,
                items: items.map((i) => ({ productId: i.productId, quantity: Number(i.quantity) })),
                notes: notes || undefined,
            });
            navigate('/stock');
        } catch { }
    };

    return (
        <div>
            <PageHeader
                title="Stock Transfer"
                description="Move stock between warehouses"
                actions={<Button variant="outline" onClick={() => navigate('/stock')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>}
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Route</h3>
                        <div className="grid grid-cols-2 gap-6 items-center">
                            <Select
                                label="From Warehouse" required
                                placeholder="Select source..."
                                options={warehouseOptions}
                                value={fromWarehouseId}
                                onChange={(e) => setFromWarehouseId(e.target.value)}
                            />
                            <Select
                                label="To Warehouse" required
                                placeholder="Select destination..."
                                options={warehouseOptions.filter((o) => o.value !== fromWarehouseId)}
                                value={toWarehouseId}
                                onChange={(e) => setToWarehouseId(e.target.value)}
                            />
                        </div>
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700">Items to Transfer</h3>
                            <Button type="button" variant="outline" size="sm" onClick={addLine}
                                disabled={!fromWarehouseId}>
                                <Plus size={14} className="mr-1" /> Add Item
                            </Button>
                        </div>

                        {!fromWarehouseId ? (
                            <p className="text-sm text-gray-500 text-center py-8">Select source warehouse first</p>
                        ) : availableProducts.length === 0 ? (
                            <p className="text-sm text-gray-500 text-center py-8">No stock available at source warehouse</p>
                        ) : (
                            <div className="space-y-3">
                                {lines.map((line, idx) => {
                                    const selected = availableProducts.find((p) => p.value === line.productId);
                                    const qty = Number(line.quantity) || 0;
                                    const exceeds = selected && qty > selected.available;

                                    return (
                                        <div key={idx} className="border border-gray-200 rounded-lg p-3">
                                            <div className="flex gap-2 items-start">
                                                <span className="text-xs text-gray-500 mt-2 w-6">{idx + 1}</span>
                                                <div className="flex-1 grid grid-cols-4 gap-2">
                                                    <div className="col-span-3">
                                                        <Select
                                                            placeholder="Select product..."
                                                            options={availableProducts}
                                                            value={line.productId}
                                                            onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                                                        />
                                                    </div>
                                                    <div>
                                                        <Input
                                                            type="number" step="0.01" min="0.01"
                                                            placeholder="Qty"
                                                            value={line.quantity}
                                                            onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                                                            error={exceeds ? `Max ${selected.available}` : undefined}
                                                        />
                                                    </div>
                                                </div>
                                                {lines.length > 1 && (
                                                    <button type="button" onClick={() => removeLine(idx)}
                                                        className="p-2 text-red-600 hover:bg-red-50 rounded mt-0.5">
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    <Card className="p-6">
                        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </Card>
                </div>

                <div>
                    <Card className="p-6 sticky top-6">
                        <ArrowRightLeft size={24} className="text-primary-600 mb-3" />
                        <h3 className="font-semibold mb-2">Transfer Summary</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Each item decreases at source and increases at destination. Two movements per line in the audit log.
                        </p>
                        <Button variant="primary" fullWidth onClick={handleSubmit} loading={mutation.isPending}
                            disabled={!fromWarehouseId || !toWarehouseId || !lines.some((l) => l.productId && l.quantity)}>
                            <Save size={16} className="mr-1.5" /> Execute Transfer
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}