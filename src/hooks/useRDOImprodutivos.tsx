import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types for Unproductive Time Appointments
export interface ApontamentoImprodutivo {
  id: string;
  rdo_id: string;
  motivo_id: string;
  hora_inicio: string; // TIME format from database
  hora_fim: string; // TIME format from database
  duracao_total?: string; // INTERVAL from database
  descricao?: string | null;
  created_at: string;
  motivos_improdutivos?: {
    id: string;
    motivo: string;
    descricao: string | null;
    categoria: 'Cliente' | 'Empresa Montadora' | 'Contratada' | 'Terceiros Indiretos';
  };
}

export interface NovoApontamentoImprodutivo {
  rdo_id: string;
  motivo_id: string;
  hora_inicio: string;
  hora_fim: string;
  descricao?: string;
}

// Hook para buscar apontamentos improdutivos de um RDO específico
export const useApontamentosImprodutivos = (rdoId?: string) => {
  return useQuery({
    queryKey: ['apontamentos_improdutivos', rdoId],
    queryFn: async () => {
      if (!rdoId) return [];
      
      const { data, error } = await supabase
        .from('apontamentos_improdutivos')
        .select(`
          *,
          motivos_improdutivos:motivo_id(*)
        `)
        .eq('rdo_id', rdoId)
        .order('hora_inicio', { ascending: true });

      if (error) throw error;
      return data as ApontamentoImprodutivo[];
    },
    enabled: !!rdoId,
  });
};

// Hook para criar apontamento improdutivo
export const useCreateApontamentoImprodutivo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (apontamento: NovoApontamentoImprodutivo) => {
      const { data, error } = await supabase
        .from('apontamentos_improdutivos')
        .insert([apontamento])
        .select(`
          *,
          motivos_improdutivos:motivo_id(*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['apontamentos_improdutivos', variables.rdo_id] 
      });
      toast.success('Apontamento improdutivo criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar apontamento improdutivo: ' + error.message);
    },
  });
};

// Hook para atualizar apontamento improdutivo
export const useUpdateApontamentoImprodutivo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ApontamentoImprodutivo> & { id: string }) => {
      const { data, error } = await supabase
        .from('apontamentos_improdutivos')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          motivos_improdutivos:motivo_id(*)
        `)
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apontamentos_improdutivos'] });
      toast.success('Apontamento improdutivo atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar apontamento improdutivo: ' + error.message);
    },
  });
};

// Hook para deletar apontamento improdutivo
export const useDeleteApontamentoImprodutivo = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('apontamentos_improdutivos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apontamentos_improdutivos'] });
      toast.success('Apontamento improdutivo removido com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover apontamento improdutivo: ' + error.message);
    },
  });
};

// Utility function to calculate duration between two times
export const calculateDuration = (horaInicio: string, horaFim: string): string => {
  try {
    const inicio = new Date(`2000-01-01T${horaInicio}`);
    const fim = new Date(`2000-01-01T${horaFim}`);
    
    // Handle cases where end time is on the next day
    if (fim < inicio) {
      fim.setDate(fim.getDate() + 1);
    }
    
    const diffMs = fim.getTime() - inicio.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error('Error calculating duration:', error);
    return '00:00';
  }
};