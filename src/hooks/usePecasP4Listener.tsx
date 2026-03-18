
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePecasP4Listener = () => {
  useEffect(() => {
    // Função para processar notificações de novas peças P4
    const processarNovaPecaP4 = async (payload: any) => {
      try {
        const data = JSON.parse(payload);
        console.log('🔔 Nova peça P4 detectada:', data);
        
        // Verificar se a peça já existe na prioridade P4
        const { data: itemExistente, error: errorCheck } = await supabase
          .from('itens_prioridade_fabricacao')
          .select('id')
          .eq('peca_id', data.peca_id)
          .eq('prioridade_fabricacao_id', data.prioridade_fabricacao_id)
          .single();

        if (errorCheck && errorCheck.code !== 'PGRST116') {
          console.error('❌ Erro ao verificar item existente:', errorCheck);
          return;
        }

        // Se não existe, criar o item na prioridade P4
        if (!itemExistente) {
          const { error: errorInsert } = await supabase
            .from('itens_prioridade_fabricacao')
            .insert({
              peca_id: data.peca_id,
              prioridade_fabricacao_id: data.prioridade_fabricacao_id,
              quantidade_priorizada: data.quantidade,
              peso_total: data.quantidade * data.peso_unitario,
              ordem_fabricacao: 1
            });

          if (errorInsert) {
            console.error('❌ Erro ao inserir peça na prioridade P4:', errorInsert);
          } else {
            console.log('✅ Peça adicionada à prioridade P4 automaticamente');
          }
        }
      } catch (error) {
        console.error('❌ Erro ao processar notificação de nova peça P4:', error);
      }
    };

    // Escutar notificações do PostgreSQL
    const channel = supabase
      .channel('nova_peca_p4')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'pecas'
      }, (payload) => {
        // Este listener não será usado pois estamos usando pg_notify
        // Mantemos apenas como fallback
      })
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
};
