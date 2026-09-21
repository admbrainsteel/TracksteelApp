import React, { useState } from 'react';
import {
  Eye,
  Grid as GridIcon,
  Maximize2,
  Box,
  Layers,
  Compass,
  Palette,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Focus,
  Sliders
} from 'lucide-react';

interface Viewer3DSidebarProps {
  opacity: number;
  onOpacityChange: (val: number) => void;
  showGrid: boolean;
  onToggleGrid: () => void;
  isOrthographic: boolean;
  onToggleCamera: () => void;
  isWireframe: boolean;
  onToggleWireframe: () => void;
  colorMode: 'description' | 'production';
  onColorModeChange: (mode: 'description' | 'production') => void;
  onFitView: () => void;
  onToggleFullscreen: () => void;
}

export const Viewer3DSidebar: React.FC<Viewer3DSidebarProps> = ({
  opacity,
  onOpacityChange,
  showGrid,
  onToggleGrid,
  isOrthographic,
  onToggleCamera,
  isWireframe,
  onToggleWireframe,
  colorMode,
  onColorModeChange,
  onFitView,
  onToggleFullscreen,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(true);

  return (
    <div className="absolute top-4 left-4 z-30 flex items-start select-none">
      {/* Container Principal da Barra Lateral */}
      <div
        className={`transition-all duration-300 ease-in-out flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden ${
          isOpen ? 'w-60 max-h-[calc(100vh-16rem)]' : 'w-0 border-0 opacity-0 pointer-events-none'
        }`}
      >
        {/* Cabeçalho do Sub-Menu */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-100/90 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Controles 3D
            </span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 font-bold">
            SteelXR
          </span>
        </div>

        {/* Corpo com Rolagem Suave */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
          {/* Grupo 1: Modo de Cores / Produção */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Exibição de Cores
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-950/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => onColorModeChange('production')}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  colorMode === 'production'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Produção</span>
              </button>
              <button
                onClick={() => onColorModeChange('description')}
                className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  colorMode === 'description'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>Padrão</span>
              </button>
            </div>
          </div>

          {/* Grupo 2: Visibilidade & Grade */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <GridIcon className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Ambiente & Estrutura
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {/* Toggle Grid */}
              <button
                onClick={onToggleGrid}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  showGrid
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <GridIcon className="w-3.5 h-3.5" />
                <span>Grid: {showGrid ? 'LIGADO' : 'DESL'}</span>
              </button>

              {/* Sólido / Aramado */}
              <button
                onClick={onToggleWireframe}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isWireframe
                    ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-800 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                {isWireframe ? <Layers className="w-3.5 h-3.5 text-cyan-600" /> : <Box className="w-3.5 h-3.5" />}
                <span>{isWireframe ? 'Aramado' : 'Sólido'}</span>
              </button>
            </div>
          </div>

          {/* Grupo 3: Câmera & Projeção */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              Câmera & Visualização
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {/* Câmera Toggle */}
              <button
                onClick={onToggleCamera}
                className={`flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  isOrthographic
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 shadow-sm'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <Box className="w-3.5 h-3.5" />
                <span>{isOrthographic ? 'Ortogonal' : 'Perspectiva'}</span>
              </button>

              {/* Enquadrar / Reset View */}
              <button
                onClick={onFitView}
                className="flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                title="Enquadrar / Centralizar Estrutura"
              >
                <Focus className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>Enquadrar</span>
              </button>
            </div>
          </div>

          {/* Grupo 4: Opacidade da Estrutura */}
          <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950/60 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                Opacidade
              </span>
              <span className="font-mono font-bold text-amber-700 dark:text-amber-400">{opacity}%</span>
            </div>
            <input
              type="range"
              min={10}
              max={100}
              value={opacity}
              onChange={(e) => onOpacityChange(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <button onClick={() => onOpacityChange(25)} className="hover:text-amber-600">25%</button>
              <button onClick={() => onOpacityChange(50)} className="hover:text-amber-600">50%</button>
              <button onClick={() => onOpacityChange(75)} className="hover:text-amber-600">75%</button>
              <button onClick={() => onOpacityChange(100)} className="hover:text-amber-600">100%</button>
            </div>
          </div>

          {/* Botão Tela Cheia */}
          <button
            onClick={onToggleFullscreen}
            className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-cyan-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            <Maximize2 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>Expandir Tela Cheia</span>
          </button>
        </div>
      </div>

      {/* Botão de Abrir / Fechar Sub-Menu Lateral */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ml-2 p-2 bg-white/95 dark:bg-slate-900/95 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg transition-all"
        title={isOpen ? 'Recolher Menu Lateral' : 'Expandir Menu Lateral 3D'}
      >
        {isOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
    </div>
  );
};
