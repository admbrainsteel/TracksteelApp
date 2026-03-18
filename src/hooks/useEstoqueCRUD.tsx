import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Interfaces
export interface UnidadeMedida {
  id: string;
  nome: string;
  abreviacao: string;
  descricao?: string;
  ativo: boolean;
}

export interface LocalizacaoEstoque {
  id: string;
  nome: string;
  codigo?: string;
  descricao?: string;
  ativo: boolean;
}

export interface QualidadeAco {
  id: string;
  nome: string;
  norma?: string;
  descricao?: string;
  propriedades?: any;
  ativo: boolean;
}

// Hooks para Unidades de Medida
export const useUnidadesMedida = () => {
  return useQuery({
    queryKey: ['unidades-medida'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('unidades_medida')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data as UnidadeMedida[];
    },
  });
};

export const useCriarUnidadeMedida = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<UnidadeMedida, 'id'>) => {
      const { data: result, error } = await supabase
        .from('unidades_medida')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-medida'] });
      toast.success('Unidade de medida criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar unidade de medida: ' + error.message);
    },
  });
};

export const useAtualizarUnidadeMedida = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: UnidadeMedida) => {
      const { data: result, error } = await supabase
        .from('unidades_medida')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-medida'] });
      toast.success('Unidade de medida atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar unidade de medida: ' + error.message);
    },
  });
};

export const useExcluirUnidadeMedida = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('unidades_medida')
        .update({ ativo: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades-medida'] });
      toast.success('Unidade de medida desativada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao desativar unidade de medida: ' + error.message);
    },
  });
};

// Hooks para Localizações
export const useLocalizacoesEstoque = () => {
  return useQuery({
    queryKey: ['localizacoes-estoque'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('localizacoes_estoque')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data as LocalizacaoEstoque[];
    },
  });
};

export const useCriarLocalizacao = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<LocalizacaoEstoque, 'id'>) => {
      const { data: result, error } = await supabase
        .from('localizacoes_estoque')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['localizacoes-estoque'] });
      toast.success('Localização criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar localização: ' + error.message);
    },
  });
};

export const useAtualizarLocalizacao = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: LocalizacaoEstoque) => {
      const { data: result, error } = await supabase
        .from('localizacoes_estoque')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['localizacoes-estoque'] });
      toast.success('Localização atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar localização: ' + error.message);
    },
  });
};

export const useExcluirLocalizacao = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('localizacoes_estoque')
        .update({ ativo: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['localizacoes-estoque'] });
      toast.success('Localização desativada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao desativar localização: ' + error.message);
    },
  });
};

// Hooks para Qualidade do Aço
export const useQualidadesAco = () => {
  return useQuery({
    queryKey: ['qualidades-aco'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qualidades_aco')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      
      if (error) throw error;
      return data as QualidadeAco[];
    },
  });
};

export const useCriarQualidadeAco = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: Omit<QualidadeAco, 'id'>) => {
      const { data: result, error } = await supabase
        .from('qualidades_aco')
        .insert(data)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualidades-aco'] });
      toast.success('Qualidade de aço criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar qualidade de aço: ' + error.message);
    },
  });
};

export const useAtualizarQualidadeAco = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...data }: QualidadeAco) => {
      const { data: result, error } = await supabase
        .from('qualidades_aco')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualidades-aco'] });
      toast.success('Qualidade de aço atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar qualidade de aço: ' + error.message);
    },
  });
};

export const useExcluirQualidadeAco = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('qualidades_aco')
        .update({ ativo: false })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualidades-aco'] });
      toast.success('Qualidade de aço desativada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao desativar qualidade de aço: ' + error.message);
    },
  });
};