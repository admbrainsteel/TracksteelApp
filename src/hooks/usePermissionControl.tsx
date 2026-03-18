
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useUserRole } from '@/hooks/useUserRole';

export function usePermissionControl() {
  const { isAdmin } = useUserRole();
  const { userPermissions, canPerformAction } = useUserPermissions();

  // Verifica se pode visualizar (todos com qualquer permissão podem visualizar)
  const canView = (): boolean => {
    if (isAdmin) return true;
    return Object.values(userPermissions).some(Boolean);
  };

  // Verifica se pode criar - visualizadores não podem
  const canCreate = (): boolean => {
    if (isAdmin) return true;
    if (userPermissions.can_view_only && !userPermissions.can_create_only && !userPermissions.can_create_update_delete) return false;
    return canPerformAction('create');
  };

  // Verifica se pode editar - visualizadores não podem
  const canEdit = (): boolean => {
    if (isAdmin) return true;
    if (userPermissions.can_view_only && !userPermissions.can_create_update_delete) return false;
    return canPerformAction('update');
  };

  // Verifica se pode excluir - visualizadores não podem
  const canDelete = (): boolean => {
    if (isAdmin) return true;
    if (userPermissions.can_view_only && !userPermissions.can_create_update_delete) return false;
    return canPerformAction('delete');
  };

  // Verifica se pode fazer operações administrativas - visualizadores não podem
  const canAdmin = (): boolean => {
    if (isAdmin) return true;
    if (userPermissions.can_view_only && !userPermissions.can_admin) return false;
    return canPerformAction('admin');
  };

  // Verifica se pode importar/exportar - visualizadores não podem
  const canImportExport = (): boolean => {
    if (isAdmin) return true;
    if (userPermissions.can_view_only && !userPermissions.can_create_only && !userPermissions.can_create_update_delete) return false;
    return canPerformAction('create');
  };

  // Verifica se pode acessar ferramentas - visualizadores não podem
  const canAccessTools = (): boolean => {
    if (isAdmin) return true;
    if (userPermissions.can_view_only && !userPermissions.can_create_only && !userPermissions.can_create_update_delete) return false;
    return true;
  };

  // Verifica se pode ter ações limitadas em Tarefas, Sistema e Sugestões - visualizadores têm acesso limitado
  const canInteractWithSpecialMenus = (): boolean => {
    if (isAdmin) return true;
    if (userPermissions.can_view_only && !userPermissions.can_create_only && !userPermissions.can_create_update_delete) return false;
    return true;
  };

  // Obtém o nível de permissão do usuário
  const getPermissionLevel = (): 'admin' | 'full' | 'create' | 'view' | 'none' => {
    if (isAdmin || userPermissions.can_admin) return 'admin';
    if (userPermissions.can_create_update_delete) return 'full';
    if (userPermissions.can_create_only) return 'create';
    if (userPermissions.can_view_only) return 'view';
    return 'none';
  };

  // Verifica se botão/ação deve ser desabilitado
  const isDisabled = (action: 'create' | 'edit' | 'delete' | 'admin' | 'import' | 'export'): boolean => {
    switch (action) {
      case 'create':
        return !canCreate();
      case 'edit':
        return !canEdit();
      case 'delete':
        return !canDelete();
      case 'admin':
        return !canAdmin();
      case 'import':
      case 'export':
        return !canImportExport();
      default:
        return false;
    }
  };

  return {
    canView,
    canCreate,
    canEdit,
    canDelete,
    canAdmin,
    canImportExport,
    canAccessTools,
    canInteractWithSpecialMenus,
    getPermissionLevel,
    isDisabled,
    userPermissions
  };
}
