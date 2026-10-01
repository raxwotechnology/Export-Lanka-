import React, { useState, useEffect, useRef } from 'react';
import { Search, X, UserCheck, Plus } from 'lucide-react';
import api from '../../api/axios';
import toast from 'react-hot-toast';

export default function CustomerAutocompleteSelect({
    label,
    placeholder = "Type customer name or code...",
    customers = [],
    value,
    onChange,
    onCreated,
    required = false,
    disabled = false
}) {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [localCustomers, setLocalCustomers] = useState([]);
    const wrapperRef = useRef(null);

    // Initialize/sync local list with prop
    useEffect(() => {
        setLocalCustomers(customers);
    }, [customers]);

    const isValidObjectId = (id) => typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);

    // Sync input value with external value change
    useEffect(() => {
        if (isValidObjectId(value)) {
            const found = localCustomers.find(c => c._id === value);
            if (found) {
                setInputValue(`${found.displayName} (${found.customerCode || ''})`);
            }
        } else if (!value) {
            setInputValue('');
        } else {
            setInputValue(value);
        }
    }, [value, localCustomers]);

    // Handle clicks outside of dropdown to close it
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const query = inputValue.toLowerCase().trim();
    const filtered = localCustomers.filter(c =>
        c.displayName?.toLowerCase().includes(query) ||
        c.customerCode?.toLowerCase().includes(query) ||
        c.primaryContact?.phone?.toLowerCase().includes(query) ||
        c.companyName?.toLowerCase().includes(query)
    );

    const handleSelectOption = (customer) => {
        setInputValue(`${customer.displayName} (${customer.customerCode || ''})`);
        onChange(customer._id, customer);
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setInputValue('');
        onChange('', null);
        setIsOpen(true);
    };

    // Auto-create customer if typed name doesn't exist
    const handleAutoCreate = async (nameToCreate) => {
        if (!nameToCreate.trim()) return;

        // Parse name and phone if present
        const match = nameToCreate.trim().match(/(\+?\d{8,14})/);
        let phone = '';
        let displayName = nameToCreate.trim();
        if (match) {
            phone = match[1];
            displayName = nameToCreate.trim().replace(phone, '').trim();
            if (!displayName) {
                displayName = `Customer ${phone}`;
            }
        }

        try {
            const payload = {
                displayName,
                companyName: displayName,
                customerType: 'company',
                status: 'active',
                primaryContact: phone ? {
                    phone,
                    name: displayName
                } : undefined,
                paymentTerms: {
                    type: 'cod',
                    creditDays: 0,
                    creditLimit: 0,
                },
            };

            const res = await api.post('/customers', payload);
            if (res.data?.success && res.data?.data) {
                const newCust = res.data.data;
                toast.success(`Created new customer: ${newCust.displayName}`);
                setLocalCustomers(prev => [...prev, newCust]);
                setInputValue(`${newCust.displayName} (${newCust.customerCode || ''})`);
                onChange(newCust._id, newCust);
                onCreated?.(newCust);
                setIsOpen(false);
            }
        } catch (err) {
            console.error('Customer auto-creation failed:', err.response?.data || err);
            toast.error(err.response?.data?.message || 'Failed to create new customer');
        }
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
            )}
            <div className="relative flex items-center">
                <Search size={16} className="absolute left-3 text-gray-400 pointer-events-none" />
                <input
                    type="text"
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={(e) => {
                        const val = e.target.value;
                        setInputValue(val);
                        if (!val) {
                            onChange('', null);
                        }
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    disabled={disabled}
                    className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white outline-none transition"
                />
                {inputValue && !disabled && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                        title="Clear customer"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-gray-100 animate-fade-in">
                    {filtered.length > 0 ? (
                        filtered.map((c) => {
                            const isCurrentSelected = c._id === value;
                            return (
                                <button
                                    key={c._id}
                                    type="button"
                                    onMouseDown={() => handleSelectOption(c)}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition flex items-center justify-between cursor-pointer ${
                                        isCurrentSelected
                                            ? 'bg-primary-50 text-primary-900 font-semibold'
                                            : 'hover:bg-gray-50 text-gray-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                            {c.displayName?.charAt(0)?.toUpperCase() || 'C'}
                                        </div>
                                        <div className="truncate">
                                            <p className="font-medium text-gray-900 truncate">{c.displayName}</p>
                                            {c.companyName && c.companyName !== c.displayName && (
                                                <p className="text-xs text-gray-500 truncate">{c.companyName}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 pl-2">
                                        <span className="text-xs font-mono font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                            {c.customerCode}
                                        </span>
                                        {c.primaryContact?.phone && (
                                            <p className="text-[11px] text-gray-400 mt-0.5">{c.primaryContact.phone}</p>
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    ) : (
                        <div className="px-4 py-3 text-xs text-gray-500 text-center">
                            No matching customers found for "{inputValue}"
                        </div>
                    )}

                    {inputValue.trim() && !localCustomers.some(c => c.displayName?.toLowerCase() === inputValue.trim().toLowerCase()) && (
                        <button
                            type="button"
                            onMouseDown={() => handleAutoCreate(inputValue)}
                            className="w-full text-left px-4 py-2.5 text-xs text-primary-700 hover:bg-primary-50 font-semibold flex items-center gap-2 transition"
                        >
                            <Plus size={14} />
                            <span>Create new customer "{inputValue.trim()}"</span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
