import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const rolesApi = {
    list: async () => (await api.get('/roles')).data,
    getByName: async (name) => (await api.get(`/roles/${name}`)).data,
    updatePermissions: async (name, permissions) => (await api.put(`/roles/${name}/permissions`, { permissions })).data,
    resetRole: async (name) => (await api.post(`/roles/${name}/reset`)).data,
    getAllPermissions: async () => (await api.get('/roles/permissions/all')).data,
};

export const useRoles = () => useQuery({
    queryKey: ['roles'],
    queryFn: rolesApi.list,
});

export const useRole = (roleName) => useQuery({
    queryKey: ['role', roleName],
    queryFn: () => rolesApi.getByName(roleName),
    enabled: !!roleName,
});

export const useAllPermissions = () => useQuery({
    queryKey: ['all-permissions'],
    queryFn: rolesApi.getAllPermissions,
    staleTime: 5 * 60 * 1000,
});

export const useUpdateRolePermissions = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ roleName, permissions }) => rolesApi.updatePermissions(roleName, permissions),
        onSuccess: (_, variables) => {
            qc.invalidateQueries({ queryKey: ['roles'] });
            qc.invalidateQueries({ queryKey: ['role', variables.roleName] });
            toast.success(`Permissions updated successfully`);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to update permissions'),
    });
};

export const useResetRolePermissions = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (roleName) => rolesApi.resetRole(roleName),
        onSuccess: (_, roleName) => {
            qc.invalidateQueries({ queryKey: ['roles'] });
            qc.invalidateQueries({ queryKey: ['role', roleName] });
            toast.success(`Role reset to defaults`);
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Failed to reset role'),
    });
};
