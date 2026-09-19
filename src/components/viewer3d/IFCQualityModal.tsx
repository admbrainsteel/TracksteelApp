import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, Layers, Cpu, FileCode2, X, ArrowRight } from 'lucide-react';
import { IFCQualityAudit } from '@/lib/ifc/ifcLoaderService';

interface IFCQualityModalProps {
  audit: IFCQualityAudit | null;
  isOpen: boolean;
  onClose: () => void;
}

export const IFCQualityModal: React.FC<IFCQualityModalProps> = ({ audit, isOpen, onClose }) => {
  if (!isOpen || !audit) return null;

  const isExcellent = audit.qualityScore === 'EXCELENTE';
  const isGood = audit.qualityScore === 'BOM';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Header Banner */}
        <div className={`p-6 border-b ${
          isExcellent
            ? 'bg-emerald-950/40 border-emerald-500/30'
            : isGood
            ? 'bg-amber-950/40 border-amber-500/30'
            : 'bg-rose-950/40 border-rose-500/30'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${
                isExcellent
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : isGood
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
              }`}>
                {isExcellent ? (
                  <ShieldCheck className="w-7 h-7" />
                ) : isGood ? (
                  <CheckCircle2 className="w-7 h-7" />
                ) : (
                  <AlertTriangle className="w-7 h-7" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h2 className="text-xl font-bold text-white tracking-tight">
                    Auditoria de Qualidade do IFC
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                    isExcellent
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : isGood
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    Score: {audit.qualityScore}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1">{audit.qualityMessage}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Padrão / View
              </span>
              <span className="text-sm font-bold text-cyan-400 mt-1 block truncate">
                {audit.viewDefinition}
              </span>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Montagens (Assemblies)
              </span>
              <span className="text-lg font-mono font-extrabold text-white mt-1 block">
                {audit.totalAssemblies}
              </span>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Marcas Mapeadas
              </span>
              <span className="text-lg font-mono font-extrabold text-emerald-400 mt-1 block">
                {audit.uniqueMarksFound}
              </span>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block">
                Sólidos Estruturais
              </span>
              <span className="text-lg font-mono font-extrabold text-amber-400 mt-1 block">
                {audit.totalStructuralElements}
              </span>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="bg-slate-950/60 rounded-xl border border-slate-800 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Detalhamento de Elementos no Modelo
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80">
                <span className="text-slate-400">Vigas/Terças:</span>{' '}
                <span className="font-bold text-white">{audit.totalBeams}</span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80">
                <span className="text-slate-400">Pilares:</span>{' '}
                <span className="font-bold text-white">{audit.totalColumns}</span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80">
                <span className="text-slate-400">Chapas/Plates:</span>{' '}
                <span className="font-bold text-white">{audit.totalPlates}</span>
              </div>
              <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80">
                <span className="text-slate-400">Fixadores/Soldas:</span>{' '}
                <span className="font-bold text-white">{audit.totalFasteners}</span>
              </div>
            </div>
          </div>

          {/* Recommendation Box if not EM.11 */}
          {audit.recommendation && (
            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200/90 leading-relaxed flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-amber-300 block mb-1">
                  Recomendação de Engenharia:
                </span>
                {audit.recommendation}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition-all"
          >
            <span>Prosseguir para o Visualizador 3D</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
