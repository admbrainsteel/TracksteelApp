// Hook que retorna role/permissões do usuário
// Migrado pra Logto: não depende mais do Supabase
// Qualquer usuário autenticado via Logto tem acesso Total

import { useAuth } from '@/hooks/useAuth';
import type { UserRole, AppRole } from '@/hooks/useUserPermissions/types';

export type AccessLevel = 'Total' | 'Parcial' | 'Restrita';

export const useUserRole = () => {
  const { user, loading } = useAuth();

  // Sem usuário = sem permissão
  if (!user) {
    return {
      accessLevel: 'Restrita' as AccessLevel,
      isAdmin: false,
      isGerencia: false,
      isDiretoria: false,
      role: 'user' as UserRole,
      loading: false,
      error: null,
    };
  }

  // Com usuário autenticado via Logto = Total
  return {
    accessLevel: 'Total' as AccessLevel,
    isAdmin: true,
    isGerencia: true,
    isDiretoria: true,
    role: 'admin' as UserRole,
    loading,
    error: null,
  };
};

// Helper function (placeholder, não usado)
export const hasRole = (userId: string | undefined, role: AppRole): boolean => {
  return false;
};