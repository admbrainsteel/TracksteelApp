
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OFAtiva {
  of_number: string;
  descricao_resumida?: string;
  cliente?: string;
  gestor?: string;
}

export const useOFsAtivas = () => {
  const { data: ofsAtivas = [], isLoading } = useQuery({
    queryKey: ['ofs-ativas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ficha_tecnica_contratos')
        .select('of_number, descricao_resumida, cliente, gestor')
        .not('of_number', 'is', null)
        .order('of_number');

      if (error) {
        console.error('Erro ao buscar OFs ativas:', error);
        throw error;
      }

      return data as OFAtiva[];
    },
  });

  return {
    ofsAtivas,
    data: ofsAtivas, // Mantém compatibilidade com código existente
    isLoading,
  };
};
