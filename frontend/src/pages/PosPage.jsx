import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Search, Plus, Minus, Trash2, ShoppingCart, Save, X,
    Package, AlertCircle, UserPlus, PackagePlus, CreditCard,
    CheckCircle, ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Badge from '../components/ui/Badge';
import { customersApi } from '../features/customers/customersApi';
import { productsApi } from '../features/products/productsApi';
import { stockApi } from '../features/stock/stockApi';
import { useWarehouses } from '../features/warehouses/useWarehouses';
import { useCategories } from '../features/products/useProducts';
import { useCreateSalesOrder } from '../features/salesOrders/useSalesOrders';
import QuickCreateCustomerModal from '../features/customers/QuickCreateCustomerModal';

export default function PosPage() {
    const navigate = useNavigate();
    const createOrder = useCreateSalesOrder();

    // Cart state
    const [customerId, setCustomerId] = useState('');
    const [sourceWarehouseId, setSourceWarehouseId] = useState('');
    const [cart, setCart] = useState([]); // [{ productId, name, code, price, qty, available, taxRate, taxable }]
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('all');
    const [orderDiscountPercent, setOrderDiscountPercent] = useState(0);

    // Modals
    const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);

    // Data
    const { data: warehousesData } = useWarehouses({ isActive: true });
    const { data: customersData } = useQuery({
        queryKey: ['customers', 'active'],
        queryFn: () => customersApi.list({ status: 'active', limit: 500 }),
    });
    const { data: productsData } = useQuery({
        queryKey: ['products', 'active', 'pos'],
        queryFn: () => productsApi.list({ status: 'active', canBeSold: true, limit: 500 }),
    });
    const { data: categoriesData } = useCategories({ isActive: 'true' });
    const { data: stockData } = useQuery({
        queryKey: ['stock', 'pos', sourceWarehouseId],
        queryFn: () => stockApi.list({ warehouseId: sourceWarehouseId, limit: 500 }),
        enabled: !!sourceWarehouseId,
    });
    const [taxMode, setTaxMode] = useState('item'); // 'item' = use product's tax rate, 'override' = use override
    const [overrideTaxRate, setOverrideTaxRate] = useState(18);

    const warehouses = warehousesData?.data || [];
    const customers = customersData?.data || [];
    const products = (productsData?.data || []).filter((p) => p.canBeSold !== false);
    const categories = categoriesData?.data || [];
    const stockItems = stockData?.data || [];

    // Set default warehouse
    useEffect(() => {
        if (!sourceWarehouseId && warehouses.length > 0) {
            const def = warehouses.find((w) => w.isDefault) || warehouses[0];
            if (def) setSourceWarehouseId(def._id);
        }
    }, [warehouses, sourceWarehouseId]);

    // Build stock map
    const stockMap = useMemo(() => {
        const map = new Map();
        stockItems.forEach((s) => {
            const pid = s.productId?._id || s.productId;
            const existing = map.get(pid) || { onHand: 0, reserved: 0 };
            existing.onHand += s.quantities?.onHand || 0;
            existing.reserved += s.quantities?.reserved || 0;
            map.set(pid, existing);
        });
        return map;
    }, [stockItems]);

    // Filter products
    const filteredProducts = useMemo(() => {
        let result = products;
        if (activeCategory !== 'all') {
            result = result.filter((p) => (p.categoryId?._id || p.categoryId) === activeCategory);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter((p) =>
                p.name?.toLowerCase().includes(q)
                || p.productCode?.toLowerCase().includes(q)
                || p.barcode?.toLowerCase().includes(q)
            );
        }
        return result.slice(0, 60); // limit display
    }, [products, activeCategory, searchQuery]);

    const selectedCustomer = customers.find((c) => c._id === customerId);
    const customerOptions = customers.map((c) => ({
        value: c._id,
        label: `${c.displayName} (${c.customerCode})`,
    }));

    // Cart actions
    const addToCart = (product) => {
        const stock = stockMap.get(product._id);
        const available = stock ? Math.max(0, stock.onHand - stock.reserved) : 0;

        if (available <= 0) {
            toast.error(`${product.name} is out of stock at this warehouse`);
            return;
        }

        setCart((prev) => {
            const existing = prev.find((i) => i.productId === product._id);
            if (existing) {
                if (existing.qty >= available) {
                    toast.error(`Only ${available} available`);
                    return prev;
                }
                return prev.map((i) => i.productId === product._id
                    ? { ...i, qty: i.qty + 1 } : i);
            }

            let price = product.basePrice;
            if (selectedCustomer?.defaultDiscountPercent) {
                price = price * (1 - selectedCustomer.defaultDiscountPercent / 100);
            }

            return [...prev, {
                productId: product._id,
                name: product.name,
                code: product.productCode,
                price: +price.toFixed(2),
                qty: 1,
                available,
                taxRate: product.tax?.taxRate || 0,
                taxable: product.tax?.taxable !== false,
                unitOfMeasure: product.unitOfMeasure,
            }];
        });
    };

    const updateQty = (productId, delta) => {
        setCart((prev) => prev.map((i) => {
            if (i.productId !== productId) return i;
            const newQty = i.qty + delta;
            if (newQty <= 0) return null;
            if (newQty > i.available) {
                toast.error(`Only ${i.available} available`);
                return i;
            }
            return { ...i, qty: newQty };
        }).filter(Boolean));
    };

    const setQty = (productId, qty) => {
        setCart((prev) => prev.map((i) => {
            if (i.productId !== productId) return i;
            const newQty = Math.max(0, +qty || 0);
            if (newQty > i.available) {
                toast.error(`Only ${i.available} available`);
                return i;
            }
            return { ...i, qty: newQty };
        }).filter((i) => i.qty > 0));
    };

    const removeFromCart = (productId) => {
        setCart((prev) => prev.filter((i) => i.productId !== productId));
    };

    const clearCart = () => {
        if (cart.length === 0) return;
        if (window.confirm('Clear all items?')) setCart([]);
    };

    // Totals
    const totals = useMemo(() => {
        let subtotal = 0;
        let totalTax = 0;
        cart.forEach((item) => {
            const lineSub = item.qty * item.price;
            subtotal += lineSub;
            if (taxMode === 'override') {
                totalTax += lineSub * ((+overrideTaxRate || 0) / 100);
            } else if (item.taxable) {
                totalTax += lineSub * (item.taxRate / 100);
            }
        });
        const orderDisc = subtotal * (+orderDiscountPercent || 0) / 100;
        const grandTotal = subtotal - orderDisc + totalTax;
        return {
            subtotal: +subtotal.toFixed(2),
            orderDiscount: +orderDisc.toFixed(2),
            totalTax: +totalTax.toFixed(2),
            grandTotal: +grandTotal.toFixed(2),
            itemCount: cart.reduce((s, i) => s + i.qty, 0),
        };
    }, [cart, orderDiscountPercent, taxMode, overrideTaxRate]);

    const fmt = (n) => new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', minimumFractionDigits: 2 }).format(n || 0);

    const handleCheckout = async (saveAsDraft = false) => {
        if (!customerId) { toast.error('Select a customer'); return; }
        if (!sourceWarehouseId) { toast.error('Select a warehouse'); return; }
        if (cart.length === 0) { toast.error('Cart is empty'); return; }

        const payload = {
            customerId,
            sourceWarehouseId,
            source: 'pos',
            items: cart.map((i) => ({
                productId: i.productId,
                orderedQuantity: i.qty,
                unitPrice: i.price,
                taxRate: taxMode === 'override' ? (+overrideTaxRate || 0) : i.taxRate,
                taxable: taxMode === 'override' ? (+overrideTaxRate || 0) > 0 : i.taxable,
                discountPercent: 0,
            })),
            orderDiscount: orderDiscountPercent > 0
                ? { type: 'percentage', value: +orderDiscountPercent }
                : undefined,
            status: saveAsDraft ? 'draft' : 'approved',
        };

        try {
            const result = await createOrder.mutateAsync(payload);
            toast.success(saveAsDraft ? 'Order saved as draft' : 'Order created!');
            setCart([]);
            setCustomerId('');
            setOrderDiscountPercent(0);
            setTaxMode('item');
            navigate(`/sales-orders/${result.data._id}`);
        } catch { }
    };

    const selectedWarehouse = warehouses.find((w) => w._id === sourceWarehouseId);

    return (
        <div className="h-screen flex flex-col bg-gray-50 -m-6">
            {/* Top bar */}
            <div className="bg-white border-b px-4 py-3 flex items-center gap-4">
                <Button variant="outline" size="sm" onClick={() => navigate('/sales-orders')}>
                    <ArrowLeft size={14} className="mr-1" /> Back
                </Button>

                <div className="flex-1 flex gap-3 items-center">
                    <div className="w-72">
                        <div className="flex gap-1 items-end">
                            <div className="flex-1">
                                <Select placeholder="Select customer..." options={customerOptions}
                                    value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setIsCustomerModalOpen(true)} title="Quick add">
                                <UserPlus size={14} />
                            </Button>
                        </div>
                    </div>

                    <div className="w-56">
                        <Select placeholder="Warehouse"
                            options={warehouses.map((w) => ({ value: w._id, label: w.name }))}
                            value={sourceWarehouseId} onChange={(e) => { setSourceWarehouseId(e.target.value); setCart([]); }} />
                    </div>

                    {selectedCustomer && (
                        <div className="text-xs text-gray-600">
                            <p>Credit: <span className="font-semibold">{fmt(selectedCustomer.creditStatus?.availableCredit || 0)}</span></p>
                            {selectedCustomer.creditStatus?.onCreditHold && (
                                <Badge variant="danger">On Credit Hold</Badge>
                            )}
                        </div>
                    )}
                </div>

                <h1 className="font-bold text-lg flex items-center gap-2">
                    <ShoppingCart size={20} />POS
                </h1>
            </div>

            {/* Main 2-column layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left: Product catalog */}
                <div className="flex-1 flex flex-col bg-gray-50 p-4 overflow-hidden">
                    {/* Search */}
                    <div className="flex gap-2 mb-3">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name, code, or barcode..."
                                className="w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm bg-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Category tabs */}
                    <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
                        <button onClick={() => setActiveCategory('all')}
                            className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${activeCategory === 'all' ? 'bg-primary-600 text-white' : 'bg-white border hover:bg-gray-100'
                                }`}>
                            All
                        </button>
                        {categories.map((c) => (
                            <button key={c._id} onClick={() => setActiveCategory(c._id)}
                                className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${activeCategory === c._id ? 'bg-primary-600 text-white' : 'bg-white border hover:bg-gray-100'
                                    }`}>
                                {c.name}
                            </button>
                        ))}
                    </div>

                    {/* Product grid */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-16 text-gray-500">
                                <Package size={32} className="mx-auto mb-2 text-gray-300" />
                                <p>No products found</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
                                {filteredProducts.map((p) => {
                                    const stock = stockMap.get(p._id);
                                    const available = stock ? Math.max(0, stock.onHand - stock.reserved) : 0;
                                    const inCart = cart.find((i) => i.productId === p._id)?.qty || 0;
                                    const outOfStock = available <= 0;
                                    const lowStock = available > 0 && available <= 5;

                                    return (
                                        <button
                                            key={p._id}
                                            onClick={() => addToCart(p)}
                                            disabled={outOfStock}
                                            className={`text-left bg-white border rounded-lg p-3 transition-all ${outOfStock
                                                ? 'opacity-50 cursor-not-allowed'
                                                : 'hover:shadow-md hover:-translate-y-0.5 hover:border-primary-300'
                                                } ${inCart > 0 ? 'border-primary-500 bg-primary-50' : ''}`}>
                                            <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                                                <Package size={32} className="text-gray-400" />
                                            </div>
                                            <p className="text-sm font-medium line-clamp-2 mb-1">{p.name}</p>
                                            <p className="text-xs text-gray-500 font-mono mb-1">{p.productCode}</p>
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-bold text-primary-600">{fmt(p.basePrice)}</p>
                                                {outOfStock ? (
                                                    <Badge variant="danger">Out</Badge>
                                                ) : lowStock ? (
                                                    <Badge variant="warning">{available}</Badge>
                                                ) : (
                                                    <Badge variant="success">{available}</Badge>
                                                )}
                                            </div>
                                            {inCart > 0 && (
                                                <div className="mt-1 text-xs text-primary-700 font-semibold">
                                                    {inCart} in cart
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Cart */}
                <div className="w-96 bg-white border-l flex flex-col">
                    <div className="p-4 border-b flex items-center justify-between">
                        <h2 className="font-bold flex items-center gap-2">
                            <ShoppingCart size={18} /> Cart
                            {totals.itemCount > 0 && <Badge>{totals.itemCount}</Badge>}
                        </h2>
                        {cart.length > 0 && (
                            <button onClick={clearCart} className="text-xs text-red-600 hover:underline">Clear all</button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {cart.length === 0 ? (
                            <div className="text-center text-gray-500 py-12">
                                <ShoppingCart size={32} className="mx-auto mb-2 text-gray-300" />
                                <p className="text-sm">Cart is empty</p>
                                <p className="text-xs mt-1">Click products to add</p>
                            </div>
                        ) : (
                            cart.map((item) => (
                                <div key={item.productId} className="border rounded-lg p-2">
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{item.name}</p>
                                            <p className="text-xs text-gray-500 font-mono">{item.code}</p>
                                        </div>
                                        <button onClick={() => removeFromCart(item.productId)}
                                            className="p-1 text-red-600 hover:bg-red-50 rounded ml-2">
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-1 bg-gray-100 rounded">
                                            <button onClick={() => updateQty(item.productId, -1)}
                                                className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-l">
                                                <Minus size={12} />
                                            </button>
                                            <input type="number" value={item.qty} min="1" max={item.available}
                                                onChange={(e) => setQty(item.productId, e.target.value)}
                                                className="w-12 text-center text-sm bg-transparent border-0 focus:ring-0" />
                                            <button onClick={() => updateQty(item.productId, 1)}
                                                className="w-7 h-7 flex items-center justify-center hover:bg-gray-200 rounded-r">
                                                <Plus size={12} />
                                            </button>
                                        </div>
                                        <p className="text-sm font-semibold">{fmt(item.qty * item.price)}</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">
                                        {fmt(item.price)} {item.unitOfMeasure ? `/ ${item.unitOfMeasure}` : ''}
                                        · {item.available} available
                                    </p>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Summary */}
                    <div className="border-t p-4 space-y-2 bg-gray-50">
                        <div className="flex justify-between text-sm">
                            <span>Subtotal</span><span>{fmt(totals.subtotal)}</span>
                        </div>

                        <div className="flex justify-between items-center text-sm">
                            <span>Discount %</span>
                            <input type="number" min="0" max="100" step="0.01"
                                value={orderDiscountPercent}
                                onChange={(e) => setOrderDiscountPercent(e.target.value)}
                                className="w-16 px-2 py-1 border rounded text-sm text-right" />
                        </div>
                        {totals.orderDiscount > 0 && (
                            <div className="flex justify-between text-sm text-red-600">
                                <span>Discount</span><span>-{fmt(totals.orderDiscount)}</span>
                            </div>
                        )}

                        {/* Tax controls */}
                        <div className="flex justify-between items-center text-sm">
                            <span>
                                Tax {taxMode === 'override' && <span className="text-xs text-amber-600">(overridden)</span>}
                            </span>
                            <div className="flex items-center gap-1">
                                {taxMode === 'override' ? (
                                    <>
                                        <input type="number" min="0" max="100" step="0.01"
                                            value={overrideTaxRate}
                                            onChange={(e) => setOverrideTaxRate(e.target.value)}
                                            className="w-14 px-2 py-1 border rounded text-sm text-right" />
                                        <span className="text-xs">%</span>
                                        <button onClick={() => setTaxMode('item')}
                                            className="text-xs text-gray-500 hover:text-gray-800 ml-1" title="Use product tax">
                                            ↺
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <span>{fmt(totals.totalTax)}</span>
                                        <button onClick={() => {
                                            setTaxMode('override');
                                            setOverrideTaxRate(items.length > 0 ? cart[0]?.taxRate || 18 : 18);
                                        }}
                                            className="text-xs text-primary-600 hover:underline ml-2" title="Override tax rate">
                                            Edit
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                        {taxMode === 'override' && (
                            <div className="flex justify-between text-sm pl-2">
                                <span className="text-gray-500 text-xs">at {overrideTaxRate}%</span>
                                <span>{fmt(totals.totalTax)}</span>
                            </div>
                        )}

                        <div className="flex justify-between pt-2 border-t font-bold">
                            <span>Total</span>
                            <span className="text-xl text-primary-600">{fmt(totals.grandTotal)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2">
                            <Button variant="outline" onClick={() => handleCheckout(true)}
                                disabled={cart.length === 0 || !customerId} loading={createOrder.isPending}>
                                <Save size={14} className="mr-1" /> Draft
                            </Button>
                            <Button variant="primary" onClick={() => handleCheckout(false)}
                                disabled={cart.length === 0 || !customerId} loading={createOrder.isPending}>
                                <CreditCard size={14} className="mr-1" /> Checkout
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <QuickCreateCustomerModal
                isOpen={isCustomerModalOpen}
                onClose={() => setIsCustomerModalOpen(false)}
                onCreated={(c) => setCustomerId(c._id)}
            />
        </div>
    );
}