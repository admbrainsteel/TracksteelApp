
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useEditarItemPeca = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ itemId, novaQuantidade, pesoUnitario }: { 
      itemId: string; 
      novaQuantidade: number; 
      pesoUnitario: number; 
    }) => {
      if (!itemId || typeof novaQuantidade !== 'number' || typeof pesoUnitario !== 'number') {
        throw new Error('Parâmetros inválidos para edição do item');
      }

      if (novaQuantidade < 0 || pesoUnitario < 0) {
        throw new Error('Quantidade e peso devem ser valores positivos');
      }

      const { error } = await supabase
        .from('itens_romaneio_pecas')
        .update({
          quantidade_expedida: novaQuantidade,
          peso_total: novaQuantidade * pesoUnitario
        })
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['romaneios'] });
      queryClient.invalidateQueries({ queryKey: ['pecas-pintura'] });
      toast.success('Quantidade atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao editar quantidade:', error);
      toast.error('Erro ao editar quantidade: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    },
  });
};
