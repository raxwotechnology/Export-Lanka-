import React, { useState } from 'react';
import {
    Truck, Plus, MapPin, Navigation, Fuel, Clock,
    Activity, Edit, Trash2, History, CheckCircle2
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Table from '../components/ui/Table';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import { useVehicles, useTrips, useUpdateVehicle } from '../features/fleet/useFleet';
import VehicleModal from '../features/fleet/VehicleModal';
import TripLogModal from '../features/fleet/TripLogModal';

const FleetPage = ({ defaultView = 'vehicles' }) => {
    const [view, setView] = useState(defaultView); // 'vehicles' or 'history'
    
    React.useEffect(() => {
        setView(defaultView);
    }, [defaultView]);

    const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
    const [isTripModalOpen, setIsTripModalOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [deletingVehicle, setDeletingVehicle] = useState(null);

    const { data: vehiclesData, isLoading: isLoadingVehicles } = useVehicles();
    const { data: tripsData, isLoading: isLoadingTrips } = useTrips();

    const vehicles = vehiclesData?.data || [];
    const trips = tripsData?.data || [];

    const handleEditVehicle = (vehicle) => {
        setSelectedVehicle(vehicle);
        setIsVehicleModalOpen(true);
    };

    const handleLogTrip = (vehicle) => {
        setSelectedVehicle(vehicle);
        setIsTripModalOpen(true);
    };

    const tripColumns = [
        { key: 'date', label: 'Date', render: (r) => new Date(r.startDate).toLocaleDateString() },
        { key: 'vehicle', label: 'Vehicle', render: (r) => r.vehicleId?.registrationNo || r.vehicleId?.licensePlate || '—' },
        { key: 'route', label: 'Route', render: (r) => `${r.origin} → ${r.destination}` },
        { 
            key: 'shift', 
            label: 'Shift', 
            render: (r) => (
                <Badge variant={r.shift === 'night' ? 'dark' : 'warning'}>
                    {r.shift === 'night' ? 'Night Shift' : 'Day Shift'}
                </Badge>
            ) 
        },
        { key: 'purpose', label: 'Purpose', render: (r) => <Badge>{r.purpose}</Badge> },
        {
            key: 'items',
            label: 'Items & Weight',
            render: (r) => (
                <div className="max-w-[220px]">
                    <span className="font-semibold text-xs text-gray-700 block">
                        {r.quantityWeightTransported ? `${r.quantityWeightTransported} kg` : '—'}
                    </span>
                    {r.itemsTransported && r.itemsTransported.length > 0 && (
                        <span className="text-[10px] text-gray-500 block truncate" title={r.itemsTransported.map(i => `${i.item} (${i.quantity} ${i.uom})`).join(', ')}>
                            {r.itemsTransported.map(i => `${i.item} (${i.quantity} ${i.uom})`).join(', ')}
                        </span>
                    )}
                </div>
            )
        },
        { key: 'distance', label: 'Distance', render: (r) => r.endOdometer ? `${r.endOdometer - r.startOdometer} km` : 'Active' },
        {
            key: 'status',
            label: 'Status',
            render: (r) => <Badge variant={r.status === 'completed' ? 'success' : 'warning'}>{r.status}</Badge>
        },
    ];

    return (
        <div className="space-y-6">
            {/* ─── EXECUTIVE HEADER ─── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            Transportation & Logistics
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500">Fleet Operations</span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fleet & Transportation</h1>
                    <p className="text-sm text-slate-500 mt-0.5">
                        Manage company delivery vehicles, monitor active trips, and track transportation mileage.
                    </p>
                </div>

                {view === 'vehicles' && (
                    <Button
                        variant="primary"
                        onClick={() => { setSelectedVehicle(null); setIsVehicleModalOpen(true); }}
                        className="shadow-sm"
                    >
                        <Plus size={16} className="mr-1.5" /> Add Vehicle
                    </Button>
                )}
            </div>

            {/* ─── 2 COLOR-CODED MODULE BUTTONS / CARDS ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Vehicles Button (Emerald Green) */}
                <button
                    type="button"
                    onClick={() => setView('vehicles')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        view === 'vehicles'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white border-emerald-600 shadow-lg shadow-emerald-600/20 ring-2 ring-emerald-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                view === 'vehicles'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white'
                            }`}
                        >
                            <Truck size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Fleet Assets
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Delivery Vehicles
                            </h3>
                            <p className={`text-xs truncate ${view === 'vehicles' ? 'text-emerald-100' : 'text-slate-500'}`}>
                                Lorries, vans & statuses
                            </p>
                        </div>
                    </div>
                    {vehicles.length > 0 && (
                        <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                                view === 'vehicles'
                                    ? 'bg-white text-emerald-800'
                                    : 'bg-emerald-100 text-emerald-800'
                            }`}
                        >
                            {vehicles.length}
                        </span>
                    )}
                </button>

                {/* 2. Trip Logs Button (Royal Blue) */}
                <button
                    type="button"
                    onClick={() => setView('history')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-200 text-left cursor-pointer group ${
                        view === 'history'
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white border-blue-600 shadow-lg shadow-blue-600/20 ring-2 ring-blue-500/30 scale-[1.01]'
                            : 'bg-white text-slate-800 border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 shadow-xs'
                    }`}
                >
                    <div className="flex items-center gap-3.5 min-w-0">
                        <div
                            className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors shadow-xs ${
                                view === 'history'
                                    ? 'bg-white/20 text-white'
                                    : 'bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white'
                            }`}
                        >
                            <History size={22} />
                        </div>
                        <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block opacity-80">
                                Transport Logs
                            </span>
                            <h3 className="font-extrabold text-base tracking-tight truncate leading-tight">
                                Trip Logs & History
                            </h3>
                            <p className={`text-xs truncate ${view === 'history' ? 'text-blue-100' : 'text-slate-500'}`}>
                                Routes, cargo & mileage
                            </p>
                        </div>
                    </div>
                    {trips.length > 0 && (
                        <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${
                                view === 'history'
                                    ? 'bg-white text-blue-900'
                                    : 'bg-blue-100 text-blue-800'
                            }`}
                        >
                            {trips.length}
                        </span>
                    )}
                </button>
            </div>

            {view === 'vehicles' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {isLoadingVehicles ? (
                        Array(3).fill(0).map((_, i) => (
                            <div key={i} className="h-64 bg-gray-100 rounded-xl animate-pulse"></div>
                        ))
                    ) : vehicles.length === 0 ? (
                        <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded-xl border border-dashed text-sm">
                            No vehicles registered. Click "Add Vehicle" to get started.
                        </div>
                    ) : (
                        vehicles.map((v) => (
                            <div key={v._id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden group hover:shadow-md transition-shadow">
                                <div className="p-5 border-b border-gray-50 flex justify-between items-start bg-slate-50/50 text-gray-900">
                                    <div>
                                        <h3 className="font-bold">{v.registrationNo}</h3>
                                        <p className="text-xs text-gray-500">{v.make} {v.model} ({v.year})</p>
                                    </div>
                                    <Badge variant={v.status === 'available' ? 'success' : 'warning'}>
                                        {v.status.replace('_', ' ')}
                                    </Badge>
                                </div>

                                <div className="p-5 space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3">
                                            <Activity size={18} className="text-gray-400" />
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">Odometer</p>
                                                <p className="text-sm font-bold text-gray-700">{(v.currentOdometer || 0).toLocaleString()} km</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Fuel size={18} className="text-gray-400" />
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold uppercase">Fuel Type</p>
                                                <p className="text-sm font-bold text-gray-700 capitalize">{v.fuelType}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            fullWidth
                                            onClick={() => handleEditVehicle(v)}
                                            className="text-xs"
                                        >
                                            <Edit size={14} className="mr-1" /> Edit
                                        </Button>
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            fullWidth
                                            onClick={() => handleLogTrip(v)}
                                            disabled={v.status !== 'available'}
                                            className="text-xs"
                                        >
                                            <Navigation size={14} className="mr-1" /> Log Trip
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <Card>
                    {isLoadingTrips ? (
                        <div className="py-12 text-center text-gray-500">Loading trips...</div>
                    ) : trips.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">No trip logs found</div>
                    ) : (
                        <Table columns={tripColumns} data={trips} />
                    )}
                </Card>
            )}

            <VehicleModal
                isOpen={isVehicleModalOpen}
                onClose={() => setIsVehicleModalOpen(false)}
                vehicle={selectedVehicle}
            />

            <TripLogModal
                isOpen={isTripModalOpen}
                onClose={() => setIsTripModalOpen(false)}
                vehicle={selectedVehicle}
            />
        </div>
    );
};

export default FleetPage;
