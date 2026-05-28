import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Plus, Trash2, ArrowLeft, Save, PackagePlus } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

import { productsApi } from '../features/products/productsApi';
import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useOpeningStock } from '../features/stock/useStock';

export default function OpeningStockPage() {
    const navigate = useNavigate();
    const [warehouseId, setWarehouseId] = useState('');
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState([{ productId: '', quantity: '', costPerUnit: '' }]);

    const { data: warehousesData } = useWarehouses({ isActive: true });
    const { data: productsData } = useQuery({
        queryKey: ['products', 'active', 'all'],
        queryFn: () => productsApi.list({ status: 'active', limit: 500 }),
    });

    const mutation = useOpeningStock();

    const warehouseOptions = (warehousesData?.data || []).map((w) => ({
        value: w._id, label: `${w.name} (${w.warehouseCode})`,
    }));
    const productOptions = (productsData?.data || []).map((p) => ({
        value: p._id, label: `${p.name} — ${p.productCode}`,
    }));

    const addLine = () => setLines([...lines, { productId: '', quantity: '', costPerUnit: '' }]);
    const removeLine = (idx) => setLines(lines.filter((_, i) => i !== idx));
    const updateLine = (idx, field, value) => {
        const newLines = [...lines];
        newLines[idx] = { ...newLines[idx], [field]: value };

        // Auto-fill cost from product's last purchase cost
        if (field === 'productId' && value) {
            const product = productsData?.data.find((p) => p._id === value);
            if (product && !newLines[idx].costPerUnit) {
                newLines[idx].costPerUnit = product.costs?.lastPurchaseCost || product.basePrice || 0;
            }
        }
        setLines(newLines);
    };

    const handleSubmit = async () => {
        if (!warehouseId) { toast.error('Select warehouse'); return; }
        const items = lines.filter((l) => l.productId && l.quantity);
        if (items.length === 0) { toast.error('Add at least one item'); return; }

        try {
            await mutation.mutateAsync({
                warehouseId,
                items: items.map((i) => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    costPerUnit: Number(i.costPerUnit) || 0,
                })),
                notes: notes || undefined,
            });
            navigate('/stock');
        } catch { }
    };

    const totalValue = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.costPerUnit) || 0), 0);
    const fmt = (n) => new Intl.NumberFormat('en-LK', {
        style: 'currency', currency: 'LKR', minimumFractionDigits: 2,
    }).format(n || 0);

    return (
        <div>
            <PageHeader
                title="Opening Stock Entry"
                description="Record initial inventory into your warehouse"
                actions={
                    <Button variant="outline" onClick={() => navigate('/stock')}>
                        <ArrowLeft size={16} className="mr-1.5" /> Back
                    </Button>
                }
            />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Target Warehouse</h3>
                        <Select
                            label="Warehouse" required
                            placeholder="Select warehouse..."
                            options={warehouseOptions}
                            value={warehouseId}
                            onChange={(e) => setWarehouseId(e.target.value)}
                        />
                    </Card>

                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-gray-700">Stock Items</h3>
                            <Button type="button" variant="outline" size="sm" onClick={addLine}>
                                <Plus size={14} className="mr-1" /> Add Line
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {lines.map((line, idx) => {
                                const lineValue = (Number(line.quantity) || 0) * (Number(line.costPerUnit) || 0);
                                return (
                                    <div key={idx} className="border border-gray-200 rounded-lg p-3">
                                        <div className="flex gap-2 items-start">
                                            <span className="text-xs text-gray-500 mt-2 w-6">{idx + 1}</span>
                                            <div className="flex-1 grid grid-cols-6 gap-2">
                                                <div className="col-span-3">
                                                    <Select
                                                        placeholder="Select product..."
                                                        options={productOptions}
                                                        value={line.productId}
                                                        onChange={(e) => updateLine(idx, 'productId', e.target.value)}
                                                    />
                                                </div>
                                                <Input
                                                    type="number" step="0.01" min="0.01"
                                                    placeholder="Qty"
                                                    value={line.quantity}
                                                    onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                                                />
                                                <Input
                                                    type="number" step="0.01" min="0"
                                                    placeholder="Cost"
                                                    value={line.costPerUnit}
                                                    onChange={(e) => updateLine(idx, 'costPerUnit', e.target.value)}
                                                />
                                                <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm font-medium text-right">
                                                    {fmt(lineValue)}
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

                        <div className="flex justify-end mt-4 pt-4 border-t">
                            <div className="text-right">
                                <p className="text-xs text-gray-500">Total value</p>
                                <p className="text-xl font-bold text-primary-600">{fmt(totalValue)}</p>
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6">
                        <Textarea label="Notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </Card>
                </div>

                <div>
                    <Card className="p-6 sticky top-6">
                        <PackagePlus size={24} className="text-primary-600 mb-3" />
                        <h3 className="font-semibold mb-2">Opening Stock</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Use this to enter your existing inventory when starting. Each line creates a stock movement record for the audit trail.
                        </p>
                        <div className="space-y-2 text-sm mb-4">
                            <div className="flex justify-between"><span className="text-gray-500">Lines</span><span>{lines.filter((l) => l.productId).length}</span></div>
                            <div className="flex justify-between font-medium"><span>Total Value</span><span className="text-primary-600">{fmt(totalValue)}</span></div>
                        </div>
                        <Button variant="primary" fullWidth onClick={handleSubmit} loading={mutation.isPending}
                            disabled={!warehouseId || !lines.some((l) => l.productId && l.quantity)}>
                            <Save size={16} className="mr-1.5" /> Save Opening Stock
                        </Button>
                    </Card>
                </div>
            </div>
        </div>
    );
}