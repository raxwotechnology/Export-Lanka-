import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Plus, Search, Mail, Globe,
    UserPlus, Edit, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import DynamicForm from '../components/ui/DynamicForm';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const InquiriesPage = () => {
    const [inquiries, setInquiries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        companyName: '', contactPerson: '', email: '', phone: '',
        country: '', source: 'website', status: 'new', notes: '',
        productsInterested: ''
    });

    const inquirySchema = [
        { name: 'companyName', label: 'Company Name', type: 'text', required: false },
        { name: 'contactPerson', label: 'Contact Person', type: 'text' },
        { name: 'email', label: 'Email Address', type: 'text', required: false },
        { name: 'phone', label: 'Phone Number', type: 'text' },
        { name: 'country', label: 'Country', type: 'text' },
        {
            name: 'source',
            label: 'Source',
            type: 'select',
            options: [
                { value: 'website', label: 'Website' },
                { value: 'referral', label: 'Referral' },
                { value: 'trade_fair', label: 'Trade Fair' },
                { value: 'social_media', label: 'Social Media' },
                { value: 'cold_call', label: 'Cold Call' },
                { value: 'other', label: 'Other' }
            ]
        },
        {
            name: 'status',
            label: 'Lead Status',
            type: 'select',
            options: [
                { value: 'new', label: 'New' },
                { value: 'contacted', label: 'Contacted' },
                { value: 'quoted', label: 'Quoted' },
                { value: 'converted', label: 'Converted' },
                { value: 'lost', label: 'Lost' }
            ]
        },
        { name: 'productsInterested', label: 'Products Interested', type: 'text' },
        { name: 'notes', label: 'Internal Notes', type: 'textarea' }
    ];

    const fetchInquiries = async () => {
        try {
            const { data } = await api.get('/crm/inquiries');
            setInquiries(data.data || []);
        } catch (error) {
            toast.error('Failed to load inquiries');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInquiries(); }, []);

    const openForm = (inquiry = null) => {
        if (inquiry) {
            setEditing(inquiry);
            setFormData({
                companyName: inquiry.companyName || '',
                contactPerson: inquiry.contactPerson || '',
                email: inquiry.email || '',
                phone: inquiry.phone || '',
                country: inquiry.country || '',
                source: inquiry.source || 'website',
                status: inquiry.status || 'new',
                notes: inquiry.notes || '',
                productsInterested: inquiry.productsInterested || ''
            });
        } else {
            setEditing(null);
            setFormData({
                companyName: '', contactPerson: '', email: '', phone: '',
                country: '', source: 'website', status: 'new', notes: '',
                productsInterested: ''
            });
        }
        setIsFormOpen(true);
    };

    const handleFormChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        setSaving(true);
        try {
            if (editing) {
                await api.put(`/crm/inquiries/${editing._id}`, formData);
                toast.success('Inquiry updated');
            } else {
                await api.post('/crm/inquiries', formData);
                toast.success('Inquiry created');
            }
            setIsFormOpen(false);
            setEditing(null);
            fetchInquiries();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/crm/inquiries/${deleting._id}`);
            toast.success('Inquiry deleted');
            setDeleting(null);
            fetchInquiries();
        } catch (err) {
            toast.error('Failed to delete');
        }
    };

    const getStatusStyle = (status) => {
        const styles = {
            new: 'bg-blue-50 text-blue-700 border-blue-100',
            contacted: 'bg-yellow-50 text-yellow-700 border-yellow-100',
            quoted: 'bg-purple-50 text-purple-700 border-purple-100',
            converted: 'bg-green-50 text-green-700 border-green-100',
            lost: 'bg-red-50 text-red-700 border-red-100',
        };
        return styles[status] || 'bg-gray-50 text-gray-600 border-gray-100';
    };

    const filtered = inquiries.filter(i =>
        (i.companyName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (i.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-gray-900">
                <div>
                    <h2 className="text-2xl font-bold">Leads & Inquiries</h2>
                    <p className="text-sm text-gray-500">Manage incoming business queries and potential exports</p>
                </div>
                <Button variant="primary" onClick={() => openForm()}>
                    <UserPlus size={16} className="mr-1.5" />
                    Add New Lead
                </Button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md text-gray-900">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Search by company or contact..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none transition"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Company & Contact</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Location</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-gray-900">
                        {loading ? (
                            Array(5).fill(0).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td colSpan="3" className="px-6 py-6"><div className="h-4 bg-gray-100 rounded w-full"></div></td>
                                </tr>
                            ))
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan="3" className="px-6 py-10 text-center text-gray-500 italic">No inquiries found</td></tr>
                        ) : (
                            filtered.map((inquiry) => (
                                <tr key={inquiry._id} className="hover:bg-gray-50 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900">{inquiry.companyName}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                            <Mail size={12} /> {inquiry.email}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Globe size={14} className="text-gray-400" />
                                            {inquiry.country}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="outline" size="sm" onClick={() => openForm(inquiry)}>
                                                <Edit size={14} />
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => setDeleting(inquiry)}>
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Form Modal */}
            <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={editing ? 'Edit Lead' : 'New Lead'} size="lg">
                <div className="p-6">
                    <DynamicForm
                        schema={inquirySchema}
                        formData={formData}
                        onChange={handleFormChange}
                        onSubmit={handleSubmit}
                        loading={saving}
                        submitLabel={editing ? 'Update Lead' : 'Create Lead'}
                    />
                </div>
            </Modal>

            <ConfirmDialog
                isOpen={!!deleting}
                onClose={() => setDeleting(null)}
                onConfirm={handleDelete}
                title="Delete Inquiry"
                message={`Delete lead "${deleting?.companyName}"? This action cannot be undone.`}
            />
        </div>
    );
};

export default InquiriesPage;
