
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useEditarItemInsumo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      itemId, 
      novaQuantidade, 
      pesoUnitario 
    }: { 
      itemId: string; 
      novaQuantidade: number; 
      pesoUnitario?: number; 
    }) => {
      if (!itemId || typeof novaQuantidade !== 'number') {
        throw new Error('Parâmetros inválidos para edição do item');
      }

      if (novaQuantidade < 0) {
        throw new Error('Quantidade deve ser um valor positivo');
      }

      const updateData: any = {
        quantidade_expedida: novaQuantidade
      };

      // Se tiver peso unitário, validar e calcular o peso total
      if (pesoUnitario !== undefined) {
        if (typeof pesoUnitario !== 'number' || pesoUnitario < 0) {
          throw new Error('Peso unitário deve ser um valor positivo');
        }
        updateData.peso_total = novaQuantidade * pesoUnitario;
      }

      const { error } = await supabase
        .from('itens_romaneio_insumos')
        .update(updateData)
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['romaneios'] });
      toast.success('Quantidade de insumo atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao editar quantidade de insumo:', error);
      toast.error('Erro ao editar quantidade de insumo: ' + (error instanceof Error ? error.message : 'Erro desconhecido'));
    },
  });
};
