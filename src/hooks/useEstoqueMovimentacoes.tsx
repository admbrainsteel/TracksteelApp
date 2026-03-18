
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MovimentacaoEstoque {
  id: string;
  material_id: string;
  tipo_movimentacao: 'entrada' | 'saida' | 'transferencia' | 'ajuste' | 'empenho' | 'desempenho';
  quantidade: number;
  valor_unitario?: number;
  valor_total?: number;
  lote?: string;
  fornecedor?: string;
  nota_fiscal?: string;
  of_vinculada?: string;
  observacoes?: string;
  data_movimentacao: string;
  created_at: string;
  created_by?: string;
  user_name?: string;
  estoque_materiais?: {
    codigo: string;
    descricao: string;
  };
}

export const useMovimentacoesEstoque = () => {
  return useQuery({
    queryKey: ['movimentacoes-estoque'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimentacoes_estoque')
        .select(`
          *,
          estoque_materiais (
            codigo,
            descricao
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as MovimentacaoEstoque[];
    },
  });
};

export const useCriarMovimentacao = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (movimentacao: {
      material_id: string;
      tipo_movimentacao: 'entrada' | 'saida' | 'transferencia' | 'ajuste' | 'empenho' | 'desempenho';
      quantidade: number;
      lote?: string;
      fornecedor?: string;
      nota_fiscal?: string;
      of_vinculada?: string;
      observacoes?: string;
      data_movimentacao?: string;
      valor_unitario?: number;
      user_name?: string;
    }) => {
      // Validações básicas
      if (!movimentacao.material_id) {
        throw new Error('Material é obrigatório');
      }

      if (movimentacao.quantidade <= 0) {
        throw new Error('Quantidade deve ser maior que zero');
      }

      // Validações específicas para empenho e desempenho
      if (movimentacao.tipo_movimentacao === 'empenho' && !movimentacao.of_vinculada) {
        throw new Error('OF vinculada é obrigatória para movimentações de empenho');
      }

      if (movimentacao.tipo_movimentacao === 'desempenho' && !movimentacao.of_vinculada) {
        throw new Error('OF vinculada é obrigatória para movimentações de desempenho');
      }

      // Para empenhos e saídas, verificar disponibilidade
      if (movimentacao.tipo_movimentacao === 'empenho' || movimentacao.tipo_movimentacao === 'saida') {
        const { data: materialAtual, error: materialError } = await supabase
          .from('estoque_materiais')
          .select('quantidade_disponivel, descricao, codigo')
          .eq('id', movimentacao.material_id)
          .single();

        if (materialError) {
          throw new Error('Material não encontrado');
        }

        if (!materialAtual) {
          throw new Error('Material não encontrado');
        }

        if (materialAtual.quantidade_disponivel < movimentacao.quantidade) {
          const errorMsg = `Quantidade insuficiente para ${materialAtual.codigo} - ${materialAtual.descricao}. Disponível: ${materialAtual.quantidade_disponivel}, Solicitado: ${movimentacao.quantidade}`;
          throw new Error(errorMsg);
        }
      }

      // Preparar dados para inserção
      const { data: currentUser } = await supabase.auth.getUser();
      const dadosInsercao = {
        material_id: movimentacao.material_id,
        tipo_movimentacao: movimentacao.tipo_movimentacao,
        quantidade: movimentacao.quantidade,
        lote: movimentacao.lote || null,
        fornecedor: movimentacao.fornecedor || null,
        nota_fiscal: movimentacao.nota_fiscal || null,
        of_vinculada: movimentacao.of_vinculada || null,
        observacoes: movimentacao.observacoes || null,
        data_movimentacao: movimentacao.data_movimentacao || new Date().toISOString().split('T')[0],
        valor_unitario: movimentacao.valor_unitario || null,
        created_by: currentUser.user?.id
      };

      // Criar a movimentação - o trigger do banco cuidará dos empenhos automaticamente
      const { data: movimentacaoData, error: movError } = await supabase
        .from('movimentacoes_estoque')
        .insert([dadosInsercao])
        .select()
        .single();
      
      if (movError) {
        console.error('Erro detalhado:', movError);
        throw new Error(movError.message || 'Erro ao criar movimentação');
      }

      if (!movimentacaoData) {
        throw new Error('Nenhum dado foi retornado após a criação');
      }

      return movimentacaoData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['estoque-materiais'] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-estoque'] });
      queryClient.invalidateQueries({ queryKey: ['empenhos-material'] });
      toast.success('Movimentação criada com sucesso!');
    },
    onError: (error: Error) => {
      console.error('Erro capturado na mutação:', error);
      toast.error(error.message || 'Erro ao criar movimentação');
    }
  });
};

export const useExcluirMovimentacao = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (movimentacaoId: string) => {
      // Buscar detalhes da movimentação
      const { data: movimentacao, error: fetchError } = await supabase
        .from('movimentacoes_estoque')
        .select('*, estoque_materiais(codigo, descricao)')
        .eq('id', movimentacaoId)
        .single();

      if (fetchError) {
        throw new Error('Movimentação não encontrada');
      }

      // Excluir a movimentação - o trigger cuidará da reversão
      const { error: deleteError } = await supabase
        .from('movimentacoes_estoque')
        .delete()
        .eq('id', movimentacaoId);

      if (deleteError) {
        throw deleteError;
      }

      return movimentacao;
    },
    onSuccess: (movimentacao) => {
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-estoque'] });
      queryClient.invalidateQueries({ queryKey: ['estoque-materiais'] });
      queryClient.invalidateQueries({ queryKey: ['empenhos-material'] });
      
      const materialInfo = movimentacao.estoque_materiais;
      const materialDesc = materialInfo ? `${materialInfo.codigo} - ${materialInfo.descricao}` : 'Material';
      
      toast.success(`Movimentação de ${movimentacao.tipo_movimentacao} para ${materialDesc} excluída com sucesso!`);
    },
    onError: (error: any) => {
      console.error('Erro ao excluir movimentação:', error);
      const errorMessage = error?.message || 'Erro ao excluir movimentação';
      toast.error(errorMessage);
    }
  });
};
