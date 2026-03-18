
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface OFConcluida {
  id: string;
  num_of: string;
  descritivo?: string;
  peso_total?: number;
  data_abertura?: string;
  data_prazo?: string;
  criterio_qualidade?: string;
  tratamento_final?: string;
  local_uf?: string;
  data_arquivamento?: string;
  status_detalhado: 'concluida' | 'entregue';
  ficha_tecnica_data?: any;
}

export const useOFsConcluidas = () => {
  const query = useQuery({
    queryKey: ['ofs-concluidas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ofs_concluidas')
        .select('*')
        .order('data_arquivamento', { ascending: false });
      
      if (error) throw error;
      return data as OFConcluida[];
    },
  });

  const entregarOF = async (ofId: string) => {
    const { error } = await supabase.rpc('entregar_of', {
      of_concluida_id: ofId
    });
    
    if (error) throw error;
    query.refetch();
  };

  const reverterEntregueParaConcluida = async (ofId: string) => {
    const { error } = await supabase.rpc('reverter_of_entregue_para_concluida', {
      of_concluida_id: ofId
    });
    
    if (error) throw error;
    query.refetch();
  };

  const reverterConcluidaParaAtiva = async (ofId: string) => {
    const { error } = await supabase.rpc('reverter_of_concluida_para_ativa', {
      of_concluida_id: ofId
    });
    
    if (error) throw error;
    query.refetch();
  };

  // Separar OFs por status
  const ofsConcluidas = query.data?.filter(of => of.status_detalhado === 'concluida') || [];
  const ofsEntregues = query.data?.filter(of => of.status_detalhado === 'entregue') || [];

  return {
    ...query,
    ofsConcluidas,
    ofsEntregues,
    entregarOF,
    reverterEntregueParaConcluida,
    reverterConcluidaParaAtiva,
    refetch: query.refetch,
    loading: query.isLoading
  };
};
