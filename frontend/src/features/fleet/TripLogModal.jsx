import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import { useCreateTrip } from './useFleet';

const TripLogModal = ({ isOpen, onClose, vehicle }) => {
    const createTrip = useCreateTrip();

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: {
            vehicleId: '',
            origin: '',
            destination: '',
            purpose: 'delivery',
            startOdometer: 0,
            startDate: new Date().toISOString().split('T')[0]
        }
    });

    useEffect(() => {
        if (vehicle) {
            reset({
                vehicleId: vehicle._id,
                startOdometer: vehicle.currentOdometer,
                startDate: new Date().toISOString().split('T')[0],
                origin: '',
                destination: '',
                purpose: 'delivery'
            });
        }
    }, [vehicle, reset]);

    const onSubmit = async (data) => {
        try {
            await createTrip.mutateAsync(data);
            onClose();
        } catch (error) {
            // Error handled by mutation
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Log New Trip"
            size="md"
        >
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg flex justify-between items-center mb-4">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-blue-600">Selected Vehicle</p>
                        <p className="text-sm font-bold text-blue-900">{vehicle?.registrationNo}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] uppercase font-bold text-blue-600">Current Odometer</p>
                        <p className="text-sm font-bold text-blue-900">{vehicle?.currentOdometer} km</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        label="Origin"
                        required
                        placeholder="e.g. Main Warehouse"
                        error={errors.origin?.message}
                        {...register('origin', { required: 'Origin is required' })}
                    />
                    <Input
                        label="Destination"
                        required
                        placeholder="e.g. Retail Branch A"
                        error={errors.destination?.message}
                        {...register('destination', { required: 'Destination is required' })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        type="date"
                        label="Start Date"
                        required
                        {...register('startDate', { required: 'Start date is required' })}
                    />
                    <Select
                        label="Purpose"
                        options={[
                            { value: 'delivery', label: 'Delivery' },
                            { value: 'pickup', label: 'Pickup' },
                            { value: 'service', label: 'Service' },
                            { value: 'other', label: 'Other' },
                        ]}
                        {...register('purpose')}
                    />
                </div>

                <Input
                    type="number"
                    label="Start Odometer"
                    required
                    error={errors.startOdometer?.message}
                    {...register('startOdometer', { required: 'Start odometer is required' })}
                />

                <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button type="submit" loading={createTrip.isPending}>
                        Start Trip
                    </Button>
                </div>
            </form>
        </Modal>
    );
};

export default TripLogModal;
