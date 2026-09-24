import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { smartAudio } from '@/utils/smartAudio';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  User, 
  Clock, 
  Layers, 
  RefreshCw,
  Flame,
  Wrench,
  Paintbrush,
  Truck,
  Scissors,
  Box,
  AlertTriangle,
  CheckCheck
} from 'lucide-react';

export interface ApontamentoNotificacao {
  id: string;
  of_number: string;
  quantidade: number;
  data_apontamento: string;
  created_at: string;
  marca: string;
  fase: string;
  perfil?: string;
  processo_nome: string;
  processo_cor: string;
  usuario_nome: string;
  is_forcado?: boolean;
  status_confirmacao?: 'confirmado' | 'pendente_confirmacao' | string;
  forcado_por_user_nome?: string;
}

interface SmartNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ofFiltrar?: string;
  onApontamentoConfirmado?: () => void;
}

export const SmartNotificationsModal: React.FC<SmartNotificationsModalProps> = ({
  isOpen,
  onClose,
  ofFiltrar,
  onApontamentoConfirmado,
}) => {
  const { user } = useAuth();
  const [apontamentos, setApontamentos] = useState<ApontamentoNotificacao[]>([]);
  const [carregando, setCarregando] = useState<boolean>(false);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  const formatarTempo = (dataIso?: string) => {
    if (!dataIso) return 'Recente';
    try {
      const data = new Date(dataIso);
      const agora = new Date();
      const diffMs = agora.getTime() - data.getTime();
      const diffMin = Math.floor(diffMs / (1000 * 60));
      const diffHoras = Math.floor(diffMin / 60);

      if (diffMin < 1) return 'Agora mesmo';
      if (diffMin < 60) return `há ${diffMin} min`;
      if (diffHoras < 24) return `há ${diffHoras}h`;
      return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Recente';
    }
  };

  const getProcessIcon = (processoNome: string) => {
    const norm = (processoNome || '').toLowerCase();
    if (norm.includes('corte')) return <Scissors className="w-3.5 h-3.5" />;
    if (norm.includes('solda')) return <Flame className="w-3.5 h-3.5" />;
    if (norm.includes('pintu') || norm.includes('galv')) return <Paintbrush className="w-3.5 h-3.5" />;
    if (norm.includes('exped')) return <Truck className="w-3.5 h-3.5" />;
    if (norm.includes('montag')) return <Wrench className="w-3.5 h-3.5" />;
    return <Box className="w-3.5 h-3.5" />;
  };

  const carregarNotificacoes = useCallback(async () => {
    setCarregando(true);
    try {
      // Filtrar APENAS apontamentos de HOJE e do DIA ANTERIOR (ONTEM)
      const dataOntem = new Date(Date.now() - 86400000);
      const dataOntemIso = dataOntem.toISOString().split('T')[0];

      let query = supabase
        .from('apontamentos_producao' as any)
        .select(`
          id, of_number, quantidade_produzida, data_apontamento, created_at, created_by,
          is_forcado, status_confirmacao, forcado_por_user_nome, usuario_nome,
          peca:pecas!apontamentos_producao_peca_id_fkey(marca, etapa_fase, perfil_principal, descricao),
          processo:processos_fabricacao!apontamentos_producao_processo_id_fkey(nome, cor, ordem)
        `)
        .gte('data_apontamento', dataOntemIso)
        .order('created_at', { ascending: false })
        .limit(100);

      if (ofFiltrar) {
        query = query.eq('of_number', ofFiltrar);
      }

      const { data: apontamentosData, error } = await query;
      if (error) throw error;

      // Buscar nomes dos usuários dos apontamentos caso não estejam gravados diretamente
      const userIds = Array.from(new Set((apontamentosData || []).map((ap: any) => ap.created_by).filter(Boolean)));
      const profilesMap = new Map<string, string>();

      if (userIds.length > 0) {
        try {
          const { data: profs } = await supabase
            .from('profiles' as any)
            .select('id, full_name, email')
            .in('id', userIds);

          if (profs) {
            profs.forEach((pr: any) => {
              const nome = pr.full_name || pr.email?.split('@')[0] || 'Operador';
              profilesMap.set(pr.id, nome);
            });
          }
        } catch (e) {
          console.debug('Erro ao buscar perfis:', e);
        }
      }

      // Montar lista tratada
      const lista: ApontamentoNotificacao[] = (apontamentosData || []).map((ap: any) => {
        const peca = ap.peca || {};
        const processo = ap.processo || {};
        const userName = ap.usuario_nome || (ap.created_by && profilesMap.get(ap.created_by)) || 'Chão de Fábrica';

        return {
          id: String(ap.id),
          of_number: ap.of_number || 'OF',
          quantidade: Number(ap.quantidade_produzida || 1),
          data_apontamento: ap.data_apontamento,
          created_at: ap.created_at || ap.data_apontamento,
          marca: peca.marca || 'Sem Marca',
          fase: peca.etapa_fase || '1',
          perfil: peca.perfil_principal || peca.descricao || '',
          processo_nome: processo.nome || 'Produção',
          processo_cor: processo.cor || '#10b981',
          usuario_nome: userName,
          is_forcado: Boolean(ap.is_forcado),
          status_confirmacao: ap.status_confirmacao || 'confirmado',
          forcado_por_user_nome: ap.forcado_por_user_nome,
        };
      });

      setApontamentos(lista);
    } catch (err) {
      console.error('Erro ao carregar notificações de produção:', err);
    } finally {
      setCarregando(false);
    }
  }, [ofFiltrar]);

  const handleConfirmarBaixaForcada = async (item: ApontamentoNotificacao) => {
    try {
      smartAudio.playClick();
      setConfirmandoId(item.id);

      const nomeOperador = user?.name || user?.email?.split('@')[0] || 'Operador';

      const { error } = await supabase
        .from('apontamentos_producao' as any)
        .update({
          status_confirmacao: 'confirmado',
          data_confirmacao: new Date().toISOString(),
          confirmado_por_user_nome: nomeOperador,
          confirmado_por_user_id: user?.id,
        })
        .eq('id', item.id);

      if (error) throw error;

      smartAudio.playSuccess();
      toast.success(`✅ Baixa confirmada: ${item.marca} (${item.processo_nome})`);

      // Atualiza lista local
      setApontamentos((prev) =>
        prev.map((ap) => (ap.id === item.id ? { ...ap, status_confirmacao: 'confirmado' } : ap))
      );

      if (onApontamentoConfirmado) {
        onApontamentoConfirmado();
      }
    } catch (err: any) {
      smartAudio.playAlert();
      console.error('Erro ao confirmar baixa:', err);
      toast.error('Erro ao confirmar baixa: ' + (err?.message || 'Falha de conexão'));
    } finally {
      setConfirmandoId(null);
    }
  };

  useEffect(() => {
    if (isOpen) {
      carregarNotificacoes();
    }
  }, [isOpen, carregarNotificacoes]);

  if (!isOpen) return null;

  const pendentesConfirmacao = apontamentos.filter(
    (ap) => ap.is_forcado && ap.status_confirmacao === 'pendente_confirmacao'
  );
  const outrosApontamentos = apontamentos.filter(
    (ap) => !(ap.is_forcado && ap.status_confirmacao === 'pendente_confirmacao')
  );

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg max-h-[85vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden select-none animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between px-5 py-4 bg-slate-50/90 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 dark:text-amber-400">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Apontamentos Recentes
                {ofFiltrar && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300">
                    OF {ofFiltrar}
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Mostrando apontamentos de <strong className="text-slate-700 dark:text-slate-300">hoje e ontem</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                smartAudio.playClick();
                carregarNotificacoes();
              }}
              disabled={carregando}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Atualizar Notificações"
            >
              <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin text-amber-500' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                smartAudio.playClick();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Conteúdo com Apontamentos */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 custom-scrollbar">
          {/* Seção 1: Apontamentos Forçados Pendentes de Confirmação */}
          {pendentesConfirmacao.length > 0 && (
            <div className="p-3 rounded-2xl bg-red-50/80 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wide text-red-700 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4 animate-bounce shrink-0" />
                  <span>Apontamentos Forçados Pendentes ({pendentesConfirmacao.length})</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-200 dark:bg-red-900/60 text-red-800 dark:text-red-300 animate-pulse">
                  Ação Necessária
                </span>
              </div>
              <p className="text-[11px] text-red-600 dark:text-red-300">
                Peças foram apontadas no processo posterior e aguardam sua confirmação de baixa:
              </p>

              <div className="space-y-2">
                {pendentesConfirmacao.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800/60 flex items-center justify-between gap-2 shadow-sm"
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-xs text-red-700 dark:text-red-400">
                          {item.marca}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          OF {item.of_number} • F{item.fase}
                        </span>
                        <span 
                          className="text-[10px] font-bold px-1.5 py-0.2 rounded"
                          style={{
                            backgroundColor: `${item.processo_cor}20`,
                            color: item.processo_cor,
                          }}
                        >
                          {item.processo_nome}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 flex-wrap">
                        <span>Qtd: <strong>{item.quantidade} un</strong></span>
                        {item.forcado_por_user_nome && (
                          <span className="text-red-600 dark:text-red-400 font-semibold">
                            Forçado por: {item.forcado_por_user_nome}
                          </span>
                        )}
                        <span>{formatarTempo(item.created_at)}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={confirmandoId === item.id}
                      onClick={() => handleConfirmarBaixaForcada(item)}
                      className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-xs flex items-center gap-1 shrink-0 shadow-sm active:scale-95 transition-all"
                    >
                      {confirmandoId === item.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCheck className="w-3.5 h-3.5" />
                      )}
                      <span>Confirmar Baixa</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seção 2: Histórico de Apontamentos Recentes (Hoje e Ontem) */}
          {carregando && apontamentos.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
              <span className="text-xs font-medium">Buscando novos apontamentos...</span>
            </div>
          ) : outrosApontamentos.length === 0 && pendentesConfirmacao.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 stroke-[1.2] text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Nenhum apontamento registrado hoje ou ontem{ofFiltrar ? ` para a OF ${ofFiltrar}` : ''}.
              </p>
            </div>
          ) : (
            outrosApontamentos.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-950/60 hover:bg-slate-100/90 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 transition-all duration-150 flex items-start justify-between gap-3 shadow-sm"
              >
                {/* Lado Esquerdo: Marca, Detalhes e Usuário */}
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <div 
                    className="p-2 rounded-xl shrink-0 flex items-center justify-center text-white shadow-sm"
                    style={{ backgroundColor: item.processo_cor }}
                    title={item.processo_nome}
                  >
                    {getProcessIcon(item.processo_nome)}
                  </div>

                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-black text-xs sm:text-sm text-slate-900 dark:text-slate-100 tracking-tight">
                        {item.marca}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        OF {item.of_number} • F{item.fase}
                      </span>
                      <span 
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                        style={{
                          backgroundColor: `${item.processo_cor}20`,
                          color: item.processo_cor,
                        }}
                      >
                        {item.processo_nome}
                      </span>
                      {item.is_forcado && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800">
                          ⚡ Forçado (Confirmado)
                        </span>
                      )}
                    </div>

                    {item.perfil && (
                      <p className="text-[11px] font-mono text-slate-600 dark:text-slate-400 truncate">
                        {item.perfil}
                      </p>
                    )}

                    <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <User className="w-3 h-3 text-cyan-600 dark:text-cyan-400" />
                        {item.usuario_nome}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatarTempo(item.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lado Direito: Quantidade Apontada */}
                <div className="text-right shrink-0 flex flex-col items-end justify-center">
                  <span className="text-xs font-mono font-black px-2 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 shadow-sm">
                    +{item.quantidade} un
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé */}
        <div className="p-3 bg-slate-50/90 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
          <span>{apontamentos.length} apontamentos listados (hoje e ontem)</span>
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              onClose();
            }}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs active:scale-95 transition-all"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// Hook reativo para alertar e contar novos apontamentos no sininho (Hoje e Ontem)
export const useSmartNotificationsAlert = (ofFiltrar?: string) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [hasNewAlert, setHasNewAlert] = useState<boolean>(false);
  const [hasPendingForced, setHasPendingForced] = useState<boolean>(false);

  const fetchRecentCount = useCallback(async () => {
    try {
      const dataOntem = new Date(Date.now() - 86400000);
      const dataOntemIso = dataOntem.toISOString().split('T')[0];

      // 1. Contar apontamentos recentes (hoje e ontem)
      let query = supabase
        .from('apontamentos_producao' as any)
        .select('id, is_forcado, status_confirmacao', { count: 'exact' })
        .gte('data_apontamento', dataOntemIso);

      if (ofFiltrar) {
        query = query.eq('of_number', ofFiltrar);
      }

      const { data, count, error } = await query;
      if (!error && count !== null) {
        setUnreadCount(count);
        if (count > 0) setHasNewAlert(true);

        const pending = (data || []).some(
          (row: any) => row.is_forcado && row.status_confirmacao === 'pendente_confirmacao'
        );
        setHasPendingForced(pending);
      }
    } catch (err) {
      console.debug('Erro ao contar apontamentos:', err);
    }
  }, [ofFiltrar]);

  useEffect(() => {
    fetchRecentCount();

    // Realtime listener para alertar quando novos apontamentos forem inseridos ou atualizados
    const channelName = `realtime-smart-notifs-${ofFiltrar || 'all'}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'apontamentos_producao',
        },
        (payload) => {
          const newRow = payload.new as any;
          if (!ofFiltrar || newRow?.of_number === ofFiltrar) {
            fetchRecentCount();
            if (payload.eventType === 'INSERT') {
              try {
                smartAudio.playSuccess();
              } catch {
                // ignore
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ofFiltrar, fetchRecentCount]);

  const clearAlert = useCallback(() => {
    setHasNewAlert(false);
  }, []);

  return { unreadCount, hasNewAlert, hasPendingForced, clearAlert, refetch: fetchRecentCount };
};
