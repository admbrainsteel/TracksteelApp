import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ValidacaoProcesso {
  processoId: string;
  ordenacaoCorreta: boolean;
  proximoProcessoEsperado?: string;
}

interface ResultadoValidacao {
  valido: boolean;
  erro?: string;
  processosInvalidos?: ValidacaoProcesso[];
}

export const useApontamentosValidacao = () => {
  const cacheApontamentos = useRef<Map<string, any[]>>(new Map());
  const processosCache = useRef<Map<string, any[]>>(new Map());
  const pecasCache = useRef<Map<string, any[]>>(new Map());
  const idsProcessados = useRef<Map<string, any[]>>(new Map());

  const validarSequenciaProcessos = useCallback(async (
    ofNumber: string, 
    processoId: string, 
    tipoItem: 'peca' | 'componente',
    itemId: string
  ): Promise<ResultadoValidacao> => {
    try {
      // Buscar processo atual e sua ordem
      const { data: processoAtual } = await supabase
        .from('processos_fabricacao')
        .select('id, nome, ordem')
        .eq('id', processoId)
        .single();

      if (!processoAtual) {
        return {
          valido: false,
          erro: 'Processo não encontrado'
        };
      }

      // Buscar apontamentos anteriores para este item
      const query = supabase
        .from('apontamentos_producao')
        .select(`
          id,
          processo_id,
          data_apontamento,
          processos_fabricacao:processo_id (
            id,
            nome,
            ordem
          )
        `)
        .eq('of_number', ofNumber)
        .eq('tipo_apontamento', tipoItem);

      if (tipoItem === 'peca') {
        query.eq('peca_id', itemId);
      } else {
        query.eq('componente_id', itemId);
      }

      const { data: apontamentosAnteriores } = await query
        .order('data_apontamento', { ascending: true });

      if (!apontamentosAnteriores || apontamentosAnteriores.length === 0) {
        // Primeiro apontamento, sempre válido
        return { valido: true };
      }

      // Verificar se a sequência está correta
      const processosJaExecutados = apontamentosAnteriores.map(a => a.processos_fabricacao.ordem);
      const ordemAtual = processoAtual.ordem;

      // Verificar se existe algum processo com ordem maior que já foi executado
      const temProcessoFuturoExecutado = processosJaExecutados.some(ordem => ordem > ordemAtual);

      if (temProcessoFuturoExecutado) {
        return {
          valido: false,
          erro: `Não é possível apontar para ${processoAtual.nome} (ordem ${ordemAtual}), pois já existem apontamentos para processos posteriores.`
        };
      }

      // Verificar se todos os processos anteriores foram executados
      const { data: processosAnteriores } = await supabase
        .from('processos_fabricacao')
        .select('id, nome, ordem')
        .lt('ordem', ordemAtual)
        .eq('ativo', true)
        .order('ordem');

      if (processosAnteriores && processosAnteriores.length > 0) {
        const ordensNecessarias = processosAnteriores.map(p => p.ordem);
        const ordensExecutadas = [...new Set(processosJaExecutados)];
        
        const processosFaltantes = ordensNecessarias.filter(ordem => !ordensExecutadas.includes(ordem));
        
        if (processosFaltantes.length > 0) {
          const nomesFaltantes = processosAnteriores
            .filter(p => processosFaltantes.includes(p.ordem))
            .map(p => p.nome)
            .join(', ');
            
          return {
            valido: false,
            erro: `É necessário executar primeiro os processos: ${nomesFaltantes}`
          };
        }
      }

      return { valido: true };

    } catch (error) {
      console.error('Erro na validação de sequência:', error);
      return {
        valido: false,
        erro: 'Erro interno na validação'
      };
    }
  }, []);

  const precarregarDados = useCallback(async (ofNumber: string) => {
    try {
      // Pré-carregar apontamentos da OF
      const { data: apontamentos } = await supabase
        .from('apontamentos_producao')
        .select(`
          *,
          processos_fabricacao:processo_id (id, nome, ordem)
        `)
        .eq('of_number', ofNumber);

      if (apontamentos) {
        // Agrupar por processo para cache
        const apontamentosPorProcesso = apontamentos.reduce((acc, apontamento) => {
          const key = `${apontamento.processo_id}_${apontamento.tipo_apontamento}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(apontamento);
          return acc;
        }, {} as Record<string, any[]>);
        
        Object.entries(apontamentosPorProcesso).forEach(([processoId, apontamentos]) => {
          if (!cacheApontamentos.current) {
            cacheApontamentos.current = new Map();
          }
          cacheApontamentos.current.set(processoId, apontamentos);
        });
      }
      
      // Pré-carregar informações das peças da OF
      const { data: pecas } = await supabase
        .from('pecas')
        .select('*')
        .eq('of_number', ofNumber);

      if (pecas) {
        pecasCache.current?.set(ofNumber, pecas);
      }

      // Pré-carregar processos
      const { data: processos } = await supabase
        .from('processos_fabricacao')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (processos) {
        processosCache.current?.set('ativos', processos);
      }

    } catch (error) {
      console.error('Erro ao pré-carregar dados para validação:', error);
    }
  }, []);

  const limparCache = useCallback(() => {
    cacheApontamentos.current?.clear();
    processosCache.current?.clear();
    pecasCache.current?.clear();
    idsProcessados.current?.clear();
  }, []);

  return {
    validarSequenciaProcessos,
    precarregarDados,
    limparCache
  };
};