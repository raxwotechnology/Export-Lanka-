import React, { useState, useEffect } from 'react';
import api from '../api/axios';
import { format } from 'date-fns';
import {
    Wrench, Plus, Search, AlertTriangle,
    ClipboardCheck, History,
    Activity, MessageSquare, ChevronRight, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const MaintenancePage = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        title: '', description: '', priority: 'normal', assetId: '', category: 'machine'
    });

    const fetchRequests = async () => {
        try {
            const { data } = await api.get('/maintenance/requests');
            setRequests(data.data || []);
        } catch (error) {
            toast.error('Failed to load maintenance data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const openModal = () => {
        setForm({ title: '', description: '', priority: 'normal', assetId: '', category: 'machine' });
        setIsModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.post('/maintenance/requests', form);
            toast.success('Maintenance request submitted');
            setIsModalOpen(false);
            fetchRequests();
        } catch (error) {
            toast.error('Failed to submit request');
        } finally {
            setSaving(false);
        }
    };

    const getPriorityColor = (priority) => {
        if (priority === 'critical') return 'text-red-600 bg-red-50 border-red-100';
        if (priority === 'high') return 'text-orange-600 bg-orange-50 border-orange-100';
        return 'text-blue-600 bg-blue-50 border-blue-100';
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-gray-900">
                <div>
                    <h2 className="text-2xl font-bold">Maintenance & Upkeep</h2>
                    <p className="text-sm text-gray-500">Schedule machine repairs and routine vehicle service</p>
                </div>
                <Button variant="primary" onClick={openModal}>
                    <Plus size={18} className="mr-1.5" />
                    New Request
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Active Requests */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">
                            <Wrench size={18} className="text-primary-600" />
                            Pending Jobs
                        </h4>
                    </div>
                    <div className="divide-y divide-gray-100 font-sans">
                        {loading ? (
                            Array(3).fill(0).map((_, i) => (
                                <div key={i} className="p-6 animate-pulse h-24 bg-gray-50"></div>
                            ))
                        ) : requests.filter(r => r.status !== 'completed').length === 0 ? (
                            <div className="p-10 text-center text-gray-500 italic text-gray-900">No pending requests</div>
                        ) : (
                            requests.filter(r => r.status !== 'completed').map((r) => (
                                <div key={r._id} className="p-5 hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <div className="flex justify-between items-start mb-3">
                                        <h5 className="font-bold text-gray-900">{r.title}</h5>
                                        <span className={`px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-tighter ${getPriorityColor(r.priority)}`}>
                                            {r.priority}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-4">{r.description}</p>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                Asset ID: <span className="text-gray-600">{r.assetId || 'N/A'}</span>
                                            </div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                Created: <span className="text-gray-600">{r.createdAt ? format(new Date(r.createdAt), 'MMM dd') : '--'}</span>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-500 transform group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* History/Log */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm text-gray-900">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Operational Alert</h4>
                                <p className="text-xs text-gray-500">Dehydration Unit B is due for routine service in 3 days.</p>
                            </div>
                        </div>
                        <button className="w-full py-2 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-xs font-bold hover:bg-amber-100 transition uppercase tracking-widest font-sans">
                            Schedule Service
                        </button>
                    </div>

                    <div className="bg-gray-900 rounded-xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10 text-gray-200">
                            <h4 className="font-bold text-lg mb-2">Maintenance KPIs</h4>
                            <div className="grid grid-cols-2 gap-4 mt-6">
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Uptime</p>
                                    <p className="text-2xl font-black text-white">98.4%</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">MTTR</p>
                                    <p className="text-2xl font-black text-white">4.2h</p>
                                </div>
                            </div>
                        </div>
                        <Activity className="absolute right-[-20px] bottom-[-20px] w-40 h-40 text-white/5" />
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Maintenance Request" size="md">
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Issue Title *</label>
                        <input required placeholder="e.g. Grinder Motor Overheating" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 font-sans" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Asset ID / Machine *</label>
                            <input required placeholder="MCH-102" className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 font-sans" value={form.assetId} onChange={e => setForm({ ...form, assetId: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Category</label>
                            <select className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 font-sans" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                <option value="machine">Factory Machine</option>
                                <option value="vehicle">Delivery Vehicle</option>
                                <option value="building">Facility/Building</option>
                                <option value="it">IT/Network</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Priority</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['normal', 'high', 'critical'].map(p => (
                                <button key={p} type="button" onClick={() => setForm({ ...form, priority: p })} className={`py-2 text-[10px] font-black uppercase rounded-lg border transition ${form.priority === p ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'}`}>
                                    {p}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Problem Description *</label>
                        <textarea required rows={4} className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 font-sans" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t">
                        <Button variant="outline" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button type="submit" variant="primary" loading={saving}>Submit Request</Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default MaintenancePage;
