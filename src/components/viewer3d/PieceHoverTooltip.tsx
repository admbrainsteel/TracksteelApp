import React from 'react';
import { PieceInfo } from '@/lib/ifc/ifcLoaderService';
import { Box, Layers, CheckCircle2, Clock } from 'lucide-react';

interface PieceHoverTooltipProps {
  piece: PieceInfo | null;
  position: { x: number; y: number } | null;
  productionInfo?: {
    pointedQty?: number;
    totalQty?: number;
    currentStage?: string;
    stageColor?: string;
  };
}

export const PieceHoverTooltip: React.FC<PieceHoverTooltipProps> = ({
  piece,
  position,
  productionInfo,
}) => {
  if (!piece || !position) return null;

  return (
    <div
      className="fixed pointer-events-none z-40 p-4 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 text-slate-100 min-w-[260px] animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: `${position.x + 16}px`,
        top: `${position.y + 16}px`,
        maxWidth: '320px',
      }}
    >
      {/* Header Badge */}
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block">
              Marca Principal
            </span>
            <span className="text-base font-extrabold text-cyan-300 font-mono tracking-tight">
              {piece.pieceMark || 'Sem Marca'}
            </span>
          </div>
        </div>
        {piece.phase && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-slate-800 text-slate-300 border border-slate-700">
            Fase {piece.phase}
          </span>
        )}
      </div>

      {/* Details Grid */}
      <div className="space-y-1.5 text-xs">
        {piece.section && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">Perfil / Bitola:</span>
            <span className="font-semibold text-white font-mono bg-slate-950/60 px-2 py-0.5 rounded border border-slate-800">
              {piece.section}
            </span>
          </div>
        )}

        {piece.childrenIDs && piece.childrenIDs.length > 0 && (
          <div className="flex items-center justify-between text-slate-300">
            <span className="text-slate-400">Componentes:</span>
            <span className="font-semibold text-slate-200">
              {piece.childrenIDs.length} peças soldadas
            </span>
          </div>
        )}

        {/* Production Apontamentos */}
        {productionInfo && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                Apontamento:
              </span>
              <span className="font-bold text-emerald-400 font-mono">
                {productionInfo.pointedQty ?? 0} de {productionInfo.totalQty ?? 1} peças
              </span>
            </div>

            {productionInfo.currentStage && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-400" />
                  Etapa Atual:
                </span>
                <span
                  className="px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                  style={{
                    backgroundColor: `${productionInfo.stageColor || '#10b981'}20`,
                    color: productionInfo.stageColor || '#10b981',
                    border: `1px solid ${productionInfo.stageColor || '#10b981'}40`,
                  }}
                >
                  {productionInfo.currentStage}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
