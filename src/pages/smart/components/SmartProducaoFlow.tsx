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
  RotateCcw, 
  AlertTriangle, 
  ChevronRight,
  Filter,
  Delete
} from 'lucide-react';
import { OFAtiva } from '@/hooks/useOFsAtivas';
import { useProcessosFabricacao, ProcessoFabricacao } from '@/hooks/useProcessosFabricacao';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { smartAudio } from '@/utils/smartAudio';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
}

interface ApontamentoItem {
  peca_id: string;
  processo_id: string;
  quantidade_produzida: number;
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
          .select('id, marca, descricao, etapa_fase, quantidade, peso_unitario, perfil_principal')
          .eq('of_number', obra.of_number),
        supabase
          .from('apontamentos_producao')
          .select('peca_id, processo_id, quantidade_produzida')
          .eq('of_number', obra.of_number),
      ]);

      if (resPecas.data) {
        setPecas(resPecas.data);
      }
      if (resApontamentos.data) {
        setApontamentosExistentes(resApontamentos.data);
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

  // Peças filtradas pela fase selecionada com cálculo do saldo
  const pecasComSaldo = useMemo(() => {
    if (!processoSelecionado) return [];

    return pecas
      .filter((p) => {
        if (!faseSelecionada || faseSelecionada === 'Geral') return true;
        return p.etapa_fase?.trim() === faseSelecionada;
      })
      .map((p) => {
        const key = `${p.id}_${processoSelecionado.id}`;
        const jaProduzido = mapaProducao.get(key) || 0;
        const saldo = Math.max(0, p.quantidade - jaProduzido);
        return {
          ...p,
          jaProduzido,
          saldo,
        };
      })
      .sort((a, b) => {
        // Colocar primeiro as que têm saldo pendente
        if (a.saldo > 0 && b.saldo === 0) return -1;
        if (a.saldo === 0 && b.saldo > 0) return 1;
        return a.marca.localeCompare(b.marca, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [pecas, faseSelecionada, processoSelecionado, mapaProducao]);

  // Helper de ícone por processo
  const getIconeProcesso = (nome: string) => {
    const n = nome.toLowerCase();
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
    setEtapaAtual('quantidade');
  };

  // Salvar apontamento no Supabase
  const handleConfirmarApontamento = async () => {
    if (!pecaSelecionada || !processoSelecionado || !user) return;

    if (qtdApontar <= 0) {
      smartAudio.playAlert();
      toast.error('Informe uma quantidade maior que zero');
      return;
    }

    try {
      setSalvando(true);
      const hoje = new Date().toISOString().split('T')[0];

      const payload = {
        of_number: obra.of_number,
        peca_id: pecaSelecionada.id,
        tipo_apontamento: 'peca' as const,
        processo_id: processoSelecionado.id,
        quantidade_produzida: qtdApontar,
        data_apontamento: hoje,
        created_by: user.id,
        observacoes: 'Apontado via Modo Smart',
      };

      const { error } = await supabase.from('apontamentos_producao').insert(payload);

      if (error) {
        throw error;
      }

      // BIP sonoro de sucesso e vibração háptica!
      smartAudio.playSuccess();
      toast.success(`✅ Apontado: ${qtdApontar}x ${pecaSelecionada.marca} (${processoSelecionado.nome})`);

      // Notificar estatísticas do operador
      const pesoTotalKg = qtdApontar * (pecaSelecionada.peso_unitario || 0);
      onApontamentoRealizado(qtdApontar, pesoTotalKg);

      // FAST LOOP / STICKY CONTEXT:
      // Atualiza o estado local imediatamente e volta para a lista de peças daquela Fase/Processo!
      setApontamentosExistentes((prev) => [
        ...prev,
        {
          peca_id: pecaSelecionada.id,
          processo_id: processoSelecionado.id,
          quantidade_produzida: qtdApontar,
        },
      ]);

      // Permanece na mesma fase para apontar a próxima peça sem voltar tudo!
      setEtapaAtual('pecas');
      setPecaSelecionada(null);
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
          <span className="text-xs font-black uppercase text-amber-400 tracking-wider">
            ETAPA 1.1 — FABRICAÇÃO
          </span>
          <h2 className="text-xl font-black text-slate-100 uppercase mt-0.5">
            Qual é o seu Processo?
          </h2>
          <p className="text-xs text-slate-400">
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
            // Fallback com processos industriais padrões caso a tabela esteja vazia
            [
              { id: '1', nome: 'Corte', ordem: 1 },
              { id: '2', nome: 'Dobra / Furação', ordem: 2 },
              { id: '3', nome: 'Montagem', ordem: 3 },
              { id: '4', nome: 'Solda', ordem: 4 },
              { id: '5', nome: 'Pintura', ordem: 5 },
              { id: '6', nome: 'Galvanização', ordem: 6 },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleEscolherProcesso(p as ProcessoFabricacao)}
                className="min-h-[72px] p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 border-2 border-slate-700 hover:border-amber-500/80 flex items-center justify-between text-left transition-all active:scale-[0.98] group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                    {getIconeProcesso(p.nome)}
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-100 uppercase tracking-wide">
                      {p.nome}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">Toque para selecionar</div>
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-slate-500 group-hover:text-amber-400" />
              </button>
            ))
          ) : (
            processos.map((proc) => (
              <button
                key={proc.id}
                type="button"
                onClick={() => handleEscolherProcesso(proc)}
                className="min-h-[72px] p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 border-2 border-slate-700 hover:border-amber-500/80 flex items-center justify-between text-left transition-all active:scale-[0.98] group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
                    {getIconeProcesso(proc.nome)}
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-100 uppercase tracking-wide">
                      {proc.nome}
                    </div>
                    <div className="text-xs text-slate-400 font-medium">Etapa #{proc.ordem}</div>
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-slate-500 group-hover:text-amber-400" />
              </button>
            ))
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            smartAudio.playClick();
            onVoltarHub();
          }}
          className="w-full h-14 bg-slate-800 border-slate-700 text-slate-200 text-sm font-bold rounded-2xl mt-3 active:scale-98"
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
        <div className="mb-4 flex items-center justify-between p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30">
          <div className="flex items-center gap-2">
            <span className="text-amber-400">{getIconeProcesso(processoSelecionado?.nome || '')}</span>
            <span className="text-sm font-black text-amber-300 uppercase">
              PROCESSO: {processoSelecionado?.nome}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              setEtapaAtual('processo');
            }}
            className="text-xs font-bold text-amber-400 underline hover:text-amber-300 px-2 py-1"
          >
            Trocar
          </button>
        </div>

        <div className="mb-3 text-center">
          <span className="text-xs font-black uppercase text-slate-400 tracking-wider">
            ETAPA 1.2 — SUBCONJUNTO
          </span>
          <h2 className="text-xl font-black text-slate-100 uppercase mt-0.5">
            Qual é a Fase das Peças?
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pb-4">
          {fasesDisponiveis.map((fase) => {
            const countFase = pecas.filter((p) => (p.etapa_fase || 'Geral').trim() === fase).length;
            return (
              <button
                key={fase}
                type="button"
                onClick={() => handleEscolherFase(fase)}
                className="w-full min-h-[68px] p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 border-2 border-slate-700 hover:border-amber-500/80 flex items-center justify-between text-left transition-all active:scale-[0.98] group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl bg-slate-700 text-slate-200 flex items-center justify-center shrink-0">
                    <Layers className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-base font-black text-slate-100 uppercase">{fase}</div>
                    <div className="text-xs text-slate-400">{countFase} peças cadastradas</div>
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-slate-500 group-hover:text-amber-400" />
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
          className="w-full h-14 bg-slate-800 border-slate-700 text-slate-200 text-sm font-bold rounded-2xl mt-2 active:scale-98"
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
    return (
      <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
        {/* Sticky Context: Breadcrumbs Interativos no Topo */}
        <div className="mb-3 p-3 rounded-2xl bg-slate-800/95 border border-slate-700 flex items-center justify-between gap-2 shadow-md">
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              onClick={() => {
                smartAudio.playClick();
                setEtapaAtual('processo');
              }}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 font-bold text-xs flex items-center gap-1 border border-amber-500/30 hover:bg-amber-500/30 shrink-0"
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
              className="px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-bold text-xs flex items-center gap-1 border border-blue-500/30 hover:bg-blue-500/30 truncate"
              title="Trocar Fase"
            >
              <span>🏢 {faseSelecionada}</span>
            </button>
          </div>

          <span className="text-[11px] font-bold text-slate-400 shrink-0">
            {pecasComSaldo.length} itens
          </span>
        </div>

        {/* Lista de Peças */}
        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {carregandoDados ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
              <span>Carregando peças...</span>
            </div>
          ) : pecasComSaldo.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
              <Filter className="h-10 w-10 text-slate-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-200">Nenhuma peça nesta fase</h3>
              <p className="text-xs text-slate-400 mt-1">
                Selecione outra fase ou processo para apontar
              </p>
            </div>
          ) : (
            pecasComSaldo.map((item) => {
              const concluida = item.saldo <= 0;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border-2 transition-all shadow-sm ${
                    concluida
                      ? 'bg-slate-900/60 border-slate-800 opacity-75'
                      : 'bg-slate-800/95 border-slate-700/90 hover:border-amber-500/80'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-black text-amber-400 tracking-wider">
                          {item.marca}
                        </span>
                        {item.perfil_principal && (
                          <span className="text-xs px-2 py-0.5 rounded-md bg-slate-700/80 text-slate-300 font-semibold">
                            {item.perfil_principal}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-300 mt-0.5 line-clamp-1">
                        {item.descricao || 'Peça Estrutural'}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-semibold text-slate-400">Total: {item.quantidade}</div>
                      {concluida ? (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700">
                          <Check className="h-3 w-3" /> 100% Pronto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-black text-amber-300 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700">
                          Falta: {item.saldo}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra de Progresso Visual da Peça */}
                  <div className="w-full bg-slate-700/60 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        concluida ? 'bg-emerald-500' : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (item.jaProduzido / item.quantidade) * 100)}%`,
                      }}
                    />
                  </div>

                  {/* Botões de Ação no Card */}
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      type="button"
                      disabled={concluida}
                      onClick={() => handleIniciarApontamentoPeca(item, item.saldo)}
                      className={`sm:col-span-2 h-13 text-sm font-black rounded-xl uppercase tracking-wider transition-all active:scale-[0.98] ${
                        concluida
                          ? 'bg-slate-800 text-slate-500 border border-slate-700'
                          : 'bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 shadow-md shadow-amber-950/30'
                      }`}
                    >
                      {concluida ? 'Processo Concluído' : `DIGITAR / ESCOLHER QUANTIDADE`}
                    </Button>

                    {!concluida && (
                      <Button
                        type="button"
                        onClick={() => {
                          smartAudio.playClick();
                          setPecaSelecionada(item);
                          setQtdApontar(item.saldo);
                          setEtapaAtual('quantidade');
                        }}
                        className="h-13 bg-slate-700 hover:bg-slate-650 active:bg-slate-600 text-amber-400 border border-slate-600 text-xs font-black rounded-xl uppercase active:scale-95"
                        title="Apontar todo o saldo restante de uma vez"
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
          className="w-full h-14 bg-slate-800 border-slate-700 text-slate-200 text-sm font-bold rounded-2xl mt-2 active:scale-98"
        >
          ⬅️ Voltar às Fases
        </Button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: ETAPA 1.4 — APONTAMENTO DA QUANTIDADE (TECLADO TOUCH + INPUT DIRETO)
  // ─────────────────────────────────────────────────────────────
  if (etapaAtual === 'quantidade' && pecaSelecionada && processoSelecionado) {
    const key = `${pecaSelecionada.id}_${processoSelecionado.id}`;
    const jaProduzido = mapaProducao.get(key) || 0;
    const saldoPendente = Math.max(0, pecaSelecionada.quantidade - jaProduzido);

    // Ajuste por incremento
    const somarQtd = (valor: number) => {
      smartAudio.playClick();
      setQtdApontar((prev) => {
        const nova = Math.max(1, prev + valor);
        return saldoPendente > 0 ? Math.min(saldoPendente, nova) : nova;
      });
    };

    // Pressionar tecla do teclado numérico touch (0-9)
    const handleDigitoTeclado = (digito: number) => {
      smartAudio.playClick();
      setQtdApontar((prev) => {
        // Se estiver em 0 ou for primeira digitação
        const strAtual = prev <= 0 ? '' : prev.toString();
        const novaStr = strAtual + digito.toString();
        const novoValor = parseInt(novaStr, 10) || 0;
        if (saldoPendente > 0 && novoValor > saldoPendente) {
          smartAudio.playAlert();
          toast.warning(`Limite de saldo: máximo de ${saldoPendente} unidades`);
          return saldoPendente;
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
      setQtdApontar(saldoPendente > 0 ? saldoPendente : 1);
    };

    // Digitação direta no input pelo teclado físico ou celular
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, '');
      const num = parseInt(val, 10) || 0;
      if (saldoPendente > 0 && num > saldoPendente) {
        setQtdApontar(saldoPendente);
        smartAudio.playAlert();
        toast.warning(`Máximo permitido: ${saldoPendente} unidades`);
      } else {
        setQtdApontar(num);
      }
    };

    return (
      <div className="flex flex-col flex-1 p-3.5 max-w-md mx-auto w-full pb-6">
        {/* Resumo da Peça no Topo */}
        <div className="p-3.5 rounded-2xl bg-slate-800/90 border border-slate-700 mb-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xl font-black text-amber-400">
              {pecaSelecionada.marca}
            </span>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
              {processoSelecionado.nome}
            </span>
          </div>
          <div className="text-xs font-semibold text-slate-200 mt-0.5 truncate">
            {pecaSelecionada.descricao || 'Peça Estrutural'}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-700/80">
            <span>Total da Peça: {pecaSelecionada.quantidade} un</span>
            <span className="text-amber-400 font-bold">
              Saldo Pendente: {saldoPendente} un
            </span>
          </div>
        </div>

        {/* Visor / Input Central da Quantidade com botões finos -1 e +1 */}
        <div className="mb-2 text-center">
          <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
            Digite ou Escolha a Quantidade a Apontar
          </span>

          <div className="flex items-center justify-center gap-2 mt-1.5">
            <button
              type="button"
              onClick={() => somarQtd(-1)}
              disabled={qtdApontar <= 1}
              className="h-16 w-14 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border-2 border-slate-700 disabled:opacity-40 text-white flex items-center justify-center font-black active:scale-95 shadow-sm"
              title="Diminuir 1"
            >
              <Minus className="h-6 w-6" />
            </button>

            {/* Input Numérico Editável Direto (Toque para digitar ou use o teclado da tela) */}
            <div className="flex-1 max-w-[180px] h-16 rounded-2xl bg-slate-900 border-2 border-amber-500 flex items-center justify-center shadow-inner relative">
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={qtdApontar === 0 ? '' : qtdApontar}
                placeholder="0"
                onChange={handleInputChange}
                className="w-full text-center bg-transparent border-none outline-none text-3xl sm:text-4xl font-black text-amber-400 tracking-tight placeholder:text-slate-700"
              />
            </div>

            <button
              type="button"
              onClick={() => somarQtd(1)}
              disabled={saldoPendente > 0 && qtdApontar >= saldoPendente}
              className="h-16 w-14 rounded-2xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border-2 border-slate-700 disabled:opacity-40 text-white flex items-center justify-center font-black active:scale-95 shadow-sm"
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
            className="h-11 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold active:scale-95"
          >
            +5
          </button>
          <button
            type="button"
            onClick={() => somarQtd(10)}
            className="h-11 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold active:scale-95"
          >
            +10
          </button>
          <button
            type="button"
            onClick={() => somarQtd(25)}
            className="h-11 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold active:scale-95"
          >
            +25
          </button>
          <button
            type="button"
            onClick={definirTodas}
            className="h-11 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 text-xs font-black active:scale-95"
          >
            TODAS ({saldoPendente})
          </button>
        </div>

        {/* Teclado Numérico Touch de Chão de Fábrica (0 a 9, C, ⌫) */}
        <div className="grid grid-cols-3 gap-2 mb-3 bg-slate-900/80 p-2.5 rounded-2xl border border-slate-800 shadow-inner">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigitoTeclado(num)}
              className="h-13 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/80 text-white text-xl font-black active:scale-95 shadow-sm transition-all"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleLimpar}
            className="h-13 rounded-xl bg-red-950/40 hover:bg-red-900/60 active:bg-red-900 border border-red-800/50 text-red-300 text-sm font-black active:scale-95 uppercase tracking-wider"
            title="Limpar valor"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={() => handleDigitoTeclado(0)}
            className="h-13 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/80 text-white text-xl font-black active:scale-95 shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-13 rounded-xl bg-slate-800 hover:bg-slate-750 active:bg-slate-700 border border-slate-700/80 text-amber-400 flex items-center justify-center active:scale-95"
            title="Apagar último dígito"
          >
            <Delete className="h-5 w-5" />
          </button>
        </div>

        {/* Botão Gigante de Confirmação com Feedback Imediato */}
        <div className="space-y-2">
          <Button
            type="button"
            disabled={salvando || qtdApontar <= 0}
            onClick={handleConfirmarApontamento}
            className="w-full h-15 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-base font-black rounded-2xl shadow-lg shadow-emerald-950/40 uppercase tracking-wide active:scale-98 gap-2"
          >
            {salvando ? (
              <>
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Gravando...</span>
              </>
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
            }}
            className="w-full h-11 bg-slate-800 border-slate-700 text-slate-300 text-xs font-bold rounded-xl active:scale-98"
          >
            Cancelar e Voltar à Lista
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
