import React, { useState, useEffect, useMemo } from 'react';
import { 
  PackageCheck, 
  Building2, 
  Check, 
  RotateCcw, 
  Layers, 
  ChevronRight, 
  AlertCircle 
} from 'lucide-react';
import { OFAtiva } from '@/hooks/useOFsAtivas';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { smartAudio } from '@/utils/smartAudio';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface SmartMontagemFlowProps {
  obra: OFAtiva;
  onVoltarHub: () => void;
  onApontamentoMontagem?: () => void;
}

interface ItemMontagem {
  marca: string;
  descricao?: string;
  peso_unitario?: number;
  quantidade_expedida: number;
  quantidade_ja_apontada: number;
  saldo_disponivel: number;
  tem_componentes?: boolean | null;
}

export const SmartMontagemFlow: React.FC<SmartMontagemFlowProps> = ({
  obra,
  onVoltarHub,
  onApontamentoMontagem,
}) => {
  const { user } = useAuth();

  const [itens, setItens] = useState<ItemMontagem[]>([]);
  const [loading, setLoading] = useState(true);

  // Peça selecionada para apontamento
  const [itemSelecionado, setItemSelecionado] = useState<ItemMontagem | null>(null);
  const [qtdApontar, setQtdApontar] = useState<number>(1);
  const [salvando, setSalvando] = useState<boolean>(false);

  // Carregar saldo de peças expedidas vs já montadas
  const carregarDadosMontagem = React.useCallback(async () => {
    try {
      setLoading(true);

      // Buscar peças expedidas, apontamentos RDO e info de componentes em paralelo
      const [resExp, resRDO, resPecas] = await Promise.all([
        supabase
          .from('itens_romaneio_pecas')
          .select(`
            marca,
            descricao,
            peso_unitario,
            quantidade_expedida,
            romaneios_expedicao!inner(
              of_number
            )
          `)
          .eq('romaneios_expedicao.of_number', obra.of_number),
        supabase
          .from('apontamentos_peca_obra')
          .select(`
            marca_peca,
            quantidade,
            diario_obra_rdo!inner(
              of_number
            )
          `)
          .eq('diario_obra_rdo.of_number', obra.of_number),
        supabase
          .from('pecas')
          .select('marca, tem_componentes')
          .eq('of_number', obra.of_number),
      ]);

      if (resExp.error) throw resExp.error;
      if (resRDO.error) throw resRDO.error;

      const mapaExpedidas = new Map<string, { marca: string; descricao: string; peso_unitario: number; expedido: number }>();
      (resExp.data || []).forEach((item: any) => {
        const atual = mapaExpedidas.get(item.marca) || {
          marca: item.marca,
          descricao: item.descricao || '',
          peso_unitario: item.peso_unitario || 0,
          expedido: 0,
        };
        atual.expedido += Number(item.quantidade_expedida || 0);
        mapaExpedidas.set(item.marca, atual);
      });

      const mapaMontadas = new Map<string, number>();
      (resRDO.data || []).forEach((ap: any) => {
        const atual = mapaMontadas.get(ap.marca_peca) || 0;
        mapaMontadas.set(ap.marca_peca, atual + Number(ap.quantidade || 0));
      });

      const mapaSM = new Map<string, boolean>();
      (resPecas.data || []).forEach((p: any) => {
        if (p.tem_componentes === false) {
          mapaSM.set(p.marca, true);
        }
      });

      // 3. Montar lista de saldos
      const lista: ItemMontagem[] = Array.from(mapaExpedidas.values()).map((exp) => {
        const jaMontado = mapaMontadas.get(exp.marca) || 0;
        const saldo = Math.max(0, exp.expedido - jaMontado);
        return {
          marca: exp.marca,
          descricao: exp.descricao,
          peso_unitario: exp.peso_unitario,
          quantidade_expedida: exp.expedido,
          quantidade_ja_apontada: jaMontado,
          saldo_disponivel: saldo,
          tem_componentes: mapaSM.has(exp.marca) ? false : true,
        };
      });

      // Ordenar: primeiro os com saldo > 0 e com ordenação alfanumérica natural
      lista.sort((a, b) => {
        if (a.saldo_disponivel > 0 && b.saldo_disponivel === 0) return -1;
        if (a.saldo_disponivel === 0 && b.saldo_disponivel > 0) return 1;
        return a.marca.localeCompare(b.marca, undefined, { numeric: true, sensitivity: 'base' });
      });

      setItens(lista);
    } catch (e) {
      console.error('Erro ao carregar dados de montagem:', e);
      toast.error('Erro ao buscar peças da obra');
    } finally {
      setLoading(false);
    }
  }, [obra.of_number]);

  useEffect(() => {
    carregarDadosMontagem();
  }, [carregarDadosMontagem]);

  // Obter ou criar RDO de hoje para a OF
  const obterOuCriarRDO = async (): Promise<string> => {
    const hoje = new Date().toISOString().split('T')[0];

    // Buscar se já existe RDO hoje
    const { data: rdoExistente } = await supabase
      .from('diario_obra_rdo')
      .select('id')
      .eq('of_number', obra.of_number)
      .eq('data', hoje)
      .maybeSingle();

    if (rdoExistente?.id) {
      return rdoExistente.id;
    }

    const nomeOperador = user?.email?.split('@')[0] || 'Operador Smart';

    // Criar novo RDO para o dia com campos do schema real
    const { data: novoRDO, error } = await supabase
      .from('diario_obra_rdo')
      .insert({
        of_number: obra.of_number,
        data: hoje,
        usuario_nome: nomeOperador,
        usuario_rdo: user?.id || null,
        observacoes_gerais: 'Apontamento de montagem via Modo Smart',
        finalizado: false,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Erro ao criar RDO no banco:', error);
      throw error;
    }
    return novoRDO.id;
  };

  // Confirmar Apontamento de Montagem
  const handleConfirmarMontagem = async () => {
    if (!itemSelecionado || qtdApontar <= 0) return;

    try {
      setSalvando(true);
      const rdoId = await obterOuCriarRDO();

      const { error } = await supabase.from('apontamentos_peca_obra').insert({
        rdo_id: rdoId,
        marca_peca: itemSelecionado.marca,
        quantidade: qtdApontar,
        periodo: 'Normal',
        status: 'Montado',
      });

      if (error) throw error;

      smartAudio.playSuccess();
      toast.success(`🏗️ Montagem registrada: ${qtdApontar}x ${itemSelecionado.marca}!`);

      if (onApontamentoMontagem) {
        onApontamentoMontagem();
      }

      setItemSelecionado(null);
      carregarDadosMontagem();
    } catch (e: any) {
      smartAudio.playAlert();
      console.error('Erro ao registrar montagem:', e);
      toast.error('Erro ao registrar montagem: ' + (e?.message || ''));
    } finally {
      setSalvando(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: TECLADO DE APONTAMENTO
  // ─────────────────────────────────────────────────────────────
  if (itemSelecionado) {
    const saldo = itemSelecionado.saldo_disponivel;

    return (
      <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
        {/* Resumo da Peça */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 mb-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-amber-700 dark:text-amber-400">
                {itemSelecionado.marca}
              </span>
              {itemSelecionado.tem_componentes === false && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold border border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800/50">
                  S/M
                </span>
              )}
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 uppercase">
              Montagem em Obra
            </span>
          </div>
          <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 mt-1">
            {itemSelecionado.descricao || 'Peça Estrutural'}
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/80">
            <span>Recebidas no Canteiro: {itemSelecionado.quantidade_expedida} un</span>
            <span className="text-emerald-700 dark:text-emerald-400 font-bold">
              Disponíveis p/ Montar: {saldo} un
            </span>
          </div>
        </div>

        {/* Display da Quantidade */}
        <div className="my-auto py-3 text-center">
          <span className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            Quantidade Montada Agora
          </span>
          <div className="flex items-center justify-center gap-4 mt-2">
            <div className="min-w-[120px] h-20 px-6 rounded-3xl bg-slate-50 dark:bg-slate-900 border-2 border-emerald-500 flex items-center justify-center shadow-inner">
              <span className="text-4xl sm:text-5xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                {qtdApontar}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                smartAudio.playClick();
                setQtdApontar(1);
              }}
              className="h-14 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 active:bg-slate-650 border border-slate-200 dark:border-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <RotateCcw className="h-4 w-4" />
              <span>Zerar</span>
            </button>
          </div>
        </div>

        {/* Teclado Rápido */}
        <div className="grid grid-cols-4 gap-2.5 mb-4">
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              setQtdApontar((p) => Math.min(saldo, p + 1));
            }}
            className="h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 active:bg-slate-700 dark:border-slate-700 dark:text-white text-xl font-black active:scale-95 shadow-sm"
          >
            +1
          </button>
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              setQtdApontar((p) => Math.min(saldo, p + 2));
            }}
            className="h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 active:bg-slate-700 dark:border-slate-700 dark:text-white text-xl font-black active:scale-95 shadow-sm"
          >
            +2
          </button>
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              setQtdApontar((p) => Math.min(saldo, p + 5));
            }}
            className="h-16 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 border-2 border-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 active:bg-slate-700 dark:border-slate-700 dark:text-white text-xl font-black active:scale-95 shadow-sm"
          >
            +5
          </button>
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              setQtdApontar(saldo > 0 ? saldo : 1);
            }}
            className="h-16 rounded-2xl bg-emerald-100 hover:bg-emerald-200 border-2 border-emerald-300 text-emerald-800 dark:bg-emerald-500/20 dark:hover:bg-emerald-500/30 dark:border-emerald-500/60 dark:text-emerald-400 text-sm font-black active:scale-95 flex flex-col items-center justify-center leading-tight shadow-sm"
          >
            <span>TODAS</span>
            <span className="text-[11px] opacity-80">({saldo})</span>
          </button>
        </div>

        {/* Confirmação */}
        <div className="space-y-2.5">
          <Button
            type="button"
            disabled={salvando || qtdApontar <= 0}
            onClick={handleConfirmarMontagem}
            className="w-full h-16 bg-emerald-600 hover:bg-emerald-500 text-white text-base font-black rounded-2xl shadow-md uppercase tracking-wide active:scale-98 gap-2"
          >
            {salvando ? (
              <>
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-white border-t-transparent" />
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <Check className="h-6 w-6" />
                <span>CONFIRMAR MONTAGEM</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              smartAudio.playClick();
              setItemSelecionado(null);
            }}
            className="w-full h-13 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 text-sm font-bold rounded-2xl active:scale-98 shadow-sm"
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: LISTA DE PEÇAS DISPONÍVEIS NA OBRA
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
      <div className="mb-4 text-center">
        <span className="text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
          ETAPA 3 — CANTEIRO DE OBRAS
        </span>
        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase mt-0.5">
          Apontar Peças Montadas
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Peças entregues no canteiro aguardando fixação/montagem
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pb-4">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-slate-400 gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
            <span>Consultando entregas no canteiro...</span>
          </div>
        ) : itens.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <AlertCircle className="h-10 w-10 text-slate-400 dark:text-slate-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">Nenhuma peça recebida na obra</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              É necessário gerar e enviar romaneios de fábrica antes de apontar montagem
            </p>
          </div>
        ) : (
          itens.map((item) => {
            const concluida = item.saldo_disponivel <= 0;
            return (
              <div
                key={item.marca}
                className={`p-4 rounded-2xl border-2 transition-all shadow-sm ${
                  concluida
                    ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75'
                    : 'bg-white dark:bg-slate-800/95 border-slate-200 dark:border-slate-700/90 hover:border-emerald-500/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-amber-700 dark:text-amber-400 tracking-wider">
                        {item.marca}
                      </span>
                      {item.tem_componentes === false && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-bold border border-purple-300 dark:bg-purple-950/80 dark:text-purple-300 dark:border-purple-800/50">
                          S/M
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">
                      {item.descricao || 'Peça Estrutural'}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Entregues: {item.quantidade_expedida}
                    </div>
                    {concluida ? (
                      <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-300 dark:text-emerald-400 px-2 py-0.5 rounded-full dark:bg-emerald-950/80 dark:border-emerald-700">
                        <Check className="h-3 w-3" /> 100% Montada
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-black text-emerald-800 bg-emerald-100 border border-emerald-300 dark:text-emerald-300 px-2 py-0.5 rounded-full dark:bg-emerald-950/80 dark:border-emerald-700">
                        Saldo: {item.saldo_disponivel}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-3">
                  <Button
                    type="button"
                    disabled={concluida}
                    onClick={() => {
                      smartAudio.playClick();
                      setItemSelecionado(item);
                      setQtdApontar(item.saldo_disponivel > 0 ? 1 : 1);
                    }}
                    className={`w-full h-13 text-sm font-black rounded-xl uppercase tracking-wider transition-all active:scale-[0.98] ${
                      concluida
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/20'
                    }`}
                  >
                    {concluida ? 'Totalmente Montada' : `APONTAR MONTAGEM (${item.saldo_disponivel} PENDENTES)`}
                  </Button>
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
          onVoltarHub();
        }}
        className="w-full h-14 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold rounded-2xl mt-2 active:scale-98 shadow-sm"
      >
        ⬅️ Voltar ao Menu Principal
      </Button>
    </div>
  );
};
