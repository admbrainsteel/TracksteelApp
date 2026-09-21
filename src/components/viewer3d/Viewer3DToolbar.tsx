import React from 'react';
import {
  Eye,
  Grid as GridIcon,
  Scissors,
  Maximize2,
  Box,
  Layers,
  Compass,
  Footprints,
  Ruler,
  Palette,
  CheckCircle2
} from 'lucide-react';

interface Viewer3DToolbarProps {
  opacity: number;
  onOpacityChange: (val: number) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  isOrthographic: boolean;
  onToggleCamera: () => void;
  isWireframe: boolean;
  onToggleWireframe: () => void;
  navMode: 'orbit' | 'walk';
  onNavModeChange: (mode: 'orbit' | 'walk') => void;
  colorMode: 'description' | 'production';
  onColorModeChange: (mode: 'description' | 'production') => void;
  onFitView: () => void;
  onToggleFullscreen: () => void;
  onToggleSectionPlanes?: () => void;
  onToggleMeasure?: () => void;
  hasSectionPlanes?: boolean;
  isMeasuring?: boolean;
}

export const Viewer3DToolbar: React.FC<Viewer3DToolbarProps> = ({
  opacity,
  onOpacityChange,
  showGrid,
  onToggleGrid,
  isOrthographic,
  onToggleCamera,
  isWireframe,
  onToggleWireframe,
  navMode,
  onNavModeChange,
  colorMode,
  onColorModeChange,
  onFitView,
  onToggleFullscreen,
  onToggleSectionPlanes,
  onToggleMeasure,
  hasSectionPlanes,
  isMeasuring,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200 dark:border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl dark:shadow-2xl text-slate-700 dark:text-slate-200">
      {/* Left: Opacity Slider */}
      <div className="flex items-center gap-3 bg-slate-50/80 dark:bg-slate-950/60 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800">
        <Eye className="w-4 h-4 text-amber-400" />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">Opacidade</span>
        <input
          type="range"
          min={10}
          max={100}
          value={opacity}
          onChange={(e) => onOpacityChange(Number(e.target.value))}
          className="w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
        />
        <span className="text-xs font-mono font-bold text-amber-400 min-w-[32px]">
          {opacity}%
        </span>
      </div>

      {/* Middle: Control Buttons */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-50/80 dark:bg-slate-950/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
        {/* Grid */}
        <button
          onClick={onToggleGrid}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            showGrid
              ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
          title="Alternar Grade de Piso"
        >
          <GridIcon className="w-3.5 h-3.5" />
          <span>Grid</span>
        </button>

        {/* Section / Cortes */}
        <button
          onClick={onToggleSectionPlanes}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            hasSectionPlanes
              ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border border-rose-300 dark:border-rose-500/40 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
          title="Planos de Corte Estrutural"
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Cortes</span>
        </button>

        {/* Escala 1:1 / Fit */}
        <button
          onClick={onFitView}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-all"
          title="Enquadrar Estrutura Completa"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Escala 1:1</span>
        </button>

        {/* Sólido / Wireframe */}
        <button
          onClick={onToggleWireframe}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            !isWireframe
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-300 dark:border-blue-500/40'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
          title="Modo Sólido ou Aramado"
        >
          {isWireframe ? <Layers className="w-3.5 h-3.5" /> : <Box className="w-3.5 h-3.5" />}
          <span>{isWireframe ? 'Aramado' : 'Sólido'}</span>
        </button>

        {/* Ortogonal / Perspectiva */}
        <button
          onClick={onToggleCamera}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isOrthographic
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/40'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
          title="Alternar Câmera Ortogonal ou Perspectiva"
        >
          <Box className="w-3.5 h-3.5" />
          <span>{isOrthographic ? 'Ortogonal' : 'Perspectiva'}</span>
        </button>

        {/* Posicionar (Orbit) */}
        <button
          onClick={() => onNavModeChange('orbit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            navMode === 'orbit'
              ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
          title="Modo Orbitar / Rotacionar"
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Posicionar</span>
        </button>

        {/* Caminhar */}
        <button
          onClick={() => onNavModeChange('walk')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            navMode === 'walk'
              ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300 border border-cyan-300 dark:border-cyan-500/40'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
          title="Modo Primeira Pessoa (Caminhar)"
        >
          <Footprints className="w-3.5 h-3.5" />
          <span>Caminhar</span>
        </button>

        {/* Medir */}
        <button
          onClick={onToggleMeasure}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isMeasuring
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
          }`}
          title="Régua de Medição"
        >
          <Ruler className="w-3.5 h-3.5" />
          <span>Medir</span>
        </button>
      </div>

      {/* Right: Color Mode & Fullscreen */}
      <div className="flex items-center gap-2">
        {/* Mode Selector */}
        <div className="flex items-center bg-slate-50/80 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => onColorModeChange('description')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              colorMode === 'description'
                ? 'bg-amber-500 text-white dark:text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Cores por Família/Perfil"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Descrição</span>
          </button>
          <button
            onClick={() => onColorModeChange('production')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              colorMode === 'production'
                ? 'bg-emerald-500 text-white dark:text-slate-950 font-bold shadow-lg shadow-emerald-500/20'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
            title="Cores por Status de Apontamento"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Produção</span>
          </button>
        </div>

        {/* Fullscreen Button */}
        <button
          onClick={onToggleFullscreen}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-50/80 dark:bg-slate-950/60 hover:bg-cyan-100 dark:hover:bg-cyan-500 hover:text-cyan-700 dark:hover:text-slate-950 text-cyan-400 border border-slate-200 dark:border-slate-800 hover:border-cyan-400 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all"
          title="Tela Cheia"
        >
          <Maximize2 className="w-3.5 h-3.5" />
          <span>Tela Cheia</span>
        </button>
      </div>
    </div>
  );
};
