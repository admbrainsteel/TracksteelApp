import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from './useAuth';

export interface ProcessoCronograma {
  id?: string;
  nome_processo: string;
  data_inicio: string;
  data_fim: string;
  ordem: number;
}

export interface CronogramaOf {
  id?: string;
  of_id: string;
  gestor_id: string;
  revisao: number;
  processos: ProcessoCronograma[];
  peso_total?: number;
  ordem_fabricacao?: {
    num_of: string;
    descritivo: string;
    peso_total?: number;
  };
  gestor_profile?: {
    full_name: string;
    email: string;
  };
}

export const useCronogramas = () => {
  const { user } = useAuth();
  const [cronogramas, setCronogramas] = useState<CronogramaOf[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCronogramas = async () => {
    try {
      setLoading(true);

      const { data: cronogramasData, error: cronogramasError } = await supabase
        .from('cronogramas_of')
        .select(`
          *,
          ordens_fabricacao (
            num_of,
            descritivo,
            peso_total
          ),
          profiles!cronogramas_of_gestor_id_fkey (
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (cronogramasError) throw cronogramasError;

      // Carregar processos para cada cronograma
      const cronogramasComProcessos = await Promise.all(
        (cronogramasData || []).map(async (cronograma) => {
          const { data: processos, error: processosError } = await supabase
            .from('processos_cronograma')
            .select('*')
            .eq('cronograma_id', cronograma.id)
            .order('ordem');

          if (processosError) throw processosError;

          return {
            id: cronograma.id,
            of_id: cronograma.of_id,
            gestor_id: cronograma.gestor_id,
            revisao: cronograma.revisao,
            defasagem_solda: cronograma.defasagem_solda ?? 10,
            processos: processos || [],
            peso_total: cronograma.ordens_fabricacao?.peso_total,
            ordem_fabricacao: cronograma.ordens_fabricacao,
            gestor_profile: cronograma.profiles
          } as CronogramaOf;
        })
      );

      setCronogramas(cronogramasComProcessos);
    } catch (error) {
      console.error('Erro ao carregar cronogramas:', error);
      toast.error('Erro ao carregar cronogramas');
    } finally {
      setLoading(false);
    }
  };

  const saveCronograma = async (cronograma: Partial<CronogramaOf> & { processos: ProcessoCronograma[] }) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      if (!cronograma.of_id) throw new Error('Selecione uma Ordem de Fabricação');
      if (!cronograma.gestor_id) throw new Error('Selecione o gestor responsável');

      let cronogramaId: string;

      if (cronograma.id) {
        // Atualizar cronograma existente por ID
        const novaRevisao = cronograma.revisao ? cronograma.revisao + 1 : 1;

        const { data: updatedCronograma, error: updateError } = await supabase
          .from('cronogramas_of')
          .update({
            gestor_id: cronograma.gestor_id,
            revisao: novaRevisao,
            defasagem_solda: cronograma.defasagem_solda !== undefined ? cronograma.defasagem_solda : 10,
            updated_at: new Date().toISOString()
          })
          .eq('id', cronograma.id)
          .select()
          .single();

        if (updateError) throw updateError;
        cronogramaId = updatedCronograma.id;

        // Deletar processos antigos
        const { error: deleteError } = await supabase
          .from('processos_cronograma')
          .delete()
          .eq('cronograma_id', cronogramaId);

        if (deleteError) throw deleteError;
      } else {
        // Verificar se já existe cronograma para esta OF (usando maybeSingle para evitar erro PGRST116)
        const { data: existingCronograma } = await supabase
          .from('cronogramas_of')
          .select('id, revisao')
          .eq('of_id', cronograma.of_id)
          .maybeSingle();

        if (existingCronograma) {
          // Atualizar cronograma existente
          const novaRevisao = (existingCronograma.revisao || 1) + 1;

          const { data: updatedCronograma, error: updateError } = await supabase
            .from('cronogramas_of')
            .update({
              gestor_id: cronograma.gestor_id,
              revisao: novaRevisao,
              defasagem_solda: cronograma.defasagem_solda !== undefined ? cronograma.defasagem_solda : 10,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingCronograma.id)
            .select()
            .single();

          if (updateError) throw updateError;
          cronogramaId = updatedCronograma.id;

          // Deletar processos antigos
          const { error: deleteError } = await supabase
            .from('processos_cronograma')
            .delete()
            .eq('cronograma_id', cronogramaId);

          if (deleteError) throw deleteError;
        } else {
          // Criar novo cronograma
          const { data: newCronograma, error: insertError } = await supabase
            .from('cronogramas_of')
            .insert({
              of_id: cronograma.of_id,
              gestor_id: cronograma.gestor_id,
              revisao: 1,
              defasagem_solda: cronograma.defasagem_solda !== undefined ? cronograma.defasagem_solda : 10,
              created_by: user.id
            })
            .select()
            .single();

          if (insertError) throw insertError;
          cronogramaId = newCronograma.id;
        }
      }

      // Inserir novos processos
      if (cronograma.processos && cronograma.processos.length > 0) {
        const processosParaInserir = cronograma.processos.map((processo, idx) => ({
          cronograma_id: cronogramaId,
          nome_processo: processo.nome_processo,
          data_inicio: processo.data_inicio,
          data_fim: processo.data_fim,
          ordem: processo.ordem || idx + 1
        }));

        const { error: processosError } = await supabase
          .from('processos_cronograma')
          .insert(processosParaInserir);

        if (processosError) throw processosError;
      }

      toast.success('Cronograma salvo com sucesso!');
      await loadCronogramas();
      return true;
    } catch (error) {
      console.error('Erro ao salvar cronograma:', error);
      const errMsg = error instanceof Error ? error.message : 'Erro ao salvar cronograma';
      toast.error(errMsg);
      return false;
    }
  };

  const deleteCronograma = async (cronogramaId: string) => {
    try {
      const { error } = await supabase
        .from('cronogramas_of')
        .delete()
        .eq('id', cronogramaId);

      if (error) throw error;

      toast.success('Cronograma removido com sucesso!');
      await loadCronogramas();
      return true;
    } catch (error) {
      console.error('Erro ao deletar cronograma:', error);
      toast.error('Erro ao remover cronograma');
      return false;
    }
  };

  const getCronogramaPorOf = async (ofId: string) => {
    try {
      const { data: cronograma, error } = await supabase
        .from('cronogramas_of')
        .select(`
          *,
          ordens_fabricacao (
            num_of,
            descritivo,
            peso_total
          ),
          profiles!cronogramas_of_gestor_id_fkey (
            full_name,
            email
          )
        `)
        .eq('of_id', ofId)
        .maybeSingle();

      if (error) throw error;
      if (!cronograma) return null;

      const { data: processos, error: processosError } = await supabase
        .from('processos_cronograma')
        .select('*')
        .eq('cronograma_id', cronograma.id)
        .order('ordem');

      if (processosError) throw processosError;

      return {
        id: cronograma.id,
        of_id: cronograma.of_id,
        gestor_id: cronograma.gestor_id,
        revisao: cronograma.revisao,
        defasagem_solda: cronograma.defasagem_solda ?? 10,
        processos: processos || [],
        peso_total: cronograma.ordens_fabricacao?.peso_total,
        ordem_fabricacao: cronograma.ordens_fabricacao,
        gestor_profile: cronograma.profiles
      } as CronogramaOf;
    } catch (error) {
      console.error('Erro ao buscar cronograma:', error);
      return null;
    }
  };

  useEffect(() => {
    loadCronogramas();
  }, []);

  return {
    cronogramas,
    loading,
    loadCronogramas,
    saveCronograma,
    deleteCronograma,
    getCronogramaPorOf
  };
};
