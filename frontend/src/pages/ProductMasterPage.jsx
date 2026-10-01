import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    Package, FolderTree, Award, Plus, Search, Edit, Trash2 
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import Pagination from '../components/ui/Pagination';
import EmptyState from '../components/ui/EmptyState';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ExportButtons from '../components/ui/ExportButtons';

import ProductFormModal from '../features/products/ProductFormModal';
import { useProducts, useCategories, useDeleteProduct } from '../features/products/useProducts';
import { productsApi } from '../features/products/productsApi';
import { categoryFormSchema, brandFormSchema } from '../features/products/productSchemas';
import { useAuthStore } from '../store/authStore';
import { useExport } from '../hooks/useExport';

const statusVariant = {
    active: 'success',
    inactive: 'default',
    draft: 'warning',
    discontinued: 'danger',
};

// ── 1. PRODUCTS TAB CONTENT ──────────────────────────────────────────────────
function ProductsTabContent({ canManage }) {
    const [filters, setFilters] = useState({
        search: '',
        categoryId: '',
        status: '',
        excludeProductType: 'raw_material',
        page: 1,
        limit: 10,
    });
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [deletingProduct, setDeletingProduct] = useState(null);

    const { data, isLoading, isFetching } = useProducts(filters);
    const { data: categoriesData } = useCategories();
    const deleteProduct = useDeleteProduct();

    const products = data?.data || [];
    const total = data?.total || 0;
    const totalPages = data?.totalPages || 1;

    const exportColumns = [
        { header: 'Code', dataKey: 'productCode' },
        { header: 'Name', dataKey: 'name' },
        { header: 'SKU', dataKey: 'sku' },
        { header: 'Category', dataKey: 'categoryName' },
        { header: 'Brand', dataKey: 'brandName' },
        { header: 'Price', dataKey: 'basePrice' },
        { header: 'Status', dataKey: 'status' },
    ];

    const { handleExportExcel, handleExportCSV, handleExportPDF } = useExport({
        title: 'Product Catalog Report',
        columns: exportColumns,
        fileName: 'products_export',
        module: 'products',
    });

    const exportData = products.map((p) => ({
        ...p,
        categoryName: p.categoryId?.name || '—',
        brandName: p.brandId?.name || '—',
    }));

    const categoryOptions = (categoriesData?.data || []).map((c) => ({
        value: c._id,
        label: c.name,
    }));

    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-LK', {
            style: 'currency',
            currency: 'LKR',
            minimumFractionDigits: 2,
        }).format(price || 0);
    };

    const columns = [
        {
            key: 'productCode',
            label: 'Code',
            width: '120px',
            render: (row) => <span className="font-mono text-xs">{row.productCode}</span>,
        },
        {
            key: 'name',
            label: 'Product',
            render: (row) => (
                <div>
                    <p className="font-medium text-gray-900">{row.name}</p>
                    {row.sku && <p className="text-xs text-gray-500 font-mono">SKU: {row.sku}</p>}
                </div>
            ),
        },
        {
            key: 'categoryId',
            label: 'Category',
            render: (row) => row.categoryId?.name || '—',
        },
        {
            key: 'brandId',
            label: 'Brand',
            render: (row) => row.brandId?.name || '—',
        },
        {
            key: 'basePrice',
            label: 'Price',
            render: (row) => {
                const displayPrice = row.basePrice || row.costs?.lastPurchaseCost || row.costs?.averageCost || 0;
                return <span className="font-mono font-medium">{formatPrice(displayPrice)}</span>;
            },
        },
        {
            key: 'status',
            label: 'Status',
            render: (row) => <Badge variant={statusVariant[row.status]}>{row.status}</Badge>,
        },
        {
            key: 'actions',
            label: 'Actions',
            width: '120px',
            render: (row) => (
                <div className="flex gap-1">
                    {canManage && (
                        <>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingProduct(row);
                                    setIsFormOpen(true);
                                }}
                                className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded transition"
                                title="Edit"
                            >
                                <Edit size={16} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setDeletingProduct(row);
                                }}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition"
                                title="Delete"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            ),
        },
    ];

    const handleDelete = async () => {
        if (!deletingProduct) return;
        await deleteProduct.mutateAsync(deletingProduct._id);
        setDeletingProduct(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
                <div>
                    <h3 className="text-base font-bold text-slate-900">Products Catalog</h3>
                    <p className="text-xs text-slate-500">View and manage export product catalog, variants, and pricing</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <ExportButtons
                        onExportPDF={() => handleExportPDF(exportData)}
                        onExportExcel={() => handleExportExcel(exportData)}
                        onExportCSV={() => handleExportCSV(exportData)}
                        onExportAllPDF={() => handleExportPDF(null, true, filters)}
                        onExportAllExcel={() => handleExportExcel(null, true, filters)}
                        onExportAllCSV={() => handleExportCSV(null, true, filters)}
                        isDisabled={products.length === 0}
                    />
                    {canManage && (
                        <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                            <Plus size={16} className="mr-1.5" />
                            Add Product
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                {/* Search & Select Filters */}
                <div className="p-4 border-b border-gray-200 flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, SKU, code..."
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-medium"
                            value={filters.search}
                            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="w-48">
                        <Select
                            placeholder="All Categories"
                            options={categoryOptions}
                            value={filters.categoryId}
                            onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value, page: 1 }))}
                        />
                    </div>
                    <div className="w-40">
                        <Select
                            placeholder="All Statuses"
                            options={[
                                { value: '', label: 'All Statuses' },
                                { value: 'active', label: 'Active' },
                                { value: 'inactive', label: 'Inactive' },
                                { value: 'draft', label: 'Draft' },
                                { value: 'discontinued', label: 'Discontinued' },
                            ]}
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
                        />
                    </div>
                </div>

                {/* Table Content */}
                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading products...</div>
                ) : products.length === 0 ? (
                    <EmptyState
                        icon={Package}
                        title="No products found"
                        description={
                            filters.search || filters.categoryId || filters.status
                                ? 'Try adjusting your filters'
                                : 'Get started by adding your first product'
                        }
                        action={
                            canManage && !filters.search && (
                                <Button variant="primary" onClick={() => setIsFormOpen(true)}>
                                    <Plus size={16} className="mr-1.5" />
                                    Add Product
                                </Button>
                            )
                        }
                    />
                ) : (
                    <>
                        <Table columns={columns} data={products} />
                        <Pagination
                            page={filters.page}
                            totalPages={totalPages}
                            total={total}
                            onPageChange={(p) => setFilters((f) => ({ ...f, page: p }))}
                        />
                    </>
                )}

                {isFetching && !isLoading && (
                    <div className="absolute inset-0 bg-white/30 pointer-events-none" />
                )}
            </Card>

            <ProductFormModal
                isOpen={isFormOpen}
                onClose={() => {
                    setIsFormOpen(false);
                    setEditingProduct(null);
                }}
                product={editingProduct}
            />

            <ConfirmDialog
                isOpen={!!deletingProduct}
                onClose={() => setDeletingProduct(null)}
                onConfirm={handleDelete}
                title="Delete Product"
                message={`Are you sure you want to delete "${deletingProduct?.name}"?`}
                confirmText="Delete"
                variant="danger"
                loading={deleteProduct.isPending}
            />
        </div>
    );
}

// ── 2. CATEGORIES TAB CONTENT ────────────────────────────────────────────────
function CategoriesTabContent({ canManage }) {
    const qc = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['categories', 'all'],
        queryFn: () => productsApi.listCategories(),
    });

    const categories = data?.data || [];

    const createMutation = useMutation({
        mutationFn: productsApi.createCategory,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category created');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => productsApi.updateCategory(id, data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category updated');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
    });

    const deleteMutation = useMutation({
        mutationFn: productsApi.deleteCategory,
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['categories'] });
            toast.success('Category deleted');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
    });

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(categoryFormSchema),
        defaultValues: { type: 'product', isActive: true },
    });

    const openForm = (category = null) => {
        setEditing(category);
        if (category) {
            reset({
                name: category.name,
                code: category.code,
                description: category.description || '',
                parentCategory: category.parentCategory?._id || '',
                type: category.type,
                isActive: category.isActive,
            });
        } else {
            reset({ name: '', code: '', description: '', parentCategory: '', type: 'product', isActive: true });
        }
        setIsFormOpen(true);
    };

    const onSubmit = async (formData) => {
        const payload = {
            ...formData,
            parentCategory: formData.parentCategory || null,
            description: formData.description || undefined,
        };
        try {
            if (editing) {
                await updateMutation.mutateAsync({ id: editing._id, data: payload });
            } else {
                await createMutation.mutateAsync(payload);
            }
            setIsFormOpen(false);
            setEditing(null);
        } catch {}
    };

    const handleDelete = async () => {
        await deleteMutation.mutateAsync(deleting._id);
        setDeleting(null);
    };

    const parentOptions = categories
        .filter((c) => c._id !== editing?._id)
        .map((c) => ({ value: c._id, label: `${c.name} (${c.code})` }));

    const columns = [
        { key: 'code', label: 'Code', width: '100px', render: (r) => <span className="font-mono text-xs">{r.code}</span> },
        { key: 'name', label: 'Name' },
        { key: 'parentCategory', label: 'Parent', render: (r) => r.parentCategory?.name || '—' },
        {
            key: 'type',
            label: 'Type',
            render: (r) => <Badge>{r.type}</Badge>,
        },
        {
            key: 'isActive',
            label: 'Active',
            render: (r) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Yes' : 'No'}</Badge>,
        },
        {
            key: 'actions',
            label: 'Actions',
            width: '120px',
            render: (r) =>
                canManage && (
                    <div className="flex gap-1">
                        <button
                            onClick={() => openForm(r)}
                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                        >
                            <Edit size={16} />
                        </button>
                        <button
                            onClick={() => setDeleting(r)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ),
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
                <div>
                    <h3 className="text-base font-bold text-slate-900">Product Categories</h3>
                    <p className="text-xs text-slate-500">Organize and group products and raw materials into structured categories</p>
                </div>
                {canManage && (
                    <Button variant="primary" onClick={() => openForm()} className="bg-blue-600 hover:bg-blue-700">
                        <Plus size={16} className="mr-1.5" />
                        Add Category
                    </Button>
                )}
            </div>

            <Card>
                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading categories...</div>
                ) : categories.length === 0 ? (
                    <EmptyState
                        icon={FolderTree}
                        title="No categories yet"
                        description="Categories help organize your products"
                        action={canManage && <Button variant="primary" onClick={() => openForm()}><Plus size={16} className="mr-1.5" />Add Category</Button>}
                    />
                ) : (
                    <Table columns={columns} data={categories} />
                )}
            </Card>

            <Modal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditing(null); }}
                title={editing ? 'Edit Category' : 'New Category'}
                size="md"
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Name" required error={errors.name?.message} {...register('name')} />
                            <Input label="Code" required error={errors.code?.message} {...register('code')} />
                        </div>
                        <Select
                            label="Type"
                            required
                            error={errors.type?.message}
                            options={[
                                { value: 'product', label: 'Product' },
                                { value: 'raw_material', label: 'Raw Material' },
                                { value: 'both', label: 'Both' },
                            ]}
                            {...register('type')}
                        />
                        <Select
                            label="Parent Category (optional)"
                            options={parentOptions}
                            {...register('parentCategory')}
                        />
                        <Textarea label="Description" rows={2} error={errors.description?.message} {...register('description')} />
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="isActiveCat" {...register('isActive')} />
                            <label htmlFor="isActiveCat" className="text-sm text-gray-700">Active</label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                        <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary" loading={createMutation.isPending || updateMutation.isPending}>
                            {editing ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={handleDelete}
                title="Delete Category"
                message={`Delete "${deleting?.name}"? Products in this category will need to be reassigned.`}
                loading={deleteMutation.isPending}
            />
        </div>
    );
}

// ── 3. BRANDS TAB CONTENT ───────────────────────────────────────────────────
function BrandsTabContent({ canManage }) {
    const qc = useQueryClient();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);

    const { data, isLoading } = useQuery({
        queryKey: ['brands'],
        queryFn: () => productsApi.listBrands(),
    });

    const brands = data?.data || [];

    const createMutation = useMutation({
        mutationFn: productsApi.createBrand,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); toast.success('Brand created'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to create'),
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => productsApi.updateBrand(id, data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); toast.success('Brand updated'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update'),
    });

    const deleteMutation = useMutation({
        mutationFn: productsApi.deleteBrand,
        onSuccess: () => { qc.invalidateQueries({ queryKey: ['brands'] }); toast.success('Brand deleted'); },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete'),
    });

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(brandFormSchema),
        defaultValues: { isOwnBrand: true, isActive: true },
    });

    const openForm = (brand = null) => {
        setEditing(brand);
        if (brand) {
            reset({
                name: brand.name,
                code: brand.code || '',
                description: brand.description || '',
                isOwnBrand: brand.isOwnBrand,
                isActive: brand.isActive,
            });
        } else {
            reset({ name: '', code: '', description: '', isOwnBrand: true, isActive: true });
        }
        setIsFormOpen(true);
    };

    const onSubmit = async (formData) => {
        try {
            if (editing) {
                await updateMutation.mutateAsync({ id: editing._id, data: formData });
            } else {
                await createMutation.mutateAsync(formData);
            }
            setIsFormOpen(false);
            setEditing(null);
        } catch {}
    };

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'code', label: 'Code', render: (r) => r.code || '—' },
        {
            key: 'isOwnBrand',
            label: 'Type',
            render: (r) => <Badge variant={r.isOwnBrand ? 'primary' : 'default'}>{r.isOwnBrand ? 'Own Brand' : 'Third-Party'}</Badge>,
        },
        {
            key: 'isActive',
            label: 'Active',
            render: (r) => <Badge variant={r.isActive ? 'success' : 'default'}>{r.isActive ? 'Yes' : 'No'}</Badge>,
        },
        {
            key: 'actions',
            label: 'Actions',
            width: '120px',
            render: (r) =>
                canManage && (
                    <div className="flex gap-1">
                        <button onClick={() => openForm(r)} className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded">
                            <Edit size={16} />
                        </button>
                        <button onClick={() => setDeleting(r)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ),
        },
    ];

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs">
                <div>
                    <h3 className="text-base font-bold text-slate-900">Brand Portfolio</h3>
                    <p className="text-xs text-slate-500">Manage own-manufactured and third-party brand labels</p>
                </div>
                {canManage && (
                    <Button variant="primary" onClick={() => openForm()} className="bg-purple-600 hover:bg-purple-700">
                        <Plus size={16} className="mr-1.5" />
                        Add Brand
                    </Button>
                )}
            </div>

            <Card>
                {isLoading ? (
                    <div className="py-16 text-center text-gray-500">Loading brands...</div>
                ) : brands.length === 0 ? (
                    <EmptyState
                        icon={Award}
                        title="No brands yet"
                        description="Add brands to classify your products"
                        action={canManage && <Button variant="primary" onClick={() => openForm()}><Plus size={16} className="mr-1.5" />Add Brand</Button>}
                    />
                ) : (
                    <Table columns={columns} data={brands} />
                )}
            </Card>

            <Modal
                isOpen={isFormOpen}
                onClose={() => { setIsFormOpen(false); setEditing(null); }}
                title={editing ? 'Edit Brand' : 'New Brand'}
                size="md"
            >
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Name" required error={errors.name?.message} {...register('name')} />
                            <Input label="Code" error={errors.code?.message} {...register('code')} />
                        </div>
                        <Textarea label="Description" rows={2} error={errors.description?.message} {...register('description')} />
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="isOwnBrand" {...register('isOwnBrand')} />
                                <label htmlFor="isOwnBrand" className="text-sm text-gray-700">Own brand (we manufacture)</label>
                            </div>
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="isActiveB" {...register('isActive')} />
                                <label htmlFor="isActiveB" className="text-sm text-gray-700">Active</label>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 px-6 py-4 border-t bg-gray-50">
                        <Button variant="outline" type="button" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary" loading={createMutation.isPending || updateMutation.isPending}>
                            {editing ? 'Update' : 'Create'}
                        </Button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={async () => { await deleteMutation.mutateAsync(deleting._id); setDeleting(null); }}
                title="Delete Brand"
                message={`Delete brand "${deleting?.name}"?`}
                loading={deleteMutation.isPending}
            />
        </div>
    );
}

// ── MAIN UNIFIED PRODUCT MASTER PAGE ──────────────────────────────────────────
export default function ProductMasterPage({ initialTab = 'products' }) {
    const { user } = useAuthStore();
    const canManage = ['admin', 'manager', 'factory_manager', 'warehouse_manager'].includes(user?.role);

    const [searchParams, setSearchParams] = useSearchParams();
    const currentTabParam = searchParams.get('tab');

    const [activeTab, setActiveTab] = useState(() => {
        if (currentTabParam && ['products', 'categories', 'brands'].includes(currentTabParam)) {
            return currentTabParam;
        }
        return initialTab;
    });

    const { data: prodData } = useProducts({ limit: 1 });
    const { data: catData } = useCategories();
    const { data: brandData } = useQuery({
        queryKey: ['brands', 'count'],
        queryFn: () => productsApi.listBrands(),
    });

    const productsCount = prodData?.total || 0;
    const categoriesCount = catData?.data?.length || 0;
    const brandsCount = brandData?.data?.length || 0;

    useEffect(() => {
        if (currentTabParam && ['products', 'categories', 'brands'].includes(currentTabParam)) {
            setActiveTab(currentTabParam);
        }
    }, [currentTabParam]);

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        setSearchParams({ tab: tabId });
    };

    return (
        <div className="space-y-6">
            {/* Main Unified Header */}
            <PageHeader
                title="Product Master"
                description="Comprehensive management hub for products catalog, classification categories, and brand identities."
            />

            {/* ── 3 Distinctly Colored Action / Navigation Cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* 1. Products Tab Button (Emerald Theme) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('products')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'products'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'products'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                            }`}
                        >
                            <Package size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">
                                Master Catalog
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Products
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'products' ? 'text-emerald-100' : 'text-slate-500'}`}>
                                Finished & raw items
                            </p>
                        </div>
                    </div>
                    {productsCount > 0 && (
                        <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                                activeTab === 'products'
                                    ? 'bg-white text-emerald-800'
                                    : 'bg-emerald-100 text-emerald-800'
                            }`}
                        >
                            {productsCount}
                        </span>
                    )}
                </button>

                {/* 2. Categories Tab Button (Yellow / Amber Theme) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('categories')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'categories'
                            ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/25 ring-2 ring-yellow-400/40 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-amber-400 hover:bg-amber-50/60 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'categories'
                                    ? 'bg-slate-950/15 text-slate-950 font-bold'
                                    : 'bg-amber-100 text-amber-800 group-hover:bg-amber-500 group-hover:text-slate-950'
                            }`}
                        >
                            <FolderTree size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">
                                Taxonomy
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Categories
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'categories' ? 'text-amber-950/80 font-medium' : 'text-slate-500'}`}>
                                Groups & hierarchy
                            </p>
                        </div>
                    </div>
                    {categoriesCount > 0 && (
                        <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                                activeTab === 'categories'
                                    ? 'bg-slate-950 text-yellow-300 shadow-xs'
                                    : 'bg-amber-100 text-amber-900 border border-amber-200/60'
                            }`}
                        >
                            {categoriesCount}
                        </span>
                    )}
                </button>

                {/* 3. Brands Tab Button (Purple Theme) */}
                <button
                    type="button"
                    onClick={() => handleTabChange('brands')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        activeTab === 'brands'
                            ? 'bg-gradient-to-r from-purple-600 to-violet-700 text-white border-purple-600 shadow-lg shadow-purple-600/20 ring-2 ring-purple-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                activeTab === 'brands'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white'
                            }`}
                        >
                            <Award size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[11px] font-bold uppercase tracking-wider block opacity-80">
                                Identities
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Brands
                            </h3>
                            <p className={`text-xs truncate ${activeTab === 'brands' ? 'text-purple-100' : 'text-slate-500'}`}>
                                Own & third-party labels
                            </p>
                        </div>
                    </div>
                    {brandsCount > 0 && (
                        <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                                activeTab === 'brands'
                                    ? 'bg-white text-purple-800'
                                    : 'bg-purple-100 text-purple-800'
                            }`}
                        >
                            {brandsCount}
                        </span>
                    )}
                </button>
            </div>

            {/* ── Active Module Content View ── */}
            <div className="animate-in fade-in duration-150">
                {activeTab === 'products' && (
                    <ProductsTabContent canManage={canManage} />
                )}
                {activeTab === 'categories' && (
                    <CategoriesTabContent canManage={canManage} />
                )}
                {activeTab === 'brands' && (
                    <BrandsTabContent canManage={canManage} />
                )}
            </div>
        </div>
    );
}
