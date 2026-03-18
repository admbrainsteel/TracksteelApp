
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ItemPrioridade } from './usePrioridadesFabricacao';

export const useItensPrioridade = (prioridadeId?: string) => {
  const [itens, setItens] = useState<ItemPrioridade[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchItens = async (prioridadeId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('itens_prioridade_fabricacao')
        .select(`
          *,
          peca:pecas(marca, descricao, peso_unitario, quantidade)
        `)
        .eq('prioridade_fabricacao_id', prioridadeId)
        .order('ordem_fabricacao', { ascending: true });

      if (error) {
        console.error('Erro ao buscar itens:', error);
        return;
      }

      setItens(data || []);
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
    } finally {
      setLoading(false);
    }
  };

  const adicionarItem = async (dadosItem: Omit<ItemPrioridade, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Buscar próxima ordem
      const { data: ultimoItem } = await supabase
        .from('itens_prioridade_fabricacao')
        .select('ordem_fabricacao')
        .eq('prioridade_fabricacao_id', dadosItem.prioridade_fabricacao_id)
        .order('ordem_fabricacao', { ascending: false })
        .limit(1)
        .single();

      const proximaOrdem = ultimoItem ? ultimoItem.ordem_fabricacao + 1 : 1;

      const { data, error } = await supabase
        .from('itens_prioridade_fabricacao')
        .insert([{
          ...dadosItem,
          ordem_fabricacao: proximaOrdem
        }])
        .select()
        .single();

      if (error) {
        console.error('Erro ao adicionar item:', error);
        toast.error('Erro ao adicionar peça');
        return null;
      }

      toast.success('Peça adicionada com sucesso!');
      if (prioridadeId) {
        await fetchItens(prioridadeId);
      }
      return data;
    } catch (error) {
      console.error('Erro ao adicionar item:', error);
      toast.error('Erro ao adicionar peça');
      return null;
    }
  };

  const atualizarOrdemItens = async (itensOrdenados: { id: string; ordem_fabricacao: number }[]) => {
    try {
      const updates = itensOrdenados.map(item => 
        supabase
          .from('itens_prioridade_fabricacao')
          .update({ ordem_fabricacao: item.ordem_fabricacao })
          .eq('id', item.id)
      );

      await Promise.all(updates);

      if (prioridadeId) {
        await fetchItens(prioridadeId);
      }
      return true;
    } catch (error) {
      console.error('Erro ao atualizar ordem:', error);
      toast.error('Erro ao atualizar ordem');
      return false;
    }
  };

  const removerItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('itens_prioridade_fabricacao')
        .delete()
        .eq('id', itemId);

      if (error) {
        console.error('Erro ao remover item:', error);
        toast.error('Erro ao remover peça');
        return false;
      }

      toast.success('Peça removida com sucesso!');
      if (prioridadeId) {
        await fetchItens(prioridadeId);
      }
      return true;
    } catch (error) {
      console.error('Erro ao remover item:', error);
      toast.error('Erro ao remover peça');
      return false;
    }
  };

  const atualizarQuantidade = async (itemId: string, novaQuantidade: number, pesoUnitario: number) => {
    try {
      const { error } = await supabase
        .from('itens_prioridade_fabricacao')
        .update({
          quantidade_priorizada: novaQuantidade,
          peso_total: novaQuantidade * pesoUnitario
        })
        .eq('id', itemId);

      if (error) {
        console.error('Erro ao atualizar quantidade:', error);
        toast.error('Erro ao atualizar quantidade');
        return false;
      }

      if (prioridadeId) {
        await fetchItens(prioridadeId);
      }
      return true;
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      toast.error('Erro ao atualizar quantidade');
      return false;
    }
  };

  const transferirItem = async (itemId: string, novaPrioridadeId: string) => {
    try {
      // Buscar próxima ordem na nova prioridade
      const { data: ultimoItem } = await supabase
        .from('itens_prioridade_fabricacao')
        .select('ordem_fabricacao')
        .eq('prioridade_fabricacao_id', novaPrioridadeId)
        .order('ordem_fabricacao', { ascending: false })
        .limit(1)
        .single();

      const proximaOrdem = ultimoItem ? ultimoItem.ordem_fabricacao + 1 : 1;

      const { error } = await supabase
        .from('itens_prioridade_fabricacao')
        .update({
          prioridade_fabricacao_id: novaPrioridadeId,
          ordem_fabricacao: proximaOrdem
        })
        .eq('id', itemId);

      if (error) {
        console.error('Erro ao transferir item:', error);
        toast.error('Erro ao transferir peça');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao transferir item:', error);
      toast.error('Erro ao transferir peça');
      return false;
    }
  };

  useEffect(() => {
    if (prioridadeId) {
      fetchItens(prioridadeId);
    }
  }, [prioridadeId]);

  return {
    itens,
    loading,
    fetchItens,
    adicionarItem,
    atualizarOrdemItens,
    removerItem,
    atualizarQuantidade,
    transferirItem,
    refetch: () => prioridadeId ? fetchItens(prioridadeId) : Promise.resolve()
  };
};
