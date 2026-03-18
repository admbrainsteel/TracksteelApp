
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface FichaTecnicaOption {
  id: string;
  of_number: string;
  descritivo?: string;
  cliente?: string;
  data_inicio?: string;
  data_termino_prev?: string;
  peso_total?: number;
  gestor?: string;
}

export interface NovaOFData {
  of_number: string;
  descritivo?: string;
  data_abertura?: string;
  data_prazo?: string;
  data_termino_prev?: string;
  peso_total?: number;
  gestor?: string;
  prioridade: string;
  nivel_qualidade: string;
  criterio_qualidade?: string;
  tratamento_final?: string;
  local_uf?: string;
  status: string;
  ficha_tecnica_id: string;
}

export const useNovaOF = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fichasTecnicas, setFichasTecnicas] = useState<FichaTecnicaOption[]>([]);

  const buscarFichasTecnicas = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ficha_tecnica_contratos')
        .select('id, of_number, descricao_resumida, cliente, data_inicio, data_termino_prev, quantidade, gestor')
        .eq('user_id', user.id)
        .order('of_number');

      if (error) throw error;

      const fichasFormatadas = data.map(ficha => ({
        id: ficha.id,
        of_number: ficha.of_number,
        descritivo: ficha.descricao_resumida,
        cliente: ficha.cliente,
        data_inicio: ficha.data_inicio,
        data_termino_prev: ficha.data_termino_prev,
        peso_total: ficha.quantidade || 0,
        gestor: ficha.gestor
      }));

      setFichasTecnicas(fichasFormatadas);
    } catch (error) {
      console.error('Erro ao buscar fichas técnicas:', error);
      toast.error('Erro ao carregar fichas técnicas');
    } finally {
      setLoading(false);
    }
  };

  const criarNovaOF = async (data: NovaOFData) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    setLoading(true);
    try {
      // Verificar se já existe uma OF com este número
      const { data: existingOF } = await supabase
        .from('ordens_fabricacao')
        .select('id')
        .eq('num_of', data.of_number)
        .maybeSingle();

      if (existingOF) {
        toast.error('Já existe uma Ordem de Fabricação com este número');
        return false;
      }

      const novaOF = {
        num_of: data.of_number,
        descritivo: data.descritivo || null,
        data_abertura: data.data_abertura || new Date().toISOString().split('T')[0],
        data_prazo: data.data_prazo || null,
        data_termino_prev: data.data_termino_prev || null,
        peso_total: data.peso_total || null,
        gestor: data.gestor || null,
        prioridade: data.prioridade || 'Normal',
        nivel_qualidade: data.nivel_qualidade || 'Normal',
        criterio_qualidade: data.criterio_qualidade || null,
        tratamento_final: data.tratamento_final || null,
        local_uf: data.local_uf || null,
        status: data.status || 'ativa',
        user_id: user.id,
        ficha_tecnica_id: data.ficha_tecnica_id
      };

      const { error } = await supabase
        .from('ordens_fabricacao')
        .insert([novaOF]);

      if (error) throw error;

      toast.success('Ordem de Fabricação criada com sucesso!');
      return true;
    } catch (error) {
      console.error('Erro ao criar OF:', error);
      toast.error('Erro ao criar Ordem de Fabricação');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fichasTecnicas,
    buscarFichasTecnicas,
    criarNovaOF
  };
};
