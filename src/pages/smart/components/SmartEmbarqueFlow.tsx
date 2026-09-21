import React, { useState, useEffect, useMemo } from 'react';
import { 
  Truck, 
  Plus, 
  ListChecks, 
  ChevronRight, 
  Check, 
  Package, 
  User, 
  FileCheck,
  AlertCircle
} from 'lucide-react';
import { OFAtiva } from '@/hooks/useOFsAtivas';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { smartAudio } from '@/utils/smartAudio';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface SmartEmbarqueFlowProps {
  obra: OFAtiva;
  onVoltarHub: () => void;
}

interface RomaneioAberto {
  id: string;
  numero_romaneio: string;
  nome_motorista?: string;
  tipo_transporte?: string;
  peso_total_romaneio?: number;
  status?: string;
  created_at?: string;
}

interface PecaPronta {
  id: string;
  marca: string;
  descricao: string;
  etapa_fase: string;
  quantidade: number;
  peso_unitario: number;
  quantidadeJaExpedida: number;
  saldoDisponivel: number;
}

export const SmartEmbarqueFlow: React.FC<SmartEmbarqueFlowProps> = ({ obra, onVoltarHub }) => {
  const { user } = useAuth();

  // Estados: 'menu' | 'novo_romaneio' | 'selecionar_romaneio' | 'carregando_pecas'
  const [subTela, setSubTela] = useState<'menu' | 'novo_romaneio' | 'selecionar_romaneio' | 'carregando_pecas'>('menu');

  // Romaneio ativo para carregamento
  const [romaneioAtivo, setRomaneioAtivo] = useState<RomaneioAberto | null>(null);

  // Lista de romaneios da OF
  const [romaneios, setRomaneios] = useState<RomaneioAberto[]>([]);
  const [loadingRomaneios, setLoadingRomaneios] = useState<boolean>(false);

  // Formulário de Novo Romaneio Rápido
  const [nomeMotorista, setNomeMotorista] = useState('');
  const [tipoTransporte, setTipoTransporte] = useState<'caminhao_pequeno' | 'caminhao_trucado' | 'caminhao_munck' | 'carreta_12m'>('caminhao_trucado');
  const [freteTipo, setFreteTipo] = useState<'proprio' | 'terceiros'>('proprio');
  const [criandoRomaneio, setCriandoRomaneio] = useState(false);

  // Lista de peças prontas da OF e seus saldos de embarque
  const [pecasProntas, setPecasProntas] = useState<PecaPronta[]>([]);
  const [loadingPecas, setLoadingPecas] = useState(false);

  // Peça selecionada para adicionar ao caminhão
  const [pecaEmbarque, setPecaEmbarque] = useState<PecaPronta | null>(null);
  const [qtdEmbarcar, setQtdEmbarcar] = useState<number>(1);
  const [salvandoItem, setSalvandoItem] = useState(false);

  // Carregar Romaneios Abertos da OF
  const carregarRomaneios = React.useCallback(async () => {
    try {
      setLoadingRomaneios(true);
      const { data, error } = await supabase
        .from('romaneios_expedicao')
        .select('*')
        .eq('of_number', obra.of_number)
        .neq('status', 'Entregue')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRomaneios(data || []);
    } catch (e) {
      console.error('Erro ao buscar romaneios:', e);
    } finally {
      setLoadingRomaneios(false);
    }
  }, [obra.of_number]);

  // Carregar Peças com Saldo para Embarque
  const carregarPecasParaEmbarque = React.useCallback(async () => {
    try {
      setLoadingPecas(true);

      const [resPecas, resItensExpedidos] = await Promise.all([
        supabase
          .from('pecas')
          .select('id, marca, descricao, etapa_fase, quantidade, peso_unitario')
          .eq('of_number', obra.of_number),
        supabase
          .from('itens_romaneio_pecas')
          .select('peca_id, quantidade_expedida'),
      ]);

      const mapaExpedidas = new Map<string, number>();
      if (resItensExpedidos.data) {
        resItensExpedidos.data.forEach((item) => {
          const atual = mapaExpedidas.get(item.peca_id) || 0;
          mapaExpedidas.set(item.peca_id, atual + Number(item.quantidade_expedida || 0));
        });
      }

      if (resPecas.data) {
        const formatadas: PecaPronta[] = resPecas.data.map((p) => {
          const jaExp = mapaExpedidas.get(p.id) || 0;
          const saldo = Math.max(0, p.quantidade - jaExp);
          return {
            ...p,
            quantidadeJaExpedida: jaExp,
            saldoDisponivel: saldo,
          };
        });
        setPecasProntas(formatadas);
      }
    } catch (e) {
      console.error('Erro ao carregar peças para embarque:', e);
    } finally {
      setLoadingPecas(false);
    }
  }, [obra.of_number]);

  useEffect(() => {
    carregarRomaneios();
    carregarPecasParaEmbarque();
  }, [carregarRomaneios, carregarPecasParaEmbarque]);

  // Criar Novo Romaneio
  const handleCriarRomaneio = async () => {
    if (!user) return;
    try {
      setCriandoRomaneio(true);
      const hoje = new Date().toISOString().split('T')[0];

      // Gerar número de romaneio sequencial RO-XX
      const seq = (romaneios.length + 1).toString().padStart(2, '0');
      const numRomaneio = `RO${obra.of_number.replace(/\D/g, '')}-${seq}`;

      const novo = {
        of_number: obra.of_number,
        numero_romaneio: numRomaneio,
        data_romaneio: hoje,
        data_criacao: hoje,
        revisao: 0,
        prioridade: 'Normal' as const,
        status: 'Em planejamento' as const,
        tipo_transporte: tipoTransporte,
        frete_tipo: freteTipo,
        nome_motorista: nomeMotorista || 'Motorista a definir',
        peso_total_romaneio: 0,
        created_by: user.id,
      };

      const { data, error } = await supabase
        .from('romaneios_expedicao')
        .insert(novo)
        .select()
        .single();

      if (error) throw error;

      smartAudio.playSuccess();
      toast.success(`Romaneio ${numRomaneio} criado!`);
      setRomaneioAtivo(data);
      setSubTela('carregando_pecas');
      carregarRomaneios();
    } catch (e: any) {
      smartAudio.playAlert();
      console.error('Erro ao criar romaneio:', e);
      toast.error('Erro ao criar romaneio: ' + (e?.message || 'Falha de conexão'));
    } finally {
      setCriandoRomaneio(false);
    }
  };

  // Incluir Peça no Romaneio
  const handleIncluirPeca = async () => {
    if (!romaneioAtivo || !pecaEmbarque || qtdEmbarcar <= 0) return;

    try {
      setSalvandoItem(true);
      const pesoTotalItem = qtdEmbarcar * (pecaEmbarque.peso_unitario || 0);

      const novoItem = {
        romaneio_id: romaneioAtivo.id,
        peca_id: pecaEmbarque.id,
        marca: pecaEmbarque.marca,
        descricao: pecaEmbarque.descricao,
        fase: pecaEmbarque.etapa_fase || 'Geral',
        quantidade_expedida: qtdEmbarcar,
        peso_unitario: pecaEmbarque.peso_unitario || 0,
        peso_total: pesoTotalItem,
        quantidade_faltante: Math.max(0, pecaEmbarque.saldoDisponivel - qtdEmbarcar),
      };

      const { error } = await supabase.from('itens_romaneio_pecas').insert(novoItem);
      if (error) throw error;

      // Atualizar o peso total no cabeçalho do romaneio
      const novoPesoRomaneio = (romaneioAtivo.peso_total_romaneio || 0) + pesoTotalItem;
      await supabase
        .from('romaneios_expedicao')
        .update({ peso_total_romaneio: novoPesoRomaneio })
        .eq('id', romaneioAtivo.id);

      smartAudio.playSuccess();
      toast.success(`Adicionado: ${qtdEmbarcar}x ${pecaEmbarque.marca} ao caminhão!`);

      // Atualizar estado local
      setRomaneioAtivo((prev) => (prev ? { ...prev, peso_total_romaneio: novoPesoRomaneio } : null));
      setPecaEmbarque(null);
      carregarPecasParaEmbarque();
    } catch (e: any) {
      smartAudio.playAlert();
      console.error('Erro ao adicionar peça ao romaneio:', e);
      toast.error('Erro ao incluir no caminhão: ' + (e?.message || ''));
    } finally {
      setSalvandoItem(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: SUBTELA 'MENU'
  // ─────────────────────────────────────────────────────────────
  if (subTela === 'menu') {
    return (
      <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
        <div className="mb-6 text-center">
          <div className="inline-flex p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
            <Truck className="h-8 w-8" />
          </div>
          <span className="text-xs font-black uppercase text-blue-400 tracking-wider block">
            ETAPA 2 — EXPEDIÇÃO
          </span>
          <h2 className="text-xl font-black text-slate-100 uppercase mt-0.5">
            Apontar Embarque & Romaneio
          </h2>
          <p className="text-xs text-slate-400">
            Carregue caminhões com as peças prontas no pátio
          </p>
        </div>

        <div className="space-y-3.5 my-auto">
          {/* Opção 1: Criar Novo Romaneio */}
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              setSubTela('novo_romaneio');
            }}
            className="w-full min-h-[90px] p-5 rounded-3xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:scale-[0.98] text-white flex items-center justify-between text-left shadow-lg shadow-blue-950/40 border-2 border-blue-400/30 transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-white/20">
                <Plus className="h-7 w-7 text-white" />
              </div>
              <div>
                <div className="text-lg font-black tracking-tight">
                  Criar Novo Romaneio Rápido
                </div>
                <div className="text-xs text-blue-100 font-medium">
                  Informar veículo, motorista e iniciar carga
                </div>
              </div>
            </div>
            <ChevronRight className="h-6 w-6 text-blue-200 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Opção 2: Romaneios em Aberto */}
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              setSubTela('selecionar_romaneio');
            }}
            className="w-full min-h-[90px] p-5 rounded-3xl bg-slate-800 hover:bg-slate-750 active:scale-[0.98] text-slate-100 border-2 border-slate-700 hover:border-blue-500/60 flex items-center justify-between text-left shadow-md transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-slate-700 text-blue-400">
                <ListChecks className="h-7 w-7" />
              </div>
              <div>
                <div className="text-lg font-black tracking-tight">
                  Continuar em Romaneio Aberto
                </div>
                <div className="text-xs text-slate-400 font-medium">
                  {romaneios.length} romaneio(s) aberto(s) para esta obra
                </div>
              </div>
            </div>
            <ChevronRight className="h-6 w-6 text-slate-400 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            smartAudio.playClick();
            onVoltarHub();
          }}
          className="w-full h-14 bg-slate-800 border-slate-700 text-slate-200 text-sm font-bold rounded-2xl mt-4 active:scale-98"
        >
          Voltar ao Menu Principal
        </Button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: SUBTELA 'NOVO_ROMANEIO' (FORMULÁRIO TOUCH RÁPIDO)
  // ─────────────────────────────────────────────────────────────
  if (subTela === 'novo_romaneio') {
    return (
      <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
        <div className="mb-4 text-center">
          <span className="text-xs font-black uppercase text-blue-400 tracking-wider">
            NOVO CARREGAMENTO
          </span>
          <h2 className="text-xl font-black text-slate-100 uppercase mt-0.5">
            Dados do Veículo & Frete
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pb-4">
          {/* Nome / Placa do Motorista */}
          <div>
            <label className="text-xs font-black uppercase text-slate-300 tracking-wider block mb-1.5">
              Motorista ou Identificação do Veículo
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="h-5 w-5 text-blue-400" />
              </div>
              <Input
                type="text"
                value={nomeMotorista}
                onChange={(e) => setNomeMotorista(e.target.value)}
                placeholder="Ex: João Silva / Placa ABC-1234"
                className="h-14 pl-11 bg-slate-800/90 border-slate-700 text-slate-100 text-base font-medium rounded-2xl"
              />
            </div>
          </div>

          {/* Pílulas Touch: Tipo de Transporte */}
          <div>
            <label className="text-xs font-black uppercase text-slate-300 tracking-wider block mb-1.5">
              Tipo de Veículo
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'caminhao_pequeno', label: 'Caminhão 3/4' },
                { id: 'caminhao_trucado', label: 'Toco / Trucado' },
                { id: 'caminhao_munck', label: 'Munck' },
                { id: 'carreta_12m', label: 'Carreta 12m/15m' },
              ].map((tipo) => (
                <button
                  key={tipo.id}
                  type="button"
                  onClick={() => {
                    smartAudio.playClick();
                    setTipoTransporte(tipo.id as any);
                  }}
                  className={`h-14 rounded-2xl font-bold text-xs sm:text-sm transition-all border-2 active:scale-95 flex items-center justify-center text-center p-2 ${
                    tipoTransporte === tipo.id
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {tipo.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pílulas Touch: Tipo de Frete */}
          <div>
            <label className="text-xs font-black uppercase text-slate-300 tracking-wider block mb-1.5">
              Tipo de Frete
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'proprio', label: 'Frota Própria' },
                { id: 'terceiros', label: 'Terceirizado' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => {
                    smartAudio.playClick();
                    setFreteTipo(f.id as any);
                  }}
                  className={`h-12 rounded-2xl font-bold text-xs sm:text-sm transition-all border-2 active:scale-95 flex items-center justify-center text-center ${
                    freteTipo === f.id
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2 mt-2">
          <Button
            type="button"
            disabled={criandoRomaneio}
            onClick={handleCriarRomaneio}
            className="w-full h-15 bg-blue-600 hover:bg-blue-500 text-white font-black text-base rounded-2xl shadow-lg uppercase tracking-wider active:scale-98"
          >
            {criandoRomaneio ? 'Criando...' : 'Criar e Começar a Carregar'}
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              smartAudio.playClick();
              setSubTela('menu');
            }}
            className="w-full h-12 bg-slate-800 border-slate-700 text-slate-300 text-xs font-bold rounded-2xl"
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: SUBTELA 'SELECIONAR_ROMANEIO'
  // ─────────────────────────────────────────────────────────────
  if (subTela === 'selecionar_romaneio') {
    return (
      <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
        <div className="mb-4 text-center">
          <span className="text-xs font-black uppercase text-blue-400 tracking-wider">
            CONTINUAR CARGA
          </span>
          <h2 className="text-xl font-black text-slate-100 uppercase mt-0.5">
            Selecione o Romaneio
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pb-4">
          {loadingRomaneios ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              <span>Buscando romaneios abertos...</span>
            </div>
          ) : romaneios.length === 0 ? (
            <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
              <AlertCircle className="h-10 w-10 text-slate-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-200">Nenhum romaneio aberto</h3>
              <p className="text-xs text-slate-400 mt-1">
                Crie um novo romaneio para iniciar a expedição
              </p>
            </div>
          ) : (
            romaneios.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  smartAudio.playClick();
                  setRomaneioAtivo(r);
                  setSubTela('carregando_pecas');
                }}
                className="w-full min-h-[72px] p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 border-2 border-slate-700 hover:border-blue-500/80 flex items-center justify-between text-left transition-all active:scale-[0.98] group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                    <Truck className="h-6 w-6" />
                  </div>
                  <div>
                    <div className="text-base font-black text-blue-400">
                      {r.numero_romaneio}
                    </div>
                    <div className="text-xs text-slate-200 font-semibold">
                      {r.nome_motorista || 'Motorista padrão'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Peso Atual: {(r.peso_total_romaneio || 0).toLocaleString('pt-BR')} kg
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-6 w-6 text-slate-400 group-hover:text-blue-400" />
              </button>
            ))
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            smartAudio.playClick();
            setSubTela('menu');
          }}
          className="w-full h-14 bg-slate-800 border-slate-700 text-slate-200 text-sm font-bold rounded-2xl mt-2 active:scale-98"
        >
          ⬅️ Voltar
        </Button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: SUBTELA 'CARREGANDO_PECAS' (CARGA DE PEÇAS NO CAMINHÃO)
  // ─────────────────────────────────────────────────────────────
  if (subTela === 'carregando_pecas' && romaneioAtivo) {
    return (
      <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
        {/* Banner do Romaneio Ativo */}
        <div className="p-3.5 rounded-2xl bg-blue-950/60 border border-blue-700/60 mb-3 shadow-md flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase text-blue-400 tracking-wider">
                CAMINHÃO ATIVO
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300">
                {romaneioAtivo.numero_romaneio}
              </span>
            </div>
            <div className="text-xs text-slate-300 mt-0.5">
              Motorista: <span className="font-bold">{romaneioAtivo.nome_motorista}</span> | Peso:{' '}
              <span className="font-bold text-amber-400">
                {(romaneioAtivo.peso_total_romaneio || 0).toLocaleString('pt-BR')} kg
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              smartAudio.playClick();
              setRomaneioAtivo(null);
              setSubTela('menu');
            }}
            className="text-xs font-bold text-blue-400 underline px-2 py-1 shrink-0"
          >
            Trocar
          </button>
        </div>

        {/* Modal/Seção de Quantidade para o Item Selecionado */}
        {pecaEmbarque ? (
          <div className="p-4 rounded-2xl bg-slate-800 border-2 border-blue-500/80 mb-3 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl font-black text-amber-400">
                {pecaEmbarque.marca}
              </span>
              <span className="text-xs font-bold text-slate-400">
                Saldo: {pecaEmbarque.saldoDisponivel} un
              </span>
            </div>

            <div className="flex items-center justify-center gap-3 my-3">
              <div className="h-16 px-6 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center">
                <span className="text-3xl font-black text-blue-400">{qtdEmbarcar}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    smartAudio.playClick();
                    setQtdEmbarcar((p) => Math.min(pecaEmbarque.saldoDisponivel, p + 1));
                  }}
                  className="h-12 px-3 rounded-xl bg-slate-700 font-bold text-white active:scale-95"
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => {
                    smartAudio.playClick();
                    setQtdEmbarcar((p) => Math.min(pecaEmbarque.saldoDisponivel, p + 2));
                  }}
                  className="h-12 px-3 rounded-xl bg-slate-700 font-bold text-white active:scale-95"
                >
                  +2
                </button>
                <button
                  type="button"
                  onClick={() => {
                    smartAudio.playClick();
                    setQtdEmbarcar(pecaEmbarque.saldoDisponivel);
                  }}
                  className="h-12 px-2.5 rounded-xl bg-blue-500/20 text-blue-300 font-black text-xs active:scale-95"
                >
                  TODAS
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button
                type="button"
                disabled={salvandoItem}
                onClick={handleIncluirPeca}
                className="h-13 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-xl text-xs uppercase"
              >
                {salvandoItem ? 'Gravando...' : 'INCLUIR NO CAMINHÃO'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPecaEmbarque(null)}
                className="h-13 bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : null}

        {/* Lista de Peças Prontas para Embarcar */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pb-4">
          <div className="text-xs font-black uppercase text-slate-400 tracking-wider mb-1">
            Peças com Saldo para Embarque
          </div>

          {loadingPecas ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
              <span>Carregando peças prontas...</span>
            </div>
          ) : pecasProntas.filter((p) => p.saldoDisponivel > 0).length === 0 ? (
            <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
              <Package className="h-10 w-10 text-slate-500 mx-auto mb-2" />
              <h3 className="text-base font-bold text-slate-200">
                Nenhuma peça com saldo de embarque
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Todas as peças prontas já foram embarcadas em romaneios anteriores
              </p>
            </div>
          ) : (
            pecasProntas
              .filter((p) => p.saldoDisponivel > 0)
              .map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl bg-slate-800/95 border border-slate-700 flex items-center justify-between gap-2 shadow-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-amber-400">{p.marca}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-semibold">
                        {p.etapa_fase || 'Estrutural'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 mt-0.5">
                      Saldo p/ Embarque:{' '}
                      <span className="font-bold text-blue-400">{p.saldoDisponivel} un</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      smartAudio.playClick();
                      setPecaEmbarque(p);
                      setQtdEmbarcar(1);
                    }}
                    className="h-11 px-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl active:scale-95 text-xs uppercase shrink-0"
                  >
                    Embarcar
                  </Button>
                </div>
              ))
          )}
        </div>

        {/* Botão Finalizador do Romaneio */}
        <div className="space-y-2 mt-2">
          <Button
            type="button"
            onClick={() => {
              smartAudio.playSuccess();
              toast.success('Carregamento do Romaneio registrado com sucesso!');
              setSubTela('menu');
            }}
            className="w-full h-15 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black rounded-2xl shadow-lg uppercase active:scale-98 gap-2"
          >
            <FileCheck className="h-5 w-5" />
            <span>FINALIZAR CARREGAMENTO DO ROMANEIO</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={() => {
              smartAudio.playClick();
              setSubTela('menu');
            }}
            className="w-full h-12 bg-slate-800 border-slate-700 text-slate-300 text-xs font-bold rounded-2xl"
          >
            ⬅️ Voltar à Lista
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
