
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface EmpenhoMaterial {
  id: string;
  material_id: string;
  of_number: string;
  quantidade_empenhada: number;
  quantidade_utilizada: number;
  lote?: string;
  observacoes?: string;
  status: 'Empenhado' | 'Finalizado' | 'Cancelado';
  data_empenho: string;
  created_by?: string;
  created_at: string;
  movimentacao_empenho_id?: string;
  estoque_materiais?: {
    codigo: string;
    descricao: string;
    unidade: string;
    valor_unitario: number;
  };
}

// Hook para buscar todos os empenhos (apenas visualização)
export const useEmpenhosMaterial = (ofNumber?: string) => {
  return useQuery({
    queryKey: ['empenhos-material', ofNumber],
    queryFn: async () => {
      let query = supabase
        .from('empenhos_material')
        .select(`
          *,
          estoque_materiais!inner(
            codigo,
            descricao,
            unidade,
            valor_unitario
          )
        `)
        .order('created_at', { ascending: false });
      
      if (ofNumber) {
        query = query.eq('of_number', ofNumber);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as EmpenhoMaterial[];
    }
  });
};

// Hook para buscar OFs com empenhos
export const useOFsComEmpenhos = () => {
  return useQuery({
    queryKey: ['ofs-com-empenhos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empenhos_material')
        .select('of_number')
        .not('of_number', 'is', null)
        .neq('status', 'Cancelado');

      if (error) throw error;
      
      const uniqueOFs = Array.from(new Set(data.map(item => item.of_number)))
        .filter(of => of && of.trim() !== '')
        .sort();
      
      return uniqueOFs;
    }
  });
};

// Hook para relatório de empenhos por OF
export const useRelatorioEmpenhosPorOF = (ofNumber?: string) => {
  return useQuery({
    queryKey: ['relatorio-empenhos-of', ofNumber],
    queryFn: async () => {
      if (!ofNumber) return [];
      
      const { data, error } = await supabase
        .from('empenhos_material')
        .select(`
          *,
          estoque_materiais!inner(
            codigo,
            descricao,
            unidade,
            valor_unitario
          )
        `)
        .eq('of_number', ofNumber)
        .neq('status', 'Cancelado')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EmpenhoMaterial[];
    },
    enabled: !!ofNumber
  });
};
