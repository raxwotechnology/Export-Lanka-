import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Package } from 'lucide-react';

import { authApi } from '../features/auth/authApi';
import { loginSchema } from '../features/auth/authSchemas';
import { useAuthStore } from '../store/authStore';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

export default function LoginPage() {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(loginSchema),
    });

    const fillAdminCredentials = (email = 'admin@example.com', pass = 'Admin123!') => {
        setValue('email', email, { shouldValidate: true });
        setValue('password', pass, { shouldValidate: true });
    };

    const loginMutation = useMutation({
        mutationFn: authApi.login,
        onSuccess: (response) => {
            const { token, ...user } = response.data;
            login(user, token);
            toast.success(`Welcome back, ${user.firstName}!`);
            navigate('/dashboard');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Login failed';
            toast.error(message);
        },
    });

    // Already logged in? Go to dashboard
    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    const onSubmit = (data) => {
        loginMutation.mutate(data);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 to-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo/Brand */}
                <div className="text-center mb-6">
                    <img
                        src="/company_logo.jpg"
                        alt="Authentic Lanka Exports"
                        className="w-16 h-16 object-contain rounded-2xl mx-auto mb-3 border border-slate-200 bg-white p-1 shadow-sm"
                        onError={(e) => {
                            e.target.style.display = 'none';
                        }}
                    />
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Authentic Lanka ERP</h1>
                    <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mt-0.5">Export Management System</p>
                </div>

                <Card className="p-8 shadow-md border border-slate-200/80">
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
                    <p className="text-xs text-gray-500 mb-5">
                        Enter your credentials to access your dashboard
                    </p>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input
                            label="Email"
                            type="email"
                            placeholder="admin@example.com"
                            required
                            error={errors.email?.message}
                            {...register('email')}
                        />

                        <div className="relative">
                            <Input
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter your password"
                                required
                                error={errors.password?.message}
                                {...register('password')}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            loading={loginMutation.isPending}
                        >
                            {loginMutation.isPending ? 'Signing in...' : 'Sign in'}
                        </Button>
                    </form>

                    {/* Quick Admin Credentials Helper */}
                    <div className="mt-5 p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-emerald-950 flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
                                Admin Credentials
                            </span>
                            <button
                                type="button"
                                onClick={() => fillAdminCredentials('admin@example.com', 'Admin123!')}
                                className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-semibold hover:bg-emerald-700 transition"
                            >
                                Auto Fill
                            </button>
                        </div>
                        <div className="text-[11px] text-slate-700 font-mono space-y-0.5">
                            <div>Email: <span className="font-semibold text-slate-900">admin@example.com</span></div>
                            <div>Password: <span className="font-semibold text-slate-900">Admin123!</span></div>
                        </div>
                    </div>

                    <p className="text-xs text-center text-gray-500 mt-6">
                        Forgot your password? Contact your administrator.
                    </p>
                </Card>

                <p className="text-center text-xs text-gray-500 mt-6">
                    © 2026 Export Lanka ERP. All rights reserved.
                </p>
            </div>
        </div>
    );
}