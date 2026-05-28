import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';

import { customersApi } from '../features/customers/customersApi';
import { salesOrdersApi } from '../features/salesOrders/salesOrdersApi';
import { useCreateReturn } from '../features/returns/useReturns';

import api from '../api/axios';

const reasonOptions = [
    { value: 'damaged_on_arrival', label: 'Damaged on arrival' },
    { value: 'defective', label: 'Defective' },
    { value: 'wrong_item', label: 'Wrong item sent' },
    { value: 'not_as_described', label: 'Not as described' },
    { value: 'expired', label: 'Expired' },
    { value: 'overshipped', label: 'Over-shipped' },
    { value: 'customer_changed_mind', label: 'Changed mind' },
    { value: 'late_delivery', label: 'Late delivery' },
    { value: 'other', label: 'Other' },
];

export default function ReturnFormPage() {
    const navigate = useNavigate();
    const createMutation = useCreateReturn();

    const [customerId, setCustomerId] = useState('');
    const [selectedOrderIds, setSelectedOrderIds] = useState([]);
    const [items, setItems] = useState([]);
    const [customerNotes, setCustomerNotes] = useState('');
    const [internalNotes, setInternalNotes] = useState('');

    const { data: customersData } = useQuery({
        queryKey: ['customers', 'active'],
        queryFn: () => customersApi.list({ status: 'active', limit: 500 }),
    });
    // const { data: ordersData } = useQuery({
    //     queryKey: ['customerOrders', customerId],
    //     queryFn: () => salesOrdersApi.list({ customerId, limit: 100 }),
    //     enabled: !!customerId,
    // });

    // In your component:
    const { data: ordersData } = useQuery({
        queryKey: ['eligibleOrdersForReturn', customerId],
        queryFn: async () => {
            if (!customerId) return { data: [] };
            const res = await api.get('/customer-returns/eligible-orders', { params: { customerId } });
            return res.data;
        },
        enabled: !!customerId,
    });

    const eligibleOrders = ordersData?.data || [];

    const customers = customersData?.data || [];
    const orders = (ordersData?.data || []).filter((o) => ['delivered', 'invoiced', 'completed'].includes(o.status));

    const customerOptions = customers.map((c) => ({ value: c._id, label: `${c.displayName} (${c.customerCode})` }));

    // Collect all items from selected orders for picking
    const availableItems = useMemo(() => {
        const itemList = [];
        orders.filter((o) => selectedOrderIds.includes(o._id)).forEach((o) => {
            o.items.forEach((item) => {
                itemList.push({
                    salesOrderId: o._id,
                    salesOrderLineId: item._id,
                    orderNumber: o.orderNumber,
                    productId: item.productId?._id || item.productId,
                    productCode: item.productCode,
                    productName: item.productName,
                    unitPrice: item.unitPrice,
                    unitOfMeasure: item.unitOfMeasure,
                    maxQty: item.deliveredQuantity || item.orderedQuantity,
                });
            });
        });
        return itemList;
    }, [orders, selectedOrderIds]);

    const toggleOrder = (id) => {
        setSelectedOrderIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
    };

    const addItem = (src) => {
        setItems([...items, {
            salesOrderId: src.salesOrderId,
            salesOrderLineId: src.salesOrderLineId,
            productId: src.productId,
            productCode: src.productCode,
            productName: src.productName,
            unitPrice: src.unitPrice,
            unitOfMeasure: src.unitOfMeasure,
            maxQty: src.maxQty,
            quantityReturned: 1,
            reason: 'damaged_on_arrival',
            reasonDescription: '',
            refundable: true,
            restockingFeePercent: 0,
        }]);
    };
    const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
    const updateItem = (idx, f, v) => {
        const newItems = [...items];
        newItems[idx] = { ...newItems[idx], [f]: v };
        setItems(newItems);
    };

    const totals = useMemo(() => {
        const value = items.reduce((s, i) => s + (+i.quantityReturned || 0) * (+i.unitPrice || 0), 0);
        const restocking = items.reduce((s, i) => s + value * (+i.restockingFeePercent || 0) / 100, 0);
        const refund = items.filter((i) => i.refundable).reduce((s, i) => s + ((+i.quantityReturned || 0) * (+i.unitPrice || 0)) - (((+i.quantityReturned || 0) * (+i.unitPrice || 0)) * (+i.restockingFeePercent || 0) / 100), 0);
        return { value: +value.toFixed(2), refund: +refund.toFixed(2), restocking: +restocking.toFixed(2) };
    }, [items]);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const submit = async () => {
        if (!customerId) { toast.error('Select customer'); return; }
        if (items.length === 0) { toast.error('Add at least one item'); return; }

        try {
            const result = await createMutation.mutateAsync({
                customerId,
                salesOrderIds: selectedOrderIds,
                items: items.map((i) => ({
                    productId: i.productId,
                    quantityReturned: +i.quantityReturned,
                    unitPrice: +i.unitPrice,
                    reason: i.reason,
                    reasonDescription: i.reasonDescription || undefined,
                    refundable: i.refundable,
                    restockingFeePercent: +i.restockingFeePercent || 0,
                    salesOrderId: i.salesOrderId,
                    salesOrderLineId: i.salesOrderLineId,
                })),
                customerNotes: customerNotes || undefined,
                internalNotes: internalNotes || undefined,
            });
            navigate(`/returns/${result.data._id}`);
        } catch { }
    };

    return (
        <div>
            <PageHeader title="New Return Request (RMA)"
                actions={<Button variant="outline" onClick={() => navigate('/returns')}>
                    <ArrowLeft size={16} className="mr-1.5" /> Back
                </Button>} />

            <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-6">
                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Customer & Source Orders</h3>
                        <Select label="Customer" required placeholder="Select customer..."
                            options={customerOptions} value={customerId}
                            onChange={(e) => { setCustomerId(e.target.value); setSelectedOrderIds([]); setItems([]); }} />

                        {customerId && orders.length > 0 && (
                            <div className="mt-4">
                                <p className="text-sm font-medium mb-2">Source Orders (optional — helps trace the return)</p>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {orders.map((o) => (
                                        <label key={o._id} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                                            <input type="checkbox" checked={selectedOrderIds.includes(o._id)} onChange={() => toggleOrder(o._id)} />
                                            <span className="font-mono text-xs">{o.orderNumber}</span>
                                            <span className="text-sm">— {fmt(o.grandTotal)}</span>
                                            <span className="text-xs text-gray-500 ml-auto">{new Date(o.orderDate).toLocaleDateString('en-LK')}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>

                    <Card className="p-6">
                        <h3 className="text-sm font-semibold text-gray-700 mb-4">Items to Return</h3>

                        {availableItems.length > 0 && (
                            <div className="mb-4">
                                <p className="text-xs text-gray-500 mb-2">Pick items from selected orders:</p>
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {availableItems.filter((ai) => !items.find((i) => i.salesOrderLineId === ai.salesOrderLineId)).map((ai, idx) => (
                                        <button key={idx} type="button" onClick={() => addItem(ai)}
                                            className="w-full flex items-center justify-between p-2 text-sm border rounded hover:bg-gray-50">
                                            <span>{ai.productName} <span className="text-xs text-gray-500">({ai.orderNumber})</span></span>
                                            <span className="text-xs">Max {ai.maxQty}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            {items.map((item, idx) => (
                                <div key={idx} className="border rounded-lg p-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <p className="font-medium text-sm">{item.productName}</p>
                                            <p className="text-xs text-gray-500 font-mono">{item.productCode} · Max qty: {item.maxQty}</p>
                                        </div>
                                        <button type="button" onClick={() => removeItem(idx)} className="text-red-600 hover:bg-red-50 p-1 rounded">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 mb-2">
                                        <Input label="Qty" type="number" step="0.01" min="0"
                                            max={item.remainingReturnableQuantity}  // ← cap at remaining
                                            value={item.quantityReturned} onChange={(e) => updateItem(idx, 'quantityReturned', e.target.value)} />
                                        {item.alreadyReturnedQuantity > 0 && (
                                            <p className="text-xs text-gray-500 mt-1">
                                                {item.alreadyReturnedQuantity} of {item.orderedQuantity} already returned.
                                                Remaining returnable: {item.remainingReturnableQuantity}
                                            </p>
                                        )}
                                        <Input label="Unit Price" type="number" step="0.01"
                                            value={item.unitPrice} onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)} />
                                        <Input label="Restock Fee %" type="number" step="0.01" min="0" max="100"
                                            value={item.restockingFeePercent} onChange={(e) => updateItem(idx, 'restockingFeePercent', e.target.value)} />
                                    </div>
                                    <Select label="Reason" options={reasonOptions}
                                        value={item.reason} onChange={(e) => updateItem(idx, 'reason', e.target.value)} />
                                    <Textarea label="Reason details" rows={2} value={item.reasonDescription}
                                        onChange={(e) => updateItem(idx, 'reasonDescription', e.target.value)} />
                                    <label className="flex items-center gap-2 text-sm mt-2">
                                        <input type="checkbox" checked={item.refundable}
                                            onChange={(e) => updateItem(idx, 'refundable', e.target.checked)} />
                                        Refundable
                                    </label>
                                </div>
                            ))}
                        </div>
                    </Card>

                    <Card className="p-6">
                        <Textarea label="Customer Notes" rows={2} value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} />
                        <Textarea label="Internal Notes" rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
                    </Card>
                </div>

                <div>
                    <Card className="p-6 sticky top-6">
                        <h3 className="text-sm font-semibold mb-4">Summary</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-gray-600">Return Value</span><span>{fmt(totals.value)}</span></div>
                            <div className="flex justify-between"><span className="text-gray-600">Restocking fees</span><span className="text-red-600">-{fmt(totals.restocking)}</span></div>
                            <div className="flex justify-between pt-3 border-t font-semibold"><span>Refund</span><span className="text-primary-600">{fmt(totals.refund)}</span></div>
                        </div>
                        <Button variant="primary" fullWidth className="mt-4" onClick={submit} loading={createMutation.isPending}
                            disabled={!customerId || items.length === 0}>
                            <Save size={16} className="mr-1.5" /> Create RMA
                        </Button>
                        <p className="text-xs text-gray-500 text-center mt-2">Will be saved as draft. Approve it to start processing.</p>
                    </Card>
                </div>
            </div>
        </div>
    );
}