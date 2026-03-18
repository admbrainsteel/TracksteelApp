
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export const useUserFunction = () => {
  const { user } = useAuth();

  const { data: userFunction, isLoading } = useQuery({
    queryKey: ['user-function', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('profiles')
        .select(`
          function_id,
          functions (
            name,
            description
          )
        `)
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar função do usuário:', error);
        return null;
      }

      return data?.functions?.name || null;
    },
    enabled: !!user?.id,
  });

  const isComprador = userFunction?.toLowerCase().includes('comprador') || false;

  return {
    userFunction,
    isComprador,
    isLoading,
  };
};
