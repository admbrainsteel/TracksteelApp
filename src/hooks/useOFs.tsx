
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OrdemFabricacao {
  id: string;
  num_of: string;
  descritivo?: string;
  status?: string;
  data_abertura?: string;
  data_prazo?: string;
  data_termino_prev?: string;
  peso_total?: number;
  gestor?: string;
  prioridade?: string;
  nivel_qualidade?: string;
  criterio_qualidade?: string;
  tratamento_final?: string;
  local_uf?: string;
  user_id?: string;
  ficha_tecnica_id?: string;
}

export const useOFs = () => {
  const query = useQuery({
    queryKey: ['ordens-fabricacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_fabricacao')
        .select('*')
        .eq('status', 'ativa')
        .order('num_of');
      
      if (error) throw error;
      return data as OrdemFabricacao[];
    },
  });

  const updateOF = async (id: string, updates: Partial<OrdemFabricacao>) => {
    const { error } = await supabase
      .from('ordens_fabricacao')
      .update(updates)
      .eq('id', id);
    
    if (error) throw error;
    query.refetch();
  };

  const deleteOF = async (id: string) => {
    const { error } = await supabase
      .from('ordens_fabricacao')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    query.refetch();
  };

  const concluirOF = async (ofId: string) => {
    const { error } = await supabase.rpc('concluir_of', {
      of_id_param: ofId
    });
    
    if (error) throw error;
    query.refetch();
  };

  return {
    ...query,
    ofs: query.data || [],
    loading: query.isLoading,
    refetch: query.refetch,
    updateOF,
    deleteOF,
    concluirOF
  };
};
