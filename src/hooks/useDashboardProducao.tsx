
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DashboardProcesso {
  id: string;
  nome: string;
  pesoTotal: number;
  pesoFabricado: number;
  progressoReal: number;
  progressoEsperado: number;
  status: 'verde' | 'amarelo' | 'vermelho';
  dataInicioPlanned?: string;
  dataFimPlanned?: string;
  dataInicioReal?: string;
  dataFimReal?: string;
  dadosGrafico: {
    data: string;
    planejado: number;
    realizado: number;
  }[];
}

export interface DashboardData {
  of: string;
  progressoGeral: number;
  pesoTotalFabricado: number;
  tonelagem: number;
  processos: DashboardProcesso[];
}

export const useDashboardProducao = (ofNumber: string) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = async () => {
    if (!ofNumber) {
      setDashboardData(null);
      return;
    }

    setLoading(true);
    try {
      // Buscar dados da OF
      const { data: ofData, error: ofError } = await supabase
        .from('ordens_fabricacao')
        .select('*')
        .eq('num_of', ofNumber)
        .single();

      if (ofError) throw ofError;

      // Buscar peças da OF
      const { data: pecasData, error: pecasError } = await supabase
        .from('pecas')
        .select('*')
        .eq('of_number', ofNumber);

      if (pecasError) throw pecasError;

      // Buscar apontamentos da OF
      const { data: apontamentosData, error: apontamentosError } = await supabase
        .from('apontamentos_producao')
        .select(`
          *,
          peca:pecas!apontamentos_producao_peca_id_fkey(peso_unitario),
          processo:processos_fabricacao!apontamentos_producao_processo_id_fkey(nome, ordem)
        `)
        .eq('of_number', ofNumber);

      if (apontamentosError) throw apontamentosError;

      // Buscar processos
      const { data: processosData, error: processosError } = await supabase
        .from('processos_fabricacao')
        .select('*')
        .eq('ativo', true)
        .order('ordem');

      if (processosError) throw processosError;

      // Calcular dados do dashboard
      const pesoTotalPlanejado = pecasData.reduce((total, peca) => 
        total + (peca.quantidade * (peca.peso_unitario || 0)), 0
      );

      const pesoTotalFabricado = apontamentosData.reduce((total, apontamento) => 
        total + (apontamento.quantidade_produzida * (apontamento.peca?.peso_unitario || 0)), 0
      );

      const progressoGeral = pesoTotalPlanejado > 0 ? (pesoTotalFabricado / pesoTotalPlanejado) * 100 : 0;

      // Processar dados por processo
      const processos: DashboardProcesso[] = processosData.map(processo => {
        const apontamentosProcesso = apontamentosData.filter(a => a.processo_id === processo.id);
        const pesoFabricadoProcesso = apontamentosProcesso.reduce((total, a) => 
          total + (a.quantidade_produzida * (a.peca?.peso_unitario || 0)), 0
        );

        const progressoReal = pesoTotalPlanejado > 0 ? (pesoFabricadoProcesso / pesoTotalPlanejado) * 100 : 0;
        
        // Calcular progresso esperado baseado na data atual
        const hoje = new Date();
        const dataInicio = ofData.data_abertura ? new Date(ofData.data_abertura) : new Date();
        const dataFim = ofData.data_prazo ? new Date(ofData.data_prazo) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        const diasTotais = Math.max(1, Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)));
        const diasDecorridos = Math.max(0, Math.ceil((hoje.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)));
        const progressoEsperado = Math.min(100, (diasDecorridos / diasTotais) * 100);

        // Determinar status
        let status: 'verde' | 'amarelo' | 'vermelho' = 'verde';
        if (progressoReal < progressoEsperado * 0.8) {
          status = 'vermelho';
        } else if (progressoReal < progressoEsperado * 0.9) {
          status = 'amarelo';
        }

        // Gerar dados do gráfico (últimos 30 dias)
        const dadosGrafico = [];
        const dataAtual = new Date();
        for (let i = 29; i >= 0; i--) {
          const data = new Date(dataAtual);
          data.setDate(data.getDate() - i);
          const dataStr = data.toISOString().split('T')[0];
          
          // Calcular progresso planejado para esta data
          const diasDesdeInicio = Math.max(0, Math.ceil((data.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)));
          const planejado = Math.min(pesoTotalPlanejado, (diasDesdeInicio / diasTotais) * pesoTotalPlanejado);
          
          // Calcular progresso real até esta data
          const apontamentosAteData = apontamentosProcesso.filter(a => a.data_apontamento <= dataStr);
          const realizado = apontamentosAteData.reduce((total, a) => 
            total + (a.quantidade_produzida * (a.peca?.peso_unitario || 0)), 0
          );

          dadosGrafico.push({
            data: dataStr,
            planejado,
            realizado
          });
        }

        return {
          id: processo.id,
          nome: processo.nome,
          pesoTotal: pesoTotalPlanejado,
          pesoFabricado: pesoFabricadoProcesso,
          progressoReal,
          progressoEsperado,
          status,
          dadosGrafico
        };
      });

      setDashboardData({
        of: ofNumber,
        progressoGeral,
        pesoTotalFabricado,
        tonelagem: pesoTotalPlanejado,
        processos
      });

    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ofNumber]);

  return {
    dashboardData,
    loading,
    refetch: fetchDashboardData
  };
};
