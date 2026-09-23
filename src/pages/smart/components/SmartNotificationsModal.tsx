import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { smartAudio } from '@/utils/smartAudio';
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
  Box
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
}

interface SmartNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  ofFiltrar?: string;
}

export const SmartNotificationsModal: React.FC<SmartNotificationsModalProps> = ({
  isOpen,
  onClose,
  ofFiltrar,
}) => {
  const [apontamentos, setApontamentos] = useState<ApontamentoNotificacao[]>([]);
  const [carregando, setCarregando] = useState<boolean>(false);

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
      // 1. Buscar os últimos 30 apontamentos
      let query = supabase
        .from('apontamentos_producao' as any)
        .select(`
          id, of_number, quantidade_produzida, data_apontamento, created_at, created_by,
          peca:pecas!apontamentos_producao_peca_id_fkey(marca, etapa_fase, perfil_principal, descricao),
          processo:processos_fabricacao!apontamentos_producao_processo_id_fkey(nome, cor, ordem)
        `)
        .order('created_at', { ascending: false })
        .limit(30);

      if (ofFiltrar) {
        query = query.eq('of_number', ofFiltrar);
      }

      const { data: apontamentosData, error } = await query;
      if (error) throw error;

      // 2. Buscar nomes dos usuários dos apontamentos
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

      // 3. Montar lista tratada
      const lista: ApontamentoNotificacao[] = (apontamentosData || []).map((ap: any) => {
        const peca = ap.peca || {};
        const processo = ap.processo || {};
        const userName = (ap.created_by && profilesMap.get(ap.created_by)) || 'Chão de Fábrica';

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
        };
      });

      setApontamentos(lista);
    } catch (err) {
      console.error('Erro ao carregar notificações de produção:', err);
    } finally {
      setCarregando(false);
    }
  }, [ofFiltrar]);

  useEffect(() => {
    if (isOpen) {
      carregarNotificacoes();
    }
  }, [isOpen, carregarNotificacoes]);

  if (!isOpen) return null;

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
                Histórico em tempo real das peças produzidas
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

        {/* Lista de Notificações de Apontamentos */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar">
          {carregando && apontamentos.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-2">
              <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
              <span className="text-xs font-medium">Buscando novos apontamentos...</span>
            </div>
          ) : apontamentos.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 stroke-[1.2] text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Nenhum apontamento registrado recentemente{ofFiltrar ? ` para a OF ${ofFiltrar}` : ''}.
              </p>
            </div>
          ) : (
            apontamentos.map((item) => (
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
          <span>{apontamentos.length} apontamentos listados</span>
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

// Hook reativo para alertar e contar novos apontamentos no sininho
export const useSmartNotificationsAlert = (ofFiltrar?: string) => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [hasNewAlert, setHasNewAlert] = useState<boolean>(false);

  useEffect(() => {
    // 1. Busca contagem de apontamentos de hoje / recentes
    const fetchRecentCount = async () => {
      try {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let query = supabase
          .from('apontamentos_producao' as any)
          .select('id', { count: 'exact', head: true })
          .gte('created_at', hoje.toISOString());

        if (ofFiltrar) {
          query = query.eq('of_number', ofFiltrar);
        }

        const { count, error } = await query;
        if (!error && count !== null) {
          setUnreadCount(count);
          if (count > 0) setHasNewAlert(true);
        }
      } catch (err) {
        console.debug('Erro ao contar apontamentos:', err);
      }
    };

    fetchRecentCount();

    // 2. Realtime listener para alertar quando novos apontamentos forem inseridos
    const channelName = `realtime-smart-notifs-${ofFiltrar || 'all'}-${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'apontamentos_producao',
        },
        (payload) => {
          const newRow = payload.new as any;
          if (!ofFiltrar || newRow?.of_number === ofFiltrar) {
            setUnreadCount((c) => c + 1);
            setHasNewAlert(true);
            try {
              smartAudio.playSuccess();
            } catch {
              // ignore
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ofFiltrar]);

  const clearAlert = useCallback(() => {
    setHasNewAlert(false);
  }, []);

  return { unreadCount, hasNewAlert, clearAlert };
};

