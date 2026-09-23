import React, { useState, useEffect, useCallback } from 'react';
import { OFAtiva } from '@/hooks/useOFsAtivas';
import { supabase } from '@/integrations/supabase/client';
import { loadAndAuditIFC, LoadedIFCResult } from '@/lib/ifc/ifcLoaderService';
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
  const [modelData, setModelData] = useState<LoadedIFCResult | null>(null);
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
          const marca = p.marca ? String(p.marca).trim().toUpperCase() : '';
          const fase = p.etapa_fase ? String(p.etapa_fase).trim() : '';
          if (fase) phasesSet.add(fase);

          if (marca) {
            const existing = prodMap.get(marca);
            if (!existing) {
              prodMap.set(marca, {
                marca,
                etapa_fase: fase,
                totalQtd: Number(p.quantidade || 1),
                pointedQtd: 0,
                currentProcessName: 'Pendente',
                processColor: '#94a3b8',
                processOrdem: 0,
              });
            } else {
              existing.totalQtd += Number(p.quantidade || 0);
            }
          }
        });
      }

      if (apontamentosRes.data) {
        apontamentosRes.data.forEach((ap: any) => {
          const marca = ap.peca?.marca ? String(ap.peca.marca).trim().toUpperCase() : '';
          if (marca && prodMap.has(marca)) {
            const item = prodMap.get(marca)!;
            const q = Number(ap.quantidade_produzida || 0);
            const procNome = ap.processo?.nome || 'Produção';
            const procOrdem = Number(ap.processo?.ordem || 0);

            if (q > 0 && procOrdem >= (item.processOrdem || 0)) {
              item.pointedQtd = Math.max(item.pointedQtd, q);
              item.currentProcessName = procNome;
              item.processColor = ap.processo?.cor || '#10b981';
              item.processOrdem = procOrdem;
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

      const result = await loadAndAuditIFC(buffer, (pct, msg) => {
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
