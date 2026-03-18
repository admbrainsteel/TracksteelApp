
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface PrioridadeFabricacao {
  id: string;
  of_number: string;
  etapa_fase: string;
  prioridade_id: string;
  nome_prioridade: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
  prioridade_config?: {
    codigo: string;
    nome: string;
    cor: string;
  };
}

export interface ItemPrioridade {
  id: string;
  prioridade_fabricacao_id: string;
  peca_id: string;
  quantidade_priorizada: number;
  ordem_fabricacao: number;
  peso_total: number;
  created_at: string;
  updated_at: string;
  peca?: {
    marca: string;
    descricao: string;
    peso_unitario: number;
    quantidade: number;
  };
}

export const usePrioridadesFabricacao = () => {
  const { user } = useAuth();
  const [prioridades, setPrioridades] = useState<PrioridadeFabricacao[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrioridades = async (ofNumber?: string, etapaFase?: string) => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('prioridades_fabricacao')
        .select(`
          *,
          prioridade_config:prioridades_config(codigo, nome, cor)
        `)
        .eq('ativo', true)
        .order('created_at', { ascending: false });

      if (ofNumber) {
        query = query.eq('of_number', ofNumber);
      }
      
      if (etapaFase) {
        query = query.eq('etapa_fase', etapaFase);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar prioridades:', error);
        toast.error('Erro ao carregar prioridades');
        return;
      }

      setPrioridades(data || []);
    } catch (error) {
      console.error('Erro ao buscar prioridades:', error);
      toast.error('Erro ao carregar prioridades');
    } finally {
      setLoading(false);
    }
  };

  const criarPrioridade = async (dadosPrioridade: Omit<PrioridadeFabricacao, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      if (!user) {
        toast.error('Usuário não autenticado');
        return null;
      }

      const { data, error } = await supabase
        .from('prioridades_fabricacao')
        .insert([{
          ...dadosPrioridade,
          created_by: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar prioridade:', error);
        toast.error('Erro ao criar prioridade');
        return null;
      }

      toast.success('Prioridade criada com sucesso!');
      await fetchPrioridades();
      return data;
    } catch (error) {
      console.error('Erro ao criar prioridade:', error);
      toast.error('Erro ao criar prioridade');
      return null;
    }
  };

  const atualizarPrioridade = async (id: string, dadosAtualizacao: Partial<PrioridadeFabricacao>) => {
    try {
      const { error } = await supabase
        .from('prioridades_fabricacao')
        .update(dadosAtualizacao)
        .eq('id', id);

      if (error) {
        console.error('Erro ao atualizar prioridade:', error);
        toast.error('Erro ao atualizar prioridade');
        return false;
      }

      toast.success('Prioridade atualizada com sucesso!');
      await fetchPrioridades();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar prioridade:', error);
      toast.error('Erro ao atualizar prioridade');
      return false;
    }
  };

  const deletarPrioridade = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prioridades_fabricacao')
        .update({ ativo: false })
        .eq('id', id);

      if (error) {
        console.error('Erro ao deletar prioridade:', error);
        toast.error('Erro ao deletar prioridade');
        return false;
      }

      toast.success('Prioridade removida com sucesso!');
      await fetchPrioridades();
      return true;
    } catch (error) {
      console.error('Erro ao deletar prioridade:', error);
      toast.error('Erro ao deletar prioridade');
      return false;
    }
  };

  useEffect(() => {
    fetchPrioridades();
  }, []);

  return {
    prioridades,
    loading,
    fetchPrioridades,
    criarPrioridade,
    atualizarPrioridade,
    deletarPrioridade,
    refetch: fetchPrioridades
  };
};
