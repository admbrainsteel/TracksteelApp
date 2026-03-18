
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RastreabilidadeMaterial {
  id: string;
  lote: string;
  material_id: string;
  quantidade: number;
  data_entrada?: string;
  fornecedor?: string;
  certificado?: string;
  corrida?: string;
  data_validade?: string;
  nota_fiscal?: string;
  status: string;
  created_at: string;
  created_by?: string;
  estoque_materiais?: {
    codigo: string;
    descricao: string;
    qualidade_aco?: string;
  };
}

// Função para gerar número de lote com a regra especificada
const generateLoteNumber = async (): Promise<string> => {
  try {
    // Buscar o próximo número sequencial
    const { data: lastLote, error } = await supabase
      .from('rastreabilidade_materiais')
      .select('lote')
      .like('lote', 'RE%')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let nextSequential = 1; // Começar com 001

    if (!error && lastLote) {
      // Extrair número sequencial do último lote (primeiros 3 dígitos após "RE")
      const match = lastLote.lote.match(/^RE(\d{3})/);
      if (match) {
        const lastSequential = parseInt(match[1]);
        nextSequential = (lastSequential + 1) % 1000; // Cicla de 0 a 999
      }
    }

    // Gerar componentes do lote
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // 01-12
    const year = String(now.getFullYear()).slice(-2); // Últimos 2 dígitos do ano
    const sequential = String(nextSequential).padStart(3, '0'); // 001-999

    return `RE${sequential}${month}${year}`;
  } catch (error) {
    console.error('Erro ao gerar número do lote:', error);
    // Fallback para caso de erro
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    return `RE001${month}${year}`;
  }
};

export const useRastreabilidadeMateriais = () => {
  return useQuery({
    queryKey: ['rastreabilidade-materiais'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rastreabilidade_materiais')
        .select(`
          *,
          estoque_materiais (
            codigo,
            descricao,
            qualidade_aco
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as RastreabilidadeMaterial[];
    },
  });
};

export const useCriarRastreabilidade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (rastreabilidade: Partial<RastreabilidadeMaterial>) => {
      // Gerar lote automaticamente se não fornecido ou for null
      let loteNumber = rastreabilidade.lote;
      if (!loteNumber || loteNumber.trim() === '') {
        loteNumber = await generateLoteNumber();
      }

      const { data, error } = await supabase
        .from('rastreabilidade_materiais')
        .insert([{
          lote: loteNumber,
          material_id: rastreabilidade.material_id,
          quantidade: rastreabilidade.quantidade,
          data_entrada: rastreabilidade.data_entrada,
          fornecedor: rastreabilidade.fornecedor,
          certificado: rastreabilidade.certificado,
          corrida: rastreabilidade.corrida,
          data_validade: rastreabilidade.data_validade,
          nota_fiscal: rastreabilidade.nota_fiscal,
          status: rastreabilidade.status || 'Ativo',
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rastreabilidade-materiais'] });
      toast.success('Lote criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar lote:', error);
      toast.error('Erro ao criar lote');
    },
  });
};

export const useAtualizarRastreabilidade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...rastreabilidade }: Partial<RastreabilidadeMaterial> & { id: string }) => {
      const { data, error } = await supabase
        .from('rastreabilidade_materiais')
        .update(rastreabilidade)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rastreabilidade-materiais'] });
      toast.success('Lote atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar lote:', error);
      toast.error('Erro ao atualizar lote');
    },
  });
};

export const useExcluirRastreabilidade = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('rastreabilidade_materiais')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rastreabilidade-materiais'] });
      toast.success('Lote excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir lote:', error);
      toast.error('Erro ao excluir lote');
    },
  });
};

// Re-exportar hook do estoque para uso no modal
export { useEstoqueMateriais } from './useEstoque';
