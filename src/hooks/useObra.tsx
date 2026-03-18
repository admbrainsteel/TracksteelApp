import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types
export interface ContratoObra {
  id: string;
  of_number: string;
  nome_obra: string | null;
  cliente: string | null;
  data_inicio_contratual: string | null;
  data_termino_prevista: string | null;
  status: 'Aguardando Inicio' | 'Ativo' | 'Pausado' | 'Concluído' | 'Arquivada';
  created_at: string;
  updated_at: string;
}

export interface RecursoObra {
  id: string;
  tipo_recurso: string;
  nome_recurso: string;
  descricao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CondicaoClimatica {
  id: string;
  nome: string;
  icone: string | null;
  ativo: boolean;
}

export interface MotivoImprodutivo {
  id: string;
  motivo: string;
  descricao: string | null;
  categoria: 'Cliente' | 'Empresa Montadora' | 'Contratada' | 'Terceiros Indiretos';
  ativo: boolean;
}

export interface DiarioObraRDO {
  id: string;
  of_number: string;
  usuario_rdo: string | null;
  usuario_nome: string | null;
  numero_rdo: string | null;
  data: string;
  condicao_climatica_id: string | null;
  temperatura_aproximada: number | null;
  hora_inicio: string | null;
  hora_fim: string | null;
  total_horas_trabalhadas: number | null;
  observacoes_gerais: string | null;
  finalizado: boolean;
  sincronizado: boolean;
  created_at: string;
  updated_at: string;
  condicoes_climaticas?: CondicaoClimatica;
}

// Hooks para Contratos de Obra
export const useContratosObra = () => {
  return useQuery({
    queryKey: ['contratos_obra'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contratos_obra')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ContratoObra[];
    },
  });
};

export const useCreateContratoObra = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contrato: Omit<ContratoObra, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('contratos_obra')
        .insert([contrato])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos_obra'] });
      toast.success('Contrato de obra criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar contrato de obra: ' + error.message);
    },
  });
};

export const useUpdateContratoObra = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ContratoObra> & { id: string }) => {
      const { data, error } = await supabase
        .from('contratos_obra')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contratos_obra'] });
      toast.success('Status da obra atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar obra: ' + error.message);
    },
  });
};

// Hooks para Recursos de Obra
export const useRecursosObra = () => {
  return useQuery({
    queryKey: ['recursos_obra'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recursos_obra')
        .select('*')
        .eq('ativo', true)
        .order('tipo_recurso', { ascending: true });

      if (error) throw error;
      return data as RecursoObra[];
    },
  });
};

export const useCreateRecursoObra = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recurso: Omit<RecursoObra, 'id' | 'created_at' | 'updated_at' | 'ativo'>) => {
      const { data, error } = await supabase
        .from('recursos_obra')
        .insert([{ ...recurso, ativo: true }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recursos_obra'] });
      toast.success('Recurso de obra criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar recurso de obra: ' + error.message);
    },
  });
};

// Hooks para Condições Climáticas
export const useCondicoesClimaticas = () => {
  return useQuery({
    queryKey: ['condicoes_climaticas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('condicoes_climaticas')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });

      if (error) throw error;
      return data as CondicaoClimatica[];
    },
  });
};

// Hooks para Motivos Improdutivos
export const useMotivosImprodutivos = () => {
  return useQuery({
    queryKey: ['motivos_improdutivos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motivos_improdutivos')
        .select('*')
        .eq('ativo', true)
        .order('categoria', { ascending: true });

      if (error) throw error;
      return data as MotivoImprodutivo[];
    },
  });
};

export const useCreateMotivoImprodutivo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (motivo: Omit<MotivoImprodutivo, 'id' | 'ativo'>) => {
      const { data, error } = await supabase
        .from('motivos_improdutivos')
        .insert([{ ...motivo, ativo: true }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos_improdutivos'] });
      toast.success('Motivo improdutivo criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar motivo improdutivo: ' + error.message);
    },
  });
};

export const useUpdateMotivoImprodutivo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MotivoImprodutivo> & { id: string }) => {
      const { data, error } = await supabase
        .from('motivos_improdutivos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos_improdutivos'] });
      toast.success('Motivo improdutivo atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar motivo improdutivo: ' + error.message);
    },
  });
};

export const useDeleteMotivoImprodutivo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('motivos_improdutivos')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos_improdutivos'] });
      toast.success('Motivo improdutivo removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover motivo improdutivo: ' + error.message);
    },
  });
};

// Hooks para Diário de Obra (RDO)
export const useDiariosObra = (ofNumber?: string) => {
  return useQuery({
    queryKey: ['diarios_obra', ofNumber],
    queryFn: async () => {
      let query = supabase
        .from('diario_obra_rdo')
        .select(`
          *,
          condicoes_climaticas:condicao_climatica_id(*)
        `)
        .order('data', { ascending: false });

      if (ofNumber) {
        query = query.eq('of_number', ofNumber);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as DiarioObraRDO[];
    },
    enabled: !!ofNumber,
  });
};

// Hook para verificar se existe RDO para OF e data
export const useCheckExistingRDO = () => {
  return useMutation({
    mutationFn: async ({ ofNumber, data }: { ofNumber: string; data: string }) => {
      const { data: existingRDO, error } = await supabase
        .from('diario_obra_rdo')
        .select(`
          *,
          condicoes_climaticas:condicao_climatica_id(*)
        `)
        .eq('of_number', ofNumber)
        .eq('data', data)
        .maybeSingle();

      if (error) throw error;
      return existingRDO;
    },
  });
};

export const useCreateDiarioObra = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rdo: Omit<DiarioObraRDO, 'id' | 'created_at' | 'updated_at' | 'condicoes_climaticas' | 'numero_rdo'>) => {
      // Buscar nome do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      let userName = null;
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        userName = profile?.full_name || user.email?.split('@')[0] || 'Usuário';
      }

      const { data, error } = await supabase
        .from('diario_obra_rdo')
        .insert([{ ...rdo, usuario_nome: userName }])
        .select(`
          *,
          condicoes_climaticas:condicao_climatica_id(*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diarios_obra'] });
      toast.success('RDO criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar RDO: ' + error.message);
    },
  });
};

export const useUpdateDiarioObra = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DiarioObraRDO> & { id: string }) => {
      const { data, error } = await supabase
        .from('diario_obra_rdo')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          condicoes_climaticas:condicao_climatica_id(*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diarios_obra'] });
      toast.success('RDO atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar RDO: ' + error.message);
    },
  });
};

// Hook para buscar OFs disponíveis
export const useOFsDisponiveis = () => {
  return useQuery({
    queryKey: ['ofs_disponiveis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_fabricacao')
        .select('num_of, descritivo, data_prazo')
        .eq('status', 'ativa')
        .order('num_of', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
};
