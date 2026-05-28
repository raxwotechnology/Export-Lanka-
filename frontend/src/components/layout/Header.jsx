import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Menu } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../features/auth/authApi';
import NotificationDropdown from '../ui/NotificationDropdown';

export default function Header({ onToggleSidebar }) {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const handleLogout = async () => {
        try {
            await authApi.logout();
        } catch (err) {
            // Even if backend fails, log out locally
        }
        logout();
        toast.success('Logged out successfully');
        navigate('/login');
    };

    const roleLabel = {
        admin: 'Administrator',
        manager: 'Manager',
        accountant: 'Accountant',
        sales_manager: 'Sales Manager',
        sales_rep: 'Sales Rep',
        warehouse_staff: 'Warehouse Staff',
        production_staff: 'Production Staff',
        staff: 'Staff',
    }[user?.role] || 'User';

    return (
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
            <div className="flex items-center gap-3">
                {/* Hamburger toggle */}
                <button
                    onClick={onToggleSidebar}
                    className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition"
                    aria-label="Toggle sidebar"
                >
                    <Menu size={20} />
                </button>
                <h1 className="text-lg font-semibold text-gray-900">
                    Welcome, {user?.firstName}
                </h1>
            </div>

            <div className="flex items-center gap-4">
                <NotificationDropdown />

                <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-50 rounded-lg">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                        <button onClick={() => navigate('/profile')}>
                            <UserIcon className="w-4 h-4 text-primary-600" />
                        </button>
                    </div>
                    <div className="text-sm">
                        <p className="font-medium text-gray-900">{user?.fullName}</p>
                        <p className="text-xs text-gray-500">{roleLabel}</p>
                    </div>
                </div>

                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
                >
                    <LogOut size={16} />
                    <span>Logout</span>
                </button>
            </div>
        </header>
    );
}