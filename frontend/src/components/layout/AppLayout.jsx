import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import Sidebar from './Sidebar';
import Header from './Header';
import { useSocket } from '../../hooks/useSocket';

export default function AppLayout() {
    const { user } = useAuthStore();

    // Mobile drawer state
    const [mobileOpen, setMobileOpen] = useState(false);

    // Desktop collapse state (persisted)
    const [isCollapsed, setIsCollapsed] = useState(() => {
        return localStorage.getItem('sidebar_collapsed') === 'true';
    });

    const handleToggleCollapse = () => {
        setIsCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('sidebar_collapsed', String(next));
            return next;
        });
    };

    const handleToggleSidebar = () => {
        if (window.innerWidth < 1024) {
            setMobileOpen((prev) => !prev);
        } else {
            handleToggleCollapse();
        }
    };

    // Auto-close mobile drawer if window resizes to desktop width
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024) {
                setMobileOpen(false);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Initialize real-time notifications
    useSocket();

    return (
        <div className="h-screen flex bg-slate-50 overflow-hidden">
            <Sidebar
                userRole={user?.role}
                isOpen={mobileOpen}
                onClose={() => setMobileOpen(false)}
                isCollapsed={isCollapsed}
                onToggleCollapse={handleToggleCollapse}
            />
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                <Header onToggleSidebar={handleToggleSidebar} />
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}