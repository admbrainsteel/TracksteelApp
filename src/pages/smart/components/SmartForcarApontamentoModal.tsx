import React, { useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { smartAudio } from '@/utils/smartAudio';
import { useAuth } from '@/hooks/useAuth';
import { ProcessoFabricacao } from '@/hooks/useProcessosFabricacao';
import { OFAtiva } from '@/hooks/useOFsAtivas';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { 
  AlertTriangle, 
  X, 
  Zap, 
  Check, 
  Plus, 
  Minus, 
  ArrowRight,
  Sparkles,
  RefreshCw,
  Scissors,
  Ruler,
  Puzzle,
  Paintbrush,
  ShieldAlert
} from 'lucide-react';

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

interface SmartForcarApontamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  obra: OFAtiva;
  faseSelecionada: string;
  processoAtual: ProcessoFabricacao;
  todosProcessos: ProcessoFabricacao[];
  pecas: PecaData[];
  mapaProducao: Map<string, number>;
  onSucesso: (pecasCount: number, pesoKg: number) => void;
}

export const SmartForcarApontamentoModal: React.FC<SmartForcarApontamentoModalProps> = ({
  isOpen,
  onClose,
  obra,
  faseSelecionada,
  processoAtual,
  todosProcessos,
  pecas,
  mapaProducao,
  onSucesso,
}) => {
  const { user } = useAuth();
  const [pecaSelecionada, setPecaSelecionada] = useState<PecaData | null>(null);
  const [qtdForcar, setQtdForcar] = useState<number>(1);
  const [salvando, setSalvando] = useState<boolean>(false);

  const getIconeProcesso = (nome: string) => {
    const n = (nome || '').toLowerCase();
    if (n.includes('corte')) return <Scissors className="h-4 w-4" />;
    if (n.includes('dobra') || n.includes('fura')) return <Ruler className="h-4 w-4" />;
    if (n.includes('montag')) return <Puzzle className="h-4 w-4" />;
    if (n.includes('solda')) return <Zap className="h-4 w-4" />;
    if (n.includes('pintura')) return <Paintbrush className="h-4 w-4" />;
    return <ShieldAlert className="h-4 w-4" />;
  };

  // Encontra o processo anterior para uma determinada peça considerando regra S/M
  const getProcessoAnteriorPeca = (peca: PecaData): ProcessoFabricacao | null => {
    const procsOrdenados = [...todosProcessos].sort((a, b) => a.ordem - b.ordem);
    const indexAtual = procsOrdenados.findIndex((p) => p.id === processoAtual.id);
    if (indexAtual <= 0) return null;

    const ehSemMontagem = peca.tem_componentes === false;

    for (let i = indexAtual - 1; i >= 0; i--) {
      const proc = procsOrdenados[i];
      const nomeP = (proc.nome || '').toLowerCase();
      // Peças sem montagem (S/M) pulam solda
      if (ehSemMontagem && nomeP.includes('solda')) {
        continue;
      }
      return proc;
    }
    return null;
  };

  // Peças da fase que ainda NÃO foram totalmente apontadas no processo anterior
  const pecasPendentesProcessoAnterior = useMemo(() => {
    return pecas
      .filter((p) => {
        if (!faseSelecionada || faseSelecionada === 'Geral') return true;
        return (p.etapa_fase || 'Geral').trim() === faseSelecionada;
      })
      .map((p) => {
        const procAnterior = getProcessoAnteriorPeca(p);
        if (!procAnterior) {
          return { ...p, procAnterior: null, saldoPendenteAnterior: 0, jaApontadoAnterior: 0 };
        }
        const keyAnt = `${p.id}_${procAnterior.id}`;
        const jaApontadoAnterior = mapaProducao.get(keyAnt) || 0;
        const saldoPendenteAnterior = Math.max(0, p.quantidade - jaApontadoAnterior);

        return {
          ...p,
          procAnterior,
          saldoPendenteAnterior,
          jaApontadoAnterior,
        };
      })
      .filter((p) => p.procAnterior !== null && p.saldoPendenteAnterior > 0)
      .sort((a, b) => a.marca.localeCompare(b.marca, undefined, { numeric: true, sensitivity: 'base' }));
  }, [pecas, faseSelecionada, processoAtual, todosProcessos, mapaProducao]);

  const handleSelecionarPeca = (peca: any) => {
    smartAudio.playClick();
    setPecaSelecionada(peca);
    setQtdForcar(peca.saldoPendenteAnterior > 0 ? (peca.saldoPendenteAnterior >= 1 ? 1 : peca.saldoPendenteAnterior) : 1);
  };

  const handleConfirmarForcamento = async () => {
    if (!pecaSelecionada || !user) return;

    const procAnterior = getProcessoAnteriorPeca(pecaSelecionada);
    if (!procAnterior) {
      toast.error('Processo anterior não identificado para esta peça');
      return;
    }

    if (qtdForcar <= 0) {
      smartAudio.playAlert();
      toast.error('Informe uma quantidade válida');
      return;
    }

    try {
      setSalvando(true);
      const hoje = new Date().toISOString().split('T')[0];
      const nomeUsuario = user.name || user.username || user.email?.split('@')[0] || 'Operador Chão de Fábrica';

      // 1. Inserir apontamento no Processo Anterior com flag de FORÇADO e PENDENTE DE CONFIRMAÇÃO
      const payloadAnterior = {
        of_number: obra.of_number,
        peca_id: pecaSelecionada.id,
        tipo_apontamento: 'peca' as const,
        processo_id: procAnterior.id,
        quantidade_produzida: qtdForcar,
        data_apontamento: hoje,
        created_by: user.id,
        usuario_nome: nomeUsuario,
        is_forcado: true,
        status_confirmacao: 'pendente_confirmacao',
        forcado_por_user_nome: nomeUsuario,
        forcado_por_user_id: user.id,
        forcado_para_processo_id: processoAtual.id,
        observacoes: `Forçado por ${nomeUsuario} no posto ${processoAtual.nome}`,
      };

      // 2. Inserir apontamento no Processo Atual (pois o operador já produziu/está com as peças)
      const payloadAtual = {
        of_number: obra.of_number,
        peca_id: pecaSelecionada.id,
        tipo_apontamento: 'peca' as const,
        processo_id: processoAtual.id,
        quantidade_produzida: qtdForcar,
        data_apontamento: hoje,
        created_by: user.id,
        usuario_nome: nomeUsuario,
        is_forcado: false,
        status_confirmacao: 'confirmado',
        observacoes: `Apontamento regular decorrente de força de ${procAnterior.nome}`,
      };

      const { error: erroAnt } = await supabase.from('apontamentos_producao').insert(payloadAnterior);
      if (erroAnt) throw erroAnt;

      const { error: erroAtual } = await supabase.from('apontamentos_producao').insert(payloadAtual);
      if (erroAtual) throw erroAtual;

      // Sucesso!
      smartAudio.playSuccess();
      toast.success(
        `⚡ Apontamento forçado com sucesso! ${qtdForcar}x ${pecaSelecionada.marca} liberadas de ${procAnterior.nome} e apontadas em ${processoAtual.nome}.`
      );

      const pesoTotal = qtdForcar * (pecaSelecionada.peso_unitario || 0);
      onSucesso(qtdForcar, pesoTotal);
      onClose();
    } catch (e: any) {
      smartAudio.playAlert();
      console.error('Erro ao forçar apontamento:', e);
      toast.error('Falha ao forçar apontamento: ' + (e?.message || 'Erro de conexão'));
    } finally {
      setSalvando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg max-h-[90vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border-2 border-amber-500/50 dark:border-amber-500/40 shadow-2xl overflow-hidden select-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Zap className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Forçar Apontamento
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-slate-950">
                  {processoAtual.nome}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Aponte peças esquecidas no processo anterior para liberar seu posto
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Aviso de Destaque */}
        <div className="px-4 py-2.5 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-900/40 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
          <span>
            Ao forçar o apontamento, a peça será automaticamente registrada no processo anterior (com pendência de confirmação) e apontada no seu processo atual.
          </span>
        </div>

        {/* Conteúdo Principal */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {pecasPendentesProcessoAnterior.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-slate-500">
              <Sparkles className="w-10 h-10 text-emerald-500 stroke-[1.2]" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Tudo em ordem!
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
                Não há peças da fase {faseSelecionada} pendentes no processo anterior. Todas as peças disponíveis já foram apontadas!
              </p>
            </div>
          ) : !pecaSelecionada ? (
            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                Selecione a peça que deseja forçar:
              </span>
              {pecasPendentesProcessoAnterior.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelecionarPeca(item)}
                  className="w-full p-3.5 rounded-2xl bg-white dark:bg-slate-800/90 hover:bg-amber-50/70 dark:hover:bg-slate-750 border-2 border-slate-200 hover:border-amber-400 dark:border-slate-700 dark:hover:border-amber-500 text-left transition-all active:scale-[0.98] flex items-center justify-between gap-3 shadow-sm group"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                        {item.marca}
                      </span>
                      {item.tem_componentes === false && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold">
                          S/M
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Total: {item.quantidade} un
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.descricao || item.perfil_principal || 'Peça Estrutural'}
                    </p>

                    <div className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 font-bold">
                      <span className="flex items-center gap-1">
                        {item.procAnterior && getIconeProcesso(item.procAnterior.nome)}
                        Falta em: {item.procAnterior?.nome} ({item.saldoPendenteAnterior} un)
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase shadow-sm group-hover:scale-105 transition-transform flex items-center gap-1">
                      <span>Escolher</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Card da Peça Selecionada */}
              <div className="p-4 rounded-2xl bg-amber-50/80 dark:bg-amber-950/30 border-2 border-amber-400/80 dark:border-amber-500/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-lg text-amber-800 dark:text-amber-300">
                    {pecaSelecionada.marca}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      smartAudio.playClick();
                      setPecaSelecionada(null);
                    }}
                    className="text-xs font-bold text-amber-700 dark:text-amber-400 underline hover:text-amber-900"
                  >
                    Trocar Peça
                  </button>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300">
                  {pecaSelecionada.descricao || pecaSelecionada.perfil_principal}
                </div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 pt-2 border-t border-amber-300/60 dark:border-amber-800/60">
                  <span>Total da Peça: {pecaSelecionada.quantidade} un</span>
                  <span className="text-amber-700 dark:text-amber-400 font-bold">
                    Pendente no anterior: {(pecaSelecionada as any).saldoPendenteAnterior} un
                  </span>
                </div>
              </div>

              {/* Seletor de Quantidade */}
              <div className="text-center space-y-2">
                <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 tracking-wider">
                  Quantas unidades você está forçando agora?
                </span>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      smartAudio.playClick();
                      setQtdForcar((prev) => Math.max(1, prev - 1));
                    }}
                    disabled={qtdForcar <= 1}
                    className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 disabled:opacity-40 text-slate-800 dark:text-white flex items-center justify-center font-black active:scale-95 shadow-sm"
                  >
                    <Minus className="h-6 w-6" />
                  </button>

                  <div className="w-28 h-14 rounded-2xl bg-white dark:bg-slate-900 border-2 border-amber-500 flex items-center justify-center shadow-inner">
                    <span className="text-3xl font-black text-amber-600 dark:text-amber-400">
                      {qtdForcar}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      smartAudio.playClick();
                      setQtdForcar((prev) => {
                        const max = (pecaSelecionada as any).saldoPendenteAnterior || 1;
                        return Math.min(max, prev + 1);
                      });
                    }}
                    disabled={qtdForcar >= ((pecaSelecionada as any).saldoPendenteAnterior || 1)}
                    className="h-14 w-14 rounded-2xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 disabled:opacity-40 text-slate-800 dark:text-white flex items-center justify-center font-black active:scale-95 shadow-sm"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>

                <div className="flex justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      smartAudio.playClick();
                      setQtdForcar((pecaSelecionada as any).saldoPendenteAnterior || 1);
                    }}
                    className="px-3 py-1 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-800 dark:bg-amber-950 dark:text-amber-300 text-xs font-bold transition-colors"
                  >
                    Máximo Disponível ({(pecaSelecionada as any).saldoPendenteAnterior || 1})
                  </button>
                </div>
              </div>

              {/* Botão de Confirmação */}
              <Button
                type="button"
                disabled={salvando || qtdForcar <= 0}
                onClick={handleConfirmarForcamento}
                className="w-full h-14 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 text-sm font-black rounded-2xl shadow-lg shadow-amber-950/20 uppercase tracking-wide active:scale-98 gap-2"
              >
                {salvando ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span>Registrando Forçamento...</span>
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 stroke-[3]" />
                    <span>CONFIRMAR FORÇAMENTO ({qtdForcar} UN)</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              smartAudio.playClick();
              onClose();
            }}
            className="h-10 px-4 rounded-xl text-xs font-bold"
          >
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
};
