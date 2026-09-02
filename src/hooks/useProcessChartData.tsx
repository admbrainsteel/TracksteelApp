
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ChartData {
  name: string;
  weight: number;
}

interface ProcessChartData {
  corte: ChartData[];
  solda: ChartData[];
  montagem: ChartData[];
}

export const useProcessChartData = (ofNumber: string) => {
  const [chartData, setChartData] = useState<ProcessChartData>({
    corte: [],
    solda: [],
    montagem: []
  });
  const [loading, setLoading] = useState(false);

  const calculateProcessData = async (processName: string): Promise<ChartData[]> => {
    try {
      console.log(`Buscando dados para processo: ${processName}`);
      
      // Buscar processo por nome
      const { data: processo, error: processoError } = await supabase
        .from('processos_fabricacao')
        .select('id')
        .ilike('nome', `%${processName}%`)
        .single();

      if (processoError || !processo) {
        console.log(`Processo ${processName} não encontrado:`, processoError);
        return [
          { name: '7-15d', weight: 0 },
          { name: 'ult.7d', weight: 0 },
          { name: 'prev.7d', weight: 0 }
        ];
      }

      console.log(`Processo ${processName} encontrado com ID:`, processo.id);

      const hoje = new Date();
      hoje.setHours(23, 59, 59, 999);
      
      const seteDiasAtras = new Date(hoje);
      seteDiasAtras.setDate(hoje.getDate() - 7);
      seteDiasAtras.setHours(0, 0, 0, 0);
      
      const quatorzeDiasAtras = new Date(hoje);
      quatorzeDiasAtras.setDate(hoje.getDate() - 14);
      quatorzeDiasAtras.setHours(0, 0, 0, 0);

      const seisDiasAtras = new Date(hoje);
      seisDiasAtras.setDate(hoje.getDate() - 6);
      seisDiasAtras.setHours(0, 0, 0, 0);

      // Buscar apontamentos completos para obter o total fabricado
      const { data: apontamentos, error: apontamentosError } = await supabase
        .from('apontamentos_producao')
        .select(`
          *,
          peca:pecas!apontamentos_producao_peca_id_fkey(peso_unitario),
          componente:componentes_peca!apontamentos_producao_componente_id_fkey(peso_unitario)
        `)
        .eq('of_number', ofNumber)
        .eq('processo_id', processo.id);

      if (apontamentosError) {
        console.error(`Erro ao buscar apontamentos para ${processName}:`, apontamentosError);
      }

      console.log(`Apontamentos encontrados para ${processName}:`, apontamentos?.length || 0);

      let peso7a14Dias = 0;
      let peso6DiasRecentes = 0;
      let pesoTotalProcessado = 0;

      if (apontamentos && apontamentos.length > 0) {
        apontamentos.forEach(apontamento => {
          let pesoUnitario = 0;
          if (apontamento.tipo_apontamento === 'componente' && apontamento.componente?.peso_unitario) {
            pesoUnitario = apontamento.componente.peso_unitario;
          } else if (apontamento.tipo_apontamento === 'peca' && apontamento.peca?.peso_unitario) {
            pesoUnitario = apontamento.peca.peso_unitario;
          }

          const pesoTotal = pesoUnitario * apontamento.quantidade_produzida;
          pesoTotalProcessado += pesoTotal;

          if (apontamento.data_apontamento) {
            // Se data_apontamento for apenas a data (YYYY-MM-DD), setamos pra meio dia pra evitar bugs de fuso
            const dateStr = typeof apontamento.data_apontamento === 'string' && apontamento.data_apontamento.length <= 10 
                ? apontamento.data_apontamento + 'T12:00:00' 
                : apontamento.data_apontamento;
                
            const dataApontamento = new Date(dateStr); 

            // Período de 7-14 dias atrás
            if (dataApontamento >= quatorzeDiasAtras && dataApontamento < seteDiasAtras) {
              peso7a14Dias += pesoTotal;
            }
            // Últimos 6 dias
            if (dataApontamento >= seisDiasAtras && dataApontamento <= hoje) {
              peso6DiasRecentes += pesoTotal;
            }
          }
        });
      }

      // Calcular peso necessário para próximos 7 dias (meta)
      const { data: ofData } = await supabase
        .from('ordens_fabricacao')
        .select('peso_total, data_prazo')
        .eq('num_of', ofNumber)
        .single();

      let pesoTotalPlanejado = ofData?.peso_total || 0;
      
      if (!pesoTotalPlanejado) {
        const { data: fichaTecnica } = await supabase
          .from('ficha_tecnica_contratos')
          .select('quantidade')
          .eq('of_number', ofNumber)
          .maybeSingle();

        if (fichaTecnica?.quantidade) {
          pesoTotalPlanejado = fichaTecnica.quantidade;
        }
      }

      if (!pesoTotalPlanejado) {
        const { data: pecasData } = await supabase
          .from('pecas')
          .select('peso_unitario, quantidade')
          .eq('of_number', ofNumber);

        if (pecasData) {
          pesoTotalPlanejado = pecasData.reduce((total, peca) => {
            return total + ((peca.peso_unitario || 0) * (peca.quantidade || 0));
          }, 0);
        }
      }

      let pesoMeta = 0;
      if (pesoTotalPlanejado > 0) {
        const dataFim = ofData?.data_prazo ? new Date(ofData.data_prazo + 'T23:59:59') : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const diasRestantes = Math.max(1, Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)));
        const pesoRestante = Math.max(0, pesoTotalPlanejado - pesoTotalProcessado);
        
        // Meta para próximos 7 dias baseada no ritmo necessário
        if (diasRestantes <= 7) {
          pesoMeta = pesoRestante;
        } else {
          pesoMeta = (pesoRestante / diasRestantes) * 7;
        }
      }

      const resultado = [
        { name: '7-15d', weight: Number(peso7a14Dias.toFixed(0)) }, 
        { name: 'ult.7d', weight: Number(peso6DiasRecentes.toFixed(0)) },
        { name: 'prev.7d', weight: Number(pesoMeta.toFixed(0)) }
      ];

      console.log(`Dados calculados para ${processName}:`, resultado);
      return resultado;
    } catch (error) {
      console.error(`Erro ao calcular dados do processo ${processName}:`, error);
      return [
        { name: '7-15d', weight: 0 },
        { name: 'ult.7d', weight: 0 },
        { name: 'prev.7d', weight: 0 }
      ];
    }
  };

  const fetchChartData = async () => {
    if (!ofNumber) return;
    
    console.log('Iniciando busca de dados dos gráficos para OF:', ofNumber);
    setLoading(true);
    
    try {
      const [corteData, soldaData, montagemData] = await Promise.all([
        calculateProcessData('corte'),
        calculateProcessData('solda'),
        calculateProcessData('montagem')
      ]);

      const newChartData = {
        corte: corteData,
        solda: soldaData,
        montagem: montagemData
      };

      console.log('Dados finais dos gráficos:', newChartData);
      setChartData(newChartData);
    } catch (error) {
      console.error('Erro ao buscar dados dos gráficos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, [ofNumber]);

  return { chartData, loading, refetch: fetchChartData };
};
