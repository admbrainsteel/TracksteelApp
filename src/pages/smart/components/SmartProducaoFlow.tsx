import React, { useState, useMemo } from 'react';
import { 
  Scissors, 
  Ruler, 
  Puzzle, 
  Zap, 
  Paintbrush, 
  ShieldAlert, 
  Check, 
  Layers, 
  Plus, 
  Minus, 
  AlertTriangle, 
  ChevronRight,
  Filter,
  Delete,
  Pencil,
  CheckCheck
} from 'lucide-react';
import { OFAtiva } from '@/hooks/useOFsAtivas';
import { useProcessosFabricacao, ProcessoFabricacao } from '@/hooks/useProcessosFabricacao';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { smartAudio } from '@/utils/smartAudio';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { SmartForcarApontamentoModal } from './SmartForcarApontamentoModal';

interface SmartProducaoFlowProps {
  obra: OFAtiva;
  onApontamentoRealizado: (pecasCount: number, pesoKg: number) => void;
  onVoltarHub: () => void;
}

interface PecaData {
  id: string;
  marca: string;
  descricao: string;
  etapa_fase: string;
  quantidade: number;
  peso_unitario: number;
  perfil_principal?: string;
  tem_componentes?: boolean | null;
}

interface CalculoSaldoPeca {
  saldo: number;
  jaProduzido: number;
  qtdDisponivelParaEntrar: number;
  ehSemMontagem: boolean;
  motivoBloqueio: string | null;
  minPermitido: number;
  procSeguinteNome: string | null;
}

// Função auxiliar pura para cálculo sequencial de saldo por processo e regra S/M
export const calcularSaldoProcessoPeca = (
  peca: PecaData,
  processoAtual: ProcessoFabricacao,
  todosProcessos: ProcessoFabricacao[],
  mapaProd: Map<string, number>
): CalculoSaldoPeca => {
  const ehSemMontagem = peca.tem_componentes === false;
  const keyAtual = `${peca.id}_${processoAtual.id}`;
  const jaProduzidoAtual = mapaProd.get(keyAtual) || 0;

  const procsOrdenados = [...todosProcessos].sort((a, b) => a.ordem - b.ordem);
  const indexAtual = procsOrdenados.findIndex((p) => p.id === processoAtual.id);
  const nomeProcAtual = (processoAtual.nome || '').toLowerCase();

  const ehSolda = nomeProcAtual.includes('solda');

  let qtdDisponivelParaEntrar = Number(peca.quantidade) || 0;
  let motivoBloqueio: string | null = null;

  // REGRA 1: Peças sem montagem (S/M) não passam por Solda
  if (ehSemMontagem && ehSolda) {
    qtdDisponivelParaEntrar = 0;
    motivoBloqueio = 'Peça S/M (Pula Solda - vai direto para Pintura)';
  } else if (indexAtual > 0) {
    // REGRA 2: Encontrar processo anterior válido
    let procAnteriorValido: ProcessoFabricacao | null = null;
    for (let i = indexAtual - 1; i >= 0; i--) {
      const proc = procsOrdenados[i];
      const nomeP = (proc.nome || '').toLowerCase();
      // Se a peça for S/M, pula solda na busca do anterior (ex: Corte -> Pintura)
      if (ehSemMontagem && nomeP.includes('solda')) {
        continue;
      }
      procAnteriorValido = proc;
      break;
    }

    if (procAnteriorValido) {
      const keyAnt = `${peca.id}_${procAnteriorValido.id}`;
      const qtdApontadaAnterior = mapaProd.get(keyAnt) || 0;
      qtdDisponivelParaEntrar = qtdApontadaAnterior;

      if (qtdApontadaAnterior === 0) {
        motivoBloqueio = `Aguardando ${procAnteriorValido.nome}`;
      } else if (qtdApontadaAnterior < peca.quantidade && qtdApontadaAnterior <= jaProduzidoAtual) {
        motivoBloqueio = `Aguardando saldo em ${procAnteriorValido.nome} (${qtdApontadaAnterior}/${peca.quantidade})`;
      }
    }
  }

  // REGRA 3: Encontrar processo subsequente válido para limitar a edição (minPermitido)
  let minPermitido = 0;
  let procSeguinteNome: string | null = null;
  if (indexAtual >= 0 && indexAtual < procsOrdenados.length - 1) {
    let procSeguinteValido: ProcessoFabricacao | null = null;
    for (let i = indexAtual + 1; i < procsOrdenados.length; i++) {
      const proc = procsOrdenados[i];
      const nomeP = (proc.nome || '').toLowerCase();
      // Se a peça for S/M, pula solda na busca do subsequente
      if (ehSemMontagem && nomeP.includes('solda')) {
        continue;
      }
      procSeguinteValido = proc;
      break;
    }

    if (procSeguinteValido) {
      const keySeg = `${peca.id}_${procSeguinteValido.id}`;
      minPermitido = mapaProd.get(keySeg) || 0;
      procSeguinteNome = procSeguinteValido.nome;
    }
  }

  const saldo = Math.max(0, qtdDisponivelParaEntrar - jaProduzidoAtual);

  return {
    saldo,
    jaProduzido: jaProduzidoAtual,
    qtdDisponivelParaEntrar,
    ehSemMontagem,
    motivoBloqueio,
    minPermitido,
    procSeguinteNome
  };
};

interface ApontamentoItem {
  id?: string;
  peca_id: string;
  processo_id: string;
  quantidade_produzida: number;
  is_forcado?: boolean;
  status_confirmacao?: string;
  forcado_por_user_nome?: string;
  usuario_nome?: string;
}

export const SmartProducaoFlow: React.FC<SmartProducaoFlowProps> = ({
  obra,
  onApontamentoRealizado,
  onVoltarHub,
}) => {
  const { user } = useAuth();
  const { data: processos = [], isLoading: loadingProcessos } = useProcessosFabricacao();

  // Estados da esteira guiada
  const [etapaAtual, setEtapaAtual] = useState<'processo' | 'fase' | 'pecas' | 'quantidade'>('processo');
  const [processoSelecionado, setProcessoSelecionado] = useState<ProcessoFabricacao | null>(null);
  const [faseSelecionada, setFaseSelecionada] = useState<string>('');
  const [pecaSelecionada, setPecaSelecionada] = useState<PecaData | null>(null);

  // Quantidade selecionada no teclado rápido
  const [qtdApontar, setQtdApontar] = useState<number>(1);
  const [salvando, setSalvando] = useState<boolean>(false);
  const [modoEdicao, setModoEdicao] = useState<boolean>(false);

  // Modal de Forçar Apontamento
  const [isForcarModalOpen, setIsForcarModalOpen] = useState<boolean>(false);

  // Dados carregados da OF
  const [pecas, setPecas] = useState<PecaData[]>([]);
  const [apontamentosExistentes, setApontamentosExistentes] = useState<ApontamentoItem[]>([]);
  const [carregandoDados, setCarregandoDados] = useState<boolean>(true);

  // Carregar peças e apontamentos da OF
  const carregarDadosOF = React.useCallback(async () => {
    try {
      setCarregandoDados(true);

      const [resPecas, resApontamentos] = await Promise.all([
        supabase
          .from('pecas')
          .select('id, marca, descricao, etapa_fase, quantidade, peso_unitario, perfil_principal, tem_componentes')
          .eq('of_number', obra.of_number),
        supabase
          .from('apontamentos_producao')
          .select('id, peca_id, processo_id, quantidade_produzida, is_forcado, status_confirmacao, forcado_por_user_nome, usuario_nome')
          .eq('of_number', obra.of_number),
      ]);

      if (resPecas.data) {
        setPecas(resPecas.data);
      }
      if (resApontamentos.data) {
        setApontamentosExistentes(resApontamentos.data as any);
      }
    } catch (e) {
      console.error('Erro ao carregar dados da OF:', e);
      toast.error('Erro ao buscar peças da obra');
    } finally {
      setCarregandoDados(false);
    }
  }, [obra.of_number]);

  React.useEffect(() => {
    carregarDadosOF();
  }, [carregarDadosOF]);

  // Lista de fases únicas da OF
  const fasesDisponiveis = useMemo(() => {
    const setFases = new Set<string>();
    pecas.forEach((p) => {
      if (p.etapa_fase && p.etapa_fase.trim()) {
        setFases.add(p.etapa_fase.trim());
      }
    });
    const lista = Array.from(setFases).sort();
    return lista.length > 0 ? lista : ['Geral'];
  }, [pecas]);

  // Mapa de produção acumulada por peca_id e processo_id
  const mapaProducao = useMemo(() => {
    const mapa = new Map<string, number>();
    apontamentosExistentes.forEach((ap) => {
      const key = `${ap.peca_id}_${ap.processo_id}`;
      const atual = mapa.get(key) || 0;
      mapa.set(key, atual + Number(ap.quantidade_produzida || 0));
    });
    return mapa;
  }, [apontamentosExistentes]);

  // Apontamentos forçados que ainda estão pendentes de confirmação de baixa
  const apontamentosPendentes = useMemo(() => {
    return apontamentosExistentes.filter(
      (ap) => ap.is_forcado && ap.status_confirmacao === 'pendente_confirmacao'
    );
  }, [apontamentosExistentes]);

  // Contagem de pendências por processo (para alertar no Step 1.1)
  const contagemPendentesPorProcesso = useMemo(() => {
    const map = new Map<string, number>();
    apontamentosPendentes.forEach((ap) => {
      map.set(ap.processo_id, (map.get(ap.processo_id) || 0) + 1);
    });
    return map;
  }, [apontamentosPendentes]);

  // Contagem de pendências por fase no processo selecionado (para alertar no Step 1.2)
  const contagemPendentesPorFase = useMemo(() => {
    const map = new Map<string, number>();
    if (!processoSelecionado) return map;

    apontamentosPendentes.forEach((ap) => {
      if (ap.processo_id === processoSelecionado.id) {
        const peca = pecas.find((p) => p.id === ap.peca_id);
        const fase = (peca?.etapa_fase || 'Geral').trim();
        map.set(fase, (map.get(fase) || 0) + 1);
      }
    });
    return map;
  }, [apontamentosPendentes, processoSelecionado, pecas]);

  // Mapa de pendências por peça no processo selecionado (para alertar no Step 1.3)
  const pecasPendentesMap = useMemo(() => {
    const map = new Map<string, ApontamentoItem[]>();
    if (!processoSelecionado) return map;

    apontamentosPendentes.forEach((ap) => {
      if (ap.processo_id === processoSelecionado.id) {
        const lista = map.get(ap.peca_id) || [];
        lista.push(ap);
        map.set(ap.peca_id, lista);
      }
    });
    return map;
  }, [apontamentosPendentes, processoSelecionado]);

  // Peças filtradas pela fase selecionada com cálculo estrito de precedência de processos e regra S/M
  const pecasComSaldo = useMemo(() => {
    if (!processoSelecionado) return [];

    return pecas
      .filter((p) => {
        if (!faseSelecionada || faseSelecionada === 'Geral') return true;
        return (p.etapa_fase || 'Geral').trim() === faseSelecionada;
      })
      .map((p) => {
        const info = calcularSaldoProcessoPeca(p, processoSelecionado, processos, mapaProducao);
        return {
          ...p,
          ...info,
        };
      })
      .sort((a, b) => {
        // Colocar primeiro as que têm pendência de confirmação de baixa
        const temPendA = pecasPendentesMap.has(a.id);
        const temPendB = pecasPendentesMap.has(b.id);
        if (temPendA && !temPendB) return -1;
        if (!temPendA && temPendB) return 1;

        // Depois as que têm saldo pendente disponível > 0
        if (a.saldo > 0 && b.saldo === 0) return -1;
        if (a.saldo === 0 && b.saldo > 0) return 1;
        return a.marca.localeCompare(b.marca, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [pecas, faseSelecionada, processoSelecionado, mapaProducao, processos, pecasPendentesMap]);

  // Helper de ícone por processo
  const getIconeProcesso = (nome: string) => {
    const n = (nome || '').toLowerCase();
    if (n.includes('corte')) return <Scissors className="h-6 w-6" />;
    if (n.includes('dobra') || n.includes('fura')) return <Ruler className="h-6 w-6" />;
    if (n.includes('montag')) return <Puzzle className="h-6 w-6" />;
    if (n.includes('solda')) return <Zap className="h-6 w-6" />;
    if (n.includes('pintura')) return <Paintbrush className="h-6 w-6" />;
    return <ShieldAlert className="h-6 w-6" />;
  };

  // ── AÇÕES DE TRANSIÇÃO ──

  const handleEscolherProcesso = (proc: ProcessoFabricacao) => {
    smartAudio.playClick();
    setProcessoSelecionado(proc);
    setEtapaAtual('fase');
  };

  const handleEscolherFase = (fase: string) => {
    smartAudio.playClick();
    setFaseSelecionada(fase);
    setEtapaAtual('pecas');
  };

  const handleIniciarApontamentoPeca = (peca: PecaData, saldo: number) => {
    smartAudio.playClick();
    setPecaSelecionada(peca);
    setQtdApontar(saldo > 0 ? (saldo >= 1 ? 1 : saldo) : 1);
    setModoEdicao(false);
    setEtapaAtual('quantidade');
  };

  // Confirmar baixa direta de apontamento forçado pendente
  const handleConfirmarBaixaDireta = async (apontamentoId: string, marca: string) => {
    try {
      smartAudio.playClick();
      const nomeOperador = user?.name || user?.username || user?.email?.split('@')[0] || 'Operador';

      const { error } = await supabase
        .from('apontamentos_producao' as any)
        .update({
          status_confirmacao: 'confirmado',
          data_confirmacao: new Date().toISOString(),
          confirmado_por_user_nome: nomeOperador,
          confirmado_por_user_id: user?.id,
        })
        .eq('id', apontamentoId);

      if (error) throw error;

      smartAudio.playSuccess();
      toast.success(`✅ Baixa confirmada com sucesso: ${marca}`);
      await carregarDadosOF();
    } catch (e: any) {
      smartAudio.playAlert();
      console.error('Erro ao confirmar baixa:', e);
      toast.error('Erro ao confirmar baixa: ' + (e?.message || 'Falha de conexão'));
    }
  };

  // Salvar apontamento no Supabase
  const handleConfirmarApontamento = async () => {
    if (!pecaSelecionada || !processoSelecionado || !user) return;

    if (qtdApontar < 0) {
      smartAudio.playAlert();
      toast.error('A quantidade não pode ser negativa');
      return;
    }

    if (!modoEdicao && qtdApontar <= 0) {
      smartAudio.playAlert();
      toast.error('Informe uma quantidade maior que zero para um novo apontamento');
      return;
    }

    const info = calcularSaldoProcessoPeca(pecaSelecionada, processoSelecionado, processos, mapaProducao);
    if (modoEdicao && qtdApontar < info.minPermitido) {
      smartAudio.playAlert();
      toast.error(`Não é possível reduzir para ${qtdApontar}. O processo seguinte (${info.procSeguinteNome}) já consumiu ${info.minPermitido} peças. Ajuste o processo seguinte primeiro.`);
      return;
    }

    try {
      setSalvando(true);
      const hoje = new Date().toISOString().split('T')[0];
      const nomeUsuario = user.name || user.username || user.email?.split('@')[0] || 'Operador';

      if (modoEdicao) {
        if (qtdApontar === info.jaProduzido) {
          smartAudio.playClick();
          toast.info('Nenhuma alteração na quantidade foi feita.');
          setEtapaAtual('pecas');
          setPecaSelecionada(null);
          setModoEdicao(false);
          setSalvando(false);
          return;
        }

        // Em modo de edição/ajuste, removemos os apontamentos anteriores dessa peça/processo
        // e, se a nova quantidade for > 0, inserimos o apontamento ajustado consolidado.
        // Isso evita deltas negativos (que violam a check constraint quantidade_positiva)
        // e permite zerar/anular o apontamento com perfeição.
        const { error: deleteError } = await supabase
          .from('apontamentos_producao')
          .delete()
          .eq('of_number', obra.of_number)
          .eq('peca_id', pecaSelecionada.id)
          .eq('processo_id', processoSelecionado.id);

        if (deleteError) {
          throw deleteError;
        }

        if (qtdApontar > 0) {
          const payload = {
            of_number: obra.of_number,
            peca_id: pecaSelecionada.id,
            tipo_apontamento: 'peca' as const,
            processo_id: processoSelecionado.id,
            quantidade_produzida: qtdApontar,
            data_apontamento: hoje,
            created_by: user.id,
            usuario_nome: nomeUsuario,
            is_forcado: false,
            status_confirmacao: 'confirmado',
            observacoes: `Ajuste de quantidade total para ${qtdApontar} un via Modo Smart`,
          };

          const { error: insertError } = await supabase.from('apontamentos_producao').insert(payload);
          if (insertError) throw insertError;
        }

        smartAudio.playSuccess();
        if (qtdApontar === 0) {
          toast.success(`🗑️ Apontamento anulado/zerado: ${pecaSelecionada.marca} (${processoSelecionado.nome})`);
        } else {
          toast.success(`✏️ Ajuste realizado: ${pecaSelecionada.marca} (${processoSelecionado.nome}) para ${qtdApontar} un`);
        }

        const delta = qtdApontar - info.jaProduzido;
        const pesoTotalKg = delta * (pecaSelecionada.peso_unitario || 0);
        onApontamentoRealizado(qtdApontar, pesoTotalKg);

      } else {
        // Novo apontamento regular
        const payload = {
          of_number: obra.of_number,
          peca_id: pecaSelecionada.id,
          tipo_apontamento: 'peca' as const,
          processo_id: processoSelecionado.id,
          quantidade_produzida: qtdApontar,
          data_apontamento: hoje,
          created_by: user.id,
          usuario_nome: nomeUsuario,
          is_forcado: false,
          status_confirmacao: 'confirmado',
          observacoes: 'Apontado via Modo Smart',
        };

        const { error } = await supabase.from('apontamentos_producao').insert(payload);
        if (error) {
          throw error;
        }

        smartAudio.playSuccess();
        toast.success(`✅ Apontado: ${qtdApontar}x ${pecaSelecionada.marca} (${processoSelecionado.nome})`);

        const pesoTotalKg = qtdApontar * (pecaSelecionada.peso_unitario || 0);
        onApontamentoRealizado(qtdApontar, pesoTotalKg);
      }

      // Atualiza os dados imediatamente e volta para a lista de peças daquela Fase/Processo
      await carregarDadosOF();

      setEtapaAtual('pecas');
      setPecaSelecionada(null);
      setModoEdicao(false);
    } catch (e: any) {
      smartAudio.playAlert();
      console.error('Erro ao salvar apontamento:', e);
      toast.error('Falha ao registrar apontamento: ' + (e?.message || 'Erro de conexão'));
    } finally {
      setSalvando(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: ETAPA 1.1 — SELEÇÃO DE PROCESSO
  // ─────────────────────────────────────────────────────────────
  if (etapaAtual === 'processo') {
    return (
      <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
        <div className="mb-4 text-center">
          <span className="text-xs font-black uppercase text-amber-500 dark:text-amber-400 tracking-wider">
            ETAPA 1.1 — FABRICAÇÃO
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase mt-0.5">
            Qual é o seu Processo?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Selecione o posto de trabalho em que você está operando
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 overflow-y-auto pb-4">
          {loadingProcessos ? (
            <div className="col-span-full py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
              <span>Carregando etapas...</span>
            </div>
          ) : processos.length === 0 ? (
            // Fallback com processos industriais corretos
            [
              { id: '1', nome: 'Corte', ordem: 1 },
              { id: '2', nome: 'Dobra / Furação', ordem: 2 },
              { id: '3', nome: 'Solda', ordem: 3 },
              { id: '4', nome: 'Pintura', ordem: 4 },
              { id: '5', nome: 'Galvanização', ordem: 5 },
            ].map((p) => {
              const pendentesCount = contagemPendentesPorProcesso.get(p.id) || 0;
              const hasPend = pendentesCount > 0;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleEscolherProcesso(p as ProcessoFabricacao)}
                  className={`min-h-[72px] p-4 rounded-2xl border-2 flex items-center justify-between text-left transition-all active:scale-[0.98] group shadow-sm ${
                    hasPend
                      ? 'animate-pulse-red-fast bg-red-50/80 dark:bg-red-950/40 border-red-500 shadow-md shadow-red-500/20'
                      : 'bg-white hover:bg-amber-50/60 active:bg-amber-100/60 dark:bg-slate-800/90 dark:hover:bg-slate-750 dark:active:bg-slate-700 border-slate-200 hover:border-amber-400/80 dark:border-slate-700 dark:hover:border-amber-500/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                      hasPend ? 'bg-red-500 text-white animate-bounce' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400'
                    }`}>
                      {getIconeProcesso(p.nome)}
                    </div>
                    <div>
                      <div className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                        <span>{p.nome}</span>
                        {hasPend && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-600 text-white">
                            ⚠️ {pendentesCount} {pendentesCount === 1 ? 'pendência' : 'pendências'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Toque para selecionar</div>
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-slate-400 group-hover:text-amber-600 dark:text-slate-500 dark:group-hover:text-amber-400" />
                </button>
              );
            })
          ) : (
            processos.map((proc) => {
              const pendentesCount = contagemPendentesPorProcesso.get(proc.id) || 0;
              const hasPend = pendentesCount > 0;

              return (
                <button
                  key={proc.id}
                  type="button"
                  onClick={() => handleEscolherProcesso(proc)}
                  className={`min-h-[72px] p-4 rounded-2xl border-2 flex items-center justify-between text-left transition-all active:scale-[0.98] group shadow-sm ${
                    hasPend
                      ? 'animate-pulse-red-fast bg-red-50/80 dark:bg-red-950/40 border-red-500 shadow-md shadow-red-500/20'
                      : 'bg-white hover:bg-amber-50/60 active:bg-amber-100/60 dark:bg-slate-800/90 dark:hover:bg-slate-750 dark:active:bg-slate-700 border-slate-200 hover:border-amber-400/80 dark:border-slate-700 dark:hover:border-amber-500/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${
                      hasPend ? 'bg-red-500 text-white animate-bounce' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400'
                    }`}>
                      {getIconeProcesso(proc.nome)}
                    </div>
                    <div>
                      <div className="text-base font-black text-slate-900 dark:text-slate-100 uppercase tracking-wide flex items-center gap-2">
                        <span>{proc.nome}</span>
                        {hasPend && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-600 text-white">
                            ⚠️ {pendentesCount} {pendentesCount === 1 ? 'baixa pendente' : 'baixas pendentes'}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Etapa #{proc.ordem}</div>
                    </div>
                  </div>
                  <ChevronRight className="h-6 w-6 text-slate-400 group-hover:text-amber-600 dark:text-slate-500 dark:group-hover:text-amber-400" />
                </button>
              );
            })
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            smartAudio.playClick();
            onVoltarHub();
          }}
          className="w-full h-14 bg-white hover:bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 dark:border-slate-700 dark:text-slate-200 text-sm font-bold rounded-2xl mt-3 active:scale-98 transition-colors"
        >
          Voltar ao Menu Principal
        </Button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: ETAPA 1.2 — SELEÇÃO DE FASE / SUBCONJUNTO
  // ─────────────────────────────────────────────────────────────
  if (etapaAtual === 'fase') {
    return (
      <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
        {/* Breadcrumb de Processo */}
        <div className="mb-4 flex items-center justify-between p-3 rounded-2xl bg-amber-100 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/30 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-amber-800 dark:text-amber-400">{getIconeProcesso(processoSelecionado?.nome || '')}</span>
            <span className="text-sm font-black text-amber-900 dark:text-amber-300 uppercase">
              PROCESSO: {processoSelecionado?.nome}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              setEtapaAtual('processo');
            }}
            className="text-xs font-bold text-amber-800 dark:text-amber-400 underline hover:text-amber-900 dark:hover:text-amber-300 px-2 py-1"
          >
            Trocar
          </button>
        </div>

        <div className="mb-3 text-center">
          <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            ETAPA 1.2 — SUBCONJUNTO
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase mt-0.5">
            Qual é a Fase das Peças?
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pb-4">
          {fasesDisponiveis.map((fase) => {
            const countFase = pecas.filter((p) => (p.etapa_fase || 'Geral').trim() === fase).length;
            const pendentesFaseCount = contagemPendentesPorFase.get(fase) || 0;
            const hasPendFase = pendentesFaseCount > 0;

            return (
              <button
                key={fase}
                type="button"
                onClick={() => handleEscolherFase(fase)}
                className={`w-full min-h-[68px] p-4 rounded-2xl border-2 flex items-center justify-between text-left transition-all active:scale-[0.98] group shadow-sm ${
                  hasPendFase
                    ? 'animate-pulse-red-fast bg-red-50/80 dark:bg-red-950/40 border-red-500 shadow-md shadow-red-500/20'
                    : 'bg-white hover:bg-amber-50/60 active:bg-amber-100/60 dark:bg-slate-800/90 dark:hover:bg-slate-750 dark:active:bg-slate-700 border-slate-200 hover:border-amber-400/80 dark:border-slate-700 dark:hover:border-amber-500/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center shrink-0 ${
                    hasPendFase ? 'bg-red-500 text-white animate-bounce' : 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                  }`}>
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100 uppercase flex items-center gap-2">
                      <span>{fase}</span>
                      {hasPendFase && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-red-600 text-white">
                          ⚠️ {pendentesFaseCount} {pendentesFaseCount === 1 ? 'baixa pendente' : 'baixas pendentes'}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{countFase} peças cadastradas</div>
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-slate-400 group-hover:text-amber-600 dark:text-slate-500 dark:group-hover:text-amber-400" />
              </button>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            smartAudio.playClick();
            setEtapaAtual('processo');
          }}
          className="w-full h-14 bg-white hover:bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 dark:border-slate-700 dark:text-slate-200 text-sm font-bold rounded-2xl mt-2 active:scale-98 transition-colors"
        >
          ⬅️ Voltar aos Processos
        </Button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: ETAPA 1.3 — LISTA DE PEÇAS (FAST LOOP / STICKY CONTEXT)
  // ─────────────────────────────────────────────────────────────
  if (etapaAtual === 'pecas') {
    const isPrimeiroProcesso = processoSelecionado && processos.length > 0 && processoSelecionado.id === [...processos].sort((a,b) => a.ordem - b.ordem)[0]?.id;

    return (
      <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
        {/* Sticky Context: Breadcrumbs Interativos no Topo + Botão de Forçar Apontamento */}
        <div className="mb-3 p-3 rounded-2xl bg-white dark:bg-slate-800/95 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 shadow-sm flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                smartAudio.playClick();
                setEtapaAtual('processo');
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300 font-bold text-xs flex items-center gap-1 border border-amber-300 dark:border-amber-500/30 hover:bg-amber-200 dark:hover:bg-amber-500/30 shrink-0 transition-colors"
              title="Trocar Processo"
            >
              <span>⚡ {processoSelecionado?.nome}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                smartAudio.playClick();
                setEtapaAtual('fase');
              }}
              className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 font-bold text-xs flex items-center gap-1 border border-blue-200 dark:border-blue-500/30 hover:bg-blue-200 dark:hover:bg-blue-500/30 truncate transition-colors"
              title="Trocar Fase"
            >
              <span>🏢 {faseSelecionada}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {!isPrimeiroProcesso && processoSelecionado && (
              <button
                type="button"
                onClick={() => {
                  smartAudio.playClick();
                  setIsForcarModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black text-xs uppercase flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                title="Forçar apontamento de peças esquecidas no processo anterior"
              >
                <Zap className="w-3.5 h-3.5 fill-current animate-pulse" />
                <span>Forçar Apontamento</span>
              </button>
            )}

            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
              {pecasComSaldo.length} itens
            </span>
          </div>
        </div>

        {/* Lista de Peças */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {carregandoDados ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
              <span>Carregando peças...</span>
            </div>
          ) : pecasComSaldo.length === 0 ? (
            <div className="p-8 text-center bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <Filter className="h-10 w-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Nenhuma peça nesta fase</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Selecione outra fase ou processo para apontar
              </p>
            </div>
          ) : (
            pecasComSaldo.map((item) => {
              const pendenciasItem = pecasPendentesMap.get(item.id) || [];
              const temPendencia = pendenciasItem.length > 0;
              const concluida = item.saldo <= 0;

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border-2 transition-all shadow-sm ${
                    temPendencia
                      ? 'animate-pulse-red-fast bg-red-50/70 dark:bg-red-950/40 border-red-500 shadow-md shadow-red-500/20'
                      : concluida
                      ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75'
                      : 'bg-white dark:bg-slate-800/95 border-slate-200 dark:border-slate-700/90 hover:border-amber-400 dark:hover:border-amber-500/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xl font-black text-amber-700 dark:text-amber-400 tracking-wider">
                          {item.marca}
                        </span>
                        {item.tem_componentes === false && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800/50 font-black"
                            title="Peça Sem Montagem (Pula Solda - vai direto para Pintura)"
                          >
                            S/M
                          </span>
                        )}
                        {item.perfil_principal && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-semibold border border-slate-200 dark:border-transparent">
                            {item.perfil_principal}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">
                        {item.descricao || 'Peça Estrutural'}
                      </div>
                      {item.motivoBloqueio && item.saldo === 0 && !concluida && (
                        <div className="text-[11px] text-amber-700 dark:text-amber-400/90 font-medium mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
                          <span>{item.motivoBloqueio}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex flex-col items-end gap-1">
                        <span>Total: {item.quantidade}</span>
                        {item.jaProduzido > 0 && (
                          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md mt-0.5 mb-0.5 shadow-sm">
                            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              Apontada: {item.jaProduzido}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                smartAudio.playClick();
                                setPecaSelecionada(item);
                                setQtdApontar(item.jaProduzido);
                                setModoEdicao(true);
                                setEtapaAtual('quantidade');
                              }}
                              className="text-amber-600 hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-300 transition-colors p-1 rounded-md hover:bg-amber-50 dark:hover:bg-amber-500/10"
                              title="Editar quantidade apontada"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                      {concluida ? (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 mt-1">
                          <Check className="h-3 w-3" /> 100% Pronto
                        </span>
                      ) : item.saldo > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 mt-1">
                          Disponível: {item.saldo}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 mt-1">
                          Pendente ant.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra de Progresso Visual da Peça */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700/60 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        concluida ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (item.jaProduzido / item.quantidade) * 100)}%`,
                      }}
                    />
                  </div>

                  {/* ALERTA VISUAL: BAIXA FORÇADA PENDENTE DE CONFIRMAÇÃO */}
                  {temPendencia && (
                    <div className="mt-3 p-2.5 rounded-xl bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-xs font-bold text-red-800 dark:text-red-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 animate-bounce shrink-0" />
                        <span>
                          Baixa forçada ({pendenciasItem.reduce((acc, p) => acc + (p.quantidade_produzida || 0), 0)} un)
                          {pendenciasItem[0]?.forcado_por_user_nome && ` • Por: ${pendenciasItem[0].forcado_por_user_nome}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleConfirmarBaixaDireta(pendenciasItem[0].id!, item.marca)}
                        className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-black uppercase flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Confirmar Baixa</span>
                      </button>
                    </div>
                  )}

                  {/* Botões de Ação no Card */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      type="button"
                      disabled={concluida || item.saldo <= 0}
                      onClick={() => handleIniciarApontamentoPeca(item, item.saldo)}
                      className={`sm:col-span-2 h-13 text-sm font-black rounded-xl uppercase tracking-wider transition-all active:scale-[0.98] ${
                        concluida
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                          : item.saldo <= 0
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 cursor-not-allowed'
                          : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 shadow-md shadow-amber-900/20 dark:shadow-amber-950/30'
                      }`}
                    >
                      {concluida
                        ? 'Processo Concluído'
                        : item.saldo <= 0
                        ? item.motivoBloqueio || 'Indisponível neste processo'
                        : `DIGITAR / ESCOLHER QUANTIDADE`}
                    </Button>

                    {!concluida && item.saldo > 0 && (
                      <Button
                        type="button"
                        onClick={() => {
                          smartAudio.playClick();
                          setPecaSelecionada(item);
                          setQtdApontar(item.saldo);
                          setModoEdicao(false);
                          setEtapaAtual('quantidade');
                        }}
                        className="h-13 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-800 border border-amber-300 dark:bg-slate-700 dark:hover:bg-slate-650 dark:active:bg-slate-600 dark:text-amber-400 dark:border-slate-600 text-xs font-black rounded-xl uppercase active:scale-95 transition-colors"
                        title="Apontar todo o saldo disponível de uma vez"
                      >
                        TODAS ({item.saldo})
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            smartAudio.playClick();
            setEtapaAtual('fase');
          }}
          className="w-full h-14 bg-white hover:bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:hover:bg-slate-750 dark:border-slate-700 dark:text-slate-200 text-sm font-bold rounded-2xl mt-2 active:scale-98 transition-colors"
        >
          ⬅️ Voltar às Fases
        </Button>

        {/* Modal de Forçar Apontamento */}
        {processoSelecionado && (
          <SmartForcarApontamentoModal
            isOpen={isForcarModalOpen}
            onClose={() => setIsForcarModalOpen(false)}
            obra={obra}
            faseSelecionada={faseSelecionada}
            processoAtual={processoSelecionado}
            todosProcessos={processos}
            pecas={pecas}
            mapaProducao={mapaProducao}
            onSucesso={(qtd, peso) => {
              carregarDadosOF();
              onApontamentoRealizado(qtd, peso);
            }}
          />
        )}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: ETAPA 1.4 — APONTAMENTO DA QUANTIDADE (TECLADO TOUCH + INPUT DIRETO)
  // ─────────────────────────────────────────────────────────────
  if (etapaAtual === 'quantidade' && pecaSelecionada && processoSelecionado) {
    const infoSaldoAtual = calcularSaldoProcessoPeca(
      pecaSelecionada,
      processoSelecionado,
      processos,
      mapaProducao
    );
    const saldoPendente = infoSaldoAtual.saldo;
    const maxPermitido = modoEdicao ? infoSaldoAtual.jaProduzido + infoSaldoAtual.saldo : infoSaldoAtual.saldo;

    // Ajuste por incremento
    const somarQtd = (valor: number) => {
      smartAudio.playClick();
      setQtdApontar((prev) => {
        const minQtd = modoEdicao ? 0 : 1;
        const nova = Math.max(minQtd, prev + valor);
        return maxPermitido > 0 ? Math.min(maxPermitido, nova) : nova;
      });
    };

    // Pressionar tecla do teclado numérico touch (0-9)
    const handleDigitoTeclado = (digito: number) => {
      smartAudio.playClick();
      setQtdApontar((prev) => {
        const strAtual = prev <= 0 ? '' : prev.toString();
        const novaStr = strAtual + digito.toString();
        const novoValor = parseInt(novaStr, 10) || 0;
        if (maxPermitido > 0 && novoValor > maxPermitido) {
          smartAudio.playAlert();
          toast.warning(`Limite de saldo: máximo de ${maxPermitido} unidades`);
          return maxPermitido;
        }
        return novoValor;
      });
    };

    // Apagar último dígito (Backspace)
    const handleBackspace = () => {
      smartAudio.playClick();
      setQtdApontar((prev) => {
        const str = prev.toString();
        if (str.length <= 1) return 0;
        return parseInt(str.slice(0, -1), 10) || 0;
      });
    };

    // Limpar / Zerar
    const handleLimpar = () => {
      smartAudio.playClick();
      setQtdApontar(0);
    };

    // Definir Todas
    const definirTodas = () => {
      smartAudio.playClick();
      setQtdApontar(maxPermitido > 0 ? maxPermitido : 1);
    };

    // Digitação direta no input pelo teclado físico ou celular
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, '');
      const num = parseInt(val, 10) || 0;
      if (maxPermitido > 0 && num > maxPermitido) {
        setQtdApontar(maxPermitido);
        smartAudio.playAlert();
        toast.warning(`Máximo permitido: ${maxPermitido} unidades`);
      } else {
        setQtdApontar(num);
      }
    };

    return (
      <div className="flex flex-col flex-1 p-3.5 max-w-md mx-auto w-full pb-6">
        {/* Resumo da Peça no Topo */}
        <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 mb-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-amber-700 dark:text-amber-400">
                {pecaSelecionada.marca}
              </span>
              {pecaSelecionada.tem_componentes === false && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800/50 font-black"
                  title="Peça Sem Montagem (Pula Solda)"
                >
                  S/M
                </span>
              )}
            </div>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 uppercase">
              {processoSelecionado.nome}
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-200 mt-0.5 truncate">
            {pecaSelecionada.descricao || 'Peça Estrutural'}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/80">
            <span>Total da Peça: {pecaSelecionada.quantidade} un</span>
            <span className="text-amber-700 dark:text-amber-400 font-bold">
              {modoEdicao ? `Máximo: ${maxPermitido} un` : `Saldo Pendente: ${maxPermitido} un`}
            </span>
          </div>
        </div>

        {/* Visor / Input Central da Quantidade com botões finos -1 e +1 */}
        <div className="mb-2 text-center">
          <span className="text-[11px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            {modoEdicao ? 'Ajustar a Quantidade Total Apontada' : 'Digite ou Escolha a Quantidade a Apontar'}
          </span>

          <div className="flex items-center justify-center gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => somarQtd(-1)}
              disabled={qtdApontar <= (modoEdicao ? 0 : 1)}
              className="h-16 w-14 rounded-2xl bg-white hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:active:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 disabled:opacity-40 text-slate-800 dark:text-white flex items-center justify-center font-black active:scale-95 shadow-sm transition-colors"
              title="Diminuir 1"
            >
              <Minus className="h-6 w-6" />
            </button>

            {/* Input Numérico Editável Direto */}
            <div className="flex-1 max-w-[180px] h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-amber-500 flex items-center justify-center shadow-inner relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={qtdApontar === 0 ? (modoEdicao ? '0' : '') : qtdApontar}
                placeholder="0"
                onChange={handleInputChange}
                className="w-full text-center bg-transparent border-none outline-none text-3xl sm:text-4xl font-black text-amber-700 dark:text-amber-400 tracking-tight placeholder:text-slate-400 dark:placeholder:text-slate-700"
              />
            </div>

            <button
              type="button"
              onClick={() => somarQtd(1)}
              disabled={maxPermitido > 0 && qtdApontar >= maxPermitido}
              className="h-16 w-14 rounded-2xl bg-white hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:active:bg-slate-700 border-2 border-slate-200 dark:border-slate-700 disabled:opacity-40 text-slate-800 dark:text-white flex items-center justify-center font-black active:scale-95 shadow-sm transition-colors"
              title="Aumentar 1"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Pílulas de Atalhos Rápidos (+5, +10, +25, TODAS) */}
        <div className="grid grid-cols-4 gap-1.5 mb-3">
          <button
            type="button"
            onClick={() => somarQtd(5)}
            className="h-11 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:active:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold active:scale-95 shadow-sm transition-colors"
          >
            +5
          </button>
          <button
            type="button"
            onClick={() => somarQtd(10)}
            className="h-11 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:active:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold active:scale-95 shadow-sm transition-colors"
          >
            +10
          </button>
          <button
            type="button"
            onClick={() => somarQtd(25)}
            className="h-11 rounded-xl bg-white hover:bg-slate-100 active:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 dark:active:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold active:scale-95 shadow-sm transition-colors"
          >
            +25
          </button>
          <button
            type="button"
            onClick={definirTodas}
            className="h-11 rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 border border-amber-300 text-amber-800 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 dark:border-amber-500/50 dark:text-amber-300 text-xs font-black active:scale-95 transition-colors"
          >
            TODAS ({maxPermitido})
          </button>
        </div>

        {/* Teclado Numérico Touch de Chão de Fábrica (0 a 9, C, ⌫) */}
        <div className="grid grid-cols-3 gap-2 mb-3 bg-slate-100 dark:bg-slate-900/80 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigitoTeclado(num)}
              className="h-13 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 dark:active:bg-slate-700 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xl font-black active:scale-95 shadow-sm transition-all"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleLimpar}
            className="h-13 rounded-xl bg-rose-100 hover:bg-rose-200 active:bg-rose-300 border border-rose-300 text-rose-800 dark:bg-red-950/40 dark:hover:bg-red-900/60 dark:active:bg-red-900 dark:border-red-800/50 dark:text-red-300 text-sm font-black active:scale-95 uppercase tracking-wider transition-colors"
            title="Zerar / Limpar valor"
          >
            Limpar (0)
          </button>
          <button
            type="button"
            onClick={() => handleDigitoTeclado(0)}
            className="h-13 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 dark:active:bg-slate-700 border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white text-xl font-black active:scale-95 shadow-sm transition-all"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-13 rounded-xl bg-amber-100 hover:bg-amber-200 active:bg-amber-300 border border-amber-300 text-amber-800 dark:bg-slate-800 dark:hover:bg-slate-750 dark:active:bg-slate-700 dark:border-slate-700/80 dark:text-amber-400 flex items-center justify-center active:scale-95 transition-colors"
            title="Apagar último dígito"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Botão Gigante de Confirmação com Feedback Imediato */}
        <div className="space-y-2">
          <Button
            type="button"
            disabled={salvando || (!modoEdicao && qtdApontar <= 0) || (modoEdicao && qtdApontar < 0)}
            onClick={handleConfirmarApontamento}
            className={`w-full h-15 text-base font-black rounded-2xl shadow-lg uppercase tracking-wide active:scale-98 gap-2 transition-all ${
              modoEdicao && qtdApontar === 0
                ? 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white shadow-rose-950/20 dark:shadow-rose-950/40'
                : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white shadow-emerald-950/20 dark:shadow-emerald-950/40'
            }`}
          >
            {salvando ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Gravando...</span>
              </>
            ) : modoEdicao ? (
              qtdApontar === 0 ? (
                <>
                  <Delete className="h-5 w-5" />
                  <span>ZERAR / ANULAR APONTAMENTO (0 UN)</span>
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  <span>SALVAR AJUSTE ({qtdApontar} UN)</span>
                </>
              )
            ) : (
              <>
                <Check className="h-5 w-5" />
                <span>CONFIRMAR {qtdApontar > 0 ? `(${qtdApontar} UNIDADES)` : ''}</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={salvando}
            onClick={() => {
              smartAudio.playClick();
              setEtapaAtual('pecas');
              setModoEdicao(false);
            }}
            className="w-full h-11 bg-white hover:bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl active:scale-98 transition-colors"
          >
            Cancelar e Voltar à Lista
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
