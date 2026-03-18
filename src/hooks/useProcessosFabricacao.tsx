
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProcessoFabricacao {
  id: string;
  nome: string;
  descricao?: string;
  ordem: number;
  ativo: boolean;
  cor?: string;
}

export const useProcessosFabricacao = () => {
  return useQuery({
    queryKey: ['processos-fabricacao'],
    queryFn: async (): Promise<ProcessoFabricacao[]> => {
      console.log('🔍 Buscando processos de fabricação...');
      
      const { data, error } = await supabase
        .from('processos_fabricacao')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (error) {
        console.error('❌ Erro ao buscar processos de fabricação:', error);
        throw error;
      }

      console.log('✅ Processos carregados:', data?.length || 0);
      console.log('📋 Processos disponíveis:', data?.map(p => ({ id: p.id, nome: p.nome, ordem: p.ordem })));

      return data || [];
    },
    staleTime: 300000, // Cache por 5 minutos
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: 1000
  });
};
