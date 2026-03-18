
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useRemoverItemPeca = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase
        .from('itens_romaneio_pecas')
        .delete()
        .eq('id', itemId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['romaneios'] });
      queryClient.invalidateQueries({ queryKey: ['pecas-pintura'] });
      toast.success('Item removido com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao remover item:', error);
      toast.error('Erro ao remover item');
    },
  });
};
