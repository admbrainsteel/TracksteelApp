import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ApontamentoPecaObra {
  id: string;
  rdo_id: string;
  marca_peca: string;
  quantidade: number;
  created_at: string;
}

export interface NovoApontamentoPeca {
  rdo_id: string;
  marca_peca: string;
  quantidade: number;
}

export const useApontamentosPecaObra = (rdoId?: string) => {
  return useQuery({
    queryKey: ['apontamentos_peca_obra', rdoId],
    queryFn: async () => {
      if (!rdoId) return [];

      const { data, error } = await supabase
        .from('apontamentos_peca_obra')
        .select('*')
        .eq('rdo_id', rdoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ApontamentoPecaObra[];
    },
    enabled: !!rdoId,
  });
};

export const useCreateApontamentoPeca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (apontamento: NovoApontamentoPeca) => {
      const { data, error } = await supabase
        .from('apontamentos_peca_obra')
        .insert([apontamento])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['apontamentos_peca_obra', variables.rdo_id] });
      queryClient.invalidateQueries({ queryKey: ['pecas_expedidas'] });
      toast.success('Apontamento de peça adicionado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao adicionar apontamento: ' + error.message);
    },
  });
};

export const useUpdateApontamentoPeca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApontamentoPecaObra> & { id: string }) => {
      const { data, error } = await supabase
        .from('apontamentos_peca_obra')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['apontamentos_peca_obra', data.rdo_id] });
      queryClient.invalidateQueries({ queryKey: ['pecas_expedidas'] });
      toast.success('Apontamento atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar apontamento: ' + error.message);
    },
  });
};

export const useDeleteApontamentoPeca = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // Primeiro buscar o apontamento para invalidar as queries corretas
      const { data: apontamento } = await supabase
        .from('apontamentos_peca_obra')
        .select('rdo_id')
        .eq('id', id)
        .single();

      const { error } = await supabase
        .from('apontamentos_peca_obra')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return apontamento;
    },
    onSuccess: (apontamento) => {
      if (apontamento) {
        queryClient.invalidateQueries({ queryKey: ['apontamentos_peca_obra', apontamento.rdo_id] });
        queryClient.invalidateQueries({ queryKey: ['pecas_expedidas'] });
      }
      toast.success('Apontamento removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover apontamento: ' + error.message);
    },
  });
};