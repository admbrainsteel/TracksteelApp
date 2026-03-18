
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface PrioridadeConfig {
  id: string;
  codigo: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const usePrioridades = () => {
  const [prioridades, setPrioridades] = useState<PrioridadeConfig[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrioridades = async () => {
    try {
      const { data, error } = await supabase
        .from('prioridades_config')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

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

  const updatePrioridade = async (id: string, updates: Partial<PrioridadeConfig>) => {
    try {
      const { error } = await supabase
        .from('prioridades_config')
        .update(updates)
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

  const getPrioridadeByCodigo = (codigo: string) => {
    return prioridades.find(p => p.codigo === codigo);
  };

  useEffect(() => {
    fetchPrioridades();
  }, []);

  return {
    prioridades,
    loading,
    updatePrioridade,
    getPrioridadeByCodigo,
    refetch: fetchPrioridades
  };
};
