
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useUserRole } from '@/hooks/useUserRole';
import type { ResourceKey, PermissionLevel } from '@/hooks/useUserPermissions/types';

export function usePermissions() {
  const { isAdmin } = useUserRole();
  const { hasAccess, userPermissions, getResourcePermission, canPerformActionByResource } = useUserPermissions();

  const checkResourceAccess = (resourceKey?: string): boolean => {
    if (import.meta.env.DEV) {
      console.log('🔍 checkResourceAccess called:', { resourceKey, isAdmin, result: hasAccess(resourceKey) });
    }
    return hasAccess(resourceKey);
  };

  const getPermissionForResource = (resourceKey: string, permissions: Record<string, boolean>): PermissionLevel | null => {
    // Admin sempre tem permissão total
    if (isAdmin) return 'can_admin';
    
    // Use resource-specific permission if available
    const resourcePermission = getResourcePermission(resourceKey as ResourceKey);
    if (resourcePermission && resourcePermission !== 'no_access') {
      return resourcePermission;
    }
    
    // Se não tem acesso básico, retorna null
    if (!hasAccess()) return null;

    // Verifica as permissões funcionais do usuário como fallback
    if (permissions.can_admin) return 'can_admin';
    if (permissions.can_create_update_delete) return 'can_create_update_delete';
    if (permissions.can_create_only) return 'can_create_only';
    if (permissions.can_view_only) return 'can_view_only';

    // Por padrão, apenas visualização
    return 'can_view_only';
  };

  const canPerformAction = (
    action: 'create' | 'read' | 'update' | 'delete' | 'admin',
    resourceKey: string,
    permissions: Record<string, boolean>
  ): boolean => {
    // Try resource-specific permission first
    if (canPerformActionByResource(action, resourceKey as ResourceKey)) {
      return true;
    }
    
    // Fallback to functional permissions
    const permission = getPermissionForResource(resourceKey, permissions);
    
    if (!permission) return false;

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
  };

  return {
    checkResourceAccess,
    getPermissionForResource,
    canPerformAction,
    userPermissions
  };
}
