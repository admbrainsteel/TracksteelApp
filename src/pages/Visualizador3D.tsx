import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { loadAndAuditModel3D, LoadedModel3DResult, IFCQualityAudit } from '@/lib/3d/modelLoaderService';
import { uploadIFCToCloud, fetchSavedIFCModel, removeSavedIFCModel } from '@/lib/ifc/ifcStorageService';
import { ModelViewer3D } from '@/components/viewer3d/ModelViewer3D';
import { IFCQualityModal } from '@/components/viewer3d/IFCQualityModal';
import { useToast } from '@/hooks/use-toast';
import {
  Upload,
  Box,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Weight,
  Cloud,
  Trash2
} from 'lucide-react';

interface OFOption {
  id: string;
  of_number: string;
  descritivo?: string;
  cliente?: string;
  peso_total?: number;
  ifc_url?: string | null;
  ifc_filename?: string | null;
  ifc_file_size?: number | null;
  ifc_updated_at?: string | null;
  model_3d_rotation?: { x: number; y: number; z: number } | null;
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
  const { toast } = useToast();
  const [ofs, setOfs] = useState<OFOption[]>([]);
  const [selectedOF, setSelectedOF] = useState<string>('');
  const [selectedPhase, setSelectedPhase] = useState<string>('all');
  const [phasesList, setPhasesList] = useState<string[]>([]);

  // Production pointing data from Supabase
  const [productionMap, setProductionMap] = useState<Map<string, any>>(new Map());
  const [uniqueItemsList, setUniqueItemsList] = useState<any[]>([]);
  const [totalPecasBD, setTotalPecasBD] = useState<number>(0);
  const [totalApontadasBD, setTotalApontadasBD] = useState<number>(0);
  const [pesoTotalBD, setPesoTotalBD] = useState<number>(0);
  const [progressoOF, setProgressoOF] = useState<number>(0);

  // 3D Model and Quality State
  const [modelData, setModelData] = useState<LoadedModel3DResult | null>(null);
  const [auditData, setAuditData] = useState<IFCQualityAudit | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [loadingPercent, setLoadingPercent] = useState<number>(0);
  const [isLoadingModel, setIsLoadingModel] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Fetch OFs (com colunas de IFC e rotação 3D para persistência na nuvem)
  useEffect(() => {
    async function fetchOFs() {
      try {
        const { data, error } = await supabase
          .from('ordens_fabricacao' as any)
          .select('id, num_of, descritivo, peso_total, ifc_url, ifc_filename, ifc_file_size, ifc_updated_at, model_3d_rotation')
          .order('num_of', { ascending: false });

        if (!error && data) {
          const list: OFOption[] = (data as any[]).map((item) => ({
            id: item.id,
            of_number: item.num_of || '',
            descritivo: item.descritivo || '',
            peso_total: Number(item.peso_total || 0),
            ifc_url: item.ifc_url || null,
            ifc_filename: item.ifc_filename || null,
            ifc_file_size: item.ifc_file_size ? Number(item.ifc_file_size) : null,
            ifc_updated_at: item.ifc_updated_at || null,
            model_3d_rotation: item.model_3d_rotation || null,
          }));
          setOfs(list);
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

        // Fetch apontamentos com join de peca e processo
        const { data: apontamentosData, error: errorApontamentos } = await supabase
          .from('apontamentos_producao' as any)
          .select(`
            id, of_number, peca_id, quantidade_produzida,
            peca:pecas!apontamentos_producao_peca_id_fkey(marca, etapa_fase),
            processo:processos_fabricacao!apontamentos_producao_processo_id_fkey(nome, cor, ordem)
          `)
          .eq('of_number', selectedOF);

        if (errorApontamentos) {
          console.error('Erro ao buscar apontamentos no visualizador:', errorApontamentos);
        }

        const phases = new Set<string>();
        const prodMap = new Map<string, any>();
        const uniqueItems: any[] = [];
        let totalPecas = 0;
        let totalPeso = 0;

        if (pecasData) {
          pecasData.forEach((p: any) => {
            let fase = String(p.etapa_fase || '').trim();
            if (fase) {
              if (/^\d+$/.test(fase)) {
                fase = String(parseInt(fase, 10));
              }
              phases.add(fase);
            }
            totalPecas += Number(p.quantidade || 0);
            totalPeso += Number(p.peso_total || 0);

            const marcaStr = String(p.marca || '').trim();
            const item = {
              pecaId: p.id,
              marca: marcaStr,
              fase,
              ofNumber: selectedOF,
              totalQtd: Number(p.quantidade || 1),
              pesoTotal: Number(p.peso_total || 0),
              pesoUnitario: Number(p.peso_unitario || 0),
              pointedQtd: 0,
              currentProcessName: 'Pendente',
              processColor: '#64748b',
              processOrdem: 0,
              processesCompleted: [] as string[],
              processPointedQtds: {} as Record<string, number>,
            };

            uniqueItems.push(item);

            // Indexações para amarração gráfica flexível
            prodMap.set(marcaStr, item);
            prodMap.set(marcaStr.toUpperCase(), item);
            prodMap.set(`${fase}-${marcaStr}`, item);
            prodMap.set(`${fase}-${marcaStr}`.toUpperCase(), item);
            prodMap.set(`${selectedOF}-${fase}-${marcaStr}`, item);
            prodMap.set(`${selectedOF}-${fase}-${marcaStr}`.toUpperCase(), item);
            prodMap.set(`${selectedOF}-${marcaStr}`, item);
            prodMap.set(`${selectedOF}-${marcaStr}`.toUpperCase(), item);

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
                const procRaw = String(ap.processo?.nome || '').trim();
                const procNorm = procRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

                // Detalhamento é um processo de engenharia prévio, não fabril
                const isDetalhamento = procNorm.includes('detalh');

                if (qty > 0) {
                  existing.processPointedQtds[procNorm] = (existing.processPointedQtds[procNorm] || 0) + qty;
                  if (!existing.processesCompleted.includes(procNorm)) {
                    existing.processesCompleted.push(procNorm);
                  }

                  if (!isDetalhamento) {
                    existing.pointedQtd = Math.max(existing.pointedQtd, qty);
                    existing.currentProcessName = procRaw || existing.currentProcessName;
                    existing.processColor = ap.processo?.cor || PROCESS_COLORS[procRaw] || '#10b981';
                    existing.processOrdem = Math.max(existing.processOrdem, Number(ap.processo?.ordem || 0));
                  } else {
                    existing.hasDetalhamento = true;
                  }
                }
              }
            }
          });
        }

        let pointedTotal = 0;
        let sumProgress = 0;

        uniqueItems.forEach((val) => {
          pointedTotal += val.pointedQtd;
          const pecaProgress = val.pointedQtd > 0 ? Math.min(val.processOrdem / 5, 1) * (val.pointedQtd / val.totalQtd) : 0;
          sumProgress += pecaProgress * val.totalQtd;
        });

        const progressoGeralPercent = totalPecas > 0 ? Math.min(Math.round((sumProgress / totalPecas) * 100), 100) : 0;

        setPhasesList(Array.from(phases).sort((a, b) => {
          const na = Number(a);
          const nb = Number(b);
          return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
        }));

        setProductionMap(prodMap);
        setUniqueItemsList(uniqueItems);
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

  // Função auxiliar de carregamento de modelo salvo
  const loadSavedModel = useCallback(async (ofNumber: string, url: string, filename?: string | null) => {
    setIsLoadingModel(true);
    setLoadingStep('Buscando modelo 3D vinculado...');
    setLoadingPercent(15);

    try {
      const buffer = await fetchSavedIFCModel(ofNumber, url, (percent, step) => {
        setLoadingPercent(percent);
        setLoadingStep(step);
      });

      setLoadingStep('Decodificando entidades e montagens 3D...');
      setLoadingPercent(55);

      const result = await loadAndAuditModel3D(buffer, filename || undefined, (percent, step) => {
        setLoadingPercent(55 + Math.round(percent * 0.45));
        setLoadingStep(step);
      });

      setModelData(result);
      setAuditData(result.audit);

      // Mescla fases detectadas no IFC/WRL às fases da OF
      if (result.detectedPhases && result.detectedPhases.length > 0) {
        setPhasesList((prev) => {
          const normPrev = prev.map((f) => (/^\d+$/.test(f) ? String(parseInt(f, 10)) : f));
          const normDetected = result.detectedPhases.map((f) => (/^\d+$/.test(f) ? String(parseInt(f, 10)) : f));
          const combined = new Set([...normPrev, ...normDetected]);
          return Array.from(combined).sort((a, b) => {
            const na = Number(a);
            const nb = Number(b);
            return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
          });
        });
      }

      toast({
        title: 'Modelo 3D Carregado',
        description: `Modelo da OF ${ofNumber} carregado automaticamente da nuvem.`,
      });
    } catch (err: any) {
      console.error('Erro ao carregar modelo salvo:', err);
      toast({
        variant: 'destructive',
        title: 'Falha no Carregamento Automático',
        description: `Não foi possível carregar o modelo salvo: ${err.message || 'Erro de rede'}`,
      });
    } finally {
      setIsLoadingModel(false);
    }
  }, [toast]);

  // 3. Efeito para verificar e carregar automaticamente o modelo IFC salvo ao selecionar uma obra
  useEffect(() => {
    if (!selectedOF) return;

    // Reseta visualizador para a nova OF
    setModelData(null);
    setAuditData(null);
    setSelectedPhase('all');
    setPhasesList([]);

    const currentOF = ofs.find((o) => o.of_number === selectedOF);

    if (currentOF && currentOF.ifc_url) {
      loadSavedModel(selectedOF, currentOF.ifc_url, currentOF.ifc_filename);
    } else if (ofs.length === 0) {
      // Caso a lista de ofs ainda esteja sendo buscada, tenta consulta direta rápida
      async function checkDirect() {
        try {
          const { data } = await supabase
            .from('ordens_fabricacao' as any)
            .select('ifc_url, ifc_filename')
            .eq('num_of', selectedOF)
            .maybeSingle();

          if (data && (data as any).ifc_url) {
            loadSavedModel(selectedOF, (data as any).ifc_url, (data as any).ifc_filename);
          }
        } catch (err) {
          console.debug('Checagem direta de IFC:', err);
        }
      }
      checkDirect();
    }
  }, [selectedOF, ofs, loadSavedModel]);

  // Handle File Upload: Processa, audita e salva automaticamente na nuvem
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedOF) {
      toast({
        title: 'Selecione uma OF',
        description: 'Por favor, selecione uma Ordem de Fabricação (OF) antes de carregar o modelo 3D.',
        variant: 'destructive',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsLoadingModel(true);
    setLoadingStep('Iniciando processamento e auditoria...');
    setLoadingPercent(10);

    try {
      // 1. Processa e audita localmente para renderização imediata
      const result = await loadAndAuditModel3D(file, file.name, (percent, step) => {
        setLoadingPercent(Math.min(percent, 70));
        setLoadingStep(step);
      });

      setModelData(result);
      setAuditData(result.audit);
      setIsAuditModalOpen(true); // Abre modal de qualidade automaticamente

      // Mescla fases detectadas no IFC/WRL às fases da OF
      if (result.detectedPhases && result.detectedPhases.length > 0) {
        setPhasesList((prev) => {
          const normPrev = prev.map((f) => (/^\d+$/.test(f) ? String(parseInt(f, 10)) : f));
          const normDetected = result.detectedPhases.map((f) => (/^\d+$/.test(f) ? String(parseInt(f, 10)) : f));
          const combined = new Set([...normPrev, ...normDetected]);
          return Array.from(combined).sort((a, b) => {
            const na = Number(a);
            const nb = Number(b);
            return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
          });
        });
      }

      // 2. Upload e armazenamento permanente no banco de dados e nuvem
      setLoadingStep(`Salvando modelo no banco de dados da OF ${selectedOF}...`);
      setLoadingPercent(75);

      const { publicUrl } = await uploadIFCToCloud(
        file,
        selectedOF,
        result.audit,
        (step, percent) => {
          setLoadingStep(step);
          setLoadingPercent(75 + Math.round(percent * 0.25));
        }
      );

      // Atualiza o estado local das OFs com o novo arquivo vinculado
      setOfs((prev) =>
        prev.map((o) =>
          o.of_number === selectedOF
            ? {
                ...o,
                ifc_url: publicUrl,
                ifc_filename: file.name,
                ifc_file_size: file.size,
                ifc_updated_at: new Date().toISOString(),
              }
            : o
        )
      );

      toast({
        title: 'Modelo 3D Gravado no Banco!',
        description: `O arquivo "${file.name}" foi salvo com sucesso e carregará automaticamente ao entrar na OF ${selectedOF}.`,
      });
    } catch (err: any) {
      console.error('Erro ao carregar e salvar Modelo 3D:', err);
      toast({
        variant: 'destructive',
        title: 'Erro no Carregamento',
        description: `Falha: ${err.message || 'Erro desconhecido'}`,
      });
    } finally {
      setIsLoadingModel(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Remover modelo salvo
  const handleRemoveSavedModel = async () => {
    if (!confirm(`Deseja remover o modelo 3D vinculado à OF ${selectedOF}?`)) return;

    try {
      await removeSavedIFCModel(selectedOF);
      setOfs((prev) =>
        prev.map((o) =>
          o.of_number === selectedOF
            ? { ...o, ifc_url: null, ifc_filename: null, ifc_file_size: null, ifc_updated_at: null }
            : o
        )
      );
      setModelData(null);
      setAuditData(null);
      toast({
        title: 'Modelo Removido',
        description: `O modelo vinculado à OF ${selectedOF} foi desvinculado com sucesso.`,
      });
    } catch (err: any) {
      console.error('Erro ao remover modelo:', err);
      toast({
        variant: 'destructive',
        title: 'Erro ao desvincular',
        description: err.message,
      });
    }
  };

  // Métricas dinâmicas refletindo a fase selecionada
  const activeMetrics = useMemo(() => {
    if (selectedPhase === 'all' || !selectedPhase) {
      return {
        totalPecas: totalPecasBD,
        apontadas: totalApontadasBD,
        peso: pesoTotalBD,
        progresso: progressoOF,
        phaseLabel: null,
      };
    }

    const filtered = uniqueItemsList.filter((item) => String(item.fase) === String(selectedPhase));
    let pTotal = 0;
    let pApontadas = 0;
    let pPeso = 0;
    let sumProg = 0;

    filtered.forEach((item) => {
      pTotal += item.totalQtd;
      pApontadas += item.pointedQtd;
      pPeso += (item.pesoTotal || 0);
      const pecaProgress = item.pointedQtd > 0 ? Math.min(item.processOrdem / 5, 1) * (item.pointedQtd / item.totalQtd) : 0;
      sumProg += pecaProgress * item.totalQtd;
    });

    const progPercent = pTotal > 0 ? Math.min(Math.round((sumProg / pTotal) * 100), 100) : 0;

    return {
      totalPecas: pTotal,
      apontadas: pApontadas,
      peso: pPeso,
      progresso: progPercent,
      phaseLabel: `Fase ${selectedPhase}`,
    };
  }, [selectedPhase, totalPecasBD, totalApontadasBD, pesoTotalBD, progressoOF, uniqueItemsList]);

  const currentOFInfo = ofs.find((o) => o.of_number === selectedOF);
  const hasSavedModel = Boolean(currentOFInfo?.ifc_url);

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-var(--hub-banner-height,0px)-4rem)] min-h-[600px] w-full p-4 md:p-6 space-y-4 max-w-[1920px] mx-auto">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-slate-900/90 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-lg dark:shadow-xl">
        {/* Left: Title, OF Selector & Phase Filter */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-xl shadow-lg shadow-cyan-500/10">
              <Box className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                Visualizador 3D Industrial
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-500/40">
                  BIM + Produção
                </span>
              </h1>
              <p className="text-xs text-slate-700 font-bold dark:text-slate-300 dark:font-medium">
                Acompanhamento visual de peças, montagens e apontamentos industriais
              </p>
            </div>
          </div>

          {/* OF Selector Dropdown */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">OF:</span>
            <select
              value={selectedOF}
              onChange={(e) => setSelectedOF(e.target.value)}
              className="bg-transparent text-sm font-extrabold text-cyan-900 dark:text-cyan-300 focus:outline-none cursor-pointer"
            >
              <option value="" disabled className="text-slate-500">Selecione a OF...</option>
              {ofs.map((ofItem) => (
                <option key={ofItem.id} value={ofItem.of_number} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-medium">
                  {ofItem.of_number} {ofItem.descritivo ? `— ${ofItem.descritivo}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Cloud Stored Model Badge */}
          {hasSavedModel && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100/80 dark:bg-emerald-500/10 border border-emerald-300 dark:border-emerald-500/30 rounded-xl text-xs shadow-sm">
              <Cloud className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
              <span
                className="text-emerald-900 dark:text-emerald-300 font-mono font-bold max-w-[170px] truncate"
                title={currentOFInfo?.ifc_filename || 'Modelo 3D Vinculado'}
              >
                {currentOFInfo?.ifc_filename || 'Modelo Salvo'}
              </span>
              <button
                onClick={handleRemoveSavedModel}
                disabled={isLoadingModel}
                className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors ml-1 p-0.5 rounded cursor-pointer"
                title="Desvincular modelo desta OF"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Phase Filter Buttons */}
          {phasesList.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setSelectedPhase('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                  selectedPhase === 'all'
                    ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 font-bold shadow-md shadow-cyan-600/30'
                    : 'text-slate-800 font-medium dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
                      ? 'bg-cyan-600 text-white dark:bg-cyan-500 dark:text-slate-950 font-bold shadow-md shadow-cyan-600/30'
                      : 'text-slate-800 font-medium dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
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
              className="flex items-center gap-2 px-3.5 py-2 bg-emerald-100/70 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-500/30 rounded-xl text-xs font-bold transition-all shadow"
              title="Ver detalhes da auditoria do IFC"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span>Auditoria: {auditData.qualityScore}</span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".ifc,.wrl,.wrz,.gltf,.glb"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            onClick={() => {
              if (!selectedOF) {
                toast({
                  title: 'Selecione uma OF',
                  description: 'Por favor, selecione uma Ordem de Fabricação (OF) antes de carregar o modelo 3D.',
                  variant: 'destructive',
                });
                return;
              }
              fileInputRef.current?.click();
            }}
            disabled={isLoadingModel || !selectedOF}
            title={!selectedOF ? 'Selecione uma OF acima para habilitar o carregamento do modelo 3D' : undefined}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-600/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {isLoadingModel ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{loadingStep || `Carregando (${loadingPercent}%)...`}</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                <span>{hasSavedModel ? 'Substituir Modelo 3D' : 'Carregar Modelo 3D (IFC/WRL)'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Production KPIs Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex items-center justify-between shadow-sm dark:shadow-none">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
              Total de Peças {activeMetrics.phaseLabel ? `(${activeMetrics.phaseLabel})` : ''}
            </span>
            <span className="text-lg font-mono font-extrabold text-slate-900 dark:text-white">
              {activeMetrics.totalPecas} peças
            </span>
          </div>
          <Layers className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex items-center justify-between shadow-sm dark:shadow-none">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
              Apontamentos Realizados {activeMetrics.phaseLabel ? `(${activeMetrics.phaseLabel})` : ''}
            </span>
            <span className="text-lg font-mono font-extrabold text-emerald-700 dark:text-emerald-400">
              {activeMetrics.apontadas} apontadas
            </span>
          </div>
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex items-center justify-between shadow-sm dark:shadow-none">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
              Evolução {activeMetrics.phaseLabel ? `(${activeMetrics.phaseLabel})` : 'da OF'}
            </span>
            <span className="text-lg font-mono font-extrabold text-amber-600 dark:text-amber-400">
              {activeMetrics.progresso}% concluído
            </span>
          </div>
          <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>

        <div className="bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 p-3 rounded-xl flex items-center justify-between shadow-sm dark:shadow-none">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 block">
              Peso {activeMetrics.phaseLabel ? `(${activeMetrics.phaseLabel})` : 'da Estrutura'}
            </span>
            <span className="text-lg font-mono font-extrabold text-cyan-800 dark:text-cyan-300">
              {activeMetrics.peso > 0 ? `${(activeMetrics.peso / 1000).toFixed(1)} ton` : '0.0 ton'}
            </span>
          </div>
          <Weight className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
        </div>
      </div>

      {/* Main 3D Viewport */}
      <div className="relative flex-1 min-h-[480px] w-full bg-slate-100 dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl">
        {isLoadingModel && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-950/90 backdrop-blur-md text-slate-900 dark:text-white space-y-4">
            <div className="p-4 bg-cyan-100 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 rounded-2xl border border-cyan-300 dark:border-cyan-500/40 animate-pulse">
              <Loader2 className="w-10 h-10 animate-spin" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{loadingStep}</h3>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
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
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-6 text-center text-slate-700 font-bold dark:text-slate-300 dark:font-medium space-y-4">
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 shadow-xl dark:shadow-2xl text-cyan-500 dark:text-cyan-400">
              <Box className="w-16 h-16 stroke-[1.2]" />
            </div>
            <div className="space-y-1 max-w-md">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Nenhum modelo 3D carregado para {selectedOF}</h2>
              <p className="text-xs text-slate-700 font-bold dark:text-slate-300 dark:font-medium leading-relaxed">
                Clique no botão <span className="text-cyan-600 dark:text-cyan-300 font-semibold">"Carregar Modelo 3D (IFC/WRL)"</span> acima para importar o arquivo de fabricação desta obra. Ele será gravado no banco de dados e recarregado automaticamente nas próximas visitas.
              </p>
            </div>
          </div>
        )}

        <ModelViewer3D
          modelData={modelData}
          productionData={productionMap}
          selectedOF={selectedOF}
          selectedPhase={selectedPhase}
          initialRotation={ofs.find((o) => o.of_number === selectedOF)?.model_3d_rotation}
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
