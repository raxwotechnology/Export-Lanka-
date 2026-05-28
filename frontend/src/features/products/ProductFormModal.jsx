import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import { productFormSchema } from './productSchemas';
import { useCategories, useBrands, useUoms, useCreateProduct, useUpdateProduct } from './useProducts';

const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'pricing', label: 'Pricing & Tax' },
    { id: 'stock', label: 'Stock & Packaging' },
    { id: 'sales', label: 'Sales Config' },
];

export default function ProductFormModal({ isOpen, onClose, product = null }) {
    const [activeTab, setActiveTab] = useState('basic');
    const isEdit = !!product;

    const { data: categoriesData } = useCategories();
    const { data: brandsData } = useBrands();
    const { data: uomsData } = useUoms();
    const createProduct = useCreateProduct();
    const updateProduct = useUpdateProduct();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(productFormSchema),
        defaultValues: {
            type: 'trading',
            status: 'active',
            taxable: true,
            taxRate: 18,
            sellable: true,
            allowBackorder: false,
            minimumOrderQuantity: 1,
        },
    });

    // When opening in edit mode, populate form
    useEffect(() => {
        if (isOpen && product) {
            reset({
                name: product.name || '',
                shortName: product.shortName || '',
                sku: product.sku || '',
                barcode: product.barcode || '',
                productType: product.productType || 'finished_good',
                canBeSold: product.canBeSold ?? true,
                canBePurchased: product.canBePurchased ?? true,
                canBeManufactured: product.canBeManufactured ?? false,
                description: product.description || '',
                categoryId: product.categoryId?._id || product.categoryId || '',
                brandId: product.brandId?._id || product.brandId || '',
                type: product.type || 'trading',
                unitOfMeasure: product.unitOfMeasure || '',
                basePrice: product.basePrice || 0,
                mrp: product.mrp || 0,
                taxable: product.tax?.taxable ?? true,
                taxRate: product.tax?.taxRate ?? 18,
                hsCode: product.tax?.hsCode || '',
                minimumLevel: product.stockLevels?.minimumLevel || 0,
                reorderLevel: product.stockLevels?.reorderLevel || 0,
                maximumLevel: product.stockLevels?.maximumLevel || 0,
                unitsPerCarton: product.packaging?.unitsPerCarton || 0,
                cartonsPerPallet: product.packaging?.cartonsPerPallet || 0,
                minimumOrderQuantity: product.salesConfig?.minimumOrderQuantity || 1,
                sellable: product.salesConfig?.sellable ?? true,
                allowBackorder: product.salesConfig?.allowBackorder ?? false,
                status: product.status || 'active',
                notes: product.notes || '',
            });
        } else if (isOpen && !product) {
            // Reset to defaults when creating new
            reset({
                type: 'trading',
                status: 'active',
                taxable: true,
                taxRate: 18,
                sellable: true,
                allowBackorder: false,
                minimumOrderQuantity: 1,
            });
        }
        setActiveTab('basic');
    }, [isOpen, product, reset]);

    const onSubmit = async (data) => {
        // Transform flat form data back into nested structure for API
        const payload = {
            name: data.name,
            shortName: data.shortName || undefined,
            sku: data.sku || undefined,
            barcode: data.barcode || undefined,
            productType: data.productType,
            canBeSold: data.canBeSold,
            canBePurchased: data.canBePurchased,
            canBeManufactured: data.canBeManufactured,
            description: data.description || undefined,
            categoryId: data.categoryId,
            brandId: data.brandId || undefined,
            type: data.type,
            unitOfMeasure: data.unitOfMeasure,
            basePrice: data.basePrice,
            mrp: data.mrp || undefined,
            tax: {
                taxable: data.taxable,
                taxRate: data.taxRate || 0,
                hsCode: data.hsCode || undefined,
            },
            stockLevels: {
                minimumLevel: data.minimumLevel || 0,
                reorderLevel: data.reorderLevel || 0,
                maximumLevel: data.maximumLevel || 0,
            },
            packaging: {
                unitsPerCarton: data.unitsPerCarton || 0,
                cartonsPerPallet: data.cartonsPerPallet || 0,
            },
            salesConfig: {
                minimumOrderQuantity: data.minimumOrderQuantity || 1,
                sellable: data.sellable,
                allowBackorder: data.allowBackorder,
            },
            status: data.status,
            notes: data.notes || undefined,
        };

        try {
            if (isEdit) {
                await updateProduct.mutateAsync({ id: product._id, data: payload });
            } else {
                await createProduct.mutateAsync(payload);
            }
            onClose();
        } catch (err) {
            // Errors already toasted via hook
        }
    };

    const categoryOptions = (categoriesData?.data || []).map((c) => ({
        value: c._id,
        label: `${c.name} (${c.code})`,
    }));
    const brandOptions = (brandsData?.data || []).map((b) => ({
        value: b._id,
        label: b.name,
    }));
    const uomOptions = (uomsData?.data || []).map((u) => ({
        value: u.symbol,
        label: `${u.name} (${u.symbol})`,
    }));

    const isLoading = createProduct.isPending || updateProduct.isPending;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isEdit ? `Edit Product — ${product?.productCode}` : 'Create New Product'}
            size="xl"
        >
            <form onSubmit={handleSubmit(onSubmit)}>
                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <div className="flex gap-1 px-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition ${activeTab === tab.id
                                    ? 'border-primary-600 text-primary-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                    {activeTab === 'basic' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input label="Product Name" required error={errors.name?.message} {...register('name')} />
                                <Input label="Short Name" error={errors.shortName?.message} {...register('shortName')} />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <Input label="SKU" error={errors.sku?.message} {...register('sku')} />
                                <Input label="Barcode" error={errors.barcode?.message} {...register('barcode')} />
                                <Select
                                    label="Type"
                                    required
                                    error={errors.type?.message}
                                    options={[
                                        { value: 'trading', label: 'Trading (buy & sell)' },
                                        { value: 'manufactured', label: 'Manufactured' },
                                        { value: 'service', label: 'Service' },
                                        { value: 'bundle', label: 'Bundle' },
                                    ]}
                                    {...register('type')}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <Select
                                    label="Category"
                                    required
                                    error={errors.categoryId?.message}
                                    options={categoryOptions}
                                    {...register('categoryId')}
                                />
                                <Select
                                    label="Brand"
                                    error={errors.brandId?.message}
                                    options={brandOptions}
                                    {...register('brandId')}
                                />
                                <Select
                                    label="Product Type" required
                                    options={[
                                        { value: 'finished_good', label: 'Finished Good (sellable)' },
                                        { value: 'raw_material', label: 'Raw Material (for production)' },
                                        { value: 'semi_finished', label: 'Semi-Finished (intermediate)' },
                                        { value: 'packaging', label: 'Packaging Material' },
                                        { value: 'consumable', label: 'Consumable' },
                                        { value: 'service', label: 'Service' },
                                    ]}
                                    error={errors.productType?.message}
                                    {...register('productType')}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Unit of Measure"
                                    required
                                    error={errors.unitOfMeasure?.message}
                                    options={uomOptions}
                                    {...register('unitOfMeasure')}
                                />
                                <Select
                                    label="Status"
                                    required
                                    error={errors.status?.message}
                                    options={[
                                        { value: 'active', label: 'Active' },
                                        { value: 'inactive', label: 'Inactive' },
                                        { value: 'draft', label: 'Draft' },
                                        { value: 'discontinued', label: 'Discontinued' },
                                    ]}
                                    {...register('status')}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" {...register('canBeSold')} />
                                    Can be sold
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" {...register('canBePurchased')} />
                                    Can be purchased
                                </label>
                                <label className="flex items-center gap-2 text-sm">
                                    <input type="checkbox" {...register('canBeManufactured')} />
                                    Can be manufactured
                                </label>
                            </div>
                            <Textarea label="Description" rows={3} error={errors.description?.message} {...register('description')} />
                            <Textarea label="Internal Notes" rows={2} error={errors.notes?.message} {...register('notes')} />
                        </div>
                    )}

                    {activeTab === 'pricing' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Base Price (LKR)"
                                    type="number"
                                    step="0.01"
                                    required
                                    error={errors.basePrice?.message}
                                    {...register('basePrice')}
                                />
                                <Input
                                    label="MRP (LKR)"
                                    type="number"
                                    step="0.01"
                                    error={errors.mrp?.message}
                                    {...register('mrp')}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="taxable" {...register('taxable')} />
                                <label htmlFor="taxable" className="text-sm text-gray-700">Taxable (VAT applicable)</label>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Tax Rate (%)"
                                    type="number"
                                    step="0.01"
                                    error={errors.taxRate?.message}
                                    {...register('taxRate')}
                                />
                                <Input label="HS Code" error={errors.hsCode?.message} {...register('hsCode')} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'stock' && (
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-700">Stock Levels</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <Input
                                    label="Minimum Level"
                                    type="number"
                                    error={errors.minimumLevel?.message}
                                    {...register('minimumLevel')}
                                />
                                <Input
                                    label="Reorder Level"
                                    type="number"
                                    error={errors.reorderLevel?.message}
                                    {...register('reorderLevel')}
                                />
                                <Input
                                    label="Maximum Level"
                                    type="number"
                                    error={errors.maximumLevel?.message}
                                    {...register('maximumLevel')}
                                />
                            </div>
                            <h4 className="text-sm font-semibold text-gray-700 pt-4">Packaging</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Units per Carton"
                                    type="number"
                                    error={errors.unitsPerCarton?.message}
                                    {...register('unitsPerCarton')}
                                />
                                <Input
                                    label="Cartons per Pallet"
                                    type="number"
                                    error={errors.cartonsPerPallet?.message}
                                    {...register('cartonsPerPallet')}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'sales' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="sellable" {...register('sellable')} />
                                <label htmlFor="sellable" className="text-sm text-gray-700">Sellable (can be added to sales orders)</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="allowBackorder" {...register('allowBackorder')} />
                                <label htmlFor="allowBackorder" className="text-sm text-gray-700">Allow backorder when out of stock</label>
                            </div>
                            <Input
                                label="Minimum Order Quantity"
                                type="number"
                                error={errors.minimumOrderQuantity?.message}
                                {...register('minimumOrderQuantity')}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <Button variant="outline" onClick={onClose} type="button" disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="primary" loading={isLoading}>
                        {isEdit ? 'Update Product' : 'Create Product'}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}