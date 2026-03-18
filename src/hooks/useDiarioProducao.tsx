
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DiarioProducao {
  id?: string;
  data: string;
  tecnico_responsavel: string;
  turno: string;
  observacoes_gerais?: string;
  fotos_urls?: string[];
  finalizado?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
}

export interface RecursoProducao {
  id: string;
  nome: string;
  tipo: 'maquina' | 'operario';
  ativo?: boolean;
}

export interface ApontamentoDiarioRecurso {
  id?: string;
  diario_id: string;
  of_number: string;
  recurso_id: string;
  qtd_inicio?: number;
  qtd_meio?: number;
  qtd_fim?: number;
  qtd_segundo_turno?: number;
}

export interface LoteSoldaDiario {
  id?: string;
  diario_id: string;
  of_number: string;
  lote_solda?: string;
}

export interface OcorrenciaImprodutividade {
  id: string;
  descricao: string;
  categoria?: string;
  ativo?: boolean;
}

export const useDiarioProducao = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar todos os diários
  const { data: diarios, isLoading: isLoadingDiarios } = useQuery({
    queryKey: ['diarios-producao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diarios_producao')
        .select('*')
        .order('data', { ascending: false });
      
      if (error) throw error;
      return data as DiarioProducao[];
    }
  });

  // Buscar recursos
  const { data: recursos, isLoading: isLoadingRecursos } = useQuery({
    queryKey: ['recursos-producao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recursos_producao')
        .select('*')
        .eq('ativo', true)
        .order('tipo', { ascending: true })
        .order('nome', { ascending: true });
      
      if (error) throw error;
      return data as RecursoProducao[];
    }
  });

  // Buscar ocorrências
  const { data: ocorrencias, isLoading: isLoadingOcorrencias } = useQuery({
    queryKey: ['ocorrencias-improdutividade'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ocorrencias_improdutividade')
        .select('*')
        .eq('ativo', true)
        .order('descricao', { ascending: true });
      
      if (error) throw error;
      return data as OcorrenciaImprodutividade[];
    }
  });

  // Salvar diário
  const salvarDiario = useMutation({
    mutationFn: async (diario: DiarioProducao) => {
      const { data, error } = await supabase
        .from('diarios_producao')
        .insert([{
          data: diario.data,
          tecnico_responsavel: diario.tecnico_responsavel,
          turno: diario.turno,
          observacoes_gerais: diario.observacoes_gerais,
          fotos_urls: diario.fotos_urls,
          finalizado: diario.finalizado || false
        }])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diarios-producao'] });
      toast({
        title: "Sucesso",
        description: "Diário salvo com sucesso!"
      });
    },
    onError: (error) => {
      console.error('Erro ao salvar diário:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar diário. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Salvar apontamentos de recursos
  const salvarApontamentos = useMutation({
    mutationFn: async (apontamentos: ApontamentoDiarioRecurso[]) => {
      const { error } = await supabase
        .from('apontamentos_diario_recursos')
        .insert(apontamentos);
      
      if (error) throw error;
    },
    onError: (error) => {
      console.error('Erro ao salvar apontamentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar apontamentos. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Salvar lotes de solda
  const salvarLotesSolda = useMutation({
    mutationFn: async (lotes: LoteSoldaDiario[]) => {
      const { error } = await supabase
        .from('lotes_solda_diario')
        .insert(lotes);
      
      if (error) throw error;
    },
    onError: (error) => {
      console.error('Erro ao salvar lotes de solda:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar lotes de solda. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Salvar ocorrências do diário
  const salvarOcorrenciasDiario = useMutation({
    mutationFn: async (dados: { diario_id: string; ocorrencia_ids: string[] }) => {
      const ocorrenciasParaInserir = dados.ocorrencia_ids.map(ocorrencia_id => ({
        diario_id: dados.diario_id,
        ocorrencia_id
      }));

      const { error } = await supabase
        .from('diario_ocorrencias')
        .insert(ocorrenciasParaInserir);
      
      if (error) throw error;
    },
    onError: (error) => {
      console.error('Erro ao salvar ocorrências do diário:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar ocorrências. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Deletar diário
  const deletarDiario = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('diarios_producao')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diarios-producao'] });
      toast({
        title: "Sucesso",
        description: "Diário deletado com sucesso!"
      });
    },
    onError: (error) => {
      console.error('Erro ao deletar diário:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar diário. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  return {
    diarios,
    recursos,
    ocorrencias,
    isLoadingDiarios,
    isLoadingRecursos,
    isLoadingOcorrencias,
    salvarDiario,
    salvarApontamentos,
    salvarLotesSolda,
    salvarOcorrenciasDiario,
    deletarDiario
  };
};
