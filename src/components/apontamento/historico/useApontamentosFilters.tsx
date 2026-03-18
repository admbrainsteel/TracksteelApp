import { useState, useMemo, useEffect } from 'react';
import { ApontamentoProducao } from '@/hooks/useApontamentosProducao';

// Cache para lembrar os últimos filtros utilizados
const historicCache = {
  lastOF: '',
  lastFase: '',
  lastProcesso: ''
};

export const useApontamentosFilters = (apontamentos: ApontamentoProducao[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOF, setFilterOF] = useState('');
  const [filterFase, setFilterFase] = useState('');
  const [filterProcesso, setFilterProcesso] = useState('');
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [initialized, setInitialized] = useState(false);

  // Logs detalhados para debug
  useEffect(() => {
    console.log(`🔍 DADOS RECEBIDOS NO FILTRO: ${apontamentos.length} apontamentos`);
    
    if (apontamentos.length > 0) {
      // Verificar OF B118 especificamente
      const b118Records = apontamentos.filter(apt => apt.of_number === 'B118');
      console.log(`🎯 OF B118 no filtro: ${b118Records.length} registros`);
      
      // Mostrar alguns exemplos
      if (b118Records.length > 0) {
        console.log('🔍 Primeiros 5 registros B118:', 
          b118Records.slice(0, 5).map(apt => ({
            id: apt.id,
            of: apt.of_number,
            peca: apt.peca?.marca,
            processo: apt.processo?.nome,
            data: apt.data_apontamento
          }))
        );
      }
    }
  }, [apontamentos]);

  // Carregar cache inicial apenas uma vez
  useEffect(() => {
    if (!initialized) {
      console.log(`📊 Inicializando filtros com ${apontamentos.length} apontamentos totais`);
      
      const savedCache = localStorage.getItem('historico_apontamentos_cache');
      if (savedCache) {
        try {
          const parsed = JSON.parse(savedCache);
          Object.assign(historicCache, parsed);
          console.log('📋 Cache carregado:', historicCache);
        } catch (error) {
          console.log('⚠️ Erro ao carregar cache do histórico:', error);
        }
      }

      // NÃO aplicar filtros do cache automaticamente - deixar limpo por padrão
      setInitialized(true);
    }
  }, [apontamentos, initialized]);

  // Salvar cache quando filtros mudam
  const updateCache = (updates: Partial<typeof historicCache>) => {
    Object.assign(historicCache, updates);
    localStorage.setItem('historico_apontamentos_cache', JSON.stringify(historicCache));
  };

  // Obter valores únicos para filtros - SEMPRE todos os valores disponíveis
  const uniqueOFs = useMemo(() => {
    const ofs = apontamentos
      .map(apt => apt.of_number)
      .filter((of): of is string => {
        return typeof of === 'string' && of.trim() !== '';
      })
      .filter((of, index, array) => array.indexOf(of) === index)
      .sort();
    
    console.log(`📋 OFs únicas encontradas: ${ofs.length}`, ofs.slice(0, 10), '...');
    return ofs;
  }, [apontamentos]);

  const uniqueFases = useMemo(() => {
    // Se não há OF selecionada, mostrar todas as fases
    const apontamentosFiltrados = filterOF && filterOF !== '' 
      ? apontamentos.filter(apt => apt.of_number === filterOF)
      : apontamentos;

    const fases = apontamentosFiltrados
      .map(apt => apt.peca?.etapa_fase)
      .filter((fase): fase is string => {
        return typeof fase === 'string' && fase.trim() !== '';
      })
      .filter((fase, index, array) => array.indexOf(fase) === index)
      .sort();
    
    console.log(`📋 Fases únicas encontradas para OF "${filterOF}": ${fases.length}`, fases);
    return fases;
  }, [apontamentos, filterOF]);

  const uniqueProcessos = useMemo(() => {
    // Aplicar filtros hierárquicos apenas se existirem
    let apontamentosFiltrados = apontamentos;
    
    if (filterOF && filterOF !== '') {
      apontamentosFiltrados = apontamentosFiltrados.filter(apt => apt.of_number === filterOF);
    }
    
    if (filterFase && filterFase !== '') {
      apontamentosFiltrados = apontamentosFiltrados.filter(apt => apt.peca?.etapa_fase === filterFase);
    }

    const processos = apontamentosFiltrados
      .map(apt => apt.processo?.nome)
      .filter((processo): processo is string => {
        return typeof processo === 'string' && processo.trim() !== '';
      })
      .filter((processo, index, array) => array.indexOf(processo) === index)
      .sort();
    
    console.log(`📋 Processos únicos encontrados para OF "${filterOF}" e Fase "${filterFase}": ${processos.length}`, processos);
    return processos;
  }, [apontamentos, filterOF, filterFase]);

  // Filtrar apontamentos - LÓGICA SIMPLIFICADA E CORRIGIDA
  const filteredApontamentos = useMemo(() => {
    if (!initialized) {
      console.log('⏳ Aguardando inicialização...');
      return [];
    }
    
    console.log(`🔍 INICIANDO FILTRAGEM DE ${apontamentos.length} APONTAMENTOS`);
    console.log('🔍 Filtros ativos:', { 
      searchTerm: searchTerm || 'VAZIO', 
      filterOF: filterOF || 'VAZIO', 
      filterFase: filterFase || 'VAZIO', 
      filterProcesso: filterProcesso || 'VAZIO',
      dataInicio: dataInicio ? 'SIM' : 'NÃO',
      dataFim: dataFim ? 'SIM' : 'NÃO'
    });
    
    let resultado = [...apontamentos]; // Começar com TODOS os apontamentos
    
    // Aplicar filtro de busca textual APENAS se preenchido
    if (searchTerm && searchTerm.trim() !== '') {
      const searchLower = searchTerm.toLowerCase();
      const beforeSearch = resultado.length;
      
      resultado = resultado.filter(apt => 
        (apt.of_number && apt.of_number.toLowerCase().includes(searchLower)) ||
        (apt.peca?.marca && apt.peca.marca.toLowerCase().includes(searchLower)) ||
        (apt.componente?.marca_componente && apt.componente.marca_componente.toLowerCase().includes(searchLower))
      );
      
      console.log(`🔎 Filtro texto "${searchTerm}": ${beforeSearch} → ${resultado.length} registros`);
    }
    
    // Aplicar filtro por OF APENAS se selecionado
    if (filterOF && filterOF !== '' && filterOF !== 'all') {
      const beforeOF = resultado.length;
      resultado = resultado.filter(apt => apt.of_number === filterOF);
      console.log(`🏷️ Filtro OF "${filterOF}": ${beforeOF} → ${resultado.length} registros`);
    }
    
    // Aplicar filtro por Fase APENAS se selecionado
    if (filterFase && filterFase !== '' && filterFase !== 'all') {
      const beforeFase = resultado.length;
      resultado = resultado.filter(apt => apt.peca?.etapa_fase === filterFase);
      console.log(`📋 Filtro Fase "${filterFase}": ${beforeFase} → ${resultado.length} registros`);
    }
    
    // Aplicar filtro por Processo APENAS se selecionado
    if (filterProcesso && filterProcesso !== '' && filterProcesso !== 'all') {
      const beforeProcesso = resultado.length;
      resultado = resultado.filter(apt => apt.processo?.nome === filterProcesso);
      console.log(`⚙️ Filtro Processo "${filterProcesso}": ${beforeProcesso} → ${resultado.length} registros`);
    }
    
    // Aplicar filtros de data APENAS se definidos
    if (dataInicio || dataFim) {
      const beforeData = resultado.length;
      
      resultado = resultado.filter(apt => {
        const apontamentoDate = new Date(apt.data_apontamento);
        let matchesDataInicio = true;
        let matchesDataFim = true;
        
        if (dataInicio) {
          matchesDataInicio = apontamentoDate >= dataInicio;
        }
        if (dataFim) {
          matchesDataFim = apontamentoDate <= dataFim;
        }
        
        return matchesDataInicio && matchesDataFim;
      });
      
      console.log(`📅 Filtro Data: ${beforeData} → ${resultado.length} registros`);
    }
    
    console.log(`✅ RESULTADO FINAL DA FILTRAGEM: ${resultado.length} de ${apontamentos.length} apontamentos`);
    
    // Log específico para B118 se estiver sendo filtrado
    if (filterOF === 'B118') {
      console.log(`🎯 Resultado B118: ${resultado.length} registros filtrados`);
    }
    
    return resultado;
  }, [apontamentos, searchTerm, filterOF, filterFase, filterProcesso, dataInicio, dataFim, initialized]);

  const clearFilters = () => {
    console.log('🧹 Limpando todos os filtros');
    setSearchTerm('');
    setFilterOF('');
    setFilterFase('');
    setFilterProcesso('');
    setDataInicio(undefined);
    setDataFim(undefined);
    
    // Limpar cache
    Object.assign(historicCache, { lastOF: '', lastFase: '', lastProcesso: '' });
    localStorage.removeItem('historico_apontamentos_cache');
  };

  const handleOFChange = (value: string) => {
    const selectedValue = value === 'all' ? '' : value;
    console.log('🔄 Mudando OF para:', selectedValue);
    setFilterOF(selectedValue);
    // Limpar fase e processo quando OF muda
    setFilterFase('');
    setFilterProcesso('');
    updateCache({ lastOF: selectedValue, lastFase: '', lastProcesso: '' });
  };

  const handleFaseChange = (value: string) => {
    const selectedValue = value === 'all' ? '' : value;
    console.log('🔄 Mudando Fase para:', selectedValue);
    setFilterFase(selectedValue);
    // Limpar processo quando fase muda
    setFilterProcesso('');
    updateCache({ lastFase: selectedValue, lastProcesso: '' });
  };

  const handleProcessoChange = (value: string) => {
    const selectedValue = value === 'all' ? '' : value;
    console.log('🔄 Mudando Processo para:', selectedValue);
    setFilterProcesso(selectedValue);
    updateCache({ lastProcesso: selectedValue });
  };

  return {
    searchTerm,
    setSearchTerm,
    filterOF,
    filterFase,
    filterProcesso,
    dataInicio,
    dataFim,
    setDataInicio,
    setDataFim,
    uniqueOFs,
    uniqueFases,
    uniqueProcessos,
    filteredApontamentos,
    initialized,
    handleOFChange,
    handleFaseChange,
    handleProcessoChange,
    clearFilters
  };
};
