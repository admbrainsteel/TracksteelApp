import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types for Resources Appointments
export interface ApontamentoRecursoObra {
  id: string;
  rdo_id: string;
  recurso_id: string;
  horas_trabalhadas: number;
  created_at: string;
  recursos_obra?: {
    id: string;
    tipo_recurso: string;
    nome_recurso: string;
    descricao: string | null;
  };
}

export interface NovoApontamentoRecurso {
  rdo_id: string;
  recurso_id: string;
  horas_trabalhadas: number;
}

// Hook para buscar apontamentos de recursos de um RDO específico
export const useApontamentosRecursosObra = (rdoId?: string) => {
  return useQuery({
    queryKey: ['apontamentos_recursos_obra', rdoId],
    queryFn: async () => {
      if (!rdoId) return [];
      
      const { data, error } = await supabase
        .from('apontamentos_recursos_obra')
        .select(`
          *,
          recursos_obra:recurso_id(*)
        `)
        .eq('rdo_id', rdoId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ApontamentoRecursoObra[];
    },
    enabled: !!rdoId,
  });
};

// Hook para criar apontamento de recurso
export const useCreateApontamentoRecurso = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (apontamento: NovoApontamentoRecurso) => {
      const { data, error } = await supabase
        .from('apontamentos_recursos_obra')
        .insert([apontamento])
        .select(`
          *,
          recursos_obra:recurso_id(*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['apontamentos_recursos_obra', variables.rdo_id] 
      });
      toast.success('Apontamento de recurso criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar apontamento de recurso: ' + error.message);
    },
  });
};

// Hook para atualizar apontamento de recurso
export const useUpdateApontamentoRecurso = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApontamentoRecursoObra> & { id: string }) => {
      const { data, error } = await supabase
        .from('apontamentos_recursos_obra')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          recursos_obra:recurso_id(*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apontamentos_recursos_obra'] });
      toast.success('Apontamento de recurso atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar apontamento de recurso: ' + error.message);
    },
  });
};

// Hook para deletar apontamento de recurso
export const useDeleteApontamentoRecurso = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('apontamentos_recursos_obra')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apontamentos_recursos_obra'] });
      toast.success('Apontamento de recurso removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover apontamento de recurso: ' + error.message);
    },
  });
};