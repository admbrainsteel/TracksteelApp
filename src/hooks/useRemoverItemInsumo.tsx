
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useRemoverItemInsumo = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('itens_romaneio_insumos')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['romaneios'] });
      toast.success('Insumo removido com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao remover insumo:', error);
      toast.error('Erro ao remover insumo');
    },
  });
};
