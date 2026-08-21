import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Função utilitária para retry de requisições
const retryRequest = async <T,>(
  requestFn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Tentativa ${attempt}/${maxRetries}`);
      return await requestFn();
    } catch (error) {
      lastError = error as Error;
      console.warn(`⚠️ Tentativa ${attempt} falhou:`, error);
      
      // Se é o último retry ou não é um erro de rede, não tenta novamente
      if (attempt === maxRetries || 
          (!lastError.message.includes('ERR_ABORTED') && 
           !lastError.message.includes('Failed to fetch') &&
           !lastError.message.includes('aborted'))) {
        throw lastError;
      }
      
      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  
  throw lastError!;
};

export interface ApontamentoProducao {
  id: string;
  of_number: string;
  peca_id: string;
  componente_id?: string;
  tipo_apontamento: 'peca' | 'componente';
  processo_id: string;
  quantidade_produzida: number;
  data_apontamento: string;
  observacoes?: string;
  created_at: string;
  created_by?: string;
  peca?: {
    marca: string;
    descricao: string;
    peso_unitario: number;
    etapa_fase: string;
  };
  processo?: {
    nome: string;
    ordem: number;
  };
  componente?: {
    marca_componente: string;
    descricao: string;
    peso_unitario: number;
  };
}

export interface ProcessoFabricacao {
  id: string;
  nome: string;
  descricao?: string;
  ordem: number;
  ativo: boolean;
  cor?: string;
}

export const useApontamentosProducao = () => {
  const [apontamentos, setApontamentos] = useState<ApontamentoProducao[]>([]);
  const [processos, setProcessos] = useState<ProcessoFabricacao[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchApontamentos = useCallback(async () => {
    try {
      console.log('🔍 Iniciando busca COMPLETA de apontamentos...');
      
      // Verificar se o usuário está autenticado
      if (!user) {
        console.warn('⚠️ Usuário não autenticado em useApontamentosProducao');
        return;
      }
      
      console.log('✅ Usuário autenticado:', user.id);
      
      const { count: totalCount, error: countError } = await retryRequest(async () => {
        const result = await supabase
          .from('apontamentos_producao')
          .select('*', { count: 'exact', head: true });
        return result;
      });

      if (countError) {
        console.error('❌ Erro ao contar registros:', countError);
        console.error('❌ Detalhes do erro:', {
          message: countError.message,
          details: countError.details,
          hint: countError.hint,
          code: countError.code
        });
        toast.error('Erro ao acessar dados: ' + countError.message);
        throw countError;
      }

      console.log(`📊 TOTAL DE REGISTROS NA TABELA: ${totalCount}`);

      // SEGUNDA VERIFICAÇÃO: Buscar TODOS os apontamentos sem qualquer limitação
      let allApontamentos: ApontamentoProducao[] = [];
      let pageNumber: number = 0;
      const itemsPerPage: number = 1000; // Buscar em lotes de 1000 para evitar timeout
      let hasMoreData: boolean = true;

      while (hasMoreData) {
        const startIndex: number = pageNumber * itemsPerPage;
        const endIndex: number = (pageNumber + 1) * itemsPerPage - 1;
        
        console.log(`📄 Buscando página ${pageNumber + 1} (registros ${startIndex + 1} a ${endIndex + 1})`);
        
        const { data: pageData, error: pageError } = await retryRequest(async () => {
          const result = await supabase
            .from('apontamentos_producao')
            .select(`
              *,
              peca:pecas(marca, descricao, peso_unitario, etapa_fase),
              processo:processos_fabricacao(nome, ordem),
              componente:componentes_peca(marca_componente, descricao, peso_unitario)
            `)
            .range(startIndex, endIndex)
            .order('created_at', { ascending: false });
          return result;
        });

        if (pageError) {
          console.error('❌ Erro ao buscar página:', pageError);
          throw pageError;
        }

        if (!pageData || pageData.length === 0) {
          hasMoreData = false;
          break;
        }

        allApontamentos = [...allApontamentos, ...(pageData as unknown as ApontamentoProducao[])];
        console.log(`✅ Página ${pageNumber + 1}: ${pageData.length} registros carregados. Total acumulado: ${allApontamentos.length}`);

        // Se retornou menos que o itemsPerPage, chegamos ao fim
        if (pageData.length < itemsPerPage) {
          hasMoreData = false;
        }

        pageNumber++;
      }

      console.log(`🎯 BUSCA FINALIZADA: ${allApontamentos.length} de ${totalCount || 0} registros carregados`);

      // Verificar especificamente OF B118
      const b118Count: number = allApontamentos.filter(apt => apt.of_number === 'B118').length;
      console.log(`🔍 OF B118: ${b118Count} apontamentos encontrados`);

      // Verificar distribuição por OF
      const ofCounts = allApontamentos.reduce((acc, apt) => {
        const of = apt.of_number || 'SEM_OF';
        acc[of] = (acc[of] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('📋 Distribuição por OF (primeiros 10):', 
        Object.entries(ofCounts)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 10)
      );

      // Cast the tipo_apontamento to the correct type
      const typedData = allApontamentos.map(item => ({
        ...item,
        tipo_apontamento: (item.tipo_apontamento || 'peca') as 'peca' | 'componente'
      }));

      setApontamentos(typedData);
      
      console.log(`✅ DADOS CARREGADOS COMPLETAMENTE: ${typedData.length} apontamentos`);
      
    } catch (error) {
      console.error('❌ ERRO CRÍTICO ao buscar apontamentos:', error);
      
      // Diagnóstico detalhado do erro
      if (error instanceof Error) {
        console.error('❌ Tipo de erro:', error.name);
        console.error('❌ Mensagem:', error.message);
        console.error('❌ Stack:', error.stack);
        
        // Verificar se é um erro de rede
        if (error.message.includes('ERR_ABORTED') || error.message.includes('aborted')) {
          console.error('🚨 ERRO DE REDE DETECTADO: ERR_ABORTED');
          toast.error('Erro de conexão: Requisição cancelada. Verifique sua conexão com a internet.');
        } else if (error.message.includes('Failed to fetch')) {
          console.error('🚨 ERRO DE FETCH DETECTADO');
          toast.error('Erro de conexão: Falha ao conectar com o servidor.');
        } else {
          toast.error('Erro ao carregar apontamentos: ' + error.message);
        }
      } else {
        console.error('❌ Erro desconhecido:', error);
        toast.error('Erro desconhecido ao carregar apontamentos');
      }
    }
  }, [user]);

  const fetchProcessos = useCallback(async () => {
    try {
      console.log('Buscando processos...');
      const { data, error } = await retryRequest(async () => {
        const result = await supabase
          .from('processos_fabricacao')
          .select('*')
          .eq('ativo', true)
          .order('ordem');
        return result;
      });

      if (error) {
        console.error('Erro ao buscar processos:', error);
        throw error;
      }

      console.log(`Processos carregados: ${data?.length || 0} registros`);
      setProcessos(data || []);
    } catch (error) {
      console.error('Erro ao buscar processos:', error);
      toast.error('Erro ao carregar processos');
    }
  }, []);

  const buscarQuantidadeProcessada = useCallback(async (
    marcaItem: string, 
    processoId: string, 
    ofNumber: string, 
    tipoItem: 'peca' | 'componente' = 'peca'
  ): Promise<number> => {
    try {
      let query = supabase
        .from('apontamentos_producao')
        .select('quantidade_produzida')
        .eq('processo_id', processoId)
        .eq('of_number', ofNumber)
        .eq('tipo_apontamento', tipoItem);

      if (tipoItem === 'componente') {
        // Para componentes, buscar pela marca_componente
        const { data: componentesData, error: componentesError } = await supabase
          .from('componentes_peca')
          .select('id')
          .eq('marca_componente', marcaItem);

        if (componentesError || !componentesData?.length) {
          console.log(`Nenhum componente encontrado para marca: ${marcaItem}`);
          return 0;
        }

        const componenteIds = componentesData.map(c => c.id);
        query = query.in('componente_id', componenteIds);
      } else {
        // Para peças, buscar pela marca da peça
        const { data: pecasData, error: pecasError } = await supabase
          .from('pecas')
          .select('id')
          .eq('marca', marcaItem)
          .eq('of_number', ofNumber);

        if (pecasError || !pecasData?.length) {
          console.log(`Nenhuma peça encontrada para marca: ${marcaItem} na OF: ${ofNumber}`);
          return 0;
        }

        const pecaIds = pecasData.map(p => p.id);
        query = query.in('peca_id', pecaIds);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar quantidade processada:', error);
        return 0;
      }

      const totalProcessado: number = data?.reduce((sum, apt) => sum + apt.quantidade_produzida, 0) || 0;
      
      console.log(`Quantidade processada para ${marcaItem} no processo ${processoId}: ${totalProcessado}`);
      
      return totalProcessado;
    } catch (error) {
      console.error('Erro ao buscar quantidade processada:', error);
      return 0;
    }
  }, []);

  const criarApontamento = useCallback(async (apontamento: {
    of_number: string;
    peca_id?: string;
    componente_id?: string;
    tipo_apontamento: 'peca' | 'componente';
    processo_id: string;
    quantidade_produzida: number;
    data_apontamento: string;
    observacoes?: string;
  }) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      console.log('🔄 Criando apontamento:', apontamento);

interface InsertApontamentoData {
  of_number: string;
  tipo_apontamento: 'peca' | 'componente';
  processo_id: string;
  quantidade_produzida: number;
  data_apontamento: string;
  observacoes?: string | null;
  created_by?: string;
  peca_id?: string | null;
  componente_id?: string | null;
}

      const insertData: InsertApontamentoData = {
        of_number: apontamento.of_number,
        tipo_apontamento: apontamento.tipo_apontamento,
        processo_id: apontamento.processo_id,
        quantidade_produzida: apontamento.quantidade_produzida,
        data_apontamento: apontamento.data_apontamento,
        observacoes: apontamento.observacoes || null,
        created_by: user.id
      };

      // Para componentes, precisamos buscar o peca_id da peça pai
      if (apontamento.tipo_apontamento === 'componente' && apontamento.componente_id) {
        // Buscar a peça pai do componente
        const { data: componenteData, error: componenteError } = await supabase
          .from('componentes_peca')
          .select('peca_id')
          .eq('id', apontamento.componente_id)
          .single();

        if (componenteError || !componenteData) {
          throw new Error('Erro ao buscar dados do componente');
        }

        insertData.componente_id = apontamento.componente_id;
        insertData.peca_id = componenteData.peca_id; // Usar o peca_id da peça pai
      } else {
        insertData.peca_id = apontamento.peca_id;
        insertData.componente_id = null;
      }

      // Inserir o apontamento
      const { error } = await supabase
        .from('apontamentos_producao')
        .insert(insertData);

      if (error) {
        console.error('❌ Erro SQL:', error);
        throw error;
      }

      console.log('✅ Apontamento criado com sucesso, forçando atualização completa...');
      
      // FORÇA ATUALIZAÇÃO COMPLETA DOS DADOS
      await new Promise(resolve => setTimeout(resolve, 500)); // Aguarda 500ms para garantir persistência
      await fetchApontamentos();
      
      // Log de verificação
      console.log(`🔍 Verificando apontamento criado para OF ${apontamento.of_number}`);
      
      toast.success('Apontamento registrado com sucesso!');
      
      return { success: true };
    } catch (error) {
      console.error('❌ Erro ao criar apontamento:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      toast.error('Erro ao registrar apontamento: ' + errorMessage);
      return { success: false, error };
    }
  }, [user, fetchApontamentos]);

  const criarProcesso = async (processo: Omit<ProcessoFabricacao, 'id'>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('processos_fabricacao')
        .insert({
          ...processo,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Processo criado com sucesso!');
      await fetchProcessos();
      return { success: true, data };
    } catch (error) {
      console.error('Erro ao criar processo:', error);
      toast.error('Erro ao criar processo');
      return { success: false, error };
    }
  };

  const atualizarProcesso = async (id: string, processo: Partial<ProcessoFabricacao>) => {
    try {
      const { error } = await supabase
        .from('processos_fabricacao')
        .update(processo)
        .eq('id', id);

      if (error) throw error;

      toast.success('Processo atualizado com sucesso!');
      await fetchProcessos();
      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar processo:', error);
      toast.error('Erro ao atualizar processo');
      return { success: false, error };
    }
  };

  const exportarModeloCSV = () => {
    const headers = ['of_number', 'marca_peca', 'processo', 'quantidade_produzida', 'data_apontamento', 'observacoes'];
    const exampleData = [
      ['B002', 'COLUNA-4', 'Detalhamento', '5', '2025-06-28', 'Exemplo de observação'],
      ['B002', 'VIGA-10', 'Corte', '3', '2025-06-28', ''],
      ['B003', 'PILAR-2', 'Expedição', '2', '2025-06-28', 'Peça conferida']
    ];

    const csvContent = [headers, ...exampleData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_apontamento_producao.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Modelo CSV baixado com sucesso!');
  };

  const refetch = useCallback(async () => {
    console.log('🔄 Executando refetch completo...');
    setLoading(true);
    try {
      await Promise.all([fetchApontamentos(), fetchProcessos()]);
      console.log('✅ Refetch completado com sucesso');
    } catch (error) {
      console.error('❌ Erro durante refetch:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchApontamentos, fetchProcessos]);

  useEffect(() => {
    if (user) {
      console.log('🚀 Iniciando carregamento de dados para usuário:', user.id);
      setLoading(true);
      
      // Adicionar timeout para detectar requisições que ficam pendentes
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ TIMEOUT: Requisições demorando mais que 30 segundos');
        toast.error('Timeout: Requisições demorando muito. Verifique sua conexão.');
      }, 30000);
      
      Promise.all([
        fetchApontamentos(),
        fetchProcessos()
      ]).finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
        console.log('✅ Carregamento finalizado');
      });
    } else {
      console.log('❌ Usuário não autenticado, não carregando dados');
    }
  }, [user, fetchApontamentos, fetchProcessos]);

  return {
    apontamentos,
    processos,
    loading,
    criarApontamento,
    criarProcesso,
    atualizarProcesso,
    exportarModeloCSV,
    buscarQuantidadeProcessada,
    refetch
  };
};
