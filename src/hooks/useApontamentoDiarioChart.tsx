
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSystemDateString, getDateOffsetString } from '@/utils/dateTimeUtils';

interface ApontamentoDiarioData {
  ofNumber: string;
  processo: string;
  peso: number;
  percentage: number;
}

interface ProcessoData {
  processo: string;
  total: number;
  ofs: ApontamentoDiarioData[];
}

type PeriodoType = 'diario' | 'ultimos7' | 'ultimos15' | 'ultimos30' | 'projecao7';

interface ChartDataResult {
  data: ProcessoData[];
  effectiveDate: string;
}

export const useApontamentoDiarioChart = (periodo: PeriodoType) => {
  const [result, setResult] = useState<ChartDataResult>({ data: [], effectiveDate: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('=== INICIANDO BUSCA DE DADOS PARA GRÁFICO DIÁRIO ===');
      console.log('Período selecionado:', periodo);

      // Calcular datas baseadas no período usando o utilitário de data do sistema
      const hoje = getSystemDateString();
      let dataInicio: string;
      let dataFim: string = hoje;
      let effectiveDate: string;

      console.log('Data atual do sistema (hoje):', hoje);

      switch (periodo) {
        case 'diario':
          // Para o período diário, usar a data atual (hoje) como data efetiva
          dataInicio = hoje;
          dataFim = hoje;
          effectiveDate = hoje;
          console.log('Modo diário - usando data atual:', effectiveDate);
          break;
        case 'ultimos7':
          dataInicio = getDateOffsetString(-7);
          effectiveDate = hoje;
          break;
        case 'ultimos15':
          dataInicio = getDateOffsetString(-15);
          effectiveDate = hoje;
          break;
        case 'ultimos30':
          dataInicio = getDateOffsetString(-30);
          effectiveDate = hoje;
          break;
        case 'projecao7':
          // Para projeção, pegar dados dos últimos 14 dias para calcular média
          dataInicio = getDateOffsetString(-14);
          effectiveDate = hoje;
          break;
        default:
          dataInicio = getDateOffsetString(-30);
          effectiveDate = hoje;
      }

      console.log('Data início:', dataInicio);
      console.log('Data fim:', dataFim);
      console.log('Data efetiva para relatório:', effectiveDate);

      // Consultar apontamentos com joins para obter pesos
      const { data: apontamentos, error: apontamentosError } = await supabase
        .from('apontamentos_producao')
        .select(`
          of_number,
          data_apontamento,
          quantidade_produzida,
          tipo_apontamento,
          processo:processos_fabricacao!processo_id(nome, ordem),
          peca:pecas!peca_id(peso_unitario),
          componente:componentes_peca!componente_id(peso_unitario)
        `)
        .gte('data_apontamento', dataInicio)
        .lte('data_apontamento', dataFim)
        .order('of_number')
        .order('data_apontamento');

      if (apontamentosError) {
        throw apontamentosError;
      }

      console.log('Apontamentos encontrados:', apontamentos?.length || 0);
      console.log('Dados por OF:', apontamentos?.reduce((acc, apt) => {
        acc[apt.of_number] = (acc[apt.of_number] || 0) + 1;
        return acc;
      }, {} as Record<string, number>));
      
      if (!apontamentos || apontamentos.length === 0) {
        console.log('Nenhum apontamento encontrado para o período');
        setResult({ data: [], effectiveDate });
        return;
      }

      // Processar dados agrupando por OF e processo
      const dadosProcessados = new Map<string, Map<string, number>>();
      
      apontamentos.forEach(apontamento => {
        const ofNumber = apontamento.of_number;
        const processoNome = apontamento.processo?.nome || 'Processo Desconhecido';
        
        // Calcular peso baseado no tipo de apontamento
        let pesoUnitario = 0;
        if (apontamento.tipo_apontamento === 'componente' && apontamento.componente?.peso_unitario) {
          pesoUnitario = Number(apontamento.componente.peso_unitario);
        } else if (apontamento.tipo_apontamento === 'peca' && apontamento.peca?.peso_unitario) {
          pesoUnitario = Number(apontamento.peca.peso_unitario);
        }

        let pesoTotal = pesoUnitario * Number(apontamento.quantidade_produzida);

        // Para projeção, calcular média diária e multiplicar por 7
        if (periodo === 'projecao7') {
          const diasPeriodo = Math.ceil((new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / (1000 * 60 * 60 * 24));
          pesoTotal = (pesoTotal / diasPeriodo) * 7;
        }

        // Inicializar mapas se não existirem
        if (!dadosProcessados.has(processoNome)) {
          dadosProcessados.set(processoNome, new Map());
        }

        const processoMap = dadosProcessados.get(processoNome)!;
        const pesoAtual = processoMap.get(ofNumber) || 0;
        processoMap.set(ofNumber, pesoAtual + pesoTotal);

        console.log(`OF ${ofNumber} - Processo ${processoNome}: +${pesoTotal.toFixed(2)} kg`);
      });

      // Converter para formato do gráfico
      const processosOrdenados = ['Detalhamento', 'Corte', 'Solda', 'Pintura/Galv', 'Expedição', 'Montagem', 'Aceite/DB', 'Concluído'];
      const processedData: ProcessoData[] = [];

      processosOrdenados.forEach(processoNome => {
        const processoData = dadosProcessados.get(processoNome);
        if (processoData && processoData.size > 0) {
          const ofsData: ApontamentoDiarioData[] = [];
          let totalProcesso = 0;

          // Converter Map para array e calcular total
          for (const [ofNumber, peso] of processoData) {
            if (peso > 0) {
              ofsData.push({
                ofNumber,
                processo: processoNome,
                peso: Math.round(peso),
                percentage: 0 // Será calculado após somar o total
              });
              totalProcesso += peso;
            }
          }

          // Calcular percentuais
          ofsData.forEach(ofData => {
            ofData.percentage = totalProcesso > 0 ? (ofData.peso / totalProcesso) * 100 : 0;
          });

          // Ordenar por OF
          ofsData.sort((a, b) => a.ofNumber.localeCompare(b.ofNumber));

          processedData.push({
            processo: processoNome === 'Detalhamento' ? 'DETALH.' :
                     processoNome === 'Pintura/Galv' ? 'PINT/GALV.' :
                     processoNome === 'Expedição' ? 'EXPED.' :
                     processoNome === 'Montagem' ? 'MONTAG.' :
                     processoNome === 'Aceite/DB' ? 'ACEITE/DB' :
                     processoNome === 'Concluído' ? 'CONCLUÍDO' :
                     processoNome.toUpperCase(),
            total: Math.round(totalProcesso),
            ofs: ofsData
          });

          console.log(`Processo ${processoNome}: ${Math.round(totalProcesso)} kg total, ${ofsData.length} OFs`);
        }
      });

      console.log('=== RESULTADO FINAL ===');
      console.log('Processos com dados:', processedData.length);
      console.log('Data efetiva:', effectiveDate);
      console.log('OFs únicas no período:', [...new Set(apontamentos.map(apt => apt.of_number))]);
      processedData.forEach(item => {
        console.log(`${item.processo}: ${item.total} kg (${item.ofs.length} OFs)`);
        item.ofs.forEach(ofData => {
          console.log(`  - OF ${ofData.ofNumber}: ${ofData.peso} kg`);
        });
      });

      setResult({ data: processedData, effectiveDate });

    } catch (error) {
      console.error('Erro ao buscar dados do gráfico:', error);
      setError('Erro ao carregar dados do gráfico');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [periodo]);

  return { 
    data: result.data, 
    effectiveDate: result.effectiveDate,
    loading, 
    error, 
    refetch: fetchData 
  };
};
