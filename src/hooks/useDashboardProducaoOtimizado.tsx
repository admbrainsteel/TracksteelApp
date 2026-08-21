import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProcessoConsolidado {
  processo_id: string;
  processo_nome: string;
  processo_cor: string;
  data_apontamento: string;
  peso_acumulado: number;
}

export interface DateRange {
  data_inicio_grafico: string;
  data_fim_grafico: string;
}

export interface DashboardProcesso {
  id: string;
  nome: string;
  pesoTotal: number;
  pesoFabricado: number;
  progressoReal: number;
  progressoEsperado: number;
  status: 'verde' | 'amarelo' | 'vermelho' | 'azul';
  dadosGrafico: {
    data: string;
    planejado: number;
    realizado: number;
  }[];
}

export interface DashboardDataOtimizado {
  of: string;
  progressoGeral: number;
  pesoTotalFabricado: number;
  tonelagem: number;
  processos: DashboardProcesso[];
  dadosConsolidados: ProcessoConsolidado[];
  dateRange: DateRange;
}

export const useDashboardProducaoOtimizado = (ofNumber: string) => {
  const [dashboardData, setDashboardData] = useState<DashboardDataOtimizado | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!ofNumber) {
      setDashboardData(null);
      return;
    }

    setLoading(true);
    try {
      console.log('Buscando dados do dashboard para OF:', ofNumber);

      // 1. Buscar dados da OF para obter o peso total planejado
      const { data: ofData, error: ofError } = await supabase
        .from('ordens_fabricacao')
        .select('*')
        .eq('num_of', ofNumber)
        .single();

      if (ofError) {
        console.error('Erro ao buscar OF:', ofError);
        throw ofError;
      }

      console.log('Dados da OF encontrados:', ofData);

      // 2. Buscar ficha técnica para obter peso total se não estiver na OF
      let pesoTotalPlanejado = ofData.peso_total || 0;
      
      if (!pesoTotalPlanejado) {
        const { data: fichaTecnica, error: fichaError } = await supabase
          .from('ficha_tecnica_contratos')
          .select('quantidade')
          .eq('of_number', ofNumber)
          .maybeSingle();

        if (!fichaError && fichaTecnica?.quantidade) {
          pesoTotalPlanejado = fichaTecnica.quantidade;
        }
      }

      // 3. Se ainda não temos peso, calcular das peças cadastradas
      if (!pesoTotalPlanejado) {
        const { data: pecasData, error: pecasError } = await supabase
          .from('pecas')
          .select('peso_unitario, quantidade')
          .eq('of_number', ofNumber);

        if (pecasError) {
          console.error('Erro ao buscar peças:', pecasError);
          throw pecasError;
        }

        pesoTotalPlanejado = pecasData.reduce((total, peca) => {
          const pesoUnitario = peca.peso_unitario || 0;
          const quantidade = peca.quantidade || 0;
          return total + (pesoUnitario * quantidade);
        }, 0);
      }

      console.log('Peso total planejado (BASE DE TODOS OS CÁLCULOS):', pesoTotalPlanejado, 'kg');

      // 4. Buscar apontamentos da OF com joins corretos
      const { data: apontamentosData, error: apontamentosError } = await supabase
        .from('apontamentos_producao')
        .select(`
          *,
          peca:pecas!apontamentos_producao_peca_id_fkey(peso_unitario, marca),
          processo:processos_fabricacao!apontamentos_producao_processo_id_fkey(nome, ordem, cor),
          componente:componentes_peca!apontamentos_producao_componente_id_fkey(peso_unitario, marca_componente)
        `)
        .eq('of_number', ofNumber);

      if (apontamentosError) {
        console.error('Erro ao buscar apontamentos:', apontamentosError);
        throw apontamentosError;
      }

      console.log('Apontamentos encontrados:', apontamentosData);

      // 5. Calcular peso total fabricado - apenas processo de solda
      let pesoTotalFabricado = 0;
      
      // Buscar ID do processo de solda
      const processoSolda = await supabase
        .from('processos_fabricacao')
        .select('id')
        .ilike('nome', '%solda%')
        .single();

      if (!processoSolda.error && processoSolda.data) {
        const apontamentosSolda = apontamentosData.filter(a => a.processo_id === processoSolda.data.id);
        
        apontamentosSolda.forEach(apontamento => {
          let pesoUnitario = 0;
          
          if (apontamento.tipo_apontamento === 'componente' && apontamento.componente?.peso_unitario) {
            pesoUnitario = Number(apontamento.componente.peso_unitario);
          } else if (apontamento.tipo_apontamento === 'peca' && apontamento.peca?.peso_unitario) {
            pesoUnitario = Number(apontamento.peca.peso_unitario);
          }
          
          const pesoApontamento = pesoUnitario * Number(apontamento.quantidade_produzida);
          pesoTotalFabricado += pesoApontamento;
          
          console.log(`Apontamento Solda ID: ${apontamento.id}, Tipo: ${apontamento.tipo_apontamento}, Peso unitário: ${pesoUnitario} kg, Quantidade: ${apontamento.quantidade_produzida}, Peso total: ${pesoApontamento} kg`);
        });
      }

      console.log('Peso total fabricado (apenas solda):', pesoTotalFabricado, 'kg');

      // 6. Calcular progresso geral - será recalculado após processar todos os processos
      let progressoGeral = 0;
      
      console.log(`PROGRESSO GERAL: ${pesoTotalFabricado} kg / ${pesoTotalPlanejado} kg = ${progressoGeral.toFixed(2)}%`);

      // 7. Buscar range de datas
      const { data: dateRangeData, error: dateRangeError } = await supabase
        .rpc('get_dashboard_date_range', { of_number_param: ofNumber });

      if (dateRangeError) {
        console.error('Erro ao buscar range de datas:', dateRangeError);
      }

      // 8. Buscar dados consolidados
      const { data: consolidatedData, error: consolidatedError } = await supabase
        .rpc('get_dashboard_consolidated_data', { of_number_param: ofNumber });

      if (consolidatedError) {
        console.error('Erro ao buscar dados consolidados:', consolidatedError);
      }

      // 9. Buscar processos
      const { data: processosData, error: processosError } = await supabase
        .from('processos_fabricacao')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (processosError) {
        console.error('Erro ao buscar processos:', processosError);
        throw processosError;
      }

      // 10. Buscar cronograma da OF para calcular progresso esperado correto
      const { data: cronogramaOf } = await supabase
        .from('cronogramas_of')
        .select(`
          id,
          processos_cronograma:processos_cronograma(
            nome_processo,
            data_inicio,
            data_fim
          )
        `)
        .eq('of_id', ofData.id)
        .maybeSingle();

      console.log('Cronograma da OF encontrado:', cronogramaOf);

      // Função para obter percentual esperado baseado nas datas do cronograma
      const calcularProgressoEsperado = (nomeProcesso: string): number => {
        if (!cronogramaOf?.processos_cronograma) return 0;

        const hoje = new Date();
        let processoCronograma;

        // Mapear nomes dos processos para os do cronograma
        if (nomeProcesso.toLowerCase().includes('corte') || nomeProcesso.toLowerCase().includes('solda')) {
          // Usar datas do processo "Fabricação"
          processoCronograma = cronogramaOf.processos_cronograma.find(p => 
            p.nome_processo.toLowerCase().includes('fabricação') || 
            p.nome_processo.toLowerCase().includes('fabricacao')
          );
        } else if (nomeProcesso.toLowerCase().includes('pint') || nomeProcesso.toLowerCase().includes('galv') || 
                   nomeProcesso.toLowerCase().includes('expedição') || nomeProcesso.toLowerCase().includes('expedicao') ||
                   nomeProcesso.toLowerCase().includes('montagem')) {
          // Usar datas do processo "Instalação" (incluindo "montagem")
          processoCronograma = cronogramaOf.processos_cronograma.find(p => 
            p.nome_processo.toLowerCase().includes('instalação') || 
            p.nome_processo.toLowerCase().includes('instalacao')
          );
        } else {
          // Buscar processo com nome exato ou similar
          processoCronograma = cronogramaOf.processos_cronograma.find(p => 
            p.nome_processo.toLowerCase().includes(nomeProcesso.toLowerCase()) ||
            nomeProcesso.toLowerCase().includes(p.nome_processo.toLowerCase())
          );
        }

        if (!processoCronograma) {
          console.log(`Processo ${nomeProcesso} não encontrado no cronograma`);
          return 0;
        }

        const dataInicio = new Date(processoCronograma.data_inicio + 'T00:00:00');
        const dataFim = new Date(processoCronograma.data_fim + 'T23:59:59');

        console.log(`Processo ${nomeProcesso} - Inicio: ${dataInicio.toDateString()}, Fim: ${dataFim.toDateString()}, Hoje: ${hoje.toDateString()}`);

        // Se ainda não chegou na data de início, progresso esperado é 0%
        if (hoje < dataInicio) {
          console.log(`Data atual (${hoje.toDateString()}) é menor que data de início (${dataInicio.toDateString()}) - Progresso esperado: 0%`);
          return 0;
        }

        const MS_PER_DAY = 1000 * 60 * 60 * 24;
        const diasTotais = Math.max(1, Math.floor((dataFim.getTime() - dataInicio.getTime()) / MS_PER_DAY) + 1);
        const diasDecorridos = Math.floor((hoje.getTime() - dataInicio.getTime()) / MS_PER_DAY) + 1;

        // Calcular percentual baseado nos dias
        let percentualEsperado = (diasDecorridos / diasTotais) * 100;

        // Se passou da data fim, manter em 100%
        if (hoje > dataFim) {
          percentualEsperado = 100;
          console.log(`Data atual passou da data fim - Progresso esperado mantido em: 100%`);
        } else {
          console.log(`Processo ${nomeProcesso}: ${diasDecorridos}/${diasTotais} dias = ${percentualEsperado.toFixed(2)}%`);
        }

        return Math.min(100, Math.max(0, percentualEsperado));
      };

      // 11. Processar dados por processo individual 
      const processos: DashboardProcesso[] = await Promise.all(processosData.map(async (processo) => {
        const apontamentosProcesso = apontamentosData.filter(a => a.processo_id === processo.id);
        
        let pesoFabricadoProcesso = 0;
        apontamentosProcesso.forEach(a => {
          let pesoUnitario = 0;
          
          if (a.tipo_apontamento === 'componente' && a.componente?.peso_unitario) {
            pesoUnitario = Number(a.componente.peso_unitario);
          } else if (a.tipo_apontamento === 'peca' && a.peca?.peso_unitario) {
            pesoUnitario = Number(a.peca.peso_unitario);
          }
          
          pesoFabricadoProcesso += pesoUnitario * Number(a.quantidade_produzida);
        });

        const progressoReal = pesoTotalPlanejado > 0 ? (pesoFabricadoProcesso / pesoTotalPlanejado) * 100 : 0;
        
        console.log(`PROCESSO ${processo.nome}: ${pesoFabricadoProcesso} kg fabricado / ${pesoTotalPlanejado} kg planejado = ${progressoReal.toFixed(2)}%`);
        
        // Calcular progresso esperado usando as datas do cronograma
        const progressoEsperado = calcularProgressoEsperado(processo.nome);

        // Determinar status baseado na comparação entre progresso real e esperado
        let status: 'verde' | 'amarelo' | 'vermelho' | 'azul';
        
        // Se o progresso esperado chegou a 100% (passou da data fim), usar cor vermelha na barra
        if (progressoEsperado >= 100) {
          if (progressoReal >= 100) {
            status = 'verde'; // Concluído no prazo
          } else {
            status = 'vermelho'; // Atrasado (passou da data fim mas não concluído)
          }
        } else if (progressoEsperado > 0) {
          // Comparar progresso real com esperado
          if (progressoReal > progressoEsperado) {
            status = 'azul'; // Adiantado
          } else {
            const percentualDoEsperado = (progressoReal / progressoEsperado) * 100;
            
            if (percentualDoEsperado < 60) {
              status = 'vermelho'; // Muito atrasado
            } else if (percentualDoEsperado < 80) {
              status = 'amarelo'; // Atenção
            } else {
              status = 'verde'; // No prazo
            }
          }
        } else {
          // Se não há progresso esperado ainda (antes da data de início), usar verde
          status = 'verde';
        }
        
        console.log(`STATUS ${processo.nome}: ${progressoReal.toFixed(2)}% real vs ${progressoEsperado.toFixed(2)}% esperado -> ${status}`);

         // Gerar dados do gráfico usando as datas específicas do cronograma do processo
         const dadosGrafico = [];
         
         // Buscar as datas específicas deste processo no cronograma
         let dataInicioProcesso: Date | null = null;
         let dataFimProcesso: Date | null = null;
         
         if (cronogramaOf?.processos_cronograma) {
           let processoCronograma;

           // Mapear nomes dos processos para os do cronograma
           if (processo.nome.toLowerCase().includes('corte') || processo.nome.toLowerCase().includes('solda')) {
             processoCronograma = cronogramaOf.processos_cronograma.find(p => 
               p.nome_processo.toLowerCase().includes('fabricação') || 
               p.nome_processo.toLowerCase().includes('fabricacao')
             );
           } else if (processo.nome.toLowerCase().includes('pint') || processo.nome.toLowerCase().includes('galv') || 
                      processo.nome.toLowerCase().includes('expedição') || processo.nome.toLowerCase().includes('expedicao') ||
                      processo.nome.toLowerCase().includes('montagem')) {
             processoCronograma = cronogramaOf.processos_cronograma.find(p => 
               p.nome_processo.toLowerCase().includes('instalação') || 
               p.nome_processo.toLowerCase().includes('instalacao')
             );
           } else {
             processoCronograma = cronogramaOf.processos_cronograma.find(p => 
               p.nome_processo.toLowerCase().includes(processo.nome.toLowerCase()) ||
               processo.nome.toLowerCase().includes(p.nome_processo.toLowerCase())
             );
           }

           if (processoCronograma) {
             dataInicioProcesso = new Date(processoCronograma.data_inicio + 'T00:00:00');
             dataFimProcesso = new Date(processoCronograma.data_fim + 'T23:59:59');
           }
         }
         
         // Se não há cronograma específico, usar as datas da OF como fallback
         if (!dataInicioProcesso || !dataFimProcesso) {
           dataInicioProcesso = ofData.data_abertura ? new Date(ofData.data_abertura + 'T00:00:00') : new Date();
           dataFimProcesso = ofData.data_prazo ? new Date(ofData.data_prazo + 'T23:59:59') : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
         }
         
         // Verificar se há apontamentos fora do período planejado e ajustar o range se necessário
         let dataInicioGrafico = dataInicioProcesso;
         let dataFimGrafico = dataFimProcesso;
         
         if (apontamentosProcesso.length > 0) {
           const datasMaisAntigas = apontamentosProcesso.map(a => new Date(a.data_apontamento + 'T00:00:00'));
           const datasMaisRecentes = apontamentosProcesso.map(a => new Date(a.data_apontamento + 'T23:59:59'));
           
           const menorDataApontamento = new Date(Math.min(...datasMaisAntigas.map(d => d.getTime())));
           const maiorDataApontamento = new Date(Math.max(...datasMaisRecentes.map(d => d.getTime())));
           
           // Estender o período se houver apontamentos fora do planejado
           if (menorDataApontamento < dataInicioGrafico) {
             dataInicioGrafico = menorDataApontamento;
           }
           if (maiorDataApontamento > dataFimGrafico) {
             dataFimGrafico = maiorDataApontamento;
           }
         }
         
          const MS_PER_DAY = 1000 * 60 * 60 * 24;
          const diasTotaisProcesso = Math.max(1, Math.floor((dataFimProcesso.getTime() - dataInicioProcesso.getTime()) / MS_PER_DAY) + 1);
          const diasRange = Math.floor((dataFimGrafico.getTime() - dataInicioGrafico.getTime()) / MS_PER_DAY);
          
          for (let i = 0; i <= diasRange; i++) {
            const data = new Date(dataInicioGrafico);
            data.setDate(data.getDate() + i);
            const dataStr = data.toISOString().split('T')[0];
            
            // Calcular progresso planejado baseado no cronograma específico do processo (percentual dos dias)
            let planejado = 0;
            if (data >= dataInicioProcesso && data <= dataFimProcesso) {
              const diasDecorridos = Math.floor((Math.min(data.getTime(), dataFimProcesso.getTime()) - dataInicioProcesso.getTime()) / MS_PER_DAY) + 1;
              const percentualDias = diasDecorridos / diasTotaisProcesso;
              planejado = percentualDias * pesoTotalPlanejado;
            } else if (data > dataFimProcesso) {
              // Após o fim planejado, manter o peso total planejado
              planejado = pesoTotalPlanejado;
            }
            // Antes do início planejado, o planejado fica 0
           
           // Calcular progresso real até esta data - soma dos pesos apontados
           const apontamentosAteData = apontamentosProcesso.filter(a => a.data_apontamento <= dataStr);
           let realizado = 0;
           apontamentosAteData.forEach(a => {
             let pesoUnitario = 0;
             
             if (a.tipo_apontamento === 'componente' && a.componente?.peso_unitario) {
               pesoUnitario = Number(a.componente.peso_unitario);
             } else if (a.tipo_apontamento === 'peca' && a.peca?.peso_unitario) {
               pesoUnitario = Number(a.peca.peso_unitario);
             }
             
             realizado += pesoUnitario * Number(a.quantidade_produzida);
           });

           dadosGrafico.push({
             data: dataStr,
             planejado,
             realizado
           });
         }

        return {
          id: processo.id,
          nome: processo.nome,
          pesoTotal: pesoTotalPlanejado, // SEMPRE o peso total da OF/ficha técnica
          pesoFabricado: pesoFabricadoProcesso,
          progressoReal,
          progressoEsperado,
          status,
          dadosGrafico
        };
      }));

      // Calcular progresso geral como média dos progressos reais, excluindo "Aceite/DB" e "Concluído"
      const processosParaMedia = processos.filter(p => 
        !p.nome.toLowerCase().includes('aceite') && 
        !p.nome.toLowerCase().includes('db') && 
        !p.nome.toLowerCase().includes('concluído') &&
        !p.nome.toLowerCase().includes('concluido')
      );
      
      if (processosParaMedia.length > 0) {
        const somaProgressos = processosParaMedia.reduce((soma, processo) => soma + processo.progressoReal, 0);
        progressoGeral = somaProgressos / processosParaMedia.length;
      } else {
        progressoGeral = 0;
      }

      // Atualizar progresso real e esperado do processo "Concluído" com o progresso geral
      processos.forEach(processo => {
        if (processo.nome.toLowerCase().includes('concluído') || processo.nome.toLowerCase().includes('concluido')) {
          processo.progressoReal = progressoGeral;
          
          // Calcular progresso esperado do processo "Concluído" como média dos outros processos
          // (exceto Aceite/DB e o próprio Concluído)
          const processosParaMediaEsperada = processos.filter(p => 
            !p.nome.toLowerCase().includes('aceite') && 
            !p.nome.toLowerCase().includes('db') && 
            !p.nome.toLowerCase().includes('concluído') &&
            !p.nome.toLowerCase().includes('concluido')
          );
          
          if (processosParaMediaEsperada.length > 0) {
            const somaProgressosEsperados = processosParaMediaEsperada.reduce((soma, proc) => soma + proc.progressoEsperado, 0);
            processo.progressoEsperado = somaProgressosEsperados / processosParaMediaEsperada.length;
          } else {
            processo.progressoEsperado = 0;
          }
          
          // Recalcular status do processo "Concluído"
          if (processo.progressoEsperado > 0) {
            if (processo.progressoReal > processo.progressoEsperado) {
              processo.status = 'azul'; // Adiantado
            } else {
              const percentualDoEsperado = (processo.progressoReal / processo.progressoEsperado) * 100;
              
              if (percentualDoEsperado < 60) {
                processo.status = 'vermelho'; // Atrasado
              } else if (percentualDoEsperado < 80) {
                processo.status = 'amarelo'; // Atenção
              } else {
                processo.status = 'verde'; // No prazo
              }
            }
          }
          
          console.log(`PROCESSO CONCLUÍDO atualizado: progresso real = ${progressoGeral.toFixed(2)}%, esperado = ${processo.progressoEsperado.toFixed(2)}%, status = ${processo.status}`);
        }
      });

      console.log(`PROGRESSO GERAL CORRIGIDO: Média de ${processosParaMedia.length} processos (excluindo Aceite/DB e Concluído) = ${progressoGeral.toFixed(2)}%`);
      console.log('Processos incluídos na média:', processosParaMedia.map(p => `${p.nome}: ${p.progressoReal.toFixed(1)}%`).join(', '));

      const result = {
        of: ofNumber,
        progressoGeral,
        pesoTotalFabricado,
        tonelagem: pesoTotalPlanejado, // SEMPRE o peso total da OF/ficha técnica
        processos,
        dadosConsolidados: consolidatedData || [],
        dateRange: dateRangeData?.[0] || { data_inicio_grafico: '', data_fim_grafico: '' }
      };

      console.log('=== RESULTADO FINAL DO DASHBOARD ===');
      console.log('OF:', ofNumber);
      console.log('Peso total planejado (base):', pesoTotalPlanejado, 'kg =', (pesoTotalPlanejado / 1000).toFixed(2), 't');
      console.log('Peso total fabricado:', pesoTotalFabricado, 'kg =', (pesoTotalFabricado / 1000).toFixed(2), 't');
      console.log('Progresso geral:', progressoGeral.toFixed(2) + '%');
      console.log('=====================================');
      
      setDashboardData(result);

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  }, [ofNumber]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    dashboardData,
    loading,
    refetch: fetchDashboardData
  };
};
