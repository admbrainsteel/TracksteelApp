import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

// Hook para buscar todos os empenhos
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

// Hook para buscar empenhos ativos por material
export const useEmpenhosAtivosPorMaterial = (materialId: string) => {
  return useQuery({
    queryKey: ['empenhos-ativos-material', materialId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empenhos_material')
        .select('*')
        .eq('material_id', materialId)
        .eq('status', 'Empenhado');
      
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

export const useCancelarEmpenho = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (empenhoId: string) => {
      console.log('🗑️ Iniciando cancelamento do empenho:', empenhoId);
      
      // Buscar dados do empenho
      const { data: empenho, error: fetchError } = await supabase
        .from('empenhos_material')
        .select('*, movimentacao_empenho_id, estoque_materiais(codigo, descricao)')
        .eq('id', empenhoId)
        .single();
      
      if (fetchError) {
        console.error('Erro ao buscar empenho:', fetchError);
        throw fetchError;
      }
      
      if (!empenho) throw new Error('Empenho não encontrado');
      
      if (empenho.quantidade_utilizada > 0) {
        throw new Error('Não é possível cancelar empenho que já foi parcialmente utilizado');
      }
      
      console.log('📋 Dados do empenho encontrado:', empenho);
      
      // Cancelar o empenho primeiro
      const { error: updateEmpenhoError } = await supabase
        .from('empenhos_material')
        .update({ 
          status: 'Cancelado',
          movimentacao_empenho_id: null 
        })
        .eq('id', empenhoId);
      
      if (updateEmpenhoError) {
        console.error('Erro ao cancelar empenho:', updateEmpenhoError);
        throw new Error('Erro ao cancelar empenho');
      }

      // Se há movimentação vinculada, tentar excluí-la também
      if (empenho.movimentacao_empenho_id) {
        console.log('📦 Excluindo movimentação vinculada:', empenho.movimentacao_empenho_id);
        
        try {
          const { error: deleteMovError } = await supabase
            .from('movimentacoes_estoque')
            .delete()
            .eq('id', empenho.movimentacao_empenho_id);
          
          if (deleteMovError) {
            console.error('Erro ao excluir movimentação:', deleteMovError);
            // Não falha aqui, apenas loga o erro
            console.log('⚠️ Movimentação não pôde ser excluída, mas empenho foi cancelado');
          } else {
            console.log('✅ Movimentação excluída com sucesso');
          }
        } catch (movError) {
          console.error('Erro ao tentar excluir movimentação:', movError);
          // Continua mesmo se não conseguir excluir a movimentação
        }
      }
      
      console.log('✅ Empenho cancelado com sucesso');
      return { success: true, empenho };
    },
    onSuccess: (result) => {
      toast.success('Empenho cancelado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['empenhos-material'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-materiais'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-estoque'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao cancelar empenho:', error);
      toast.error(error.message || 'Erro ao cancelar empenho');
    }
  });
};

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
