
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState } from 'react';

export interface Equipamento {
  id: string;
  codigo: string;
  descricao: string;
  capacidade?: string;
  quantidade: number;
  local_estoque: string;
  propriedade: 'proprio' | 'terceiros' | 'alugado';
  validade_calibracao?: string;
  certificado_calibracao?: string;
  periodicidade_calibracao?: number;
  of_number?: string;
  destino_outro?: string;
  data_saida?: string;
  retirado_por?: string;
  data_retorno?: string;
  devolvido_por?: string;
  observacoes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface EquipamentoFormData {
  codigo: string;
  descricao: string;
  capacidade?: string;
  quantidade: number;
  local_estoque: string;
  propriedade: 'proprio' | 'terceiros' | 'alugado';
  validade_calibracao?: string;
  certificado_calibracao?: string;
  periodicidade_calibracao?: number;
  of_number?: string;
  destino_outro?: string;
  data_saida?: string;
  retirado_por?: string;
  data_retorno?: string;
  devolvido_por?: string;
  observacoes?: string;
}

interface EquipamentoFilters {
  status: string;
  propriedade: string;
  search: string;
}

export const useEquipamentos = () => {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<EquipamentoFilters>({
    status: 'all',
    propriedade: 'all',
    search: ''
  });

  const {
    data: equipamentos = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['equipamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipamentos')
        .select('*')
        .order('codigo', { ascending: true });

      if (error) throw error;
      return data as Equipamento[];
    },
  });

  const createEquipamento = useMutation({
    mutationFn: async (data: EquipamentoFormData) => {
      const { data: result, error } = await supabase
        .from('equipamentos')
        .insert(data)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast.success('Equipamento criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar equipamento:', error);
      toast.error('Erro ao criar equipamento');
    },
  });

  const updateEquipamento = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EquipamentoFormData> }) => {
      const { data: result, error } = await supabase
        .from('equipamentos')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast.success('Equipamento atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar equipamento:', error);
      toast.error('Erro ao atualizar equipamento');
    },
  });

  const deleteEquipamento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('equipamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipamentos'] });
      toast.success('Equipamento excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir equipamento:', error);
      toast.error('Erro ao excluir equipamento');
    },
  });

  // Função para calcular o status do equipamento
  const getEquipamentoStatus = (equipamento: Equipamento) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const calibrationDate = equipamento.validade_calibracao 
      ? new Date(equipamento.validade_calibracao + 'T00:00:00') 
      : null;
    
    if (calibrationDate && calibrationDate < today) {
      return { text: 'Calibração Vencida', class: 'bg-red-500/20 text-red-400 border-red-500/30', key: 'calibracao_vencida' };
    }
    if (equipamento.data_saida && !equipamento.data_retorno) {
      return { text: 'Em Uso', class: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', key: 'em_uso' };
    }
    return { text: 'Disponível', class: 'bg-green-500/20 text-green-400 border-green-500/30', key: 'disponivel' };
  };

  // Estatísticas dos equipamentos
  const stats = {
    total: equipamentos.length,
    disponiveis: equipamentos.filter(eq => getEquipamentoStatus(eq).key === 'disponivel').length,
    emUso: equipamentos.filter(eq => getEquipamentoStatus(eq).key === 'em_uso').length,
    calibracaoVencida: equipamentos.filter(eq => {
      if (!eq.validade_calibracao) return false;
      const today = new Date();
      const next30Days = new Date();
      next30Days.setDate(today.getDate() + 30);
      const calDate = new Date(eq.validade_calibracao + 'T00:00:00');
      return calDate < next30Days;
    }).length
  };

  const updateFilters = (newFilters: Partial<EquipamentoFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      status: 'all',
      propriedade: 'all',
      search: ''
    });
  };

  return {
    equipamentos,
    isLoading,
    loading: isLoading, // Alias para compatibilidade
    error,
    filters,
    updateFilters,
    clearFilters,
    createEquipamento,
    updateEquipamento,
    deleteEquipamento,
    getEquipamentoStatus,
    stats,
  };
};
