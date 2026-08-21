
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApontamentosProducao } from '@/hooks/useApontamentosProducao';

interface HistoricoProcesso {
  marca_item: string;
  processo_id: string;
  processo_ordem: number;
  quantidade_processada: number;
  tipo_item: 'peca' | 'componente';
}

interface ValidacaoResult {
  valido: boolean;
  erro?: string;
  quantidadeMaxima?: number;
}

interface ItemDisponivel {
  marca: string;
  quantidade_disponivel: number;
  processos_concluidos: number[];
  proximo_processo_permitido: number | null;
}

export const useValidacaoSequencialProcessos = () => {
  const [historico, setHistorico] = useState<HistoricoProcesso[]>([]);
  const [loading, setLoading] = useState(false);
  const { processos, buscarQuantidadeProcessada } = useApontamentosProducao();

  // Buscar histórico de apontamentos para uma OF específica
  const buscarHistoricoOF = useCallback(async (ofNumber: string) => {
    try {
      setLoading(true);
      
      // Buscar apontamentos de peças
      const { data: apontamentosPecas, error: errorPecas } = await supabase
        .from('apontamentos_producao')
        .select(`
          quantidade_produzida,
          processo_id,
          tipo_apontamento,
          peca:pecas!apontamentos_producao_peca_id_fkey(marca),
          processo:processos_fabricacao!apontamentos_producao_processo_id_fkey(ordem)
        `)
        .eq('of_number', ofNumber)
        .eq('tipo_apontamento', 'peca');

      // Buscar apontamentos de componentes
      const { data: apontamentosComponentes, error: errorComponentes } = await supabase
        .from('apontamentos_producao')
        .select(`
          quantidade_produzida,
          processo_id,
          tipo_apontamento,
          componente:componentes_peca!apontamentos_producao_componente_id_fkey(marca_componente),
          processo:processos_fabricacao!apontamentos_producao_processo_id_fkey(ordem)
        `)
        .eq('of_number', ofNumber)
        .eq('tipo_apontamento', 'componente');

      if (errorPecas || errorComponentes) {
        throw errorPecas || errorComponentes;
      }

      const historicoCompleto: HistoricoProcesso[] = [];

      // Processar apontamentos de peças
      apontamentosPecas?.forEach(apt => {
        if (apt.peca?.marca && apt.processo?.ordem !== undefined) {
          historicoCompleto.push({
            marca_item: apt.peca.marca,
            processo_id: apt.processo_id,
            processo_ordem: apt.processo.ordem,
            quantidade_processada: apt.quantidade_produzida,
            tipo_item: 'peca'
          });
        }
      });

      // Processar apontamentos de componentes
      apontamentosComponentes?.forEach(apt => {
        if (apt.componente?.marca_componente && apt.processo?.ordem !== undefined) {
          historicoCompleto.push({
            marca_item: apt.componente.marca_componente,
            processo_id: apt.processo_id,
            processo_ordem: apt.processo.ordem,
            quantidade_processada: apt.quantidade_produzida,
            tipo_item: 'componente'
          });
        }
      });

      setHistorico(historicoCompleto);
    } catch (error) {
      console.error('Erro ao buscar histórico de processos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Validar se um item pode ser processado em um processo específico
  const validarSequenciaProcesso = useCallback((
    ofNumber: string,
    marcaItem: string,
    processoId: string,
    quantidadeSolicitada: number
  ): ValidacaoResult => {
    const processoAtual = processos.find(p => p.id === processoId);
    if (!processoAtual) {
      return { valido: false, erro: 'Processo não encontrado' };
    }

    const ordemAtual = processoAtual.ordem;
    
    // Se for o primeiro processo (ordem 1), sempre permitir
    if (ordemAtual === 1) {
      return { valido: true };
    }

    // Buscar histórico do item específico
    const historicoItem = historico.filter(h => h.marca_item === marcaItem);
    
    if (historicoItem.length === 0) {
      return { 
        valido: false, 
        erro: `Item ${marcaItem} deve primeiro passar pelo processo inicial (ordem 1)` 
      };
    }

    // Verificar se todos os processos anteriores foram concluídos
    const processosAnteriores = processos
      .filter(p => p.ordem < ordemAtual)
      .sort((a, b) => a.ordem - b.ordem);

    for (const processoAnterior of processosAnteriores) {
      const apontamentosProcessoAnterior = historicoItem.filter(
        h => h.processo_ordem === processoAnterior.ordem
      );

      if (apontamentosProcessoAnterior.length === 0) {
        return {
          valido: false,
          erro: `Item ${marcaItem} deve primeiro passar pelo processo "${processoAnterior.nome}" (ordem ${processoAnterior.ordem})`
        };
      }

      // Verificar se há quantidade suficiente processada no processo anterior
      const quantidadeProcessada = apontamentosProcessoAnterior.reduce(
        (total, apt) => total + apt.quantidade_processada, 0
      );

      if (quantidadeProcessada < quantidadeSolicitada) {
        return {
          valido: false,
          erro: `Quantidade insuficiente processada no processo "${processoAnterior.nome}". Disponível: ${quantidadeProcessada}, Solicitado: ${quantidadeSolicitada}`,
          quantidadeMaxima: quantidadeProcessada
        };
      }
    }

    return { valido: true };
  }, [historico, processos]);

  // Função auxiliar para calcular quantidade disponível do processo anterior
  const calcularQuantidadeDisponivelProcessoAnterior = useCallback(async (
    marcaItem: string,
    ordemProcessoAnterior: number,
    ofNumber: string,
    tipoItem: 'peca' | 'componente'
  ): Promise<number> => {
    const processoAnterior = processos.find(p => p.ordem === ordemProcessoAnterior);
    if (!processoAnterior) return 0;

    return await buscarQuantidadeProcessada(
      marcaItem,
      processoAnterior.id,
      ofNumber,
      tipoItem
    );
  }, [processos, buscarQuantidadeProcessada]);

  // Calcular itens disponíveis para um processo específico
  const calcularItensDisponiveis = useCallback(async (
    ofNumber: string,
    processoId: string,
    pecas: Record<string, unknown>[],
    componentes: Record<string, unknown>[]
  ): Promise<{
    pecasDisponiveis: Record<string, unknown>[];
    componentesDisponiveis: Record<string, unknown>[];
  }> => {
    const processoAtual = processos.find(p => p.id === processoId);
    if (!processoAtual) {
      return { pecasDisponiveis: [], componentesDisponiveis: [] };
    }

    const ordemAtual = processoAtual.ordem;
    const pecasDisponiveis: Record<string, unknown>[] = [];
    const componentesDisponiveis: Record<string, unknown>[] = [];

    // Processar peças
    for (const peca of pecas) {
      const marcaPeca = String(peca.marca || '');
      const qtdPeca = Number(peca.quantidade || 0);

      if (ordemAtual === 1) {
        // Primeiro processo: todas as peças estão disponíveis
        pecasDisponiveis.push({
          ...peca,
          quantidade_disponivel: qtdPeca
        });
      } else {
        // Calcular quantidade disponível baseada no processo anterior
        const quantidadeProcessadaAnterior = await calcularQuantidadeDisponivelProcessoAnterior(
          marcaPeca,
          ordemAtual - 1,
          ofNumber,
          'peca'
        );

        const quantidadeJaProcessadaAtual = await buscarQuantidadeProcessada(
          marcaPeca,
          processoId,
          ofNumber,
          'peca'
        );

        const quantidadeDisponivel = quantidadeProcessadaAnterior - quantidadeJaProcessadaAtual;

        if (quantidadeDisponivel > 0) {
          pecasDisponiveis.push({
            ...peca,
            quantidade_disponivel: quantidadeDisponivel
          });
        }
      }
    }

    // Processar componentes
    for (const componente of componentes) {
      const marcaComp = String(componente.marca_componente || '');
      const qtdComp = Number(componente.quantidade_total || 0);

      if (ordemAtual === 1) {
        // Primeiro processo: todos os componentes estão disponíveis
        componentesDisponiveis.push({
          ...componente,
          quantidade_disponivel: qtdComp
        });
      } else {
        // Calcular quantidade disponível baseada no processo anterior
        const quantidadeProcessadaAnterior = await calcularQuantidadeDisponivelProcessoAnterior(
          marcaComp,
          ordemAtual - 1,
          ofNumber,
          'componente'
        );

        const quantidadeJaProcessadaAtual = await buscarQuantidadeProcessada(
          marcaComp,
          processoId,
          ofNumber,
          'componente'
        );

        const quantidadeDisponivel = quantidadeProcessadaAnterior - quantidadeJaProcessadaAtual;

        if (quantidadeDisponivel > 0) {
          componentesDisponiveis.push({
            ...componente,
            quantidade_disponivel: quantidadeDisponivel
          });
        }
      }
    }

    return { pecasDisponiveis, componentesDisponiveis };
  }, [processos, buscarQuantidadeProcessada, calcularQuantidadeDisponivelProcessoAnterior]);

  return {
    historico,
    loading,
    buscarHistoricoOF,
    validarSequenciaProcesso,
    calcularItensDisponiveis
  };
};
