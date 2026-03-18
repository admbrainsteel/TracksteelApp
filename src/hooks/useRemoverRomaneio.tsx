
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useRemoverRomaneio = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (romaneioId: string) => {
      // Primeiro, remover todos os itens de peças do romaneio
      const { error: pecasError } = await supabase
        .from('itens_romaneio_pecas')
        .delete()
        .eq('romaneio_id', romaneioId);
      
      if (pecasError) throw pecasError;

      // Depois, remover todos os itens de insumos do romaneio
      const { error: insumosError } = await supabase
        .from('itens_romaneio_insumos')
        .delete()
        .eq('romaneio_id', romaneioId);
      
      if (insumosError) throw insumosError;

      // Por fim, remover o romaneio
      const { error: romaneioError } = await supabase
        .from('romaneios_expedicao')
        .delete()
        .eq('id', romaneioId);
      
      if (romaneioError) throw romaneioError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['romaneios'] });
      toast.success('Romaneio removido com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao remover romaneio:', error);
      toast.error('Erro ao remover romaneio');
    },
  });
};
