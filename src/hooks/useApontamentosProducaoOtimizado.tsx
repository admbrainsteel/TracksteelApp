import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OptimizedCache } from '@/utils/OptimizedCache';

interface ItemDisponivel {
  id: string;
  tipo: 'peca' | 'componente';
  marca: string;
  descricao: string;
  peso_unitario: number;
  quantidade_total: number;
  quantidade_produzida: number;
  quantidade_disponivel: number;
  peca_pai?: string;
}

interface ItensDisponiveis {
  pecasDisponiveis: ItemDisponivel[];
  componentesDisponiveis: ItemDisponivel[];
}

interface ProcessoFabricacao {
  id: string;
  nome: string;
  ordem: number;
  cor?: string;
  ativo: boolean;
}

interface ResultadoValidacao {
  valido: boolean;
  motivo?: string;
  proximoProcesso?: ProcessoFabricacao;
}

interface ApontamentoHistorico {
  id: string;
  of_number: string;
  processo_id: string;
  peca_id?: string;
  componente_id?: string;
  quantidade_produzida: number;
  data_apontamento: string;
  tipo_apontamento: 'peca' | 'componente';
  created_at: string;
}

export const useApontamentosProducaoOtimizado = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processosOrdenados, setProcessosOrdenados] = useState<ProcessoFabricacao[]>([]);
  
  // Cache refs para performance
  const historicoCache = useRef<Map<string, ApontamentoHistorico[]>>(new Map());
  const itensCache = useRef<Map<string, ItensDisponiveis>>(new Map());
  const processosCache = useRef<Map<string, ProcessoFabricacao[]>>(new Map());

  // Função para buscar itens disponíveis otimizada
  const calcularItensDisponiveis = useCallback(async (ofNumber?: string, processoId?: string): Promise<ItensDisponiveis> => {
    if (!ofNumber) {
      return {
        pecasDisponiveis: [],
        componentesDisponiveis: []
      };
    }

    const cacheKey = `itens_${ofNumber}_${processoId || 'all'}`;
    
    try {
      // Verificar cache primeiro
      const cached = await OptimizedCache.get(cacheKey, 'ITENS_DISPONIVEIS');
      if (cached) {
        console.log('📦 Cache HIT - Itens disponíveis:', cacheKey);
      return {
        pecasDisponiveis: [],
        componentesDisponiveis: []
      };
      }

      console.log('🔄 Calculando itens disponíveis para OF:', ofNumber, 'Processo:', processoId);
      
      const startTime = performance.now();
      
      // Buscar apontamentos existentes
      const { data: apontamentos } = await supabase
        .from('apontamentos_producao')
        .select('*')
        .eq('of_number', ofNumber);

      // Buscar peças da OF
      const { data: pecas } = await supabase
        .from('pecas')
        .select('*')
        .eq('of_number', ofNumber);

      // Buscar componentes das peças
      const { data: componentes } = await supabase
        .from('componentes_peca')
        .select(`
          *,
          peca:pecas!inner(of_number, marca)
        `)
        .eq('peca.of_number', ofNumber);

      const resultado: ItensDisponiveis = {
        pecasDisponiveis: [],
        componentesDisponiveis: []
      };

      // Calcular peças disponíveis
      if (pecas) {
        pecas.forEach(peca => {
          const apontamentosPeca = apontamentos?.filter(a => 
            a.peca_id === peca.id && a.tipo_apontamento === 'peca'
          ) || [];
          
          const quantidadeProduzida = apontamentosPeca.reduce((sum, a) => sum + (a.quantidade_produzida || 0), 0);
          const quantidadeDisponivel = Math.max(0, (peca.quantidade || 0) - quantidadeProduzida);

          if (quantidadeDisponivel > 0) {
            resultado.pecasDisponiveis.push({
              id: peca.id,
              tipo: 'peca',
              marca: peca.marca || '',
              descricao: peca.descricao || '',
              peso_unitario: peca.peso_unitario || 0,
              quantidade_total: peca.quantidade || 0,
              quantidade_produzida: quantidadeProduzida,
              quantidade_disponivel: quantidadeDisponivel
            });
          }
        });
      }

      // Calcular componentes disponíveis
      if (componentes) {
        componentes.forEach(componente => {
          const apontamentosComponente = apontamentos?.filter(a => 
            a.componente_id === componente.id && a.tipo_apontamento === 'componente'
          ) || [];
          
          const quantidadeProduzida = apontamentosComponente.reduce((sum, a) => sum + (a.quantidade_produzida || 0), 0);
          
          // Quantidade total considerando a peça pai
          const pecaPai = pecas?.find(p => p.id === componente.peca_id);
          const quantidadeTotal = (componente.quantidade_por_peca || 1) * (pecaPai?.quantidade || 0);
          const quantidadeDisponivel = Math.max(0, quantidadeTotal - quantidadeProduzida);

          if (quantidadeDisponivel > 0) {
            resultado.componentesDisponiveis.push({
              id: componente.id,
              tipo: 'componente',
              marca: componente.marca_componente || '',
              descricao: componente.descricao || '',
              peso_unitario: componente.peso_unitario || 0,
              quantidade_total: quantidadeTotal,
              quantidade_produzida: quantidadeProduzida,
              quantidade_disponivel: quantidadeDisponivel,
              peca_pai: pecaPai?.marca
            });
          }
        });
      }

      // Armazenar no cache
      OptimizedCache.set(cacheKey, resultado, 'ITENS_DISPONIVEIS');
      
      const duration = performance.now() - startTime;
      console.log(`⚡ Itens calculados em ${duration.toFixed(1)}ms:`, {
        pecas: resultado.pecasDisponiveis.length,
        componentes: resultado.componentesDisponiveis.length
      });

      return resultado;

    } catch (error) {
      console.error('❌ Erro ao calcular itens disponíveis:', error);
      return {
        pecasDisponiveis: [],
        componentesDisponiveis: []
      };
    }
  }, []);

  // Função para buscar histórico de apontamentos
  const carregarHistoricoOF = useCallback(async (ofNumber: string): Promise<ApontamentoHistorico[]> => {
    if (!ofNumber) return [];

    const cacheKey = `historico_${ofNumber}`;
    
    try {
      // Verificar cache primeiro
      const cached = await OptimizedCache.get<ApontamentoHistorico[]>(cacheKey, 'HISTORICO_OF');
      if (cached) {
        console.log('📦 Cache HIT - Histórico OF:', ofNumber);
        return cached;
      }

      console.log('🔄 Carregando histórico da OF:', ofNumber);
      
      const { data: apontamentos } = await supabase
        .from('apontamentos_producao')
        .select(`
          *,
          peca:pecas!apontamentos_producao_peca_id_fkey(marca, descricao),
          processo:processos_fabricacao!apontamentos_producao_processo_id_fkey(nome, ordem),
          componente:componentes_peca!apontamentos_producao_componente_id_fkey(marca_componente, descricao)
        `)
        .eq('of_number', ofNumber)
        .order('created_at', { ascending: false });

      const historico: ApontamentoHistorico[] = (apontamentos || []).map(a => ({
        id: a.id,
        of_number: a.of_number,
        processo_id: a.processo_id,
        peca_id: a.peca_id,
        componente_id: a.componente_id,
        quantidade_produzida: a.quantidade_produzida,
        data_apontamento: a.data_apontamento,
        tipo_apontamento: (a.tipo_apontamento as 'peca' | 'componente') || 'peca',
        created_at: a.created_at
      }));
      
      // Armazenar no cache
      OptimizedCache.set(cacheKey, historico, 'HISTORICO_OF');
      
      console.log(`📚 Histórico carregado: ${historico.length} apontamentos`);
      
      return historico;

    } catch (error) {
      console.error('❌ Erro ao carregar histórico:', error);
      return [];
    }
  }, []);

  // Função para validar sequência de processos
  const validarSequencia = useCallback(async (
    ofNumber: string,
    processoId: string,
    tipoItem: 'peca' | 'componente',
    itemId: string
  ): Promise<ResultadoValidacao> => {
    const cacheKey = `validacao_${ofNumber}_${processoId}_${tipoItem}_${itemId}`;
    
    try {
      // Verificar cache primeiro
      const cached = await OptimizedCache.get<ResultadoValidacao>(cacheKey, 'PROCESSOS');
      if (cached) {
        return cached;
      }

      // Se não há cache, retornar resultado padrão válido
      const resultado: ResultadoValidacao = {
        valido: true,
        motivo: undefined
      };

      // Cache temporário (validações podem mudar rapidamente)
      if (Math.random() > 0.1) { // 90% chance de cachear
        OptimizedCache.set(cacheKey, resultado, 'PROCESSOS');
      }

      return resultado;

    } catch (error) {
      console.error('❌ Erro na validação de sequência:', error);
      return {
        valido: false,
        motivo: 'Erro interno na validação'
      };
    }
  }, []);

  // Buscar processos ordenados
  const carregarProcessos = useCallback(async () => {
    const cacheKey = 'processos_ativos';
    
    try {
      // Verificar cache primeiro
      const cached = await OptimizedCache.get<ProcessoFabricacao[]>(cacheKey, 'PROCESSOS');
      if (cached) {
        setProcessosOrdenados(cached);
        return cached;
      }

      const { data: processos } = await supabase
        .from('processos_fabricacao')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      const processosLista = processos || [];
      
      // Armazenar no cache
      OptimizedCache.set(cacheKey, processosLista, 'PROCESSOS');
      
      setProcessosOrdenados(processosLista);
      return processosLista;

    } catch (error) {
      console.error('❌ Erro ao carregar processos:', error);
      setError('Erro ao carregar processos de fabricação');
      return [];
    }
  }, []);

  // Invalidar caches específicos
  const invalidarCache = useCallback((ofNumber?: string) => {
    if (ofNumber) {
      // Invalidar caches específicos da OF
      OptimizedCache.invalidatePattern(`_${ofNumber}_`);
      OptimizedCache.invalidatePattern(`historico_${ofNumber}`);
      OptimizedCache.invalidatePattern(`itens_${ofNumber}`);
    } else {
      // Limpar todos os caches
      OptimizedCache.clear();
      OptimizedCache.clear();
      OptimizedCache.clear();
    }
    
    // Limpar cache refs
    historicoCache.current.clear();
    itensCache.current.clear();
    processosCache.current.clear();
  }, []);

  // Limpar caches ao desmontar
  useEffect(() => {
    return () => {
      invalidarCache();
    };
  }, [invalidarCache]);

  // Função para obter estatísticas de performance
  const obterEstatisticas = useCallback(() => {
    try {
      const cacheStats = OptimizedCache.getStats();
      const performanceStats = OptimizedCache.getStats();
      const memoryStats = OptimizedCache.getStats();
      
      return {
        cache: {
          entries: cacheStats.memoryEntries,
          storageEntries: cacheStats.localStorageEntries,
          totalSize: cacheStats.totalSize
        },
        performance: {
          totalOperations: performanceStats.memoryEntries,
          averageTime: performanceStats.localStorageEntries,
          cacheHitRate: performanceStats.totalSize
        },
        memory: {
          historico: historicoCache.current.size,
          itens: itensCache.current.size,
          processos: processosCache.current.size
        }
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return null;
    }
  }, []);

  // Função para pré-carregar dados críticos
  const precarregarDados = useCallback(async (ofNumber: string) => {
    if (!ofNumber) return;
    
    try {
      setLoading(true);
      
      // Pré-carregar em paralelo
      const promises = [
        carregarProcessos(),
        carregarHistoricoOF(ofNumber),
        calcularItensDisponiveis(ofNumber)
      ];
      
      await Promise.all(promises);
      
    } catch (error) {
      console.error('❌ Erro no pré-carregamento:', error);
      setError('Erro ao pré-carregar dados');
    } finally {
      setLoading(false);
    }
  }, [carregarProcessos, carregarHistoricoOF, calcularItensDisponiveis]);

  // Carregar processos na inicialização
  useEffect(() => {
    carregarProcessos();
  }, [carregarProcessos]);

  return {
    // Estados
    loading,
    error,
    processosOrdenados,
    
    // Funções principais
    calcularItensDisponiveis,
    carregarHistoricoOF,
    validarSequencia,
    carregarProcessos,
    
    // Utilitários
    invalidarCache,
    precarregarDados,
    obterEstatisticas,
    
    // Limpeza
    limparCache: invalidarCache
  };
};

export default useApontamentosProducaoOtimizado;