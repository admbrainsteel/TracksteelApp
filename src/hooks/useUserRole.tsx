
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole, AppRole } from '@/hooks/useUserPermissions/types';

export type AccessLevel = 'Total' | 'Parcial' | 'Restrita';

export const useUserRole = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['user-role', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        return { 
          accessLevel: 'Restrita' as AccessLevel, 
          isAdmin: false, 
          isGerencia: false,
          isDiretoria: false,
          role: 'user' as UserRole
        };
      }

      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', user.id)
          .single();

        if (error || !profile) {
          return { 
            accessLevel: 'Restrita' as AccessLevel, 
            isAdmin: false, 
            isGerencia: false,
            isDiretoria: false,
            role: 'user' as UserRole
          };
        }

        // For now, return default permissions until we have proper role system
        // This can be enhanced later with actual role checking
        const accessLevel = 'Total' as AccessLevel;
        const isAdmin = true; // Temporary - should be based on actual roles
        
        return { 
          accessLevel, 
          isAdmin: true, 
          isGerencia: false,
          isDiretoria: false,
          role: 'admin' as UserRole
        };
      } catch (error) {
        console.error('Erro ao buscar papel do usuário:', error);
        return { 
          accessLevel: 'Restrita' as AccessLevel, 
          isAdmin: false, 
          isGerencia: false,
          isDiretoria: false,
          role: 'user' as UserRole
        };
      }
    },
    enabled: !!user?.id,
  });

  // Extract the data and add loading/error handling
  const { data, isLoading, error } = query;
  
  return {
    ...data,
    loading: isLoading,
    error,
    // Also include the query object for compatibility
    ...query
  };
};

// Helper function to check if user has role using correct AppRole type
export const hasRole = (userId: string | undefined, role: AppRole): boolean => {
  // Implementation would check against supabase function
  return false; // Placeholder
};
