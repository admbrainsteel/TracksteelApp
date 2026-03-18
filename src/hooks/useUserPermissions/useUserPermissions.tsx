
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { toast } from 'sonner';
import type { 
  UserPermissions, 
  ResourceKey, 
  ActionType, 
  PermissionLevel,
  FunctionalPermission 
} from './types';

export function useUserPermissions() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [userPermissions, setUserPermissions] = useState<UserPermissions>({
    can_admin: false,
    can_create_update_delete: false,
    can_create_only: false,
    can_view_only: false
  });
  const [resourcePermissions, setResourcePermissions] = useState<Record<string, PermissionLevel>>({});
  const [loading, setLoading] = useState(true);

  // Load user permissions
  const loadUserPermissions = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      console.log(`🔄 Loading permissions for user: ${user.email}`);

      // Load functional permissions from user privilege
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          privilege_id,
          privileges!inner (
            name,
            permissions
          )
        `)
        .eq('id', user.id)
        .single();

      if (profile?.privileges?.permissions) {
        // Safe type conversion with validation
        const permissions = profile.privileges.permissions;
        if (typeof permissions === 'object' && permissions !== null && !Array.isArray(permissions)) {
          const userPerms: UserPermissions = {
            can_admin: Boolean(permissions.can_admin),
            can_create_update_delete: Boolean(permissions.can_create_update_delete),
            can_create_only: Boolean(permissions.can_create_only),
            can_view_only: Boolean(permissions.can_view_only)
          };
          setUserPermissions(userPerms);
          console.log('✅ Functional permissions loaded:', userPerms);
        }
      }

      // Load specific resource permissions
      const { data: resourcePerms } = await supabase
        .from('user_interface_permissions')
        .select('resource_key, permission')
        .eq('user_id', user.id);

      if (resourcePerms) {
        const permsMap = resourcePerms.reduce((acc, perm) => {
          acc[perm.resource_key] = perm.permission as PermissionLevel;
          return acc;
        }, {} as Record<string, PermissionLevel>);
        setResourcePermissions(permsMap);
        console.log('✅ Resource permissions loaded:', permsMap);
      }

    } catch (error) {
      console.error('❌ Error loading permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadUserPermissions();
  }, [loadUserPermissions]);

  // Check if user has access to a resource
  const hasAccess = useCallback((resourceKey?: string): boolean => {
    // Admin always has access
    if (isAdmin) {
      console.log(`✅ Admin access granted for resource: ${resourceKey || 'general'}`);
      return true;
    }

    // If no resource specified, check general functional permissions
    if (!resourceKey) {
      const hasGeneralAccess = Object.values(userPermissions).some(Boolean);
      console.log(`🔍 General access check: ${hasGeneralAccess}`, userPermissions);
      return hasGeneralAccess;
    }

    // Check specific resource permission first
    if (resourcePermissions[resourceKey]) {
      const hasSpecificAccess = resourcePermissions[resourceKey] !== 'no_access';
      console.log(`🎯 Specific resource permission for ${resourceKey}: ${resourcePermissions[resourceKey]} -> ${hasSpecificAccess}`);
      return hasSpecificAccess;
    }

    // For equipamentos specifically, check if user has any functional permissions
    if (resourceKey === 'equipamentos') {
      const hasEquipamentosAccess = userPermissions.can_admin || 
                                   userPermissions.can_create_update_delete || 
                                   userPermissions.can_create_only || 
                                   userPermissions.can_view_only;
      console.log(`🔧 Equipamentos access check: ${hasEquipamentosAccess}`, userPermissions);
      return hasEquipamentosAccess;
    }

    // Fallback to functional permissions
    const hasFunctionalAccess = Object.values(userPermissions).some(Boolean);
    console.log(`🔄 Fallback functional access for ${resourceKey}: ${hasFunctionalAccess}`, userPermissions);
    return hasFunctionalAccess;
  }, [isAdmin, userPermissions, resourcePermissions]);

  // Check if user can access a specific route
  const canAccessRoute = useCallback((route: string): boolean => {
    // Map routes to resource keys
    const routeToResource: Record<string, string> = {
      '/equipamentos': 'equipamentos',
      '/ferramentas/inconsistencias': 'ferramentas-inconsistencias',
      '/admin': 'admin',
      '/user-management': 'user-management',
      '/sistema': 'sistema',
      '/sugestoes': 'sugestoes',
      '/tarefas': 'tarefas'
    };

    const resourceKey = routeToResource[route];
    if (resourceKey) {
      return hasAccess(resourceKey);
    }

    // Default to general access for unmapped routes
    return hasAccess();
  }, [hasAccess]);

  // Get permission level for a specific resource
  const getResourcePermission = useCallback((resourceKey: ResourceKey): PermissionLevel => {
    // Admin always has full permissions
    if (isAdmin) return 'can_admin';

    // Check specific resource permission
    if (resourcePermissions[resourceKey]) {
      return resourcePermissions[resourceKey];
    }

    // Convert functional permissions to resource permission level
    if (userPermissions.can_admin) return 'can_admin';
    if (userPermissions.can_create_update_delete) return 'can_create_update_delete';
    if (userPermissions.can_create_only) return 'can_create_only';
    if (userPermissions.can_view_only) return 'can_view_only';

    return 'no_access';
  }, [isAdmin, userPermissions, resourcePermissions]);

  // Check if user can perform a specific action on a resource
  const canPerformActionByResource = useCallback((
    action: ActionType,
    resourceKey: ResourceKey
  ): boolean => {
    const permission = getResourcePermission(resourceKey);
    
    switch (permission) {
      case 'can_admin':
        return true;
      case 'can_create_update_delete':
        return action !== 'admin';
      case 'can_create_only':
        return action === 'create' || action === 'read';
      case 'can_view_only':
        return action === 'read';
      case 'no_access':
        return false;
      default:
        return false;
    }
  }, [getResourcePermission]);

  // Generic permission check for functional permissions
  const canPerformAction = useCallback((action: ActionType): boolean => {
    if (isAdmin) return true;

    switch (action) {
      case 'admin':
        return userPermissions.can_admin;
      case 'create':
      case 'update':
      case 'delete':
        return userPermissions.can_admin || 
               userPermissions.can_create_update_delete || 
               (action === 'create' && userPermissions.can_create_only);
      case 'read':
        return Object.values(userPermissions).some(Boolean);
      default:
        return false;
    }
  }, [isAdmin, userPermissions]);

  // Set specific resource permission
  const setResourcePermission = useCallback(async (
    resourceKey: ResourceKey, 
    permission: PermissionLevel
  ): Promise<void> => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('user_interface_permissions')
        .upsert({
          user_id: user.id,
          resource_key: resourceKey,
          permission: permission
        });

      if (error) throw error;

      // Update local state
      setResourcePermissions(prev => ({
        ...prev,
        [resourceKey]: permission
      }));

      toast.success('Permissão atualizada com sucesso!');
    } catch (error) {
      console.error('Error setting resource permission:', error);
      toast.error('Erro ao atualizar permissão');
    }
  }, [user?.id]);

  return {
    userPermissions,
    resourcePermissions,
    loading,
    hasAccess,
    canAccessRoute,
    getResourcePermission,
    canPerformAction,
    canPerformActionByResource,
    setResourcePermission,
    refetch: loadUserPermissions
  };
}
