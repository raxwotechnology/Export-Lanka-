import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Settings as SettingsIcon, Building2, DollarSign, Box, Save,
    Upload, Image as ImageIcon, Trash2, Globe, FileBadge
} from 'lucide-react';
import toast from 'react-hot-toast';

import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useSettings, useUpdateSettings } from '../features/settings/useSettings';

const settingsSchema = z.object({
    companyName: z.string().min(1, 'Company name required'),
    companyTagline: z.string().optional(),
    companyAddress: z.string().optional(),
    companyPhone: z.string().optional(),
    companyEmail: z.string().email('Invalid email').optional().or(z.literal('')),
    companyWebsite: z.string().optional(),
    businessRegNo: z.string().optional(),
    companyLogo: z.string().optional(),
    taxId: z.string().optional(),
    currency: z.string().min(1, 'Currency required'),
    currencySymbol: z.string().min(1, 'Symbol required'),
    defaultTaxRate: z.coerce.number().min(0),
    lowStockThreshold: z.coerce.number().min(0),
});

export default function SettingsPage() {
    const { data, isLoading } = useSettings();
    const updateMutation = useUpdateSettings();
    const fileInputRef = useRef(null);

    const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            companyName: 'Authentic Lanka Exports (Pvt) Ltd',
            companyTagline: 'Premium Organic & Agricultural Exporters',
            companyWebsite: 'www.authenticlanka.com',
            businessRegNo: 'PV 00234567',
            companyAddress: 'No. 45/2, Temple Road, Colombo 03, Sri Lanka',
            companyPhone: '+94 11 234 5678 / +94 77 123 4567',
            companyEmail: 'info@authenticlanka.com',
            companyLogo: '/company_logo.jpg',
            taxId: 'VAT 114567890-7000',
            currency: 'LKR',
            currencySymbol: 'Rs.',
            defaultTaxRate: 0,
            lowStockThreshold: 10,
        },
    });

    const logoValue = watch('companyLogo');

    useEffect(() => {
        if (data?.data) {
            reset(data.data);
        }
    }, [data, reset]);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error('Please select an image file (PNG, JPG, or SVG)');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image file must be under 2MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const base64 = event.target?.result;
            if (base64) {
                setValue('companyLogo', base64, { shouldDirty: true });
                toast.success('Logo loaded! Click "Save All Settings" to apply to all documents.');
            }
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveLogo = () => {
        setValue('companyLogo', '', { shouldDirty: true });
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const onSubmit = async (formData) => {
        await updateMutation.mutateAsync(formData);
    };

    if (isLoading) return <div className="py-20 text-center text-gray-500">Loading settings...</div>;

    return (
        <div>
            <PageHeader
                title="System Settings"
                description="Configure company profiles, financial defaults, and corporate branding for official documents"
            />

            <form onSubmit={handleSubmit(onSubmit)} className="max-w-4xl space-y-6">
                {/* Company Profile & Branding */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-100">
                        <Building2 size={20} className="text-primary-600" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Company Profile & Official Branding</h3>
                            <p className="text-xs text-gray-500">These details appear automatically on Purchase Orders, Invoices, Quotations, and official PDF exports.</p>
                        </div>
                    </div>

                    {/* Logo Section with Live Preview & File Picker */}
                    <div className="mb-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                            Official Company Logo
                        </label>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                            <div className="w-24 h-24 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden p-1.5 flex-shrink-0">
                                {logoValue ? (
                                    <img
                                        src={logoValue}
                                        alt="Company Logo Preview"
                                        className="w-full h-full object-contain"
                                        onError={(e) => {
                                            e.currentTarget.src = '/company_logo.jpg';
                                        }}
                                    />
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-slate-400 text-[10px]">
                                        <ImageIcon size={28} className="mb-1 text-slate-300" />
                                        <span>No Logo</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2 flex-1">
                                <div className="flex flex-wrap gap-2">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <Upload size={14} className="mr-1.5 text-primary-600" />
                                        Upload Logo File
                                    </Button>

                                    {logoValue && (
                                        <Button
                                            type="button"
                                            variant="danger"
                                            size="sm"
                                            onClick={handleRemoveLogo}
                                        >
                                            <Trash2 size={14} className="mr-1.5" />
                                            Remove
                                        </Button>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500">
                                    Recommended: PNG or JPG with transparent or white background. Max size: 2MB.
                                </p>
                                <div className="pt-1">
                                    <Input
                                        placeholder="Or enter logo URL (e.g. /company_logo.jpg)"
                                        error={errors.companyLogo?.message}
                                        {...register('companyLogo')}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input
                            label="Company Name"
                            required
                            error={errors.companyName?.message}
                            placeholder="Authentic Lanka Exports (Pvt) Ltd"
                            {...register('companyName')}
                        />
                        <Input
                            label="Company Tagline / Subtitle"
                            error={errors.companyTagline?.message}
                            placeholder="Premium Organic & Agricultural Exporters"
                            {...register('companyTagline')}
                        />

                        <Input
                            label="VAT / Tax ID Number"
                            error={errors.taxId?.message}
                            placeholder="VAT 114567890-7000"
                            {...register('taxId')}
                        />
                        <Input
                            label="Business Registration No (BR)"
                            error={errors.businessRegNo?.message}
                            placeholder="PV 00234567"
                            {...register('businessRegNo')}
                        />

                        <Input
                            label="Official Email Address"
                            type="email"
                            error={errors.companyEmail?.message}
                            placeholder="info@authenticlanka.com"
                            {...register('companyEmail')}
                        />
                        <Input
                            label="Phone Numbers"
                            error={errors.companyPhone?.message}
                            placeholder="+94 11 234 5678 / +94 77 123 4567"
                            {...register('companyPhone')}
                        />

                        <div className="col-span-1 sm:col-span-2">
                            <Input
                                label="Official Website URL"
                                error={errors.companyWebsite?.message}
                                placeholder="www.authenticlanka.com"
                                {...register('companyWebsite')}
                            />
                        </div>

                        <div className="col-span-1 sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Company Registered Address</label>
                            <textarea
                                className="w-full px-3 py-2 border rounded-lg text-sm border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                                rows="3"
                                placeholder="No. 45/2, Temple Road, Colombo 03, Sri Lanka"
                                {...register('companyAddress')}
                            />
                        </div>
                    </div>
                </Card>

                {/* Financial Settings */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-100">
                        <DollarSign size={20} className="text-green-600" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Financial Defaults</h3>
                            <p className="text-xs text-gray-500">Currency codes and default taxation applied on quotations and invoices</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Input label="System Currency" placeholder="LKR" error={errors.currency?.message} {...register('currency')} />
                        <Input label="Currency Symbol" placeholder="Rs." error={errors.currencySymbol?.message} {...register('currencySymbol')} />
                        <Input label="Default Tax Rate (%)" type="number" step="0.01" error={errors.defaultTaxRate?.message} {...register('defaultTaxRate')} />
                    </div>
                </Card>

                {/* Inventory Settings */}
                <Card className="p-6">
                    <div className="flex items-center gap-3 mb-6 pb-3 border-b border-gray-100">
                        <Box size={20} className="text-amber-600" />
                        <div>
                            <h3 className="font-semibold text-gray-900">Inventory Preferences</h3>
                            <p className="text-xs text-gray-500">Threshold alerts for warehouse stock monitoring</p>
                        </div>
                    </div>
                    <div className="w-full sm:w-1/3">
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
