
import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useItensPrioridadeFabricacao, ItemPrioridade } from './useItensPrioridadeFabricacao';

export const useItensPrioridadeFabricacaoFiltrado = () => {
  const [ofSelecionada, setOfSelecionada] = useState<string | null>(null);
  const [faseSelecionada, setFaseSelecionada] = useState<string | null>(null);
  const [versaoAtual, setVersaoAtual] = useState<{
    revisao: number;
    dataModificacao: string;
    modificadoPor?: string;
  } | null>(null);

  // Use o hook original
  const hookOriginal = useItensPrioridadeFabricacao();

  // Filtrar itens baseado nos filtros selecionados
  const itensFiltrados = useMemo(() => {
    if (!ofSelecionada || !faseSelecionada) {
      return {};
    }

    const itensFiltradosObj: { [key: string]: ItemPrioridade[] } = {};
    
    Object.entries(hookOriginal.itensPorPrioridade).forEach(([prioridade, itens]) => {
      const itensDaPrioridadeFiltrados = itens.filter(item => {
        const itemOf = item.peca?.of_number || item.prioridade_fabricacao?.of_number;
        const itemFase = item.peca?.etapa_fase || item.prioridade_fabricacao?.etapa_fase;
        
        return itemOf === ofSelecionada && itemFase === faseSelecionada;
      });
      
      if (itensDaPrioridadeFiltrados.length > 0) {
        itensFiltradosObj[prioridade] = itensDaPrioridadeFiltrados;
      }
    });

    return itensFiltradosObj;
  }, [hookOriginal.itensPorPrioridade, ofSelecionada, faseSelecionada]);

  // Buscar informações de versão quando filtros mudarem
  useEffect(() => {
    const buscarVersaoAtual = async () => {
      if (!ofSelecionada || !faseSelecionada) {
        setVersaoAtual(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('prioridades_fabricacao')
          .select(`
            revisao,
            data_ultima_modificacao,
            profiles:prioridades_fabricacao_modificado_por_profiles_fkey(full_name)
          `)
          .eq('of_number', ofSelecionada)
          .eq('etapa_fase', faseSelecionada)
          .order('revisao', { ascending: false })
          .limit(1)
          .single();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao buscar versão:', error);
          return;
        }

        if (data) {
          setVersaoAtual({
            revisao: data.revisao || 0,
            dataModificacao: data.data_ultima_modificacao || new Date().toISOString(),
            modificadoPor: (data.profiles as { full_name?: string } | null)?.full_name
          });
        } else {
          setVersaoAtual({
            revisao: 0,
            dataModificacao: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Erro ao buscar versão:', error);
      }
    };

    buscarVersaoAtual();
  }, [ofSelecionada, faseSelecionada]);

  const handleFiltroChange = (novaOf: string | null, novaFase: string | null) => {
    setOfSelecionada(novaOf);
    setFaseSelecionada(novaFase);
  };

  const incrementarRevisao = async () => {
    if (!ofSelecionada || !faseSelecionada) return false;

    try {
      const novaRevisao = (versaoAtual?.revisao || 0) + 1;
      const dataModificacao = new Date().toISOString();

      const { error } = await supabase
        .from('prioridades_fabricacao')
        .update({ 
          revisao: novaRevisao, 
          data_ultima_modificacao: dataModificacao 
        })
        .eq('of_number', ofSelecionada)
        .eq('etapa_fase', faseSelecionada);

      if (error) {
        console.error('Erro ao incrementar revisão no DB:', error);
        toast.error('Erro ao registrar nova revisão.');
        return false;
      }

      setVersaoAtual(prev => ({
        ...prev!,
        revisao: novaRevisao,
        dataModificacao: dataModificacao
      }));
      
      toast.success(`Revisão atualizada para ${novaRevisao}`);
      return true;
    } catch (error) {
      console.error('Erro ao incrementar revisão:', error);
      return false;
    }
  };

  const resetarRevisao = async (valor: number = 0) => {
    if (!ofSelecionada || !faseSelecionada) return false;

    try {
      const dataModificacao = new Date().toISOString();

      const { error } = await supabase
        .from('prioridades_fabricacao')
        .update({ 
          revisao: valor, 
          data_ultima_modificacao: dataModificacao 
        })
        .eq('of_number', ofSelecionada)
        .eq('etapa_fase', faseSelecionada);

      if (error) {
        console.error('Erro ao resetar revisão no DB:', error);
        toast.error('Erro ao resetar revisão.');
        return false;
      }

      setVersaoAtual(prev => ({
        ...prev!,
        revisao: valor,
        dataModificacao: dataModificacao
      }));
      
      toast.success(`Revisão resetada para ${valor}`);
      return true;
    } catch (error) {
      console.error('Erro ao resetar revisão:', error);
      return false;
    }
  };

  return {
    ...hookOriginal,
    itensPorPrioridade: itensFiltrados,
    ofSelecionada,
    faseSelecionada,
    versaoAtual,
    onFiltroChange: handleFiltroChange,
    incrementarRevisao,
    resetarRevisao
  };
};
