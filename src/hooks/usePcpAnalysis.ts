import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProcessoSimulado {
  nome: string;
  ordem: number;
  dataInicio: string;
  dataFim: string;
  pesoKg: number;
  pesoConcluidoKg: number;
  pesoPendenteKg: number;
  diasUteis: number;
}

export interface OfPcpCard {
  id: string;
  num_of: string;
  descritivo: string;
  cliente?: string;
  pesoTotalKg: number;
  pesoConcluidoKg: number;
  progressoPercent: number;
  dataInicioPrevista: string;
  dataEntregaObra: string;
  dataFimCronograma: string;
  status: 'no_prazo' | 'atencao' | 'critico';
  folgaDiasObra: number; // dias entre fim da fabricação e necessidade na obra
  processos: ProcessoSimulado[];
}

export interface CargaPeriodoProcesso {
  semanaKey: string; // Ex: "Sem 41 (12/10)"
  semanaInicio: string;
  semanaFim: string;
  processoNome: string;
  cargaKg: number;
  capacidadeNominalKg: number;
  capacidadeRealKg: number;
  percentualOcupacao: number;
  ofDetalhes: { num_of: string; kg: number }[];
}

export interface RecomendacaoPcp {
  id: string;
  tipo: 'nivelamento_prazo' | 'rebalanceamento_equipe' | 'hora_extra' | 'terceirizacao' | 'priorizacao';
  nivel: 'info' | 'alerta' | 'critico';
  titulo: string;
  descricao: string;
  ofAlvo?: string;
  processoAlvo?: string;
  impactoEstimado: string;
  sugestaoDiasAjuste?: number;
}

export interface SimuladorConfig {
  horasExtrasPorProcesso: Record<string, number>; // processoNome -> horas extras/dia (0 a 4)
  efetivoFatorPorProcesso: Record<string, number>; // processoNome -> multiplicador (ex: 1.2 = +20% equipe)
  deslocamentoDiasOf: Record<string, number>; // num_of -> deslocar dias (+5, -3, etc)
}

export const usePcpAnalysis = () => {
  const [loading, setLoading] = useState(true);
  const [allOfs, setAllOfs] = useState<OfPcpCard[]>([]);
  const [selectedOfNumbers, setSelectedOfNumbers] = useState<string[]>([]);
  const [simulador, setSimulador] = useState<SimuladorConfig>({
    horasExtrasPorProcesso: {},
    efetivoFatorPorProcesso: {},
    deslocamentoDiasOf: {},
  });

  // Capacidade nominal diária padrão por posto (em kg/dia) - pode ser customizada
  const capacidadePadraoKgDia: Record<string, number> = {
    'Corte': 5000,
    'Furação': 4500,
    'Montagem': 4000,
    'Solda': 3500,
    'Jateamento': 5000,
    'Pintura': 5000,
    'Expedição': 6000,
  };

  // Carregar dados brutos das OFs, cronogramas e apontamentos
  const carregarDados = async () => {
    try {
      setLoading(true);

      // 1. Buscar todas as OFs em andamento/abertas
      const { data: ordens, error: ordensError } = await supabase
        .from('ordens_fabricacao')
        .select(`
          id,
          num_of,
          descritivo,
          peso_total,
          data_abertura,
          data_prazo,
          data_termino_prev,
          status
        `)
        .order('num_of', { ascending: true });

      if (ordensError) throw ordensError;

      // 2. Buscar cronogramas cadastrados com processos
      const { data: cronogramasRaw, error: cronoError } = await supabase
        .from('cronogramas_of')
        .select(`
          id,
          of_id,
          revisao,
          processos_cronograma (
            id,
            nome_processo,
            data_inicio,
            data_fim,
            ordem
          )
        `);

      if (cronoError) console.warn('Aviso ao carregar cronogramas:', cronoError);

      // 3. Buscar apontamentos acumulados agrupados por OF e Processo
      const { data: apontamentos, error: aptError } = await supabase
        .from('apontamentos_producao')
        .select(`
          of_number,
          peso_total,
          quantidade,
          data_apontamento,
          processos_fabricacao (
            nome,
            ordem
          )
        `);

      if (aptError) console.warn('Aviso ao carregar apontamentos:', aptError);

      // 4. Buscar peças para conferência do peso total real
      const { data: pecasData } = await supabase
        .from('pecas')
        .select('of_number, peso_unitario, quantidade');

      // Indexar pesos de peças por OF
      const pesoPecasPorOf: Record<string, number> = {};
      (pecasData || []).forEach((p) => {
        const peso = (Number(p.peso_unitario) || 0) * (Number(p.quantidade) || 0);
        pesoPecasPorOf[p.of_number] = (pesoPecasPorOf[p.of_number] || 0) + peso;
      });

      // Indexar apontamentos por OF e nome do processo
      const apontadoPorOfProcesso: Record<string, Record<string, number>> = {};
      (apontamentos || []).forEach((apt: any) => {
        const ofNum = apt.of_number;
        const procNome = apt.processos_fabricacao?.nome || 'Geral';
        const peso = Number(apt.peso_total) || 0;
        if (!apontadoPorOfProcesso[ofNum]) apontadoPorOfProcesso[ofNum] = {};
        apontadoPorOfProcesso[ofNum][procNome] = (apontadoPorOfProcesso[ofNum][procNome] || 0) + peso;
      });

      // Montar lista de OFs para o PCP
      const cards: OfPcpCard[] = (ordens || []).map((of) => {
        const pesoTotal = pesoPecasPorOf[of.num_of] || Number(of.peso_total) || 1000;
        const crono = (cronogramasRaw || []).find((c) => c.of_id === of.id);
        const processosCronograma = crono?.processos_cronograma || [];

        // Montar processos
        let processosMapeados: ProcessoSimulado[] = [];
        if (processosCronograma.length > 0) {
          processosMapeados = processosCronograma
            .sort((a: any, b: any) => a.ordem - b.ordem)
            .map((p: any) => {
              const procNome = p.nome_processo;
              const concluido = apontadoPorOfProcesso[of.num_of]?.[procNome] || 0;
              const inicio = new Date(p.data_inicio);
              const fim = new Date(p.data_fim);
              const dias = Math.max(1, Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 3600 * 24)));
              return {
                nome: procNome,
                ordem: p.ordem,
                dataInicio: p.data_inicio,
                dataFim: p.data_fim,
                pesoKg: pesoTotal,
                pesoConcluidoKg: Math.min(pesoTotal, concluido),
                pesoPendenteKg: Math.max(0, pesoTotal - concluido),
                diasUteis: dias,
              };
            });
        } else {
          // Fallback caso não haja cronograma detalhado ainda cadastrado
          const dataIniStr = of.data_abertura || new Date().toISOString().split('T')[0];
          const dataFimStr = of.data_termino_prev || of.data_prazo || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0];
          const procsFallback = ['Corte', 'Montagem', 'Solda', 'Pintura', 'Expedição'];
          processosMapeados = procsFallback.map((nome, idx) => ({
            nome,
            ordem: idx + 1,
            dataInicio: dataIniStr,
            dataFim: dataFimStr,
            pesoKg: pesoTotal,
            pesoConcluidoKg: 0,
            pesoPendenteKg: pesoTotal,
            diasUteis: 20,
          }));
        }

        const totalConcluido = Object.values(apontadoPorOfProcesso[of.num_of] || {}).reduce((acc, v) => acc + v, 0);
        // Média de avanço considerando os processos
        const progressoPercent = pesoTotal > 0 
          ? Math.min(100, Math.round((totalConcluido / (pesoTotal * Math.max(1, processosMapeados.length))) * 100))
          : 0;

        // Datas limites
        const dataFimCronograma = processosMapeados.length > 0
          ? processosMapeados[processosMapeados.length - 1].dataFim
          : (of.data_termino_prev || of.data_prazo || '');
        
        const dataEntregaObra = of.data_termino_prev || of.data_prazo || dataFimCronograma;

        // Calcular folga em relação à obra
        let folgaDiasObra = 0;
        if (dataEntregaObra && dataFimCronograma) {
          const dtObra = new Date(dataEntregaObra).getTime();
          const dtFimCrono = new Date(dataFimCronograma).getTime();
          folgaDiasObra = Math.round((dtObra - dtFimCrono) / (1000 * 3600 * 24));
        }

        let status: 'no_prazo' | 'atencao' | 'critico' = 'no_prazo';
        if (folgaDiasObra < 0) {
          status = 'critico';
        } else if (folgaDiasObra <= 5) {
          status = 'atencao';
        }

        return {
          id: of.id,
          num_of: of.num_of,
          descritivo: of.descritivo || `Obra OF ${of.num_of}`,
          pesoTotalKg: pesoTotal,
          pesoConcluidoKg: totalConcluido,
          progressoPercent,
          dataInicioPrevista: of.data_abertura || '',
          dataEntregaObra,
          dataFimCronograma,
          status,
          folgaDiasObra,
          processos: processosMapeados,
        };
      });

      setAllOfs(cards);
      // Selecionar por padrão as 3 primeiras OFs ativas
      if (cards.length > 0 && selectedOfNumbers.length === 0) {
        setSelectedOfNumbers(cards.slice(0, Math.min(3, cards.length)).map(c => c.num_of));
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados do PCP:', err);
      toast.error('Erro ao carregar dados de produção e cronogramas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  // OFs selecionadas na mesa de análise
  const ofsNaMesa = useMemo(() => {
    return allOfs.filter((c) => selectedOfNumbers.includes(c.num_of));
  }, [allOfs, selectedOfNumbers]);

  // Totais agregados da mesa
  const totaisMesa = useMemo(() => {
    const pesoTotalKg = ofsNaMesa.reduce((acc, c) => acc + c.pesoTotalKg, 0);
    const pesoConcluidoKg = ofsNaMesa.reduce((acc, c) => acc + c.pesoConcluidoKg, 0);
    const progressoMedio = ofsNaMesa.length > 0
      ? Math.round(ofsNaMesa.reduce((acc, c) => acc + c.progressoPercent, 0) / ofsNaMesa.length)
      : 0;

    return {
      totalOfs: ofsNaMesa.length,
      pesoTotalKg,
      pesoTotalTon: (pesoTotalKg / 1000).toFixed(1),
      pesoConcluidoKg,
      pesoConcluidoTon: (pesoConcluidoKg / 1000).toFixed(1),
      progressoMedio,
    };
  }, [ofsNaMesa]);

  // Função auxiliar para obter início da semana (Segunda-feira)
  const getSegundaFeira = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    date.setHours(0, 0, 0, 0);
    return date;
  };

  // CÁLCULO DE CARGA ACUMULADA POR SEMANA E PROCESSO (HISTOGRAMA)
  const cargaPorPeriodo = useMemo(() => {
    if (ofsNaMesa.length === 0) return [];

    // Mapear intervalos semanais
    const acumulador: Record<string, CargaPeriodoProcesso> = {};

    ofsNaMesa.forEach((of) => {
      const deslocamentoDias = simulador.deslocamentoDiasOf[of.num_of] || 0;

      of.processos.forEach((proc) => {
        const procNome = proc.nome;
        const pesoPendente = proc.pesoPendenteKg;
        if (pesoPendente <= 0) return;

        // Ajustar datas pelo simulador se houver deslocamento
        const dtInicio = new Date(proc.dataInicio);
        dtInicio.setDate(dtInicio.getDate() + deslocamentoDias);

        const dtFim = new Date(proc.dataFim);
        dtFim.setDate(dtFim.getDate() + deslocamentoDias);

        const diasTotais = Math.max(1, Math.ceil((dtFim.getTime() - dtInicio.getTime()) / (1000 * 3600 * 24)));
        const pesoPorDia = pesoPendente / diasTotais;

        // Percorrer cada dia do processo e alocar na semana correspondente
        const cursor = new Date(dtInicio);
        while (cursor <= dtFim) {
          const seg = getSegundaFeira(cursor);
          const sex = new Date(seg);
          sex.setDate(sex.getDate() + 4);

          const semanaKey = `Sem ${String(seg.getDate()).padStart(2, '0')}/${String(seg.getMonth() + 1).padStart(2, '0')}`;
          const mapKey = `${semanaKey}__${procNome}`;

          if (!acumulador[mapKey]) {
            // Capacidade nominal base (5 dias úteis por semana)
            const capBaseDia = capacidadePadraoKgDia[procNome] || 4000;
            const horaExtra = simulador.horasExtrasPorProcesso[procNome] || 0;
            const fatorEfetivo = simulador.efetivoFatorPorProcesso[procNome] || 1;
            // 8h base + horaExtra
            const fatorHoras = (8 + horaExtra) / 8;
            const capSemanal = capBaseDia * 5 * fatorHoras * fatorEfetivo;

            acumulador[mapKey] = {
              semanaKey,
              semanaInicio: seg.toISOString().split('T')[0],
              semanaFim: sex.toISOString().split('T')[0],
              processoNome: procNome,
              cargaKg: 0,
              capacidadeNominalKg: capBaseDia * 5,
              capacidadeRealKg: capSemanal,
              percentualOcupacao: 0,
              ofDetalhes: [],
            };
          }

          acumulador[mapKey].cargaKg += pesoPorDia;
          
          const existente = acumulador[mapKey].ofDetalhes.find(d => d.num_of === of.num_of);
          if (existente) {
            existente.kg += pesoPorDia;
          } else {
            acumulador[mapKey].ofDetalhes.push({ num_of: of.num_of, kg: pesoPorDia });
          }

          cursor.setDate(cursor.getDate() + 1);
        }
      });
    });

    // Calcular percentuais de ocupação
    const resultado = Object.values(acumulador).map((item) => {
      const perc = item.capacidadeRealKg > 0 ? Math.round((item.cargaKg / item.capacidadeRealKg) * 100) : 0;
      return {
        ...item,
        percentualOcupacao: perc,
      };
    });

    // Ordenar por semana cronológica
    return resultado.sort((a, b) => a.semanaInicio.localeCompare(b.semanaInicio));
  }, [ofsNaMesa, simulador]);

  // MOTOR INTELIGENTE DE RECOMENDAÇÕES E BALANCEAMENTO
  const recomendacoes = useMemo(() => {
    const list: RecomendacaoPcp[] = [];
    if (ofsNaMesa.length === 0) return list;

    // 1. Verificar sobrecarga/gargalo nos períodos
    const sobrecargas = cargaPorPeriodo.filter((c) => c.percentualOcupacao > 100);
    const processosSobrecarga = new Set(sobrecargas.map(s => s.processoNome));

    // 2. Verificar processos com folga acentuada no mesmo período
    const processosFolga = cargaPorPeriodo.filter((c) => c.percentualOcupacao < 60 && c.cargaKg > 0);

    // Regra A: Nivelamento de Prazo entre OFs (Load Leveling)
    // Se há OFs críticas e OFs com folga alta em obra
    const ofsComFolga = ofsNaMesa.filter((o) => o.folgaDiasObra > 10);
    const ofsApertadas = ofsNaMesa.filter((o) => o.folgaDiasObra <= 3);

    if (ofsComFolga.length > 0 && ofsApertadas.length > 0 && sobrecargas.length > 0) {
      const ofDoadora = ofsComFolga[0];
      const ofReceptora = ofsApertadas[0];
      list.push({
        id: 'rec_nivelamento_1',
        tipo: 'nivelamento_prazo',
        nivel: 'critico',
        titulo: `Balanceamento de Prazos: Postergar OF ${ofDoadora.num_of} em favor da OF ${ofReceptora.num_of}`,
        descricao: `A OF ${ofDoadora.num_of} possui ${ofDoadora.folgaDiasObra} dias de folga antes da montagem em obra, enquanto a OF ${ofReceptora.num_of} está com prazo crítico. Postergar o início da OF ${ofDoadora.num_of} em 5 a 7 dias desobstruirá o fluxo produtivo sem comprometer nenhuma data de obra.`,
        ofAlvo: ofDoadora.num_of,
        impactoEstimado: 'Redução de até 35% na sobrecarga simultânea de fabricação.',
        sugestaoDiasAjuste: 7,
      });
    }

    // Regra B: Rebalanceamento de Equipe entre postos
    if (processosSobrecarga.has('Solda') && processosFolga.some(p => p.processoNome === 'Montagem' || p.processoNome === 'Corte')) {
      list.push({
        id: 'rec_equipe_solda',
        tipo: 'rebalanceamento_equipe',
        nivel: 'alerta',
        titulo: 'Rebalanceamento de Mão de Obra: Transferir efetivo para Solda',
        descricao: 'O posto de Solda está em pico de sobrecarga (> 100%), enquanto a Montagem/Corte opera com capacidade ociosa no mesmo período. Recomenda-se realocar caldeireiros/montadores qualificados para suporte na soldagem.',
        processoAlvo: 'Solda',
        impactoEstimado: '+25% de capacidade diária na Solda, eliminando 4 dias de represamento.',
      });
    }

    // Regra C: Sugestão de Horas Extras pontuais
    sobrecargas.forEach((sb) => {
      if (sb.percentualOcupacao > 120) {
        list.push({
          id: `rec_he_${sb.semanaKey}_${sb.processoNome}`,
          tipo: 'hora_extra',
          nivel: 'alerta',
          titulo: `Horas Extras recomendadas em ${sb.processoNome} (${sb.semanaKey})`,
          descricao: `A demanda atinge ${(sb.cargaKg / 1000).toFixed(1)} ton contra capacidade de ${(sb.capacidadeRealKg / 1000).toFixed(1)} ton (${sb.percentualOcupacao}% de ocupação). Abrir 2 horas extras por dia neste processo restabelece o fluxo programado.`,
          processoAlvo: sb.processoNome,
          impactoEstimado: 'Equalização da carga semanal sem atraso para os processos seguintes.',
        });
      }
    });

    // Regra D: Priorização de Ataque na Linha
    if (ofsApertadas.length > 0) {
      const prioritarias = [...ofsApertadas].sort((a, b) => a.folgaDiasObra - b.folgaDiasObra);
      list.push({
        id: 'rec_prioridade',
        tipo: 'priorizacao',
        nivel: 'info',
        titulo: `Ordem de Ataque Recomendada na Fábrica`,
        descricao: `Priorizar a liberação sequencial dos lotes na ordem: ${prioritarias.map(p => `OF ${p.num_of}`).join(' ➔ ')}. Colocar as ordens com maior folga em pulmão de espera temporário caso haja fila.`,
        impactoEstimado: 'Prevenção de paradas e penalidades contratuais em obra.',
      });
    }

    return list;
  }, [ofsNaMesa, cargaPorPeriodo]);

  // Ações de manipulação da mesa
  const alternarSelecaoOf = (numOf: string) => {
    setSelectedOfNumbers((prev) =>
      prev.includes(numOf) ? prev.filter((n) => n !== numOf) : [...prev, numOf]
    );
  };

  const adicionarTodasOfs = () => {
    setSelectedOfNumbers(allOfs.map((o) => o.num_of));
  };

  const limparMesa = () => {
    setSelectedOfNumbers([]);
  };

  // Ajustes no simulador What-If
  const setHorasExtras = (processo: string, horas: number) => {
    setSimulador((prev) => ({
      ...prev,
      horasExtrasPorProcesso: { ...prev.horasExtrasPorProcesso, [processo]: horas },
    }));
  };

  const setEfetivoFator = (processo: string, fator: number) => {
    setSimulador((prev) => ({
      ...prev,
      efetivoFatorPorProcesso: { ...prev.efetivoFatorPorProcesso, [processo]: fator },
    }));
  };

  const setDeslocamentoOf = (numOf: string, dias: number) => {
    setSimulador((prev) => ({
      ...prev,
      deslocamentoDiasOf: { ...prev.deslocamentoDiasOf, [numOf]: dias },
    }));
  };

  const resetarSimulador = () => {
    setSimulador({
      horasExtrasPorProcesso: {},
      efetivoFatorPorProcesso: {},
      deslocamentoDiasOf: {},
    });
  };

  return {
    loading,
    allOfs,
    selectedOfNumbers,
    ofsNaMesa,
    totaisMesa,
    cargaPorPeriodo,
    recomendacoes,
    simulador,
    alternarSelecaoOf,
    adicionarTodasOfs,
    limparMesa,
    setHorasExtras,
    setEfetivoFator,
    setDeslocamentoOf,
    resetarSimulador,
    recarregarDados: carregarDados,
  };
};
