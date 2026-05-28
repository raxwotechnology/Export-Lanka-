import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Plus, Wallet, ArrowUpCircle, ArrowDownCircle,
    Clock, CheckCircle2, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import DynamicForm from '../components/ui/DynamicForm';

const PettyCashPage = () => {
    const [entries, setEntries] = useState([]);
    const [balance, setBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [formType, setFormType] = useState('expense');
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        item: '',
        amount: '',
        category: 'office',
        date: new Date().toISOString().split('T')[0],
        refNo: '',
        supplier: ''
    });

    const pettyCashSchema = [
        { name: 'date', label: 'Date', type: 'date', required: false },
        { name: 'refNo', label: 'Reference No', type: 'text' },
        { name: 'item', label: 'Item / Description', type: 'text', required: false },
        { name: 'supplier', label: 'Supplier', type: 'text' },
        { name: 'amount', label: 'Amount', type: 'number', required: false },
        {
            name: 'category',
            label: 'Category',
            type: 'select',
            options: [
                { value: 'office', label: 'Office Supplies' },
                { value: 'transport', label: 'Transport' },
                { value: 'food', label: 'Food & Beverages' },
                { value: 'utilities', label: 'Utilities' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'raw_material', label: 'Raw Materials' },
                { value: 'fuel', label: 'Fuel' },
                { value: 'other', label: 'Other' }
            ]
        }
    ];

    const fetchEntries = async () => {
        try {
            const { data } = await api.get('/finance/petty-cash');
            setEntries(data.data || []);
            setBalance(data.balance || 0);
        } catch (error) {
            toast.error('Failed to load petty cash data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchEntries(); }, []);

    const openForm = (type) => {
        setFormType(type);
        setFormData({
            item: '',
            amount: '',
            category: 'office',
            date: new Date().toISOString().split('T')[0],
            refNo: '',
            supplier: ''
        });
        setIsFormOpen(true);
    };

    const handleFormChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.put(`/finance/petty-cash/${id}/status`, { status });
            toast.success(`Entry ${status}`);
            fetchEntries();
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const handleSubmit = async (e) => {
        setSaving(true);
        try {
            await api.post('/finance/petty-cash', { ...formData, type: formType });
            toast.success(formType === 'replenish' ? 'Cash replenished' : 'Expense recorded');
            setIsFormOpen(false);
            fetchEntries();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-gray-900">
                <div>
                    <h2 className="text-2xl font-bold">Petty Cash Management</h2>
                    <p className="text-sm text-gray-500">Track factory and office micro-expenses</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => openForm('replenish')}>
                        <ArrowUpCircle size={16} className="mr-1.5" /> Replenish
                    </Button>
                    <Button variant="primary" onClick={() => openForm('expense')}>
                        <Plus size={16} className="mr-1.5" /> New Expense
                    </Button>
                </div>
            </div>

            <div className="bg-gradient-to-br from-primary-600 to-primary-800 rounded-2xl p-8 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-primary-100 text-sm font-medium mb-1">Current Petty Cash Balance</p>
                    <h3 className="text-4xl font-black">${balance?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                </div>
                <Wallet className="absolute right-[-20px] bottom-[-20px] w-48 h-48 text-white/10" />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h4 className="font-bold text-gray-800">Recent Transactions</h4>
                </div>
                <div className="divide-y divide-gray-100 font-sans">
                    {loading ? (
                        Array(5).fill(0).map((_, i) => <div key={i} className="p-4 animate-pulse h-16 bg-gray-50"></div>)
                    ) : entries.length === 0 ? (
                        <div className="p-10 text-center text-gray-500 italic">No transactions recorded</div>
                    ) : (
                        entries.map((entry) => (
                            <div key={entry._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4 text-gray-900">
                                    <div className={`p-2 rounded-lg ${entry.type === 'replenish' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                        {entry.type === 'replenish' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900">{entry.item || entry.description}</p>
                                        <p className="text-xs text-gray-500">{entry.date ? format(new Date(entry.date), 'MMM dd, yyyy') : ''} · {entry.category} {entry.refNo ? `· Ref: ${entry.refNo}` : ''}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className={`font-bold ${entry.type === 'replenish' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {entry.type === 'replenish' ? '+' : '-'}${(entry.amount || 0).toFixed(2)}
                                    </p>
                                    <div className="flex items-center justify-end gap-1 mt-1">
                                        {entry.status === 'pending' && (
                                            <div className="flex gap-1 mr-2">
                                                <button onClick={() => handleStatusUpdate(entry._id, 'approved')} className="p-1 hover:bg-emerald-50 text-emerald-600 rounded transition" title="Approve"><CheckCircle2 size={16} /></button>
                                                <button onClick={() => handleStatusUpdate(entry._id, 'rejected')} className="p-1 hover:bg-red-50 text-red-600 rounded transition" title="Reject"><XCircle size={16} /></button>
                                            </div>
                                        )}
                                        {entry.status === 'pending' && <Clock size={12} className="text-yellow-500" />}
                                        {entry.status === 'approved' && <CheckCircle2 size={12} className="text-emerald-500" />}
                                        {entry.status === 'rejected' && <XCircle size={12} className="text-red-500" />}
                                        <span className="text-[10px] font-bold uppercase text-gray-400">{entry.status}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <Modal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                title={formType === 'replenish' ? 'Replenish Cash' : 'New Expense'}
                size="lg"
            >
                <div className="p-6">
                    <DynamicForm
                        schema={pettyCashSchema}
                        formData={formData}
                        onChange={handleFormChange}
                        onSubmit={handleSubmit}
                        loading={saving}
                        submitLabel={formType === 'replenish' ? 'Replenish Cash' : 'Record Expense'}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default PettyCashPage;
