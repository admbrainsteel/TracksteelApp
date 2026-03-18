
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
      const seteDiasAtras = new Date(hoje);
      seteDiasAtras.setDate(hoje.getDate() - 7);
      
      const quatorzeDiasAtras = new Date(hoje);
      quatorzeDiasAtras.setDate(hoje.getDate() - 14);

      const seisDiasAtras = new Date(hoje);
      seisDiasAtras.setDate(hoje.getDate() - 6);

      // Buscar apontamentos dos últimos 14 dias
      const { data: apontamentos, error: apontamentosError } = await supabase
        .from('apontamentos_producao')
        .select(`
          *,
          peca:pecas(peso_unitario),
          componente:componentes_peca(peso_unitario)
        `)
        .eq('of_number', ofNumber)
        .eq('processo_id', processo.id)
        .gte('data_apontamento', quatorzeDiasAtras.toISOString().split('T')[0])
        .lte('data_apontamento', hoje.toISOString().split('T')[0]);

      if (apontamentosError) {
        console.error(`Erro ao buscar apontamentos para ${processName}:`, apontamentosError);
        return [
          { name: '7-15d', weight: 0 },
          { name: 'ult.7d', weight: 0 },
          { name: 'prev.7d', weight: 0 }
        ];
      }

      console.log(`Apontamentos encontrados para ${processName}:`, apontamentos?.length || 0);

      if (!apontamentos || apontamentos.length === 0) {
        return [
          { name: '7-15d', weight: 0 },
          { name: 'ult.7d', weight: 0 },
          { name: 'prev.7d', weight: 0 }
        ];
      }

      // Calcular pesos por período
      let peso7a14Dias = 0;
      let peso6DiasRecentes = 0;

      apontamentos.forEach(apontamento => {
        let pesoUnitario = 0;
        if (apontamento.tipo_apontamento === 'componente' && apontamento.componente?.peso_unitario) {
          pesoUnitario = apontamento.componente.peso_unitario;
        } else if (apontamento.tipo_apontamento === 'peca' && apontamento.peca?.peso_unitario) {
          pesoUnitario = apontamento.peca.peso_unitario;
        }

        const pesoTotal = pesoUnitario * apontamento.quantidade_produzida;
        const dataApontamento = new Date(apontamento.data_apontamento);

        // Período de 7-14 dias atrás
        if (dataApontamento >= quatorzeDiasAtras && dataApontamento < seteDiasAtras) {
          peso7a14Dias += pesoTotal;
        }
        // Últimos 6 dias
        if (dataApontamento >= seisDiasAtras && dataApontamento <= hoje) {
          peso6DiasRecentes += pesoTotal;
        }
      });

      // Calcular peso necessário para próximos 7 dias (meta)
      const { data: ofData } = await supabase
        .from('ordens_fabricacao')
        .select('peso_total, data_prazo')
        .eq('num_of', ofNumber)
        .single();

      let pesoMeta = 0;
      if (ofData?.peso_total && ofData?.data_prazo) {
        const dataFim = new Date(ofData.data_prazo);
        const diasRestantes = Math.max(1, Math.ceil((dataFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)));
        const pesoTotalProcessado = peso7a14Dias + peso6DiasRecentes;
        const pesoRestante = Math.max(0, ofData.peso_total - pesoTotalProcessado);
        
        // Meta para próximos 7 dias baseada no ritmo necessário
        if (diasRestantes <= 7) {
          pesoMeta = pesoRestante;
        } else {
          pesoMeta = (pesoRestante / diasRestantes) * 7;
        }
      }

      const resultado = [
        { name: '7-15d', weight: Number(peso7a14Dias.toFixed(0)) }, // Mantido em Kg
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
