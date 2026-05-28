import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Package, ShoppingCart, Users, Settings,
    FolderTree, Award, UserCircle, Tags, Warehouse, Boxes, Truck,
    ShoppingBag, FileText, Receipt, Wallet, Workflow, Factory, ShieldCheck,
    RotateCcw, Wrench, AlertTriangle, FileMinus,
} from 'lucide-react';

const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Products', icon: Package, path: '/products' },
    { label: 'Categories', icon: FolderTree, path: '/categories' },
    { label: 'Brands', icon: Award, path: '/brands' },
    { label: 'Warehouses', icon: Warehouse, path: '/warehouses' },
    { label: 'Stock', icon: Boxes, path: '/stock' },
    { label: 'Customers', icon: UserCircle, path: '/customers' },
    { label: 'Customer Groups', icon: Tags, path: '/customer-groups' },
    { label: 'Sales Orders', icon: ShoppingCart, path: '/sales-orders' },
    { label: 'Users', icon: Users, path: '/users', adminOnly: true },
    { label: 'Roles', icon: ShieldCheck, path: '/roles', adminOnly: true },
    { label: 'Settings', icon: Settings, path: '/settings' },
    { label: 'Suppliers', icon: Truck, path: '/suppliers' },
    { label: 'Purchase Orders', icon: ShoppingBag, path: '/purchase-orders' },
    { label: 'Invoices', icon: FileText, path: '/invoices' },
    { label: 'Bills', icon: Receipt, path: '/bills' },
    { label: 'Payments', icon: Wallet, path: '/payments' },
    { label: 'BOMs (Recipes)', icon: Workflow, path: '/boms' },
    { label: 'Production', icon: Factory, path: '/production-orders' },
    { label: 'Returns (RMA)', icon: RotateCcw, path: '/returns' },
    { label: 'Credit Notes', icon: FileMinus, path: '/credit-notes' },
    { label: 'Supplier Returns', icon: RotateCcw, path: '/supplier-returns' },
    { label: 'Damages', icon: AlertTriangle, path: '/damages' },
    { label: 'Repairs', icon: Wrench, path: '/repairs' },
];

export default function Sidebar({ userRole }) {
    const visibleItems = menuItems.filter(
        (item) => !item.adminOnly || userRole === 'admin'
    );

    return (
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
            <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                        <Package className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-gray-900">Wholesale</h2>
                        <p className="text-xs text-gray-500">System</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {visibleItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${isActive
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-gray-700 hover:bg-gray-100'
                                }`
                            }
                        >
                            <Icon size={18} />
                            <span>{item.label}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-200">
                <p className="text-xs text-gray-500">v1.0.0 · MVP</p>
            </div>
        </aside>
    );
}