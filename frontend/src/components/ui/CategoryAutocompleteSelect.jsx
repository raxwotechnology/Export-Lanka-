import React, { useState, useEffect, useRef } from 'react';
import { Search, X, FolderTree, Plus, ChevronDown, Check } from 'lucide-react';

export default function CategoryAutocompleteSelect({
    label = 'Parent Category (optional)',
    placeholder = 'Type to search or enter new parent category...',
    categories = [],
    value = '',
    onChange,
    excludeCategoryId = null,
    error,
    disabled = false,
    required = false,
}) {
    const [inputValue, setInputValue] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const wrapperRef = useRef(null);
    const inputRef = useRef(null);

    // Available categories excluding the current category (to prevent self-parenting)
    const availableCategories = categories.filter((c) => c._id !== excludeCategoryId);

    // Sync input text when value or categories change
    useEffect(() => {
        if (!value) {
            setInputValue('');
            return;
        }

        const found = availableCategories.find((c) => c._id === value);
        if (found) {
            setInputValue(found.name);
        } else {
            // It's a custom/manual name string
            setInputValue(value);
        }
    }, [value, categories, excludeCategoryId]);

    // Handle clicks outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                if (isOpen) {
                    handleCloseOnBlur();
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, inputValue, availableCategories, value]);

    const handleCloseOnBlur = () => {
        setIsOpen(false);
        const trimmed = inputValue.trim();
        if (!trimmed) {
            if (value) {
                onChange?.('');
            }
            return;
        }

        // Check if trimmed matches an existing category
        const exactMatch = availableCategories.find(
            (c) => c.name.toLowerCase() === trimmed.toLowerCase()
        );

        if (exactMatch) {
            setInputValue(exactMatch.name);
            onChange?.(exactMatch._id, exactMatch);
        } else {
            // Keep custom typed value
            onChange?.(trimmed, null);
        }
    };

    const query = inputValue.trim().toLowerCase();

    // Filtered suggestions
    const filteredCategories = availableCategories.filter((c) => {
        if (!query) return true;
        return (
            c.name?.toLowerCase().includes(query) ||
            c.code?.toLowerCase().includes(query)
        );
    });

    const hasExactMatch = availableCategories.some(
        (c) => c.name.toLowerCase() === query
    );

    const showCreateOption = query.length > 0 && !hasExactMatch;

    const handleSelectCategory = (cat) => {
        setInputValue(cat.name);
        onChange?.(cat._id, cat);
        setIsOpen(false);
        setHighlightIndex(-1);
    };

    const handleSelectCustom = (customName) => {
        const trimmed = customName.trim();
        if (!trimmed) return;
        setInputValue(trimmed);
        onChange?.(trimmed, null);
        setIsOpen(false);
        setHighlightIndex(-1);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        setInputValue('');
        onChange?.('', null);
        setIsOpen(false);
        setHighlightIndex(-1);
        inputRef.current?.focus();
    };

    const handleKeyDown = (e) => {
        if (!isOpen) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                setIsOpen(true);
                e.preventDefault();
            }
            return;
        }

        const totalItems = filteredCategories.length + (showCreateOption ? 1 : 0);

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIndex((prev) => (prev + 1 < totalItems ? prev + 1 : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIndex((prev) => (prev - 1 >= 0 ? prev - 1 : totalItems - 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (highlightIndex >= 0 && highlightIndex < filteredCategories.length) {
                handleSelectCategory(filteredCategories[highlightIndex]);
            } else if (showCreateOption && (highlightIndex === filteredCategories.length || highlightIndex === -1)) {
                handleSelectCustom(inputValue);
            } else if (filteredCategories.length === 1) {
                handleSelectCategory(filteredCategories[0]);
            } else if (inputValue.trim()) {
                handleSelectCustom(inputValue);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
            setHighlightIndex(-1);
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
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    placeholder={placeholder}
                    disabled={disabled}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setIsOpen(true);
                        setHighlightIndex(-1);
                        if (!e.target.value.trim()) {
                            onChange?.('', null);
                        }
                    }}
                    onFocus={() => {
                        setIsOpen(true);
                        setHighlightIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    className={`w-full pl-9 pr-14 py-2 border rounded-lg text-sm bg-white outline-none transition ${
                        error
                            ? 'border-red-500 focus:ring-2 focus:ring-red-200'
                            : 'border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                    }`}
                />

                <div className="absolute right-2 flex items-center gap-1">
                    {inputValue && !disabled && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                            title="Clear parent category"
                        >
                            <X size={14} />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => setIsOpen(!isOpen)}
                        className="p-1 text-gray-400 hover:text-gray-600 transition"
                        tabIndex={-1}
                    >
                        <ChevronDown size={15} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                </div>
            </div>

            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

            {/* Suggestions Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-100 animate-in fade-in duration-100">
                    {/* Top Level / None Option */}
                    <button
                        type="button"
                        onMouseDown={() => {
                            setInputValue('');
                            onChange?.('', null);
                            setIsOpen(false);
                        }}
                        className={`w-full text-left px-3.5 py-2 text-xs transition flex items-center justify-between ${
                            !value ? 'bg-primary-50 text-primary-800 font-semibold' : 'text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                        <span className="italic">None (Top-Level Category)</span>
                        {!value && <Check size={14} className="text-primary-600" />}
                    </button>

                    {/* Filtered Existing Categories */}
                    {filteredCategories.length > 0 ? (
                        filteredCategories.map((c, index) => {
                            const isSelected = value === c._id || value.toLowerCase() === c.name.toLowerCase();
                            const isHighlighted = highlightIndex === index;

                            return (
                                <button
                                    key={c._id}
                                    type="button"
                                    onMouseDown={() => handleSelectCategory(c)}
                                    className={`w-full text-left px-3.5 py-2 text-sm transition flex items-center justify-between cursor-pointer ${
                                        isSelected
                                            ? 'bg-primary-50 text-primary-900 font-medium'
                                            : isHighlighted
                                            ? 'bg-gray-100 text-gray-900'
                                            : 'hover:bg-gray-50 text-gray-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate">
                                        <FolderTree size={14} className="text-gray-400 flex-shrink-0" />
                                        <span className="truncate">{c.name}</span>
                                        {c.parentCategory?.name && (
                                            <span className="text-xs text-gray-400 truncate">
                                                (in {c.parentCategory.name})
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                                        <span className="text-[11px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                            {c.code}
                                        </span>
                                        {isSelected && <Check size={14} className="text-primary-600" />}
                                    </div>
                                </button>
                            );
                        })
                    ) : (
                        !showCreateOption && (
                            <div className="px-3.5 py-3 text-xs text-gray-400 text-center">
                                No categories found
                            </div>
                        )
                    )}

                    {/* Create New Parent Category Option */}
                    {showCreateOption && (
                        <button
                            type="button"
                            onMouseDown={() => handleSelectCustom(inputValue)}
                            className={`w-full text-left px-3.5 py-2.5 text-xs font-semibold text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/70 transition flex items-center gap-2 ${
                                highlightIndex === filteredCategories.length ? 'bg-emerald-100 ring-1 ring-emerald-400' : ''
                            }`}
                        >
                            <Plus size={14} className="text-emerald-600" />
                            <span>
                                Add <strong>"{inputValue.trim()}"</strong> as new parent category
                            </span>
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
