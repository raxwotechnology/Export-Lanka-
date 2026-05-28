import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Settings as SettingsIcon, Building2, DollarSign, Box, Save } from 'lucide-react';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useSettings, useUpdateSettings } from '../features/settings/useSettings';

const settingsSchema = z.object({
    companyName: z.string().min(1, 'Company name required'),
    companyAddress: z.string().optional(),
    companyPhone: z.string().optional(),
    companyEmail: z.string().email('Invalid email').optional().or(z.literal('')),
    taxId: z.string().optional(),
    currency: z.string().min(1, 'Currency required'),
    currencySymbol: z.string().min(1, 'Symbol required'),
    defaultTaxRate: z.coerce.number().min(0),
    lowStockThreshold: z.coerce.number().min(0),
});

export default function SettingsPage() {
    const { data, isLoading } = useSettings();
    const updateMutation = useUpdateSettings();

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            companyName: 'Wholesale ERP',
            currency: 'LKR',
            currencySymbol: 'Rs.',
            defaultTaxRate: 0,
            lowStockThreshold: 10,
        },
    });

    useEffect(() => {
        if (data?.data) {
            reset(data.data);
        }
    }, [data, reset]);

    const onSubmit = async (formData) => {
        await updateMutation.mutateAsync(formData);
    };

    if (isLoading) return <div className="py-20 text-center text-gray-500">Loading settings...</div>;

    return (
        <div>
            <PageHeader
                title="System Settings"
                description="Configure company profiles, financial defaults, and inventory behavior"
            />

            <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
                {/* Company Profile */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Building2 size={20} className="text-primary-600" />
                        <h3 className="font-semibold text-gray-900">Company Profile</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Company Name" required error={errors.companyName?.message} {...register('companyName')} />
                        <Input label="Tax ID / Registration" error={errors.taxId?.message} {...register('taxId')} />
                        <Input label="Email Address" type="email" error={errors.companyEmail?.message} {...register('companyEmail')} />
                        <Input label="Phone Number" error={errors.companyPhone?.message} {...register('companyPhone')} />
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Address</label>
                            <textarea
                                className="w-full px-3 py-2 border rounded-lg text-sm"
                                rows="3"
                                {...register('companyAddress')}
                            />
                        </div>
                    </div>
                </Card>

                {/* Financial Settings */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <DollarSign size={20} className="text-green-600" />
                        <h3 className="font-semibold text-gray-900">Financial Defaults</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <Input label="System Currency" placeholder="LKR" error={errors.currency?.message} {...register('currency')} />
                        <Input label="Currency Symbol" placeholder="Rs." error={errors.currencySymbol?.message} {...register('currencySymbol')} />
                        <Input label="Default Tax Rate (%)" type="number" step="0.01" error={errors.defaultTaxRate?.message} {...register('defaultTaxRate')} />
                    </div>
                </Card>

                {/* Inventory Settings */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Box size={20} className="text-amber-600" />
                        <h3 className="font-semibold text-gray-900">Inventory Preferences</h3>
                    </div>
                    <div className="w-1/3">
                        <Input label="Low Stock Alert Threshold" type="number" error={errors.lowStockThreshold?.message} {...register('lowStockThreshold')} />
                    </div>
                </Card>

                <div className="flex justify-end gap-3 pt-4">
                    <Button type="submit" variant="primary" size="lg" loading={updateMutation.isPending}>
                        <Save size={18} className="mr-2" /> Save All Settings
                    </Button>
                </div>
            </form>
        </div>
    );
}
