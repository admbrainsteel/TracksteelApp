import React, { useState, useEffect, useCallback } from 'react';
import { OFAtiva } from '@/hooks/useOFsAtivas';
import { supabase } from '@/integrations/supabase/client';
import { loadAndAuditModel3D, LoadedModel3DResult } from '@/lib/3d/modelLoaderService';
import { fetchSavedIFCModel } from '@/lib/ifc/ifcStorageService';
import { SmartModelViewer3D, ProductionPieceStatus } from '@/components/viewer3d/SmartModelViewer3D';
import { smartAudio } from '@/utils/smartAudio';
import { Box, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SmartViewer3DFlowProps {
  obra: OFAtiva;
  onVoltarHub: () => void;
}

export const SmartViewer3DFlow: React.FC<SmartViewer3DFlowProps> = ({
  obra,
  onVoltarHub,
}) => {
  const [modelData, setModelData] = useState<LoadedModel3DResult | null>(null);
  const [phasesList, setPhasesList] = useState<string[]>([]);
  const [productionMap, setProductionMap] = useState<Map<string, ProductionPieceStatus>>(new Map());

  // Loading States
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadingStep, setLoadingStep] = useState<string>('Buscando modelo da obra...');
  const [loadingPercent, setLoadingPercent] = useState<number>(10);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Carrega dados de produção e modelo IFC
  const carregarModeloEProducao = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setLoadingStep('Buscando modelo IFC vinculado à obra...');
    setLoadingPercent(15);

    try {
      // 1.1. Buscar registro da OF para obter URL do IFC
      const { data: ofData, error: ofError } = await supabase
        .from('ordens_fabricacao' as any)
        .select('id, num_of, descritivo, ifc_url, ifc_filename')
        .eq('num_of', obra.of_number)
        .maybeSingle();

      if (ofError) throw ofError;

      if (!ofData || !(ofData as any).ifc_url) {
        setIsLoading(false);
        setErrorMessage('Nenhum modelo IFC 3D cadastrado na nuvem para esta OF.');
        return;
      }

      const ifcUrl = (ofData as any).ifc_url;
      const ifcFilename = (ofData as any).ifc_filename;

      // 1.2. Buscar Peças e Apontamentos em paralelo
      setLoadingStep('Carregando dados das peças e apontamentos...');
      setLoadingPercent(30);

      const [pecasRes, apontamentosRes] = await Promise.all([
        supabase
          .from('pecas' as any)
          .select('id, of_number, etapa_fase, marca, descricao, quantidade, perfil_principal')
          .eq('of_number', obra.of_number),
        supabase
          .from('apontamentos_producao' as any)
          .select(`
            id, of_number, peca_id, quantidade_produzida,
            peca:pecas!apontamentos_producao_peca_id_fkey(marca, etapa_fase),
            processo:processos_fabricacao!apontamentos_producao_processo_id_fkey(nome, cor, ordem)
          `)
          .eq('of_number', obra.of_number),
      ]);

      // Mapeamento de Produção
      const prodMap = new Map<string, ProductionPieceStatus>();
      const phasesSet = new Set<string>();

      if (pecasRes.data) {
        pecasRes.data.forEach((p: any) => {
          const marcaStr = String(p.marca || '').trim();
          const fase = String(p.etapa_fase || '').trim();
          if (fase) phasesSet.add(fase);

          const item: ProductionPieceStatus = {
            pecaId: p.id,
            marca: marcaStr,
            fase,
            etapa_fase: fase,
            totalQtd: Number(p.quantidade || 1),
            pointedQtd: 0,
            currentProcessName: 'Pendente',
            processColor: '#64748b',
            processOrdem: 0,
            processesCompleted: [],
            processPointedQtds: {},
          };

          // Indexações para amarração gráfica flexível idêntica ao modo completo
          prodMap.set(marcaStr, item);
          prodMap.set(marcaStr.toUpperCase(), item);
          prodMap.set(`${fase}-${marcaStr}`, item);
          prodMap.set(`${fase}-${marcaStr}`.toUpperCase(), item);
          prodMap.set(`${obra.of_number}-${fase}-${marcaStr}`, item);
          prodMap.set(`${obra.of_number}-${fase}-${marcaStr}`.toUpperCase(), item);
          prodMap.set(`${obra.of_number}-${marcaStr}`, item);
          prodMap.set(`${obra.of_number}-${marcaStr}`.toUpperCase(), item);

          if (p.descricao) {
            prodMap.set(`DESC:${String(p.descricao).trim().toUpperCase()}`, item);
          }
          if (p.perfil_principal) {
            prodMap.set(`PERFIL:${String(p.perfil_principal).trim().toUpperCase()}`, item);
          }
        });
      }

      if (apontamentosRes.data) {
        const PROCESS_COLORS: Record<string, string> = {
          'Detalhamento': '#3b82f6',
          'Corte': '#3b82f6',
          'Solda': '#f97316',
          'Pintura': '#10b981',
          'Pintura/Galv': '#10b981',
          'Expedicao': '#06b6d4',
          'Expedição': '#06b6d4',
          'Montagem': '#8b5cf6',
          'Concluido': '#22c55e',
        };

        const sortedApontamentos = [...apontamentosRes.data].sort(
          (a: any, b: any) => (a.processo?.ordem || 0) - (b.processo?.ordem || 0)
        );

        sortedApontamentos.forEach((ap: any) => {
          const marca = ap.peca?.marca ? String(ap.peca.marca).trim() : '';
          const fase = ap.peca?.etapa_fase ? String(ap.peca.etapa_fase).trim() : '';
          if (marca) {
            const existing =
              prodMap.get(`${obra.of_number}-${fase}-${marca}`) ||
              prodMap.get(`${fase}-${marca}`) ||
              prodMap.get(marca);

            if (existing) {
              const qty = Number(ap.quantidade_produzida || 0);
              const procRaw = String(ap.processo?.nome || '').trim();
              const procNorm = procRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

              const isDetalhamento = procNorm.includes('detalh');

              if (qty > 0) {
                if (!existing.processPointedQtds) existing.processPointedQtds = {};
                if (!existing.processesCompleted) existing.processesCompleted = [];

                existing.processPointedQtds[procNorm] = (existing.processPointedQtds[procNorm] || 0) + qty;
                if (!existing.processesCompleted.includes(procNorm)) {
                  existing.processesCompleted.push(procNorm);
                }

                if (!isDetalhamento) {
                  existing.pointedQtd = Math.max(existing.pointedQtd, qty);
                  existing.currentProcessName = procRaw || existing.currentProcessName;
                  existing.processColor = ap.processo?.cor || PROCESS_COLORS[procRaw] || '#10b981';
                  existing.processOrdem = Math.max(existing.processOrdem || 0, Number(ap.processo?.ordem || 0));
                } else {
                  existing.hasDetalhamento = true;
                }
              }
            }
          }
        });
      }

      setProductionMap(prodMap);

      // 1.3. Baixar IFC da nuvem ou cache IndexedDB
      setLoadingStep('Baixando arquivo 3D de alta performance...');
      setLoadingPercent(50);

      const buffer = await fetchSavedIFCModel(obra.of_number, ifcUrl, (pct, msg) => {
        setLoadingPercent(30 + Math.round(pct * 0.35));
        setLoadingStep(msg);
      });

      // 1.4. Decodificar Entidades IFC e Gerar Geometrias Three.js
      setLoadingStep('Decodificando montagens e geometrias do modelo...');
      setLoadingPercent(68);

      const result = await loadAndAuditModel3D(buffer, ifcFilename || undefined, (pct, msg) => {
        setLoadingPercent(68 + Math.round(pct * 0.32));
        setLoadingStep(msg);
      });

      // Mescla fases encontradas no IFC
      if (result.detectedPhases && result.detectedPhases.length > 0) {
        result.detectedPhases.forEach((f) => phasesSet.add(f));
      }

      const sortedPhases = Array.from(phasesSet).sort((a, b) => {
        const na = Number(a);
        const nb = Number(b);
        return !isNaN(na) && !isNaN(nb) ? na - nb : a.localeCompare(b);
      });

      setPhasesList(sortedPhases);
      setModelData(result);
      setLoadingPercent(100);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Erro ao carregar modelo no modo Smart:', err);
      setIsLoading(false);
      setErrorMessage(err.message || 'Falha ao processar o modelo 3D desta obra.');
    }
  }, [obra.of_number]);

  useEffect(() => {
    carregarModeloEProducao();
  }, [carregarModeloEProducao]);

  // Se estiver carregando, exibe progresso elegante
  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 min-h-[500px]">
        <div className="p-4 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl mb-6">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
        </div>
        <div className="text-center max-w-sm w-full space-y-3">
          <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400">
            OF {obra.of_number} — Visualizador 3D
          </span>
          <div className="text-sm font-bold text-slate-200">{loadingStep}</div>
          <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-slate-700">
            <div
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full transition-all duration-300 rounded-full"
              style={{ width: `${loadingPercent}%` }}
            />
          </div>
          <div className="text-xs font-mono text-cyan-400 font-bold">{loadingPercent}%</div>
        </div>
      </div>
    );
  }

  // Se houver erro ou a OF não tiver IFC
  if (errorMessage || !modelData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-950 text-slate-100 min-h-[500px]">
        <div className="p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl mb-4 text-amber-400">
          <AlertCircle className="w-12 h-12" />
        </div>
        <h2 className="text-base font-bold text-slate-100 text-center mb-1">
          Modelo 3D Indisponível
        </h2>
        <p className="text-xs text-slate-400 text-center max-w-sm leading-relaxed mb-6">
          {errorMessage || `A OF ${obra.of_number} ainda não possui arquivo IFC cadastrado.`}
        </p>
        <Button
          onClick={() => {
            smartAudio.playClick();
            onVoltarHub();
          }}
          className="h-11 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 font-bold text-xs gap-2 active:scale-95 transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          <span>Voltar ao Menu</span>
        </Button>
      </div>
    );
  }

  // Renderiza o Visualizador 3D Touch-First em Tela Cheia
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950">
      <SmartModelViewer3D
        modelData={modelData}
        productionData={productionMap}
        selectedOF={obra.of_number}
        cliente={obra.cliente}
        phasesList={phasesList}
        onVoltar={onVoltarHub}
      />
    </div>
  );
};
