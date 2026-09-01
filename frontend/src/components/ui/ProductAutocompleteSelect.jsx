import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Search, Plus, Check, Loader2, X } from 'lucide-react';

export default function ProductAutocompleteSelect({
    label,
    placeholder = 'Type to search or add product...',
    products = [],
    value,
    onChange,
    productType = 'raw_material', // 'raw_material' or 'finished_good'
    required = false,
    disabled = false
}) {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const [searchedProducts, setSearchedProducts] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Fetch categories on mount to determine RAW category for auto-saving raw materials
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await api.get('/categories');
                if (res.data?.success) {
                    setCategories(res.data.data || []);
                }
            } catch (err) {
                console.error('Failed to load categories for autocomplete select:', err);
            }
        };
        fetchCategories();
    }, []);

    // Sync input value when external value changes
    useEffect(() => {
        if (!value) {
            setInputValue('');
            return;
        }
        const allProds = [...products, ...searchedProducts];
        const found = allProds.find(p => p._id === value);
        if (found) {
            setInputValue(found.name);
        }
    }, [value, products, searchedProducts]);

    // Handle clicks outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounced API search when typing
    useEffect(() => {
        if (!inputValue || !inputValue.trim()) {
            setSearchedProducts([]);
            return;
        }

        const timer = setTimeout(async () => {
            try {
                setIsSearching(true);
                const res = await api.get(`/products?search=${encodeURIComponent(inputValue.trim())}&limit=20`);
                if (res.data?.success) {
                    setSearchedProducts(res.data.data || []);
                }
            } catch (err) {
                console.warn('Autocomplete search failed:', err);
            } finally {
                setIsSearching(false);
            }
        }, 200);

        return () => clearTimeout(timer);
    }, [inputValue]);

    // Combined unique suggestions
    const combinedProducts = [];
    const seenIds = new Set();

    // First, products passed in props matching query
    for (const p of products) {
        if (!p || !p._id || seenIds.has(p._id)) continue;
        const matches = !inputValue.trim() ||
            p.name?.toLowerCase().includes(inputValue.toLowerCase()) ||
            p.productCode?.toLowerCase().includes(inputValue.toLowerCase()) ||
            p.sku?.toLowerCase().includes(inputValue.toLowerCase());
        if (matches) {
            seenIds.add(p._id);
            combinedProducts.push(p);
        }
    }

    // Next, products fetched via backend search
    for (const p of searchedProducts) {
        if (!p || !p._id || seenIds.has(p._id)) continue;
        seenIds.add(p._id);
        combinedProducts.push(p);
    }

    const handleSelectOption = (product) => {
        setInputValue(product.name);
        onChange(product._id, product);
        setIsOpen(false);
        setHighlightIndex(-1);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setInputValue('');
        onChange('', null);
        setIsOpen(true);
        inputRef.current?.focus();
    };

    // Auto-create product if it doesn't exist
    const handleAutoCreate = async (nameToCreate) => {
        const trimmed = nameToCreate.trim();
        if (!trimmed) return;
        try {
            let cats = categories;
            if (cats.length === 0) {
                const catRes = await api.get('/categories');
                if (catRes.data?.success) {
                    cats = catRes.data.data || [];
                    setCategories(cats);
                }
            }

            let matchedCat = null;
            if (productType === 'raw_material') {
                matchedCat = cats.find(c => c.code === 'RAW' || c.name === 'Raw Material') ||
                             cats.find(c => c.name.toLowerCase().includes('raw')) ||
                             cats[0];
            } else {
                matchedCat = cats.find(c => c.code === 'FIN' || c.name === 'Finished Goods' || c.name === 'Finished Good') ||
                             cats.find(c => c.name.toLowerCase().includes('finish') || c.name.toLowerCase().includes('good')) ||
                             cats[0];
            }

            if (!matchedCat) {
                toast.error('Cannot create product: No category found. Please create a category first.');
                return;
            }

            const payload = {
                name: trimmed,
                productType: productType,
                status: 'active',
                categoryId: matchedCat._id,
                unitOfMeasure: 'Kg',
                basePrice: 0,
                canBeSold: productType !== 'raw_material',
                canBePurchased: true,
            };

            const res = await api.post('/products', payload);
            if (res.data?.success && res.data?.data) {
                const newProd = res.data.data;
                toast.success(`Created: ${newProd.name} (${newProd.productCode || 'New'})`);
                setInputValue(newProd.name);
                onChange(newProd._id, newProd);
                setIsOpen(false);
            }
        } catch (err) {
            console.error('Auto-creation failed:', err.response?.data || err);
            toast.error(err.response?.data?.message || 'Failed to create new product');
        }
    };

    const handleKeyDown = (e) => {
        if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setIsOpen(true);
            return;
        }

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex(prev => (prev < combinedProducts.length - 1 ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex(prev => (prev > 0 ? prev - 1 : combinedProducts.length - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightIndex >= 0 && combinedProducts[highlightIndex]) {
                handleSelectOption(combinedProducts[highlightIndex]);
            } else if (combinedProducts.length === 1) {
                handleSelectOption(combinedProducts[0]);
            } else if (inputValue.trim() && !combinedProducts.some(p => p.name.toLowerCase() === inputValue.trim().toLowerCase())) {
                handleAutoCreate(inputValue);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const hasExactMatch = combinedProducts.some(
        p => p.name?.toLowerCase() === inputValue.trim().toLowerCase()
    );

    return (
        <div ref={wrapperRef} className="relative w-full">
            {label && (
                <label className="block text-xs font-bold text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <div className="relative flex items-center">
                <input
                    ref={inputRef}
                    type="text"
                    placeholder={placeholder}
                    value={inputValue}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setIsOpen(true);
                        setHighlightIndex(-1);
                    }}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled}
                    className="w-full px-3.5 py-2.5 pr-16 border border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 rounded-xl text-sm focus:outline-none bg-white font-medium transition shadow-sm"
                />

                <div className="absolute right-2.5 flex items-center gap-1">
                    {isSearching && <Loader2 size={16} className="text-primary-500 animate-spin" />}
                    {value && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100 transition"
                            title="Clear selection"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <Search size={16} className="text-gray-400 pointer-events-none" />
                </div>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-gray-100 animate-in fade-in zoom-in-95 duration-100">
                    {combinedProducts.length > 0 ? (
                        combinedProducts.map((p, idx) => {
                            const isSelected = p._id === value;
                            const isHighlighted = idx === highlightIndex;
                            return (
                                <button
                                    key={p._id}
                                    type="button"
                                    onClick={() => handleSelectOption(p)}
                                    className={`w-full text-left px-3.5 py-2.5 text-sm transition flex items-center justify-between ${
                                        isHighlighted ? 'bg-primary-50 text-primary-900' : isSelected ? 'bg-gray-50' : 'hover:bg-gray-50'
                                    }`}
                                >
                                    <div className="flex flex-col pr-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-gray-900">{p.name}</span>
                                            {p.productType && (
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono uppercase ${
                                                    p.productType === 'raw_material' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {p.productType.replace('_', ' ')}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                                            <span className="font-mono">{p.productCode || 'NO-CODE'}</span>
                                            {p.unitOfMeasure && <span>• {p.unitOfMeasure}</span>}
                                            {p.basePrice > 0 && <span>• Rs. {p.basePrice.toFixed(2)}</span>}
                                        </div>
                                    </div>

                                    {isSelected && <Check size={16} className="text-primary-600 flex-shrink-0" />}
                                </button>
                            );
                        })
                    ) : (
                        <div className="p-3 text-xs text-gray-400 text-center italic">
                            {inputValue ? 'No matching products found' : 'Type to search products'}
                        </div>
                    )}

                    {inputValue.trim() && !hasExactMatch && (
                        <button
                            type="button"
                            onClick={() => handleAutoCreate(inputValue)}
                            className="w-full text-left px-3.5 py-2.5 text-sm text-primary-700 bg-primary-50/50 hover:bg-primary-100 font-semibold transition flex items-center gap-2"
                        >
                            <Plus size={15} className="text-primary-600" />
                            <span>Add as new {productType === 'raw_material' ? 'Raw Material' : 'Product'}: <strong className="text-primary-900">"{inputValue.trim()}"</strong></span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
