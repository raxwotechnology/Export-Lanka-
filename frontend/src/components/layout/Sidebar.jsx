import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, BarChart3, Package, ShoppingCart, Users, Settings, Navigation,
    FolderTree, Award, UserCircle, Tags, Warehouse, Boxes, Truck,
    ShoppingBag, FileText, Receipt, Wallet, Workflow, Factory, ShieldCheck,
    RotateCcw, Wrench, AlertTriangle, FileMinus, X, Building2, Clock,
    Calendar as CalendarIcon, Plane, Calculator, DollarSign, Upload,
    ClipboardList, UserPlus, Ship, Layers, History, FileSpreadsheet,
    ChevronDown, ChevronRight, ChevronLeft, BadgeCheck,
    PackageCheck, CreditCard, Tag, Mail, Sparkles, Home, Search, Scale,
    Plus, ArrowLeftRight, Sliders, LineChart, PieChart, TrendingUp, UserCheck,
    PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { usePermission } from '../../hooks/usePermission';
import { useSettings } from '../../features/settings/useSettings';

// ── 6 Main Logical Modules + Overview + Admin ─────────────────────────────
const modulesConfig = [
    {
        id: 'overview',
        label: 'Overview',
        shortLabel: 'Overview',
        icon: LayoutDashboard,
        isOverview: true,
        items: [
            { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', permission: 'dashboard.view' },
            { label: 'POS Terminal', icon: Calculator, path: '/pos', permission: 'pos.access' },
            { label: 'My Profile', icon: UserCheck, path: '/profile' },
        ],
    },
    {
        id: 'crm-sales',
        label: '1. CRM & Sales',
        shortLabel: 'Sales',
        icon: ShoppingCart,
        badgeColor: 'bg-blue-100 text-blue-700',
        items: [
            { label: 'Inquiries / Leads', icon: UserPlus, path: '/crm/inquiries', permission: 'customers.view' },
            { label: 'Quotations', icon: FileText, path: '/crm/quotations', permission: 'sales.view' },
            { label: 'Sales Orders', icon: ShoppingCart, path: '/sales-orders', permission: 'sales.view' },
            { label: 'Customers', icon: UserCircle, path: '/customers', permission: 'customers.view' },
            { label: 'Customer Groups', icon: Tags, path: '/customer-groups', permission: 'customers.view' },
            { label: 'Customer Returns (RMA)', icon: RotateCcw, path: '/returns', permission: 'returns.view' },
            { label: 'Credit Notes', icon: FileMinus, path: '/credit-notes', permission: 'credit_notes.view' },
        ],
    },
    {
        id: 'factory-production',
        label: '2. Factory & Production',
        shortLabel: 'Production',
        icon: Factory,
        badgeColor: 'bg-amber-100 text-amber-800',
        items: [
            { label: 'Production Orders', icon: Factory, path: '/production-orders', permission: 'production.view' },
            { label: 'Production Batches', icon: Layers, path: '/manufacturing/batches', permission: 'production.view' },
            { label: 'BOM & Formulas', icon: Workflow, path: '/boms', permission: 'bom.view' },
            { label: 'Inventory Recipes', icon: Scale, path: '/inventory-recipes', permission: 'bom.view' },
            { label: 'Process Templates', icon: ClipboardList, path: '/manufacturing/templates', permission: 'production.view' },
            { label: 'Machine Registry', icon: Wrench, path: '/manufacturing/machines', permission: 'production.view' },
            { label: 'Equipment Maintenance', icon: Sliders, path: '/maintenance/requests', permission: 'admin.settings' },
        ],
    },
    {
        id: 'inventory-supply',
        label: '3. Inventory & Supply Chain',
        shortLabel: 'Inventory',
        icon: Boxes,
        badgeColor: 'bg-emerald-100 text-emerald-800',
        items: [
            { label: 'Stock Overview', icon: Boxes, path: '/stock', permission: 'inventory.view' },
            { label: 'Product Master', icon: Package, path: '/products', permission: 'products.view' },
            { label: 'Goods Receipts (GRN)', icon: PackageCheck, path: '/grns', permission: 'grn.manage' },
            { label: 'Farms & Harvests (GRN)', icon: Home, path: '/farms', permission: 'grn.manage' },
            { label: 'Purchasing & Suppliers', icon: ShoppingBag, path: '/purchase-orders', permission: 'purchasing.view' },
            { label: 'Warehouses', icon: Warehouse, path: '/warehouses', permission: 'inventory.view' },
            { label: 'Damages & Repairs', icon: AlertTriangle, path: '/damages', permission: 'damages.view' },
            { label: 'Raw Materials & Processing', icon: Layers, path: '/inventory/raw-materials', permission: 'inventory.view' },
        ],
    },
    {
        id: 'finance-billing',
        label: '4. Finance & Billing',
        shortLabel: 'Finance',
        icon: DollarSign,
        badgeColor: 'bg-teal-100 text-teal-800',
        items: [
            { label: 'Customer Invoices', icon: FileText, path: '/invoices', permission: 'invoices.view' },
            { label: 'Bills & Vendor Payments', icon: Receipt, path: '/bills', permission: 'bills.view' },
            { label: 'Payments Received', icon: Wallet, path: '/payments', permission: 'payments.view' },
            { label: 'Petty Cash', icon: DollarSign, path: '/finance/petty-cash', permission: 'payments.view' },
            { label: 'Cheque Ledger', icon: FileSpreadsheet, path: '/finance/cheques', permission: 'payments.view' },
            { label: 'Bank Accounts', icon: Building2, path: '/finance/bank-accounts', permission: 'payments.view' },
            { label: 'Fixed Assets (CapEx)', icon: Tag, path: '/finance/fixed-assets', permission: 'payments.view' },
            { label: 'Daily P&L Master', icon: LineChart, path: '/reports/daily-pnl', permission: 'reports.financial' },
        ],
    },
    {
        id: 'hr-logistics',
        label: '5. HR, Fleet & Logistics',
        shortLabel: 'HR & Fleet',
        icon: Users,
        badgeColor: 'bg-purple-100 text-purple-800',
        items: [
            { label: 'Staff & Organization', icon: Users, path: '/employees', permission: 'hr.employees.view', excludeRoles: ['employee'] },
            { label: 'Attendance Tracking', icon: CalendarIcon, path: '/attendance', permission: 'hr.attendance.view', excludeRoles: ['employee'] },
            { label: 'Shifts & Schedules', icon: Clock, path: '/shifts', permission: 'hr.employees.view', excludeRoles: ['employee'] },
            { label: 'Leave & Holidays', icon: Plane, path: '/leaves', permission: 'hr.leaves.view', excludeRoles: ['employee'] },
            { label: 'Payroll & Compensation', icon: DollarSign, path: '/payroll', permission: 'hr.payroll.view', excludeRoles: ['employee'] },
            { label: 'Fleet & Logistics', icon: Truck, path: '/fleet/vehicles', permission: 'inventory.view' },
            { label: 'Gate Pass Management', icon: ShieldCheck, path: '/logistics/gate-passes', permission: 'inventory.view' },
            { label: 'Shipment Tracking', icon: Ship, path: '/logistics/shipments', permission: 'inventory.view' },
        ],
    },
    {
        id: 'reports-analytics',
        label: '6. Reports & Analytics',
        shortLabel: 'Reports',
        icon: BarChart3,
        badgeColor: 'bg-indigo-100 text-indigo-800',
        items: [
            { label: 'Reports Hub', icon: BarChart3, path: '/reports', anyPermission: ['reports.sales', 'reports.financial', 'reports.inventory', 'reports.hr', 'reports.production'] },
            { label: 'AI Forecasting', icon: Sparkles, path: '/reports/predictions', anyPermission: ['reports.sales', 'reports.financial', 'reports.inventory', 'reports.production'] },
        ],
    },
    {
        id: 'system-admin',
        label: 'System Administration',
        shortLabel: 'Admin',
        icon: Settings,
        adminOnly: true,
        badgeColor: 'bg-rose-100 text-rose-800',
        items: [
            { label: 'User Accounts', icon: Users, path: '/users', permission: 'admin.users.view' },
            { label: 'Roles & Permissions', icon: ShieldCheck, path: '/roles', permission: 'admin.roles.view' },
            { label: 'Data Import Tool', icon: Upload, path: '/import', permission: 'admin.settings' },
            { label: 'Audit & SMS Logs', icon: History, path: '/audit-logs', permission: 'view_audit_logs' },
            { label: 'System Settings', icon: Settings, path: '/settings', permission: 'admin.settings' },
        ],
    },
];

// ── Approvals quick hub categories ──────────────────────────────────────────
const approvalCategories = [
    {
        id: 'inbound',
        label: 'Inbound Materials',
        description: 'GRN Quality & Quantity',
        items: [
            { label: 'Purchase Orders', icon: ShoppingBag, path: '/purchase-orders', permission: 'purchasing.view' },
            { label: 'Goods Receipts (GRN)', icon: PackageCheck, path: '/grns', permission: 'grn.manage' },
            { label: 'Supplier Returns', icon: RotateCcw, path: '/supplier-returns', permission: 'supplier_returns.view' },
        ],
    },
    {
        id: 'production',
        label: 'Production Batches',
        description: 'QC & Lab Release',
        items: [
            { label: 'Production Orders', icon: Factory, path: '/production-orders', permission: 'production.view' },
            { label: 'Production Batches', icon: Layers, path: '/manufacturing/batches', permission: 'production.view' },
            { label: 'BOMs (Formulas)', icon: Workflow, path: '/boms', permission: 'bom.view' },
        ],
    },
    {
        id: 'expenses',
        label: 'Expense & Petty Cash',
        description: 'Operational Cash Releases',
        items: [
            { label: 'Petty Cash', icon: DollarSign, path: '/finance/petty-cash', permission: 'payments.view' },
            { label: 'Bills', icon: Receipt, path: '/bills', permission: 'bills.view' },
            { label: 'Payments', icon: Wallet, path: '/payments', permission: 'payments.view' },
        ],
    },
    {
        id: 'sales',
        label: 'Sales & Pricing',
        description: 'Discount Override Approvals',
        items: [
            { label: 'Sales Orders', icon: ShoppingCart, path: '/sales-orders', permission: 'sales.view' },
            { label: 'Quotations', icon: FileText, path: '/crm/quotations', permission: 'sales.view' },
            { label: 'Invoices', icon: FileText, path: '/invoices', permission: 'invoices.view' },
            { label: 'Credit Notes', icon: CreditCard, path: '/credit-notes', permission: 'credit_notes.view' },
        ],
    },
    {
        id: 'returns',
        label: 'Returns & After-Sales',
        description: 'RMA & Damage Review',
        items: [
            { label: 'Customer Returns (RMA)', icon: RotateCcw, path: '/returns', permission: 'returns.view' },
            { label: 'Repairs', icon: Wrench, path: '/repairs', permission: 'repairs.view' },
            { label: 'Damages', icon: AlertTriangle, path: '/damages', permission: 'damages.view' },
        ],
    },
];

// ── Check if a specific item or its consolidated sub-routes are active ───────
function isItemActive(item, pathname) {
    if (pathname === item.path) return true;
    if (item.path !== '/' && item.path !== '/dashboard' && pathname.startsWith(item.path + '/')) {
        return true;
    }
    // Consolidated Products Hub
    if (item.path === '/products' && (pathname === '/categories' || pathname === '/brands')) {
        return true;
    }
    // Consolidated Staff & Org Hub
    if (item.path === '/employees' && (pathname === '/departments' || pathname === '/designations' || pathname === '/employees/month')) {
        return true;
    }
    // Consolidated Leave & Holidays Hub
    if (item.path === '/leaves' && (pathname === '/leave-structures' || pathname === '/holidays')) {
        return true;
    }
    // Consolidated Payroll Hub
    if (item.path === '/payroll' && (pathname === '/salary-structures' || pathname.startsWith('/payroll/'))) {
        return true;
    }
    // Consolidated Fleet Hub
    if (item.path === '/fleet/vehicles' && pathname === '/fleet/trips') {
        return true;
    }
    // Consolidated Logistics Gate Pass Hub
    if (item.path === '/logistics/gate-passes' && pathname === '/gate-screen') {
        return true;
    }
    // Consolidated Farms Hub
    if (item.path === '/farms' && pathname === '/farms/harvests') {
        return true;
    }
    // Consolidated Purchasing & Suppliers Hub
    if (item.path === '/purchase-orders' && (pathname === '/suppliers' || pathname === '/supplier-returns' || pathname.startsWith('/purchase-orders/') || pathname.startsWith('/supplier-returns/'))) {
        return true;
    }
    // Consolidated Damages & Repairs Hub
    if (item.path === '/damages' && (pathname === '/repairs' || pathname.startsWith('/repairs/'))) {
        return true;
    }
    // Consolidated Raw Materials & Processing Hub
    if (item.path === '/inventory/raw-materials' && pathname === '/inventory/converter') {
        return true;
    }
    // Consolidated Audit & SMS Logs Hub
    if (item.path === '/audit-logs' && (pathname === '/audit-logs' || pathname === '/audit-logs/sms' || pathname.startsWith('/audit-logs/'))) {
        return true;
    }
    return false;
}

// ── Theme definitions for the 6 core modules + overview / system admin ────────
const moduleThemeConfig = {
    'crm-sales': {
        headerActive: 'bg-amber-500 text-amber-950 border-amber-600 shadow-sm font-bold',
        headerInactive: 'bg-amber-50/90 text-amber-950 border-amber-200/90 hover:bg-amber-100 font-semibold',
        headerIconActive: 'bg-amber-600 text-amber-950',
        headerIconInactive: 'bg-amber-200/90 text-amber-900 group-hover:bg-amber-300',
        chevronActive: 'text-amber-950',
        chevronInactive: 'text-amber-700',
        borderLine: 'border-amber-300/80',
        subBtnActive: 'bg-amber-400 text-amber-950 font-bold border border-amber-500 shadow-xs ring-1 ring-amber-500/40',
        subBtnInactive: 'bg-amber-50/90 text-amber-900 font-medium border border-amber-200/80 hover:bg-amber-100/90 hover:border-amber-300 hover:text-amber-950 shadow-2xs',
        subIconActive: 'text-amber-950',
        subIconInactive: 'text-amber-700',
        railActive: 'bg-amber-500 text-amber-950 border-amber-600 ring-amber-400',
        railDot: 'bg-amber-500 ring-amber-600',
    },
    'factory-production': {
        headerActive: 'bg-red-600 text-white border-red-700 shadow-sm font-bold',
        headerInactive: 'bg-red-50/90 text-red-950 border-red-200/90 hover:bg-red-100 font-semibold',
        headerIconActive: 'bg-red-700 text-white',
        headerIconInactive: 'bg-red-200/90 text-red-900 group-hover:bg-red-300',
        chevronActive: 'text-white',
        chevronInactive: 'text-red-700',
        borderLine: 'border-red-300/80',
        subBtnActive: 'bg-red-600 text-white font-bold border border-red-700 shadow-xs ring-1 ring-red-400/40',
        subBtnInactive: 'bg-red-50/90 text-red-900 font-medium border border-red-200/80 hover:bg-red-100 hover:border-red-300 hover:text-red-950 shadow-2xs',
        subIconActive: 'text-white',
        subIconInactive: 'text-red-700',
        railActive: 'bg-red-600 text-white border-red-700 ring-red-400',
        railDot: 'bg-red-600 ring-red-700',
    },
    'inventory-supply': {
        headerActive: 'bg-emerald-600 text-white border-emerald-700 shadow-sm font-bold',
        headerInactive: 'bg-emerald-50/90 text-emerald-950 border-emerald-200/90 hover:bg-emerald-100 font-semibold',
        headerIconActive: 'bg-emerald-700 text-white',
        headerIconInactive: 'bg-emerald-200/90 text-emerald-900 group-hover:bg-emerald-300',
        chevronActive: 'text-white',
        chevronInactive: 'text-emerald-700',
        borderLine: 'border-emerald-300/80',
        subBtnActive: 'bg-emerald-600 text-white font-bold border border-emerald-700 shadow-xs ring-1 ring-emerald-400/40',
        subBtnInactive: 'bg-emerald-50/90 text-emerald-900 font-medium border border-emerald-200/80 hover:bg-emerald-100/90 hover:border-emerald-300 hover:text-emerald-950 shadow-2xs',
        subIconActive: 'text-white',
        subIconInactive: 'text-emerald-700',
        railActive: 'bg-emerald-600 text-white border-emerald-700 ring-emerald-400',
        railDot: 'bg-emerald-600 ring-emerald-700',
    },
    'finance-billing': {
        headerActive: 'bg-sky-600 text-white border-sky-700 shadow-sm font-bold',
        headerInactive: 'bg-sky-50/90 text-sky-950 border-sky-200/90 hover:bg-sky-100 font-semibold',
        headerIconActive: 'bg-sky-700 text-white',
        headerIconInactive: 'bg-sky-200/90 text-sky-900 group-hover:bg-sky-300',
        chevronActive: 'text-white',
        chevronInactive: 'text-sky-700',
        borderLine: 'border-sky-300/80',
        subBtnActive: 'bg-sky-600 text-white font-bold border border-sky-700 shadow-xs ring-1 ring-sky-400/40',
        subBtnInactive: 'bg-sky-50/90 text-sky-900 font-medium border border-sky-200/80 hover:bg-sky-100/90 hover:border-sky-300 hover:text-sky-950 shadow-2xs',
        subIconActive: 'text-white',
        subIconInactive: 'text-sky-700',
        railActive: 'bg-sky-600 text-white border-sky-700 ring-sky-400',
        railDot: 'bg-sky-600 ring-sky-700',
    },
    'hr-logistics': {
        headerActive: 'bg-purple-600 text-white border-purple-700 shadow-sm font-bold',
        headerInactive: 'bg-purple-50/90 text-purple-950 border-purple-200/90 hover:bg-purple-100 font-semibold',
        headerIconActive: 'bg-purple-700 text-white',
        headerIconInactive: 'bg-purple-200/90 text-purple-900 group-hover:bg-purple-300',
        chevronActive: 'text-white',
        chevronInactive: 'text-purple-700',
        borderLine: 'border-purple-300/80',
        subBtnActive: 'bg-purple-600 text-white font-bold border border-purple-700 shadow-xs ring-1 ring-purple-400/40',
        subBtnInactive: 'bg-purple-50/90 text-purple-900 font-medium border border-purple-200/80 hover:bg-purple-100/90 hover:border-purple-300 hover:text-purple-950 shadow-2xs',
        subIconActive: 'text-white',
        subIconInactive: 'text-purple-700',
        railActive: 'bg-purple-600 text-white border-purple-700 ring-purple-400',
        railDot: 'bg-purple-600 ring-purple-700',
    },
    'reports-analytics': {
        headerActive: 'bg-fuchsia-600 text-white border-fuchsia-700 shadow-sm font-bold',
        headerInactive: 'bg-fuchsia-50/90 text-fuchsia-950 border-fuchsia-200/90 hover:bg-fuchsia-100 font-semibold',
        headerIconActive: 'bg-fuchsia-700 text-white',
        headerIconInactive: 'bg-fuchsia-200/90 text-fuchsia-900 group-hover:bg-fuchsia-300',
        chevronActive: 'text-white',
        chevronInactive: 'text-fuchsia-700',
        borderLine: 'border-fuchsia-300/80',
        subBtnActive: 'bg-fuchsia-600 text-white font-bold border border-fuchsia-700 shadow-xs ring-1 ring-fuchsia-400/40',
        subBtnInactive: 'bg-fuchsia-50/90 text-fuchsia-900 font-medium border border-fuchsia-200/80 hover:bg-fuchsia-100 hover:border-fuchsia-300 hover:text-fuchsia-950 shadow-2xs',
        subIconActive: 'text-white',
        subIconInactive: 'text-fuchsia-700',
        railActive: 'bg-fuchsia-600 text-white border-fuchsia-700 ring-fuchsia-400',
        railDot: 'bg-fuchsia-600 ring-fuchsia-700',
    },
    'overview': {
        headerActive: 'bg-slate-700 text-white border-slate-800 shadow-sm font-bold',
        headerInactive: 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100 font-semibold',
        headerIconActive: 'bg-slate-800 text-white',
        headerIconInactive: 'bg-slate-200 text-slate-700',
        chevronActive: 'text-white',
        chevronInactive: 'text-slate-500',
        borderLine: 'border-slate-200',
        subBtnActive: 'bg-slate-700 text-white font-bold border border-slate-800 shadow-xs',
        subBtnInactive: 'bg-slate-50 text-slate-700 font-medium border border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-2xs',
        subIconActive: 'text-white',
        subIconInactive: 'text-slate-500',
        railActive: 'bg-slate-700 text-white border-slate-800 ring-slate-400',
        railDot: 'bg-slate-700 ring-slate-800',
    },
    'system-admin': {
        headerActive: 'bg-zinc-800 text-white border-zinc-900 shadow-sm font-bold',
        headerInactive: 'bg-zinc-100 text-zinc-900 border-zinc-300 hover:bg-zinc-200 font-semibold',
        headerIconActive: 'bg-zinc-900 text-white',
        headerIconInactive: 'bg-zinc-200 text-zinc-800',
        chevronActive: 'text-white',
        chevronInactive: 'text-zinc-600',
        borderLine: 'border-zinc-300',
        subBtnActive: 'bg-zinc-800 text-white font-bold border border-zinc-900 shadow-xs',
        subBtnInactive: 'bg-zinc-50 text-zinc-800 font-medium border border-zinc-200 hover:bg-zinc-100 shadow-2xs',
        subIconActive: 'text-white',
        subIconInactive: 'text-zinc-600',
        railActive: 'bg-zinc-800 text-white border-zinc-900 ring-zinc-500',
        railDot: 'bg-zinc-800 ring-zinc-900',
    },
};

// ── Check if any item in group is currently active ───────────────────────────
function isGroupActive(items, pathname) {
    return items.some((item) => isItemActive(item, pathname));
}

// ── Accordion Module Component ───────────────────────────────────────────────
function ModuleAccordion({ module, isExpanded, onToggle, searchQuery, pathname, onItemClick }) {
    const hasActiveChild = isGroupActive(module.items, pathname);
    const shouldShowContent = searchQuery ? true : isExpanded;
    const theme = moduleThemeConfig[module.id] || moduleThemeConfig['overview'];
    const isHeaderHighlighted = shouldShowContent || hasActiveChild;

    return (
        <div className="mb-1.5 rounded-xl transition-all duration-150">
            {/* Module Accordion Header */}
            <button
                type="button"
                onClick={onToggle}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all duration-200 group select-none border ${
                    isHeaderHighlighted
                        ? theme.headerActive
                        : theme.headerInactive
                }`}
            >
                <div className="flex items-center gap-2.5 min-w-0 pr-1">
                    <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors shadow-2xs ${
                            isHeaderHighlighted
                                ? theme.headerIconActive
                                : theme.headerIconInactive
                        }`}
                    >
                        <module.icon size={15} />
                    </div>
                    <span className="text-[13px] tracking-tight truncate leading-tight">
                        {module.label}
                    </span>
                </div>

                <ChevronDown
                    size={14}
                    className={`flex-shrink-0 transition-transform duration-200 ${
                        shouldShowContent ? `rotate-180 ${theme.chevronActive}` : theme.chevronInactive
                    }`}
                />
            </button>

            {/* Sub-Items Collapsible Container */}
            <div
                style={{
                    maxHeight: shouldShowContent ? `${module.items.length * 48 + 15}px` : '0px',
                    opacity: shouldShowContent ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
                }}
            >
                <div className={`ml-3.5 pl-2.5 border-l-2 ${theme.borderLine} my-1.5 space-y-1`}>
                    {module.items.map((item) => {
                        const ItemIcon = item.icon;
                        const isCurrentActive = isItemActive(item, pathname);

                        return (
                            <NavLink
                                key={`${item.label}-${item.path}`}
                                to={item.path}
                                onClick={onItemClick}
                                className={
                                    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-all duration-150 relative ${
                                        isCurrentActive
                                            ? theme.subBtnActive
                                            : theme.subBtnInactive
                                    }`
                                }
                            >
                                <ItemIcon
                                    size={14}
                                    className={`flex-shrink-0 ${isCurrentActive ? theme.subIconActive : theme.subIconInactive}`}
                                />
                                <span className="truncate">{item.label}</span>
                            </NavLink>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Hover Flyout / Popover Item for Collapsed Rail Mode ───────────────────────
function CollapsedRailItem({ module, pathname, onItemClick }) {
    const [isHovered, setIsHovered] = useState(false);
    const hasActiveChild = isGroupActive(module.items, pathname);
    const theme = moduleThemeConfig[module.id] || moduleThemeConfig['overview'];
    const timeoutRef = useRef(null);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 150);
    };

    return (
        <div
            className="relative flex justify-center my-1"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <button
                type="button"
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 relative group border ${
                    hasActiveChild
                        ? `${theme.railActive} shadow-sm font-bold`
                        : `${theme.headerInactive}`
                }`}
                aria-label={module.label}
            >
                <module.icon size={19} />
                {hasActiveChild && (
                    <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 ${theme.railDot} rounded-full border-2 border-white ring-1`} />
                )}
            </button>

            {/* Hover Flyout Menu */}
            {isHovered && (
                <div className="absolute left-14 top-0 z-50 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2.5 px-2 animate-in fade-in slide-in-from-left-2 duration-150">
                    <div className="px-3 pb-2 mb-1.5 border-b border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 tracking-tight">
                            {module.label}
                        </span>
                    </div>

                    <div className="space-y-1 max-h-[340px] overflow-y-auto no-scrollbar">
                        {module.items.map((item) => {
                            const ItemIcon = item.icon;
                            const isCurrentActive = isItemActive(item, pathname);

                            return (
                                <NavLink
                                    key={`flyout-${item.label}-${item.path}`}
                                    to={item.path}
                                    onClick={() => {
                                        setIsHovered(false);
                                        onItemClick?.();
                                    }}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${
                                        isCurrentActive
                                            ? theme.subBtnActive
                                            : theme.subBtnInactive
                                    }`}
                                >
                                    <ItemIcon size={14} className={isCurrentActive ? theme.subIconActive : theme.subIconInactive} />
                                    <span className="truncate">{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Main Sidebar Export ───────────────────────────────────────────────────────
export default function Sidebar({ isOpen, onClose, isCollapsed, onToggleCollapse }) {
    const sidebarRef = useRef(null);
    const location = useLocation();
    const pathname = location.pathname;

    const { hasPermission, hasAnyPermission, isAdmin, user } = usePermission();
    const { data: settingsData } = useSettings();
    const settings = settingsData?.data;

    const [searchQuery, setSearchQuery] = useState('');

    // Accordion open modules state (set of module IDs)
    const [openModules, setOpenModules] = useState(() => {
        // Find which module contains the current active route and open it by default
        const activeModule = modulesConfig.find((mod) => isGroupActive(mod.items, pathname));
        return activeModule ? { [activeModule.id]: true } : { 'crm-sales': true, overview: true };
    });

    // Auto-open active module on route changes
    useEffect(() => {
        const activeModule = modulesConfig.find((mod) => isGroupActive(mod.items, pathname));
        if (activeModule) {
            setOpenModules((prev) => ({ ...prev, [activeModule.id]: true }));
        }
    }, [pathname]);

    const toggleModule = (moduleId) => {
        setOpenModules((prev) => ({
            ...prev,
            [moduleId]: !prev[moduleId],
        }));
    };

    // Date Filter State
    const [dateFilterEnabled, setDateFilterEnabled] = useState(() => {
        return localStorage.getItem('dateFilterEnabled') === 'true';
    });
    const [filterMonth, setFilterMonth] = useState(() => {
        return localStorage.getItem('filterMonth') || String(new Date().getMonth() + 1);
    });
    const [filterYear, setFilterYear] = useState(() => {
        return localStorage.getItem('filterYear') || String(new Date().getFullYear());
    });

    const handleDateFilterToggle = (e) => {
        const enabled = e.target.checked;
        setDateFilterEnabled(enabled);
        localStorage.setItem('dateFilterEnabled', String(enabled));

        if (enabled) {
            if (!localStorage.getItem('filterMonth')) localStorage.setItem('filterMonth', filterMonth);
            if (!localStorage.getItem('filterYear')) localStorage.setItem('filterYear', filterYear);
        }
        window.location.reload();
    };

    const handleMonthChange = (e) => {
        const m = e.target.value;
        setFilterMonth(m);
        localStorage.setItem('filterMonth', m);
        window.location.reload();
    };

    const handleYearChange = (e) => {
        const y = e.target.value;
        setFilterYear(y);
        localStorage.setItem('filterYear', y);
        window.location.reload();
    };

    // Filter modules and items by permissions & search query
    const filteredModules = modulesConfig
        .map((mod) => {
            if (mod.adminOnly && !isAdmin) return null;
            if (user?.role === 'employee' && !mod.isOverview) return null;

            const visibleItems = mod.items.filter((item) => {
                if (item.excludeRoles && item.excludeRoles.includes(user?.role)) {
                    return false;
                }

                const isPermitted =
                    isAdmin ||
                    (!item.permission && !item.anyPermission) ||
                    (item.permission && hasPermission(item.permission)) ||
                    (item.anyPermission && hasAnyPermission(item.anyPermission));

                if (!isPermitted) return false;

                if (!searchQuery) return true;
                const query = searchQuery.toLowerCase().trim();
                return (
                    item.label.toLowerCase().includes(query) ||
                    mod.label.toLowerCase().includes(query)
                );
            });

            if (visibleItems.length === 0) return null;

            return {
                ...mod,
                items: visibleItems,
            };
        })
        .filter(Boolean);

    // Filter Approvals categories
    const visibleApprovals = approvalCategories
        .map((cat) => {
            const items = cat.items.filter((item) => {
                const isPermitted =
                    isAdmin ||
                    (!item.permission && !item.anyPermission) ||
                    (item.permission && hasPermission(item.permission));
                if (!isPermitted) return false;
                if (!searchQuery) return true;
                return (
                    item.label.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
                    cat.label.toLowerCase().includes(searchQuery.toLowerCase().trim())
                );
            });
            if (items.length === 0) return null;
            return { ...cat, items };
        })
        .filter(Boolean);

    const [approvalsOpen, setApprovalsOpen] = useState(false);

    // Close on outside click in mobile view
    useEffect(() => {
        if (!isOpen) return;
        const handleOutsideClick = (e) => {
            if (window.innerWidth < 1024 && sidebarRef.current && !sidebarRef.current.contains(e.target)) {
                onClose();
            }
        };
        const timerId = setTimeout(() => {
            document.addEventListener('mousedown', handleOutsideClick);
        }, 100);
        return () => {
            clearTimeout(timerId);
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, [isOpen, onClose]);

    const companyLogo = settings?.companyLogo || '/company_logo.jpg';
    const companyTitle = settings?.companyName || 'Authentic Lanka ERP';

    return (
        <>
            {/* ── Mobile Backdrop Overlay ── */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
                    onClick={onClose}
                />
            )}

            {/* ── Main Sidebar Element ── */}
            <aside
                ref={sidebarRef}
                className={`h-screen bg-white border-r border-slate-200/90 flex flex-col z-50 fixed lg:static top-0 left-0 transition-all duration-200 ease-in-out select-none ${
                    // Mobile visibility
                    isOpen ? 'translate-x-0 w-72 shadow-2xl' : '-translate-x-full lg:translate-x-0'
                } ${
                    // Desktop collapsed width
                    isCollapsed ? 'lg:w-[72px] lg:min-w-[72px]' : 'lg:w-[268px] lg:min-w-[268px]'
                }`}
            >
                {/* ── Header Branding ── */}
                <div
                    className={`h-16 border-b border-slate-200/90 flex items-center flex-shrink-0 transition-all px-4 ${
                        isCollapsed ? 'justify-center lg:px-2' : 'justify-between'
                    }`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <img
                            src={companyLogo}
                            alt="Logo"
                            className="w-9 h-9 object-contain rounded-xl border border-slate-100 p-0.5 flex-shrink-0 shadow-xs"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                        {(!isCollapsed || isOpen) && (
                            <div className="min-w-0 leading-tight">
                                <h1 className="font-bold text-slate-900 text-sm tracking-tight truncate max-w-[155px]">
                                    {companyTitle}
                                </h1>
                                <p className="text-[10px] font-semibold text-emerald-700 tracking-wider uppercase truncate">
                                    Export Management
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Mobile Close Button */}
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
                        aria-label="Close menu"
                    >
                        <X size={18} />
                    </button>

                    {/* Desktop Collapse Toggle in Header */}
                    {!isCollapsed && (
                        <button
                            onClick={onToggleCollapse}
                            className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                            title="Collapse Sidebar"
                            aria-label="Collapse sidebar"
                        >
                            <PanelLeftClose size={17} />
                        </button>
                    )}
                </div>

                {/* ── Search Bar & Filter Controls (When Expanded) ── */}
                {(!isCollapsed || isOpen) && (
                    <div className="p-3 border-b border-slate-100 flex-shrink-0 space-y-2">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search menu..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-8 pr-7 py-1.5 bg-slate-50 border border-slate-200/90 rounded-lg text-xs outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 font-medium text-slate-800 placeholder-slate-400 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                                >
                                    <X size={13} />
                                </button>
                            )}
                        </div>

                        {/* Date Filter Quick Toggle */}
                        <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50/80 rounded-lg border border-slate-200/60 text-[11px]">
                            <span className="font-semibold text-slate-600">Date Filter</span>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={dateFilterEnabled}
                                    onChange={handleDateFilterToggle}
                                    className="sr-only peer"
                                />
                                <div className="w-6 h-3.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[1px] after:left-[1px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>

                        {dateFilterEnabled && (
                            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                                <select
                                    value={filterMonth}
                                    onChange={handleMonthChange}
                                    className="px-1.5 py-1 border border-slate-200 rounded text-[11px] font-medium text-slate-700 bg-white focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer"
                                >
                                    <option value="1">Jan</option>
                                    <option value="2">Feb</option>
                                    <option value="3">Mar</option>
                                    <option value="4">Apr</option>
                                    <option value="5">May</option>
                                    <option value="6">Jun</option>
                                    <option value="7">Jul</option>
                                    <option value="8">Aug</option>
                                    <option value="9">Sep</option>
                                    <option value="10">Oct</option>
                                    <option value="11">Nov</option>
                                    <option value="12">Dec</option>
                                </select>
                                <select
                                    value={filterYear}
                                    onChange={handleYearChange}
                                    className="px-1.5 py-1 border border-slate-200 rounded text-[11px] font-medium text-slate-700 bg-white focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer"
                                >
                                    <option value="2024">2024</option>
                                    <option value="2025">2025</option>
                                    <option value="2026">2026</option>
                                    <option value="2027">2027</option>
                                </select>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Scrollable Navigation Container ── */}
                <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 no-scrollbar">
                    {/* Collapsed Rail View (Desktop Only) */}
                    {isCollapsed && !isOpen ? (
                        <div className="space-y-1">
                            {filteredModules.map((mod) => (
                                <CollapsedRailItem
                                    key={`rail-${mod.id}`}
                                    module={mod}
                                    pathname={pathname}
                                    onItemClick={() => {}}
                                />
                            ))}
                        </div>
                    ) : (
                        /* Expanded Accordion Modules */
                        <>
                            {filteredModules.map((mod) => (
                                <ModuleAccordion
                                    key={mod.id}
                                    module={mod}
                                    isExpanded={Boolean(openModules[mod.id])}
                                    onToggle={() => toggleModule(mod.id)}
                                    searchQuery={searchQuery}
                                    pathname={pathname}
                                    onItemClick={() => {
                                        if (window.innerWidth < 1024) onClose();
                                    }}
                                />
                            ))}

                            {/* ── Approvals Hub Section ── */}
                            {user?.role !== 'employee' && visibleApprovals.length > 0 && (
                                <div className="pt-2 mt-2 border-t border-slate-200/80">
                                    <button
                                        type="button"
                                        onClick={() => setApprovalsOpen((prev) => !prev)}
                                        className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-slate-700 hover:bg-slate-100/80 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-md bg-amber-100 text-amber-700 flex items-center justify-center">
                                                <BadgeCheck size={14} />
                                            </div>
                                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                                Approvals Hub
                                            </span>
                                        </div>
                                        <ChevronDown
                                            size={14}
                                            className={`text-slate-400 transition-transform duration-200 ${
                                                approvalsOpen || searchQuery ? 'rotate-180 text-amber-600' : ''
                                            }`}
                                        />
                                    </button>

                                    {(approvalsOpen || searchQuery) && (
                                        <div className="ml-3 pl-3 border-l-2 border-amber-200/80 mt-1.5 space-y-1">
                                            {visibleApprovals.map((cat) => (
                                                <div key={cat.id} className="py-1">
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                                        {cat.label}
                                                    </p>
                                                    <div className="space-y-0.5">
                                                        {cat.items.map((item) => {
                                                            const ItemIcon = item.icon;
                                                            const isCurrentActive =
                                                                pathname === item.path ||
                                                                (item.path !== '/' &&
                                                                    item.path !== '/dashboard' &&
                                                                    pathname.startsWith(item.path + '/'));

                                                            return (
                                                                <NavLink
                                                                    key={`appr-${item.label}-${item.path}`}
                                                                    to={item.path}
                                                                    onClick={() => {
                                                                        if (window.innerWidth < 1024) onClose();
                                                                    }}
                                                                    className={`flex items-center gap-2 px-2.5 py-1 rounded-md text-xs transition-colors ${
                                                                        isCurrentActive
                                                                            ? 'bg-amber-100 text-amber-900 font-semibold'
                                                                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                                                                    }`}
                                                                >
                                                                    <ItemIcon size={13} className="text-amber-600 flex-shrink-0" />
                                                                    <span className="truncate">{item.label}</span>
                                                                </NavLink>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </nav>

                {/* ── Footer / Collapse Action ── */}
                <div className="p-3 border-t border-slate-200/80 flex items-center justify-between flex-shrink-0 bg-slate-50/50">
                    {isCollapsed && !isOpen ? (
                        <button
                            onClick={onToggleCollapse}
                            className="w-full flex items-center justify-center p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                            title="Expand Sidebar"
                            aria-label="Expand sidebar"
                        >
                            <PanelLeftOpen size={18} />
                        </button>
                    ) : (
                        <>
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
                                <span className="text-[11px] font-semibold text-slate-500 truncate">
                                    Authentic ERP v2.4
                                </span>
                            </div>
                            <button
                                onClick={onToggleCollapse}
                                className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
                                title="Collapse Sidebar"
                                aria-label="Collapse sidebar"
                            >
                                <ChevronLeft size={16} />
                            </button>
                        </>
                    )}
                </div>
            </aside>
        </>
    );
}