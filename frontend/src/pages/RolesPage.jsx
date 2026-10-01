import { useState, useEffect, useMemo } from 'react';
import { 
    ShieldCheck, 
    Users, 
    Search, 
    CheckSquare, 
    Square, 
    RotateCcw, 
    Save, 
    Lock, 
    Sparkles, 
    AlertCircle,
    Layers,
    SlidersHorizontal,
    CheckCircle2
} from 'lucide-react';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useRoles, useAllPermissions, useUpdateRolePermissions, useResetRolePermissions } from '../features/roles/useRoles';

export default function RolesPage() {
    const { data: rolesResponse, isLoading: isRolesLoading } = useRoles();
    const { data: permsResponse, isLoading: isPermsLoading } = useAllPermissions();
    const updateMutation = useUpdateRolePermissions();
    const resetMutation = useResetRolePermissions();

    const roles = rolesResponse?.data || [];
    const allModules = permsResponse?.data?.modules || [];
    const allPermissions = permsResponse?.data?.all || [];

    const [selectedRoleName, setSelectedRoleName] = useState('sales_manager');
    const [selectedPerms, setSelectedPerms] = useState([]);
    const [isWildcard, setIsWildcard] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // Get current active role object
    const activeRole = useMemo(() => {
        return roles.find((r) => r.name === selectedRoleName) || roles[0] || null;
    }, [roles, selectedRoleName]);

    // When active role changes, sync state
    useEffect(() => {
        if (activeRole) {
            const perms = Array.isArray(activeRole.permissions) ? activeRole.permissions : [];
            const wildcard = perms.includes('*');
            setIsWildcard(wildcard);
            setSelectedPerms(wildcard ? allPermissions.map((p) => p.code) : perms);
            setHasUnsavedChanges(false);
        }
    }, [activeRole, allPermissions]);

    // Handle initial selection if not yet set
    useEffect(() => {
        if (roles.length > 0 && !selectedRoleName) {
            setSelectedRoleName(roles[0].name);
        }
    }, [roles, selectedRoleName]);

    // Checkbox toggle handler
    const handleTogglePermission = (code) => {
        if (isWildcard) {
            setIsWildcard(false);
            const allExcept = allPermissions.map(p => p.code).filter(p => p !== code);
            setSelectedPerms(allExcept);
            setHasUnsavedChanges(true);
            return;
        }

        setSelectedPerms((prev) => {
            const next = prev.includes(code)
                ? prev.filter((p) => p !== code)
                : [...prev, code];
            setHasUnsavedChanges(true);
            return next;
        });
    };

    // Module select/deselect all
    const handleToggleModule = (modulePerms, shouldSelect) => {
        const moduleCodes = modulePerms.map((p) => p.code);
        if (isWildcard) {
            setIsWildcard(false);
        }
        setSelectedPerms((prev) => {
            let next;
            if (shouldSelect) {
                next = Array.from(new Set([...prev, ...moduleCodes]));
            } else {
                next = prev.filter((code) => !moduleCodes.includes(code));
            }
            setHasUnsavedChanges(true);
            return next;
        });
    };

    // Global Select All
    const handleSelectAll = () => {
        setSelectedPerms(allPermissions.map((p) => p.code));
        setIsWildcard(false);
        setHasUnsavedChanges(true);
    };

    // Global Deselect All
    const handleDeselectAll = () => {
        setSelectedPerms([]);
        setIsWildcard(false);
        setHasUnsavedChanges(true);
    };

    // Handle Save
    const handleSave = async () => {
        if (!activeRole) return;
        const permsToSave = isWildcard ? ['*'] : selectedPerms;
        await updateMutation.mutateAsync({
            roleName: activeRole.name,
            permissions: permsToSave,
        });
        setHasUnsavedChanges(false);
    };

    // Handle Reset to Defaults
    const handleReset = async () => {
        if (!activeRole) return;
        if (window.confirm(`Are you sure you want to reset '${activeRole.label}' to default system permissions?`)) {
            await resetMutation.mutateAsync(activeRole.name);
            setHasUnsavedChanges(false);
        }
    };

    // Filter permissions by search query
    const filteredModules = useMemo(() => {
        if (!searchQuery.trim()) return allModules;
        const query = searchQuery.toLowerCase().trim();

        return allModules
            .map((mod) => {
                const matched = mod.permissions.filter(
                    (p) =>
                        p.label.toLowerCase().includes(query) ||
                        p.code.toLowerCase().includes(query) ||
                        (p.description && p.description.toLowerCase().includes(query))
                );
                return { ...mod, permissions: matched };
            })
            .filter((mod) => mod.permissions.length > 0);
    }, [allModules, searchQuery]);

    const activeCount = isWildcard ? allPermissions.length : selectedPerms.length;
    const totalCount = allPermissions.length;
    const percentage = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) : 0;

    return (
        <div className="space-y-6 pb-12">
            <PageHeader
                title="Roles & Permission Customization"
                description="Manage global role capabilities and fine-tune access controls across all ERP modules"
            />

            {/* Top Stat Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                        <ShieldCheck size={26} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Roles</p>
                        <h4 className="text-2xl font-bold text-gray-900">{roles.length}</h4>
                    </div>
                </Card>

                <Card className="p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Layers size={26} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">System Modules</p>
                        <h4 className="text-2xl font-bold text-gray-900">{allModules.length}</h4>
                    </div>
                </Card>

                <Card className="p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                        <SlidersHorizontal size={26} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Granular Permissions</p>
                        <h4 className="text-2xl font-bold text-gray-900">{totalCount}</h4>
                    </div>
                </Card>

                <Card className="p-4 bg-white border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <Users size={26} />
                    </div>
                    <div>
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active Users In Role</p>
                        <h4 className="text-2xl font-bold text-gray-900">{activeRole?.userCount || 0}</h4>
                    </div>
                </Card>
            </div>

            {/* Main Interactive Layout: 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* ── Left Column: Role Selector (4 cols) ────────────────────── */}
                <div className="lg:col-span-4 space-y-4">
                    <Card className="p-4 bg-white border border-gray-200 shadow-sm">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                            <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                                <Users size={16} className="text-gray-500" />
                                Available Roles ({roles.length})
                            </h3>
                            <span className="text-[11px] text-gray-400">Click to customize</span>
                        </div>

                        {isRolesLoading ? (
                            <div className="py-8 text-center text-sm text-gray-400">Loading roles...</div>
                        ) : (
                            <div className="space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                                {roles.map((role) => {
                                    const isSelected = activeRole?.name === role.name;
                                    const rolePerms = Array.isArray(role.permissions) ? role.permissions : [];
                                    const isRoleWildcard = rolePerms.includes('*');
                                    const count = isRoleWildcard ? totalCount : rolePerms.length;

                                    return (
                                        <button
                                            key={role.name}
                                            type="button"
                                            onClick={() => setSelectedRoleName(role.name)}
                                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 select-none ${
                                                isSelected
                                                    ? 'bg-primary-50/50 border-primary-500 shadow-sm ring-1 ring-primary-500'
                                                    : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div
                                                className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-white shadow-sm mt-0.5"
                                                style={{ backgroundColor: role.color || '#4b5563' }}
                                            >
                                                <ShieldCheck size={18} />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                                    <h4 className={`text-sm font-semibold truncate ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>
                                                        {role.label}
                                                    </h4>
                                                    <span className="text-[11px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                                                        {role.userCount || 0} user{role.userCount === 1 ? '' : 's'}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-gray-500 line-clamp-1 mb-2">
                                                    {role.description || role.name}
                                                </p>

                                                <div className="flex items-center gap-2 text-[11px]">
                                                    {isRoleWildcard ? (
                                                        <span className="inline-flex items-center gap-1 font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full text-[10px]">
                                                            <Sparkles size={11} /> Full Root Access
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-500 font-medium">
                                                            {count} / {totalCount} permissions
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 space-y-1">
                        <p className="font-semibold flex items-center gap-1.5 text-amber-900">
                            <AlertCircle size={14} /> Note for Administrators
                        </p>
                        <p>
                            Changes saved to a role take effect immediately for all existing and newly assigned users belonging to that role.
                        </p>
                    </div>
                </div>

                {/* ── Right Column: Permission Matrix Customizer (8 cols) ──────── */}
                <div className="lg:col-span-8 space-y-4">
                    {activeRole ? (
                        <Card className="p-5 bg-white border border-gray-200 shadow-sm space-y-5">
                            
                            {/* Role Header Banner */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-gray-50/70"
                                style={{ borderColor: `${activeRole.color}40` }}>
                                <div className="flex items-center gap-3.5">
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow"
                                        style={{ backgroundColor: activeRole.color }}
                                    >
                                        <ShieldCheck size={24} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h2 className="text-lg font-bold text-gray-900">{activeRole.label}</h2>
                                            <span className="font-mono text-xs px-2 py-0.5 rounded bg-white border text-gray-600">
                                                {activeRole.name}
                                            </span>
                                            {isWildcard && (
                                                <Badge variant="info" size="sm">Root Wildcard</Badge>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-600 mt-0.5">{activeRole.description}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleReset}
                                        loading={resetMutation.isPending}
                                        className="text-gray-700 hover:text-gray-900 border-gray-300"
                                    >
                                        <RotateCcw size={14} className="mr-1.5" />
                                        Reset Defaults
                                    </Button>

                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleSave}
                                        loading={updateMutation.isPending}
                                        disabled={!hasUnsavedChanges}
                                        className={hasUnsavedChanges ? 'ring-2 ring-primary-500 ring-offset-1' : ''}
                                    >
                                        <Save size={14} className="mr-1.5" />
                                        Save Permissions
                                    </Button>
                                </div>
                            </div>

                            {/* Unsaved changes alert */}
                            {hasUnsavedChanges && (
                                <div className="flex items-center justify-between bg-primary-50 border border-primary-200 text-primary-900 text-xs px-4 py-2.5 rounded-lg animate-fade-in">
                                    <span className="font-medium flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-primary-600 animate-pulse"></span>
                                        You have unsaved permission changes for this role.
                                    </span>
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleSave}
                                        loading={updateMutation.isPending}
                                        className="h-7 text-xs"
                                    >
                                        Save Now
                                    </Button>
                                </div>
                            )}

                            {/* Wildcard Alert if Super Admin or Root Role */}
                            {isWildcard ? (
                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-start gap-3 text-purple-900 text-xs">
                                    <Sparkles size={20} className="text-purple-600 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-1">
                                        <p className="font-bold">Full Unrestricted Wildcard Access ( * ) Enabled</p>
                                        <p className="text-purple-800">
                                            This role currently has full system access across every current and future feature. 
                                            You can uncheck specific permissions below if you wish to convert it into custom granular permissions.
                                        </p>
                                    </div>
                                </div>
                            ) : null}

                            {/* Controls: Search & Quick Batch Actions */}
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
                                <div className="relative w-full sm:w-72">
                                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search permissions..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:bg-white focus:ring-1 focus:ring-primary-500 focus:border-primary-500 outline-none"
                                    />
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                                    <div className="text-xs text-gray-600 font-medium">
                                        <span className="text-primary-700 font-bold">{activeCount}</span> / {totalCount} Active ({percentage}%)
                                    </div>

                                    <div className="h-4 w-px bg-gray-200 hidden sm:block"></div>

                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            onClick={handleSelectAll}
                                            className="px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded border border-gray-200 transition"
                                        >
                                            Select All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleDeselectAll}
                                            className="px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded border border-gray-200 transition"
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary-600 transition-all duration-300 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>

                            {/* Modules & Granular Checkbox Matrix */}
                            {isPermsLoading ? (
                                <div className="py-12 text-center text-sm text-gray-400">Loading permission definitions...</div>
                            ) : filteredModules.length === 0 ? (
                                <div className="py-12 text-center text-sm text-gray-400">
                                    No permissions match your search query '{searchQuery}'
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredModules.map((moduleGroup) => {
                                        const modulePerms = moduleGroup.permissions;
                                        const grantedInModule = modulePerms.filter((p) =>
                                            isWildcard || selectedPerms.includes(p.code)
                                        ).length;
                                        const isAllModuleSelected = grantedInModule === modulePerms.length;
                                        const isPartiallySelected = grantedInModule > 0 && !isAllModuleSelected;

                                        return (
                                            <div
                                                key={moduleGroup.module}
                                                className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-xs"
                                            >
                                                {/* Module Group Header */}
                                                <div className="bg-gray-50/80 px-4 py-3 flex items-center justify-between border-b border-gray-200">
                                                    <div className="flex items-center gap-2.5">
                                                        <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                                                            {moduleGroup.title}
                                                        </h4>
                                                        <span className="text-[11px] text-gray-500 font-medium">
                                                            ({grantedInModule}/{modulePerms.length} granted)
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleToggleModule(modulePerms, !isAllModuleSelected)}
                                                            className="text-[11px] font-semibold text-primary-700 hover:text-primary-800 flex items-center gap-1 px-2 py-0.5 rounded hover:bg-primary-50 transition"
                                                        >
                                                            {isAllModuleSelected ? 'Uncheck Group' : 'Check All Group'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Permissions Checkbox Grid */}
                                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    {modulePerms.map((perm) => {
                                                        const isChecked = isWildcard || selectedPerms.includes(perm.code);

                                                        return (
                                                            <div
                                                                key={perm.code}
                                                                onClick={() => handleTogglePermission(perm.code)}
                                                                className={`p-2.5 rounded-lg border transition-all cursor-pointer select-none flex items-start gap-2.5 ${
                                                                    isChecked
                                                                        ? 'bg-emerald-50/40 border-emerald-300 text-gray-900 shadow-xs'
                                                                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300'
                                                                }`}
                                                            >
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isChecked}
                                                                    onChange={() => {}} // handled by parent div onClick
                                                                    className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                                                                />

                                                                <div className="flex-1 min-w-0">
                                                                    <div className="flex items-center justify-between gap-1">
                                                                        <span className={`text-xs font-semibold ${isChecked ? 'text-gray-900' : 'text-gray-700'}`}>
                                                                            {perm.label}
                                                                        </span>
                                                                        {isChecked && (
                                                                            <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded">
                                                                                Access Allowed
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    
                                                                    <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5 font-mono">
                                                                        {perm.code}
                                                                    </p>
                                                                    
                                                                    {perm.description && (
                                                                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                                                                            {perm.description}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Bottom Sticky Action Footer */}
                            <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                    Role: <strong>{activeRole.label}</strong> ({activeCount} of {totalCount} permissions enabled)
                                </span>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleReset}
                                        loading={resetMutation.isPending}
                                    >
                                        Reset to Defaults
                                    </Button>

                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={handleSave}
                                        loading={updateMutation.isPending}
                                        disabled={!hasUnsavedChanges}
                                    >
                                        <Save size={14} className="mr-1.5" />
                                        Save Permissions
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    ) : (
                        <div className="p-12 text-center text-gray-400 bg-white rounded-xl border">
                            Select a role on the left to view and customize its permissions.
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}