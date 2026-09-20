import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loadAndAuditIFC, LoadedIFCResult, IFCQualityAudit } from '@/lib/ifc/ifcLoaderService';
import { ModelViewer3D } from '@/components/viewer3d/ModelViewer3D';
import { IFCQualityModal } from '@/components/viewer3d/IFCQualityModal';
import {
  Upload,
  Box,
  Layers,
  ShieldCheck,
  CheckCircle2,
  FileCode2,
  Loader2,
  TrendingUp,
  Weight,
  Sparkles,
  Info
} from 'lucide-react';

interface OFOption {
  id: string;
  of_number: string;
  descritivo?: string;
  cliente?: string;
  peso_total?: number;
}

const PROCESS_COLORS: Record<string, string> = {
  'Detalhamento': '#3b82f6',
  'Corte': '#f59e0b',
  'Montagem': '#6366f1',
  'Solda': '#f97316',
  'Pintura': '#10b981',
  'Pintura/Galv': '#10b981',
  'Expedicao': '#94a3b8',
  'Aceite/DB': '#06b6d4',
  'Concluido': '#22c55e',
};

export default function Visualizador3D() {
  const [ofs, setOfs] = useState<OFOption[]>([]);
  const [selectedOF, setSelectedOF] = useState<string>('B135');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [phasesList, setPhasesList] = useState<string[]>([]);

  // Production pointing data from Supabase
  const [productionMap, setProductionMap] = useState<Map<string, any>>(new Map());
  const [totalPecasBD, setTotalPecasBD] = useState<number>(0);
  const [totalApontadasBD, setTotalApontadasBD] = useState<number>(0);
  const [pesoTotalBD, setPesoTotalBD] = useState<number>(0);
  const [progressoOF, setProgressoOF] = useState<number>(0);

  // 3D Model and Quality State
  const [modelData, setModelData] = useState<LoadedIFCResult | null>(null);
  const [auditData, setAuditData] = useState<IFCQualityAudit | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [loadingPercent, setLoadingPercent] = useState<number>(0);
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch OFs
  useEffect(() => {
    async function fetchOFs() {
      try {
        const { data, error } = await supabase
          .from('ordens_fabricacao' as any)
          .select('id, num_of, descritivo, peso_total')
          .order('num_of', { ascending: false });

        if (!error && data) {
          const list: OFOption[] = (data as any[]).map(item => ({
            id: item.id,
            of_number: item.num_of || '',
            descritivo: item.descritivo || '',
            peso_total: Number(item.peso_total || 0)
          }));
          setOfs(list);
          if (list.length > 0 && !selectedOF) {
            setSelectedOF(list[0].of_number);
          }
        }
      } catch (err) {
        console.error('Erro ao carregar OFs:', err);
      }
    }
    fetchOFs();
  }, []);

  // 2. Fetch Pieces & Production Apontamentos for Selected OF
  useEffect(() => {
    if (!selectedOF) return;

    async function fetchProductionData() {
      try {
        // Fetch pecas
        const { data: pecasData } = await supabase
          .from('pecas' as any)
          .select('id, of_number, etapa_fase, marca, descricao, quantidade, peso_unitario, peso_total, perfil_principal, material')
          .eq('of_number', selectedOF);

        // Fetch apontamentos com join de peca e processo usando constraints explicitas para evitar PGRST201
        const { data: apontamentosData, error: errorApontamentos } = await supabase
          .from('apontamentos_producao' as any)
          .select(`
            id, of_number, peca_id, quantidade_produzida,
            peca:pecas!apontamentos_producao_peca_id_fkey(marca, etapa_fase),
            processo:processos_fabricacao!apontamentos_producao_processo_id_fkey(nome, cor, ordem)
          `)
          .eq('of_number', selectedOF);

        if (errorApontamentos) {
          console.error("Erro ao buscar apontamentos no visualizador:", errorApontamentos);
        }

        const phases = new Set<string>();
        const prodMap = new Map<string, any>();
        const uniqueItems: any[] = [];
        let totalPecas = 0;
        let totalPeso = 0;

        if (pecasData) {
          pecasData.forEach((p: any) => {
            const fase = String(p.etapa_fase || '1');
            phases.add(fase);
            totalPecas += Number(p.quantidade || 0);
            totalPeso += Number(p.peso_total || 0);

            const marcaStr = String(p.marca || '').trim();
            const item = {
              pecaId: p.id,
              marca: marcaStr,
              fase,
              ofNumber: selectedOF,
              totalQtd: Number(p.quantidade || 1),
              pointedQtd: 0,
              currentProcessName: 'Pendente',
              processColor: '#64748b',
              processOrdem: 0
            };

            uniqueItems.push(item);

            // Indexa por marca simples (ex: "4")
            prodMap.set(marcaStr, item);
            prodMap.set(marcaStr.toUpperCase(), item);
            // Indexa por fase e marca (ex: "2-4")
            prodMap.set(`${fase}-${marcaStr}`, item);
            prodMap.set(`${fase}-${marcaStr}`.toUpperCase(), item);
            // Indexa por OF, fase e marca (ex: "B135-2-4")
            prodMap.set(`${selectedOF}-${fase}-${marcaStr}`, item);
            prodMap.set(`${selectedOF}-${fase}-${marcaStr}`.toUpperCase(), item);
            // Indexa por OF e marca (ex: "B135-4")
            prodMap.set(`${selectedOF}-${marcaStr}`, item);
            prodMap.set(`${selectedOF}-${marcaStr}`.toUpperCase(), item);

            // Indexa descrição e perfil principal para amarração de elementos sem numeração (ex: barras redondas RD19)
            if (p.descricao) {
              const d = String(p.descricao).trim().toUpperCase();
              prodMap.set(`DESC:${d}`, item);
            }
            if (p.perfil_principal) {
              const perf = String(p.perfil_principal).trim().toUpperCase();
              prodMap.set(`PERFIL:${perf}`, item);
            }
          });
        }

        if (apontamentosData) {
          // Ordenar apontamentos do menor processo para o maior (assim o processo mais avançado sobressai por último)
          apontamentosData.sort((a: any, b: any) => (a.processo?.ordem || 0) - (b.processo?.ordem || 0));

          apontamentosData.forEach((ap: any) => {
            const marca = ap.peca?.marca ? String(ap.peca.marca).trim() : '';
            const fase = ap.peca?.etapa_fase ? String(ap.peca.etapa_fase).trim() : '';
            if (marca) {
              const existing =
                prodMap.get(`${selectedOF}-${fase}-${marca}`) ||
                prodMap.get(`${fase}-${marca}`) ||
                prodMap.get(marca);

              if (existing) {
                const qty = Number(ap.quantidade_produzida || 0);
                if (qty > 0) {
                  // Atualiza a peça para o estágio mais avançado alcançado
                  existing.pointedQtd = Math.max(existing.pointedQtd, qty);
                  existing.currentProcessName = ap.processo?.nome || existing.currentProcessName;
                  existing.processColor = ap.processo?.cor || PROCESS_COLORS[ap.processo?.nome || ''] || '#10b981';
                  existing.processOrdem = ap.processo?.ordem || existing.processOrdem;
                }
              }
            }
          });
        }

        let pointedTotal = 0;
        let sumProgress = 0; // Para evolução da OF

        // Itera sobre uniqueItems para não duplicar métricas com os múltiplos índices de busca
        uniqueItems.forEach((val) => {
          pointedTotal += val.pointedQtd;
          // Considerando maxOrdem = 5 como final para cálculo de %.
          const pecaProgress = val.pointedQtd > 0 ? Math.min(val.processOrdem / 5, 1) * (val.pointedQtd / val.totalQtd) : 0;
          sumProgress += pecaProgress * val.totalQtd;
        });
        
        const progressoGeralPercent = totalPecas > 0 ? Math.min(Math.round((sumProgress / totalPecas) * 100), 100) : 0;

        setPhasesList(Array.from(phases).sort());
        setProductionMap(prodMap);
        setTotalPecasBD(totalPecas);
        setTotalApontadasBD(pointedTotal);
        setPesoTotalBD(totalPeso);
        setProgressoOF(progressoGeralPercent);
      } catch (err) {
        console.error('Erro ao carregar dados de produção da OF:', err);
      }
    }

    fetchProductionData();
  }, [selectedOF]);

  // Handle File Upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoadingModel(true);
    setLoadingStep('Iniciando processamento...');
    setLoadingPercent(5);

    try {
      const result = await loadAndAuditIFC(file, (percent, step) => {
        setLoadingPercent(percent);
        setLoadingStep(step);
      });

      setModelData(result);
      setAuditData(result.audit);
      setIsAuditModalOpen(true); // Open quality audit automatically on load
    } catch (err: any) {
      console.error('Erro ao carregar IFC:', err);
      alert(`Falha no carregamento do IFC: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsLoadingModel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const progressPercent = totalPecasBD > 0 ? Math.min(Math.round((totalApontadasBD / totalPecasBD) * 100), 100) : 0; // Será substituido pelo state local caso quisermos, mas o totalApontadasBD já não vai estourar.


  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 space-y-4 max-w-[1920px] mx-auto overflow-hidden">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl">
        {/* Left: Title & OF Selector */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl shadow-lg shadow-cyan-500/10">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Visualizador 3D Industrial
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  BIM + Produção
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Acompanhamento visual de peças, montagens e apontamentos industriais
              </p>
            </div>
          </div>

          {/* OF Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-xs font-semibold text-slate-400">OF:</span>
            <select
              value={selectedOF}
              onChange={(e) => setSelectedOF(e.target.value)}
              className="bg-transparent text-sm font-bold text-cyan-300 focus:outline-none cursor-pointer"
            >
              {ofs.map((ofItem) => (
                <option key={ofItem.id} value={ofItem.of_number} className="bg-slate-900 text-white">
                  {ofItem.of_number} {ofItem.descritivo ? `— ${ofItem.descritivo}` : ''}
                </option>
              ))}
              {ofs.length === 0 && <option value="B135">B135 — Cobert. Embarque</option>}
            </select>
          </div>

          {/* Phase Filter */}
          {phasesList.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setSelectedPhase('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedPhase === 'all'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todas Fases
              </button>
              {phasesList.map((f) => (
                <button
                  key={f}
                  onClick={() => setSelectedPhase(f)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    selectedPhase === f
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Fase {f}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Actions & Audit Badge */}
        <div className="flex items-center gap-3">
          {auditData && (
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-semibold transition-all shadow"
              title="Ver detalhes da auditoria do IFC"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Auditoria: {auditData.qualityScore}</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".ifc,.gltf,.glb"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoadingModel}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
          >
            {isLoadingModel ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando ({loadingPercent}%)...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>Carregar Modelo IFC</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Production KPIs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
              Total de Peças
            </span>
            <span className="text-lg font-mono font-extrabold text-white">
              {totalPecasBD || 39} peças
            </span>
          </div>
          <Layers className="w-5 h-5 text-cyan-400" />
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
              Apontamentos Realizados
            </span>
            <span className="text-lg font-mono font-extrabold text-emerald-400">
              {totalApontadasBD} apontadas
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
              Evolução da OF
            </span>
            <span className="text-lg font-mono font-extrabold text-amber-400">
              {progressoOF}% concluído
            </span>
          </div>
          <TrendingUp className="w-5 h-5 text-amber-400" />
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 block">
              Peso da Estrutura
            </span>
            <span className="text-lg font-mono font-extrabold text-cyan-300">
              {pesoTotalBD > 0 ? `${(pesoTotalBD / 1000).toFixed(1)} ton` : '15.0 ton'}
            </span>
          </div>
          <Weight className="w-5 h-5 text-cyan-400" />
        </div>
      </div>

      {/* Main 3D Viewport */}
      <div className="relative flex-1 w-full bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
        {isLoadingModel && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md text-white space-y-4">
            <div className="p-4 bg-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-500/40 animate-pulse">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <h3 className="text-lg font-bold text-white tracking-tight">{loadingStep}</h3>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300"
                  style={{ width: `${loadingPercent}%` }}
                />
              </div>
              <span className="text-xs font-mono text-cyan-400 font-bold">{loadingPercent}%</span>
            </div>
          </div>
        )}

        {!modelData && !isLoadingModel && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center text-slate-400 space-y-4">
            <div className="p-5 rounded-3xl bg-slate-900/80 border border-slate-800 shadow-2xl text-cyan-400">
              <Box className="w-16 h-16 stroke-[1.2]" />
            </div>
            <div className="space-y-1 max-w-md">
              <h2 className="text-lg font-bold text-white">Nenhum modelo IFC carregado</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Clique no botão <span className="text-cyan-300 font-semibold">"Carregar Modelo IFC"</span> acima para importar o arquivo de fabricação da OF e visualizar a estrutura com seus apontamentos em tempo real.
              </p>
            </div>
          </div>
        )}

        <ModelViewer3D
          modelData={modelData}
          productionData={productionMap}
          selectedOF={selectedOF}
          selectedPhase={selectedPhase}
        />
      </div>

      {/* Quality Audit Modal */}
      <IFCQualityModal
        audit={auditData}
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
      />
    </div>
  );
}
