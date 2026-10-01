import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Plus, Search, Mail, Phone, Globe, UserPlus, Edit, Trash2,
    TrendingUp, XCircle, ArrowRight, Filter, Calendar, DollarSign, Package, FileText
} from 'lucide-react';
import toast from 'react-hot-toast';
import SalesWorkflowTracker from '../components/common/SalesWorkflowTracker';

const PIPELINE = [
    { status: 'new',             label: 'New',              color: 'bg-blue-500',    light: 'bg-blue-50 text-blue-700 border-blue-100',   next: 'quoted' },
    { status: 'quoted',          label: 'Quoted',           color: 'bg-violet-500',  light: 'bg-violet-50 text-violet-700 border-violet-100', next: 'sample_sent' },
    { status: 'sample_sent',     label: 'Sample Sent',     color: 'bg-amber-500',   light: 'bg-amber-50 text-amber-700 border-amber-100', next: 'sample_approved' },
    { status: 'sample_approved', label: 'Sample ✓',        color: 'bg-teal-500',    light: 'bg-teal-50 text-teal-700 border-teal-100',   next: 'order_confirmed' },
    { status: 'order_confirmed', label: 'Order Confirmed', color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700 border-emerald-100', next: 'shipped' },
    { status: 'shipped',         label: 'Shipped',          color: 'bg-sky-500',    light: 'bg-sky-50 text-sky-700 border-sky-100',      next: 'closed' },
    { status: 'closed',          label: 'Closed ✓',        color: 'bg-gray-400',    light: 'bg-gray-50 text-gray-600 border-gray-200',   next: null },
    { status: 'lost',            label: 'Lost ✗',          color: 'bg-red-400',     light: 'bg-red-50 text-red-600 border-red-100',      next: null },
];

const getPipeline = (s) => PIPELINE.find(p => p.status === s) || PIPELINE[0];

const emptyForm = () => ({
    companyName: '',
    contactPerson: '',
    email: '',
    phone: '',
    country: '',
    source: 'website',
    otherSource: '',
    status: 'new',
    currency: 'LKR',
    inquiryDate: new Date().toISOString().split('T')[0],
    expectedDeliveryDate: '',
    items: [
        { product: '', productName: '', quantity: 1, uom: 'Kg' }
    ],
    notes: '',
    productsInterested: '',
    sampleRequested: false,
    sampleDetails: {
        sentDate: '',
        trackingNumber: '',
        feedback: '',
        approved: false
    }
});

export default function InquiriesPage() {
    const navigate = useNavigate();
    const [inquiries, setInquiries]                 = useState([]);
    const [availableProducts, setAvailableProducts] = useState([]);
    const [convRate, setConvRate]                   = useState(null);
    const [loading, setLoading]                     = useState(true);
    const [searchTerm, setSearchTerm]               = useState('');
    const [filterStatus, setFilterStatus]           = useState('');
    const [isFormOpen, setIsFormOpen]               = useState(false);
    const [editing, setEditing]                     = useState(null);
    const [deleting, setDeleting]                   = useState(null);
    const [saving, setSaving]                       = useState(false);
    const [transitioning, setTransitioning]         = useState(null);
    const [formData, setFormData]                   = useState(emptyForm());

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [inqRes, convRes, prodRes] = await Promise.all([
                api.get('/crm/inquiries?limit=100'),
                api.get('/crm/inquiries/conversion-rate'),
                api.get('/products?limit=500&status=active').catch(() => ({ data: { data: [] } }))
            ]);
            setInquiries(inqRes.data.data || []);
            setConvRate(convRes.data.data);
            setAvailableProducts(prodRes.data?.data || []);
        } catch {
            toast.error('Failed to load inquiries');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const openForm = (inquiry = null) => {
        setEditing(inquiry);
        if (inquiry) {
            let initialItems = [];
            if (inquiry.items && inquiry.items.length > 0) {
                initialItems = inquiry.items.map(it => ({
                    product: it.product?._id || it.product || '',
                    productName: it.productName || it.product?.name || '',
                    quantity: it.quantity || 1,
                    uom: it.uom || 'Kg'
                }));
            } else if (inquiry.products && inquiry.products.length > 0) {
                initialItems = inquiry.products.map(p => ({
                    product: p.product?._id || p.product || '',
                    productName: p.product?.name || '',
                    quantity: p.requestedQty || 1,
                    uom: p.uom?.name || p.uom?.symbol || 'Kg'
                }));
            } else if (inquiry.productsInterested) {
                initialItems = [{ product: '', productName: inquiry.productsInterested, quantity: 1, uom: 'Kg' }];
            } else {
                initialItems = [{ product: '', productName: '', quantity: 1, uom: 'Kg' }];
            }

            setFormData({
                companyName: inquiry.companyName || '',
                contactPerson: inquiry.contactPerson || '',
                email: inquiry.email || '',
                phone: inquiry.phone || '',
                country: inquiry.country || '',
                source: inquiry.source || 'website',
                otherSource: inquiry.otherSource || '',
                status: inquiry.status || 'new',
                currency: inquiry.currency || 'LKR',
                inquiryDate: inquiry.inquiryDate
                    ? new Date(inquiry.inquiryDate).toISOString().split('T')[0]
                    : (inquiry.createdAt ? new Date(inquiry.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
                expectedDeliveryDate: inquiry.expectedDeliveryDate
                    ? new Date(inquiry.expectedDeliveryDate).toISOString().split('T')[0]
                    : '',
                items: initialItems,
                notes: inquiry.notes || '',
                productsInterested: inquiry.productsInterested || '',
                sampleRequested: inquiry.sampleRequested || false,
                sampleDetails: {
                    sentDate: inquiry.sampleDetails?.sentDate ? new Date(inquiry.sampleDetails.sentDate).toISOString().split('T')[0] : '',
                    trackingNumber: inquiry.sampleDetails?.trackingNumber || '',
                    feedback: inquiry.sampleDetails?.feedback || '',
                    approved: inquiry.sampleDetails?.approved || false
                }
            });
        } else {
            setFormData(emptyForm());
        }
        setIsFormOpen(true);
    };

    const addItem = () => {
        setFormData(p => ({
            ...p,
            items: [...p.items, { product: '', productName: '', quantity: 1, uom: 'Kg' }]
        }));
    };

    const removeItem = (index) => {
        setFormData(p => ({
            ...p,
            items: p.items.filter((_, i) => i !== index)
        }));
    };

    const handleItemChange = (index, field, value) => {
        setFormData(p => {
            const items = [...p.items];
            items[index] = { ...items[index], [field]: value };

            if (field === 'productName') {
                const found = availableProducts.find(prod => prod.name?.toLowerCase() === value?.toLowerCase());
                if (found) {
                    items[index].product = found._id;
                    const uomName = found.uom?.symbol || found.uom?.name;
                    if (['Kg', 'Bags', 'Pack', 'Pcs', 'MT'].includes(uomName)) {
                        items[index].uom = uomName;
                    }
                } else {
                    items[index].product = '';
                }
            }
            return { ...p, items };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validation
        if (!formData.companyName?.trim()) {
            toast.error('Company Name is required');
            return;
        }
        if (!formData.contactPerson?.trim() && !formData.phone?.trim() && !formData.email?.trim()) {
            toast.error('Please provide at least a Contact Person, Phone number, or Email');
            return;
        }

        const validItems = (formData.items || []).filter(item => item.productName && item.productName.trim().length > 0);
        if (validItems.length === 0) {
            toast.error('Please add at least one product/item with a name');
            return;
        }

        const payload = {
            ...formData,
            items: validItems
        };

        setSaving(true);
        try {
            if (editing) {
                await api.put(`/crm/inquiries/${editing._id}`, payload);
                toast.success('Inquiry updated successfully');
            } else {
                await api.post('/crm/inquiries', payload);
                toast.success('Lead created successfully');
            }
            setIsFormOpen(false);
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save inquiry');
        } finally {
            setSaving(false);
        }
    };

    const transition = async (inquiry, nextStatus) => {
        setTransitioning(inquiry._id + nextStatus);
        try {
            await api.put(`/crm/inquiries/${inquiry._id}/transition`, { nextStatus });
            toast.success(`Moved to: ${getPipeline(nextStatus).label}`);
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Invalid transition');
        } finally {
            setTransitioning(null);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/crm/inquiries/${deleting._id}`);
            toast.success('Deleted');
            setDeleting(null);
            fetchAll();
        } catch {
            toast.error('Failed to delete');
        }
    };

    const filtered = inquiries.filter(i =>
        (!filterStatus || i.status === filterStatus) &&
        (!(searchTerm) || [
            i.companyName, i.contactPerson, i.email, i.phone, i.country
        ].some(f => (f || '').toLowerCase().includes(searchTerm.toLowerCase())))
    );

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Sales Pipeline</h2>
                    <p className="text-sm text-gray-500">Export leads & inquiry management</p>
                </div>
                <button
                    onClick={() => openForm()}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-semibold text-sm hover:bg-primary-700 transition shadow-sm"
                >
                    <UserPlus size={16} /> Add New Lead
                </button>
            </div>

            {/* KPI + Pipeline summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="col-span-1 sm:col-span-3 lg:col-span-1 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-xl p-4 text-white shadow">
                    <p className="text-emerald-100 text-xs font-bold uppercase mb-1">Conversion Rate</p>
                    <p className="text-3xl font-black">{convRate ? `${convRate.conversionRate?.toFixed(1)}%` : '...'}</p>
                    <p className="text-emerald-200 text-xs mt-1">{convRate?.confirmed || 0} / {convRate?.total || 0} converted</p>
                </div>
                {PIPELINE.slice(0, 4).map(stage => (
                    <div key={stage.status} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                        <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                            <p className="text-xs font-bold text-gray-500">{stage.label}</p>
                        </div>
                        <p className="text-2xl font-black text-gray-900">
                            {inquiries.filter(i => i.status === stage.status).length}
                        </p>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row items-center gap-4">
                <div className="relative flex-1 w-full max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                        type="text"
                        placeholder="Search company, contact, email..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Filter size={14} className="text-gray-400" />
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-primary-500 outline-none"
                    >
                        <option value="">All Stages</option>
                        {PIPELINE.map(p => <option key={p.status} value={p.status}>{p.label}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Company & Contact</th>
                            <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Products / Items</th>
                            <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Location & Date</th>
                            <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase">Pipeline Actions</th>
                            <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase text-right">Edit</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-900">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="6" className="px-5 py-5"><div className="h-4 bg-gray-100 rounded w-3/4" /></td>
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="6" className="px-5 py-12 text-center text-gray-400 italic">No inquiries found</td></tr>
                        ) : filtered.map(inq => {
                            const stage = getPipeline(inq.status);
                            const nextStage = stage.next ? getPipeline(stage.next) : null;
                            const itemsList = inq.items && inq.items.length > 0
                                ? inq.items
                                : inq.products && inq.products.length > 0
                                ? inq.products.map(p => ({
                                    productName: p.product?.name || 'Product',
                                    quantity: p.requestedQty || 1,
                                    uom: p.uom?.symbol || p.uom?.name || 'Kg'
                                }))
                                : [];

                            return (
                                <tr key={inq._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-sm text-gray-900">{inq.companyName}</p>
                                            {inq.currency && (
                                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                                    {inq.currency}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs font-medium text-gray-600 mt-0.5">{inq.contactPerson}</p>
                                        <div className="flex flex-col gap-0.5 mt-1">
                                            {inq.email && (
                                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Mail size={11} /> {inq.email}
                                                </p>
                                            )}
                                            {inq.phone && (
                                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Phone size={11} /> {inq.phone}
                                                </p>
                                            )}
                                        </div>
                                        {inq.sampleRequested && (
                                            <div className="mt-1.5">
                                                <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded border ${
                                                    inq.sampleDetails?.approved ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                    inq.sampleDetails?.sentDate ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                    'bg-yellow-50 text-yellow-700 border-yellow-100'
                                                }`}>
                                                    Sample: {
                                                        inq.sampleDetails?.approved ? '✓ Approved' : 
                                                        inq.sampleDetails?.sentDate ? `✈ Sent (${format(new Date(inq.sampleDetails.sentDate), 'yyyy-MM-dd')})` : 
                                                        'Requested'
                                                    }
                                                </span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        {itemsList.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5 max-w-xs">
                                                {itemsList.map((it, idx) => (
                                                    <span key={idx} className="inline-flex items-center text-xs font-medium bg-gray-50 text-gray-700 px-2 py-1 rounded-md border border-gray-200 shadow-xs">
                                                        <Package size={11} className="mr-1 text-primary-600" />
                                                        {it.productName} ({it.quantity} {it.uom || 'Kg'})
                                                    </span>
                                                ))}
                                            </div>
                                        ) : inq.productsInterested ? (
                                            <span className="text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                                {inq.productsInterested}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400 italic">—</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                                            <Globe size={13} className="text-gray-400" /> {inq.country || '—'}
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-0.5 capitalize">
                                            {inq.source === 'other' && inq.otherSource ? `Other: ${inq.otherSource}` : inq.source?.replace(/_/g, ' ')}
                                        </p>
                                        {inq.inquiryDate && (
                                            <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                                                <Calendar size={11} /> {format(new Date(inq.inquiryDate), 'yyyy-MM-dd')}
                                            </p>
                                        )}
                                        {inq.expectedDeliveryDate && (
                                            <p className="text-[11px] text-amber-700 font-semibold mt-0.5">
                                                Exp: {format(new Date(inq.expectedDeliveryDate), 'yyyy-MM-dd')}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${stage.light}`}>
                                            {stage.label}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-2">
                                            {nextStage && (
                                                <button
                                                    onClick={() => transition(inq, nextStage.status)}
                                                    disabled={transitioning === inq._id + nextStage.status}
                                                    className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg hover:bg-primary-100 transition disabled:opacity-50"
                                                >
                                                    <ArrowRight size={12} /> {nextStage.label}
                                                </button>
                                            )}
                                            {!['lost', 'closed'].includes(inq.status) && (
                                                <button
                                                    onClick={() => transition(inq, 'lost')}
                                                    disabled={transitioning === inq._id + 'lost'}
                                                    className="text-xs font-bold px-2.5 py-1 bg-red-50 text-red-500 border border-red-100 rounded-lg hover:bg-red-100 transition disabled:opacity-50"
                                                >
                                                    Mark Lost
                                                </button>
                                            )}
                                            {['lost', 'closed'].includes(inq.status) && (
                                                <span className="text-xs text-gray-400 italic">Final stage</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                            <button
                                                onClick={() => navigate('/crm/quotations', { state: { convertInquiry: inq } })}
                                                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 rounded-lg text-xs font-semibold transition shadow-2xs"
                                                title="Convert Inquiry to Quotation"
                                            >
                                                <FileText size={13} />
                                                <span>Quote</span>
                                            </button>
                                            <button
                                                onClick={() => openForm(inq)}
                                                className="p-1.5 hover:bg-gray-100 rounded-lg transition text-gray-400 hover:text-gray-700"
                                                title="Edit Inquiry"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => setDeleting(inq)}
                                                className="p-1.5 hover:bg-red-50 rounded-lg transition text-gray-400 hover:text-red-500"
                                                title="Delete Inquiry"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
                        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">
                                    {editing ? 'Edit Lead / Inquiry' : 'New Lead / Inquiry'}
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Enter prospective customer and inquiry items
                                </p>
                            </div>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="p-2 hover:bg-gray-100 rounded-lg transition text-gray-400"
                            >
                                <XCircle size={20} />
                            </button>
                        </div>

                        {editing && (
                            <div className="px-6 pt-4">
                                <SalesWorkflowTracker
                                    currentStage="lead"
                                    inquiry={editing}
                                    quotation={editing.quotationId}
                                    salesOrder={editing.salesOrderId}
                                />
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            {/* Company & Contact Details */}
                            <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                        Company & Contact Details
                                    </h4>
                                    <span className="text-[11px] text-gray-400">Contact Person, Phone or Email required</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div className="sm:col-span-2">
                                        <label className="text-xs font-bold text-gray-700 block mb-1">
                                            Company Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            required
                                            value={formData.companyName}
                                            onChange={e => setFormData(p => ({ ...p, companyName: e.target.value }))}
                                            placeholder="e.g. Ceylon Organic Foods Ltd"
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-700 block mb-1">
                                            Contact Person
                                        </label>
                                        <input
                                            value={formData.contactPerson}
                                            onChange={e => setFormData(p => ({ ...p, contactPerson: e.target.value }))}
                                            placeholder="Contact Person Name"
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-700 block mb-1">
                                            Country
                                        </label>
                                        <input
                                            value={formData.country}
                                            onChange={e => setFormData(p => ({ ...p, country: e.target.value }))}
                                            placeholder="e.g. Germany, UAE, United States"
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-700 block mb-1">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                                            placeholder="buyer@domain.com"
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-700 block mb-1">
                                            Phone
                                        </label>
                                        <input
                                            type="tel"
                                            value={formData.phone}
                                            onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))}
                                            placeholder="+49 170 1234567"
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>

                                    <div className={formData.source === 'other' ? 'sm:col-span-1' : 'sm:col-span-2'}>
                                        <label className="text-xs font-bold text-gray-700 block mb-1">
                                            Lead Source
                                        </label>
                                        <select
                                            value={formData.source}
                                            onChange={e => setFormData(p => ({
                                                ...p,
                                                source: e.target.value,
                                                otherSource: e.target.value === 'other' ? p.otherSource : ''
                                            }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                        >
                                            {['website', 'referral', 'trade_fair', 'social_media', 'cold_call', 'other'].map(s => (
                                                 <option key={s} value={s}>{s.replace(/_/g, ' ').toUpperCase()}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {formData.source === 'other' && (
                                        <div className="sm:col-span-1">
                                            <label className="text-xs font-bold text-gray-700 block mb-1">
                                                Specify Other Source <span className="text-[11px] font-normal text-gray-400">(Optional)</span>
                                            </label>
                                            <input
                                                value={formData.otherSource}
                                                onChange={e => setFormData(p => ({ ...p, otherSource: e.target.value }))}
                                                placeholder="e.g. Newspaper, TV ad, Exhibition"
                                                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Inquiry Parameters (Currency, Inquiry Date, Expected Delivery Date) */}
                            <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100 space-y-3">
                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    Inquiry Parameters
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-700 block mb-1">
                                            Currency
                                        </label>
                                        <select
                                            value={formData.currency}
                                            onChange={e => setFormData(p => ({ ...p, currency: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-primary-500 outline-none"
                                        >
                                            <option value="LKR">LKR (Rs)</option>
                                            <option value="USD">USD ($)</option>
                                            <option value="EUR">EUR (€)</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-700 block mb-1">
                                            Inquiry Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.inquiryDate}
                                            onChange={e => setFormData(p => ({ ...p, inquiryDate: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold text-gray-700 block mb-1">
                                            Expected Delivery Date
                                        </label>
                                        <input
                                            type="date"
                                            value={formData.expectedDeliveryDate}
                                            onChange={e => setFormData(p => ({ ...p, expectedDeliveryDate: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Dynamic Items Table */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <label className="text-xs font-bold text-gray-700 block">
                                            Products / Items Requested <span className="text-red-500">*</span>
                                        </label>
                                        <p className="text-[11px] text-gray-400">
                                            Select from existing products or type a custom item name
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={addItem}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 rounded-lg text-xs font-bold transition border border-primary-200"
                                    >
                                        <Plus size={14} /> Add Item
                                    </button>
                                </div>

                                <datalist id="inquiry-product-options">
                                    {availableProducts.map(p => (
                                        <option key={p._id} value={p.name} />
                                    ))}
                                </datalist>

                                <div className="border border-gray-200 rounded-xl overflow-hidden shadow-xs">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-gray-100/80 border-b border-gray-200 text-gray-600 font-bold uppercase tracking-wider">
                                            <tr>
                                                <th className="px-3 py-2.5">Product</th>
                                                <th className="px-3 py-2.5 w-28">Quantity</th>
                                                <th className="px-3 py-2.5 w-28">UoM / Unit</th>
                                                <th className="px-2 py-2.5 w-12 text-center">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {formData.items.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50/50">
                                                    <td className="p-2">
                                                        <input
                                                            list="inquiry-product-options"
                                                            value={item.productName}
                                                            onChange={e => handleItemChange(idx, 'productName', e.target.value)}
                                                            placeholder="Search or type product..."
                                                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <input
                                                            type="number"
                                                            min="0.01"
                                                            step="any"
                                                            value={item.quantity}
                                                            onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                                                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none text-right font-medium"
                                                        />
                                                    </td>
                                                    <td className="p-2">
                                                        <select
                                                            value={item.uom}
                                                            onChange={e => handleItemChange(idx, 'uom', e.target.value)}
                                                            className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-primary-500 outline-none bg-white font-medium"
                                                        >
                                                            {['Kg', 'Bags', 'Pack', 'Pcs', 'MT'].map(u => (
                                                                <option key={u} value={u}>{u}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <button
                                                            type="button"
                                                            disabled={formData.items.length === 1 && !item.productName}
                                                            onClick={() => removeItem(idx)}
                                                            title="Remove item"
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-30"
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Sample Request Section */}
                            <div className="border border-gray-200 rounded-xl p-3.5 space-y-3 bg-white">
                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.sampleRequested}
                                        onChange={(e) => setFormData(p => ({ ...p, sampleRequested: e.target.checked }))}
                                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
                                    />
                                    Sample Requested?
                                </label>
                                {formData.sampleRequested && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-gray-100">
                                        <div>
                                            <label className="text-xs font-bold text-gray-600 block mb-1">Sample Sent Date</label>
                                            <input
                                                type="date"
                                                value={formData.sampleDetails?.sentDate || ''}
                                                onChange={(e) => setFormData(p => ({
                                                    ...p,
                                                    sampleDetails: { ...p.sampleDetails, sentDate: e.target.value }
                                                }))}
                                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-600 block mb-1">Tracking / Courier Number</label>
                                            <input
                                                value={formData.sampleDetails?.trackingNumber || ''}
                                                onChange={(e) => setFormData(p => ({
                                                    ...p,
                                                    sampleDetails: { ...p.sampleDetails, trackingNumber: e.target.value }
                                                }))}
                                                placeholder="e.g. DHL 481285"
                                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="text-xs font-bold text-gray-600 block mb-1">Sample Feedback</label>
                                            <input
                                                value={formData.sampleDetails?.feedback || ''}
                                                onChange={(e) => setFormData(p => ({
                                                    ...p,
                                                    sampleDetails: { ...p.sampleDetails, feedback: e.target.value }
                                                }))}
                                                placeholder="e.g. Customer liked quality, requested bulk volume pricing"
                                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={formData.sampleDetails?.approved || false}
                                                    onChange={(e) => setFormData(p => ({
                                                        ...p,
                                                        sampleDetails: { ...p.sampleDetails, approved: e.target.checked }
                                                    }))}
                                                    className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                                                />
                                                Sample Approved / QA Passed
                                            </label>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Notes Section */}
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Notes / Remarks</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                                    placeholder="Add any specific shipping terms, target price, or customer inquiries..."
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                                />
                            </div>

                            {/* Footer Buttons */}
                            <div className="flex items-center justify-between pt-3 border-t">
                                <div>
                                    {editing && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsFormOpen(false);
                                                navigate('/crm/quotations', { state: { convertInquiry: editing } });
                                            }}
                                            className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200/80 rounded-xl text-sm font-semibold transition shadow-2xs"
                                        >
                                            <FileText size={15} />
                                            <span>Convert to Quotation</span>
                                        </button>
                                    )}
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsFormOpen(false)}
                                        className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50 text-gray-700"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="px-6 py-2 bg-primary-600 text-white rounded-xl text-sm font-bold hover:bg-primary-700 transition disabled:opacity-50 shadow-md shadow-primary-500/20"
                                    >
                                        {saving ? 'Saving...' : editing ? 'Update Lead' : 'Create Lead'}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete confirm */}
            {deleting && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full">
                        <p className="font-bold text-gray-900 mb-2">Delete Lead?</p>
                        <p className="text-sm text-gray-500 mb-6">Delete &quot;{deleting.companyName}&quot;? This cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setDeleting(null)}
                                className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-semibold hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
