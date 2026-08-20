// Hook que retorna role/permissões do usuário
// Migrado pra consumir as permissões reais do banco via useUserPermissions

import { useAuth } from '@/hooks/useAuth';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import type { UserRole, AppRole } from '@/hooks/useUserPermissions/types';

export type AccessLevel = 'Total' | 'Parcial' | 'Restrita';

export const useUserRole = () => {
  const { user, loading: authLoading } = useAuth();
  const { userPermissions, loading: permsLoading } = useUserPermissions();

  const loading = authLoading || permsLoading;

  // Sem usuário = sem permissão
  if (!user) {
    return {
      accessLevel: 'Restrita' as AccessLevel,
      isAdmin: false,
      isGerencia: false,
      isDiretoria: false,
      role: 'user' as UserRole,
      loading,
      error: null,
    };
  }

  // Com usuário autenticado + validações do json de privilégios do DB
  const isAdminCheck = Boolean(userPermissions.can_admin);
  
  return {
    accessLevel: isAdminCheck ? 'Total' : 'Parcial' as AccessLevel,
    isAdmin: isAdminCheck,
    isGerencia: isAdminCheck, // fallback para componentes legados
    isDiretoria: isAdminCheck, // fallback para componentes legados
    role: (isAdminCheck ? 'admin' : 'user') as UserRole,
    loading,
    error: null,
  };
};

// Helper function (placeholder, não usado)
export const hasRole = (userId: string | undefined, role: AppRole): boolean => {
  return false;
};