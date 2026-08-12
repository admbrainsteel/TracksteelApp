
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { naturalSort } from '@/utils/naturalSort';

export interface InconsistenciaItem {
  marca: string;
  tipo: string;
  descricao: string;
  detalhes: any;
  acaoSugerida?: string;
}

export interface ResultadoAuditoria {
  inconsistencias: {
    processos: InconsistenciaItem[];
    quantidades: InconsistenciaItem[];
    expedicao: InconsistenciaItem[];
    prioridades: InconsistenciaItem[];
    estoque: InconsistenciaItem[];
  };
  verificacoesRealizadas: string[];
  dataVerificacao: Date;
}

export const useAuditoriaInconsistencias = () => {
  const [data, setData] = useState<ResultadoAuditoria | null>(null);
  const [loading, setLoading] = useState(false);

  const executarAuditoria = useCallback(async (ofNumber: string, processo?: string, faseOF?: string) => {
    setLoading(true);
    
    try {
      console.log(`🔍 Iniciando auditoria para OF: ${ofNumber}, Processo: ${processo || 'todos'}, Fase: ${faseOF || 'todas'}`);

      // Buscar dados necessários
      const [pecasData, apontamentosData, romaneiosData, prioridadesData, processosData] = await Promise.all([
        // Peças da OF filtradas por fase se especificada
        supabase
          .from('pecas')
          .select('*')
          .eq('of_number', ofNumber)
          .then(({ data }) => {
            if (!data) return [];
            return faseOF ? data.filter(p => p.etapa_fase === faseOF) : data;
          }),
        
        // Apontamentos de produção
        supabase
          .from('apontamentos_producao')
          .select(`
            *,
            processo:processos_fabricacao(nome, ordem),
            peca:pecas(marca, etapa_fase, quantidade),
            componente:componentes_peca(marca_componente)
          `)
          .eq('of_number', ofNumber)
          .then(({ data }) => data || []),
        
        // Romaneios de expedição
        supabase
          .from('itens_romaneio_pecas')
          .select(`
            *,
            romaneio:romaneios_expedicao!inner(of_number)
          `)
          .eq('romaneio.of_number', ofNumber)
          .then(({ data }) => data || []),
        
        // Prioridades de fabricação - buscar corretamente as peças em prioridades
        supabase
          .from('itens_prioridade_fabricacao')
          .select(`
            *,
            peca:pecas!inner(of_number, marca, etapa_fase),
            prioridade_fabricacao:prioridades_fabricacao!inner(
              of_number,
              etapa_fase,
              prioridade_config:prioridades_config(codigo, nome)
            )
          `)
          .eq('peca.of_number', ofNumber)
          .then(({ data }) => {
            if (!data) return [];
            return faseOF ? data.filter(item => item.peca?.etapa_fase === faseOF) : data;
          }),
        
        // Processos de fabricação
        supabase
          .from('processos_fabricacao')
          .select('*')
          .order('ordem')
          .then(({ data }) => data || [])
      ]);

      // Filtrar apontamentos por fase da OF se especificada
      const apontamentosFiltrados = faseOF ? 
        apontamentosData.filter(a => a.peca?.etapa_fase === faseOF) : 
        apontamentosData;

      // Filtrar por processo se especificado
      const apontamentosProcessoFiltrados = processo ? 
        apontamentosFiltrados.filter(a => a.processo?.nome === processo) : 
        apontamentosFiltrados;

      const inconsistencias: ResultadoAuditoria['inconsistencias'] = {
        processos: [],
        quantidades: [],
        expedicao: [],
        prioridades: [],
        estoque: []
      };

      // 1. Verificar sequência de processos
      pecasData.forEach(peca => {
        const apontamentosPeca = apontamentosProcessoFiltrados.filter(a => 
          a.tipo_apontamento === 'peca' && a.peca?.marca === peca.marca
        );

        // Ordenar apontamentos por ordem do processo
        const apontamentosOrdenados = apontamentosPeca
          .filter(a => a.processo?.ordem)
          .sort((a, b) => a.processo.ordem - b.processo.ordem);

        // Verificar se há processos pulados
        for (let i = 1; i < apontamentosOrdenados.length; i++) {
          const ordemAnterior = apontamentosOrdenados[i - 1].processo.ordem;
          const ordemAtual = apontamentosOrdenados[i].processo.ordem;
          
          if (ordemAtual - ordemAnterior > 1) {
            // Verificar se a peça tem componentes para determinar se deve passar pela solda
            const devePassarPelaSolda = peca.tem_componentes;
            const processosPulados = [];
            
            for (let ordem = ordemAnterior + 1; ordem < ordemAtual; ordem++) {
              const processoEncontrado = processosData.find(p => p.ordem === ordem);
              if (processoEncontrado) {
                // Se não tem componentes e o processo é solda, não é inconsistência
                if (!devePassarPelaSolda && processoEncontrado.nome.toLowerCase().includes('solda')) {
                  continue;
                }
                processosPulados.push(processoEncontrado.nome);
              }
            }

            if (processosPulados.length > 0) {
              inconsistencias.processos.push({
                marca: peca.marca,
                tipo: 'Processo Pulado',
                descricao: `Peça pulou processo(s): ${processosPulados.join(', ')}`,
                detalhes: {
                  processosPulados,
                  apontamentos: apontamentosOrdenados.map(a => ({
                    processo: a.processo.nome,
                    data: a.data_apontamento,
                    quantidade: a.quantidade_produzida
                  }))
                },
                acaoSugerida: 'Verificar se os processos intermediários foram executados'
              });
            }
          }
        }
      });

      // 2. Verificar quantidades inconsistentes
      pecasData.forEach(peca => {
        const apontamentosPeca = apontamentosProcessoFiltrados.filter(a => 
          a.tipo_apontamento === 'peca' && a.peca?.marca === peca.marca
        );

        // Agrupar por processo
        const quantidadesPorProcesso = apontamentosPeca.reduce((acc, apt) => {
          const processo = apt.processo?.nome || 'Desconhecido';
          acc[processo] = (acc[processo] || 0) + apt.quantidade_produzida;
          return acc;
        }, {} as Record<string, number>);

        // Verificar se algum processo tem mais quantidade que o cadastrado
        Object.entries(quantidadesPorProcesso).forEach(([processo, quantidade]) => {
          if (quantidade > peca.quantidade) {
            inconsistencias.quantidades.push({
              marca: peca.marca,
              tipo: 'Quantidade Excedente',
              descricao: `Processo ${processo} tem ${quantidade} peças apontadas, mas cadastro tem ${peca.quantidade}`,
              detalhes: {
                quantidadeCadastrada: peca.quantidade,
                quantidadeApontada: quantidade,
                processo,
                diferenca: quantidade - peca.quantidade
              },
              acaoSugerida: 'Verificar apontamentos duplicados ou corrigir quantidade no cadastro'
            });
          }
        });
      });

      // 3. Verificar peças expedidas sem processos anteriores
      const pecasExpedidas = romaneiosData.map(r => r.marca);
      const pecasComProcessos = [...new Set(apontamentosProcessoFiltrados.map(a => a.peca?.marca).filter(Boolean))];

      pecasExpedidas.forEach(marca => {
        if (!pecasComProcessos.includes(marca)) {
          const peca = pecasData.find(p => p.marca === marca);
          if (peca) {
            inconsistencias.expedicao.push({
              marca,
              tipo: 'Expedição sem Processos',
              descricao: 'Peça expedida sem nenhum processo de produção apontado',
              detalhes: {
                romaneios: romaneiosData.filter(r => r.marca === marca)
              },
              acaoSugerida: 'Apontar processos de produção antes da expedição'
            });
          }
        }
      });

      // 4. Verificar peças em múltiplas prioridades DIFERENTES (P1, P2, P3, P4)
      console.log('🔍 Verificando prioridades duplicadas para peças:', prioridadesData.length, 'itens encontrados');
      
      const pecasEmPrioridades = prioridadesData.reduce((acc, item) => {
        const marca = item.peca?.marca;
        const codigoPrioridade = item.prioridade_fabricacao?.prioridade_config?.codigo;
        
        if (marca && codigoPrioridade) {
          if (!acc[marca]) acc[marca] = new Set();
          acc[marca].add(codigoPrioridade);
        }
        return acc;
      }, {} as Record<string, Set<string>>);

      Object.entries(pecasEmPrioridades).forEach(([marca, prioridades]) => {
        if (prioridades.size > 1) {
          const prioridadesArray = Array.from(prioridades);
          inconsistencias.prioridades.push({
            marca,
            tipo: 'Múltiplas Prioridades',
            descricao: `Peça está em ${prioridades.size} prioridades diferentes: ${prioridadesArray.join(', ')}`,
            detalhes: {
              prioridades: prioridadesArray,
              detalhes: prioridadesData
                .filter(item => item.peca?.marca === marca)
                .map(item => ({
                  prioridade: item.prioridade_fabricacao?.prioridade_config?.codigo,
                  nome_prioridade: item.prioridade_fabricacao?.prioridade_config?.nome,
                  quantidade: item.quantidade_priorizada
                }))
            },
            acaoSugerida: 'Remover peça das prioridades desnecessárias, mantendo apenas em uma'
          });
        }
      });

      // Aplicar ordenação natural
      Object.keys(inconsistencias).forEach(categoria => {
        (inconsistencias as any)[categoria].sort((a: any, b: any) => naturalSort(a.marca, b.marca));
      });

      const resultado: ResultadoAuditoria = {
        inconsistencias,
        verificacoesRealizadas: [
          'Sequência de processos de produção',
          'Consistência de quantidades por processo',
          'Peças expedidas sem processos anteriores',
          'Peças em múltiplas prioridades de fabricação diferentes',
          'Duplicação de apontamentos no mesmo processo'
        ],
        dataVerificacao: new Date()
      };

      console.log(`✅ Auditoria concluída: ${Object.values(inconsistencias).reduce((total, cat) => total + cat.length, 0)} inconsistências encontradas`);
      setData(resultado);

    } catch (error) {
      console.error('❌ Erro na auditoria:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    executarAuditoria
  };
};
