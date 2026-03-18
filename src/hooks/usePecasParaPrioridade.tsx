
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Peca } from './usePecas';

export const usePecasParaPrioridade = () => {
  const [pecasDisponiveis, setPecasDisponiveis] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(false);
  const [ofNumbers, setOfNumbers] = useState<string[]>([]);
  const [etapasFases, setEtapasFases] = useState<string[]>([]);

  const fetchOFs = async () => {
    try {
      const { data, error } = await supabase
        .from('pecas')
        .select('of_number')
        .not('of_number', 'is', null);

      if (error) {
        console.error('Erro ao buscar OFs:', error);
        return;
      }

      const ofsUnicas = Array.from(new Set(data?.map(item => item.of_number).filter(Boolean) || []));
      setOfNumbers(ofsUnicas);
    } catch (error) {
      console.error('Erro ao buscar OFs:', error);
    }
  };

  const fetchEtapasFases = async (ofNumber: string) => {
    try {
      const { data, error } = await supabase
        .from('pecas')
        .select('etapa_fase')
        .eq('of_number', ofNumber)
        .not('etapa_fase', 'is', null);

      if (error) {
        console.error('Erro ao buscar fases:', error);
        return;
      }

      const fasesUnicas = Array.from(new Set(data?.map(item => item.etapa_fase).filter(Boolean) || []));
      setEtapasFases(fasesUnicas);
    } catch (error) {
      console.error('Erro ao buscar fases:', error);
    }
  };

  const fetchPecasDisponiveis = async (ofNumber: string, etapaFase: string) => {
    try {
      setLoading(true);
      
      console.log('🔍 Buscando peças disponíveis para OF:', ofNumber, 'Fase:', etapaFase);
      
      // Buscar todas as peças da OF e fase especificadas
      const { data: todasPecas, error: errorPecas } = await supabase
        .from('pecas')
        .select('*')
        .eq('of_number', ofNumber)
        .eq('etapa_fase', etapaFase);

      if (errorPecas) {
        console.error('❌ Erro ao buscar peças:', errorPecas);
        setPecasDisponiveis([]);
        return;
      }

      if (!todasPecas || todasPecas.length === 0) {
        console.log('ℹ️ Nenhuma peça encontrada para esta OF e fase');
        setPecasDisponiveis([]);
        return;
      }

      // Buscar peças já priorizadas para esta OF e fase
      const { data: pecasPriorizadas, error: errorPriorizadas } = await supabase
        .from('prioridades_fabricacao')
        .select(`
          id,
          itens_prioridade_fabricacao (
            peca_id,
            quantidade_priorizada
          )
        `)
        .eq('of_number', ofNumber)
        .eq('etapa_fase', etapaFase);

      if (errorPriorizadas) {
        console.error('❌ Erro ao buscar peças priorizadas:', errorPriorizadas);
        setPecasDisponiveis([]);
        return;
      }

      // Criar mapa de quantidades já priorizadas por peça
      const quantidadesPriorizadas: { [pecaId: string]: number } = {};
      
      if (pecasPriorizadas) {
        pecasPriorizadas.forEach(prioridade => {
          if (prioridade.itens_prioridade_fabricacao) {
            prioridade.itens_prioridade_fabricacao.forEach((item: any) => {
              if (item.peca_id) {
                quantidadesPriorizadas[item.peca_id] = 
                  (quantidadesPriorizadas[item.peca_id] || 0) + item.quantidade_priorizada;
              }
            });
          }
        });
      }

      console.log('📊 Quantidades priorizadas por peça:', quantidadesPriorizadas);

      // Filtrar peças que ainda têm quantidade disponível
      const pecasDisponiveis = todasPecas
        .map(peca => {
          const quantidadePriorizada = quantidadesPriorizadas[peca.id] || 0;
          const quantidadeDisponivel = peca.quantidade - quantidadePriorizada;
          
          return {
            ...peca,
            quantidadeDisponivel: Math.max(0, quantidadeDisponivel)
          };
        })
        .filter(peca => peca.quantidadeDisponivel > 0);

      console.log(`✅ Encontradas ${pecasDisponiveis.length} peças com quantidade disponível`);
      
      // Log detalhado das peças encontradas
      pecasDisponiveis.forEach((peca: any) => {
        const quantidadePriorizada = quantidadesPriorizadas[peca.id] || 0;
        console.log(`📦 Peça ${peca.marca}: Total=${peca.quantidade}, Priorizada=${quantidadePriorizada}, Disponível=${peca.quantidadeDisponivel}`);
      });

      setPecasDisponiveis(pecasDisponiveis);
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar peças:', error);
      setPecasDisponiveis([]);
    } finally {
      setLoading(false);
    }
  };

  const verificarPecaJaPriorizada = async (pecaId: string, prioridadeId: string) => {
    try {
      const { data, error } = await supabase
        .from('itens_prioridade_fabricacao')
        .select('id')
        .eq('peca_id', pecaId)
        .eq('prioridade_fabricacao_id', prioridadeId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao verificar peça:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Erro ao verificar peça:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchOFs();
  }, []);

  return {
    pecasDisponiveis,
    ofNumbers,
    etapasFases,
    loading,
    fetchOFs,
    fetchEtapasFases,
    fetchPecasDisponiveis,
    verificarPecaJaPriorizada
  };
};
