import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface ViewCubeProps {
  onSelectView: (view: 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'iso') => void;
}

export const ViewCube: React.FC<ViewCubeProps> = ({ onSelectView }) => {
  const [hoveredFace, setHoveredFace] = useState<string | null>(null);

  return (
    <div className="relative select-none flex flex-col items-center">
      {/* Container Principal translúcido idêntico ao SteelXR */}
      <div className="relative w-32 h-32 p-2 rounded-2xl bg-slate-950/85 backdrop-blur-xl border border-cyan-500/40 shadow-2xl shadow-cyan-950/60 flex items-center justify-center overflow-hidden">
        {/* Glow de Fundo */}
        <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 via-transparent to-blue-500/10 pointer-events-none" />

        {/* Viewport 3D Isométrica do Cubo */}
        <div
          className="relative w-20 h-20"
          style={{
            perspective: '600px',
            perspectiveOrigin: '50% 50%',
          }}
        >
          {/* Cubo 3D Rotacionado em Vista Isométrica Natural */}
          <div
            className="w-full h-full relative transition-transform duration-300 ease-out"
            style={{
              transformStyle: 'preserve-3d',
              transform: 'rotateX(-28deg) rotateY(42deg)',
            }}
          >
            {/* FACE TOPO */}
            <button
              onClick={() => onSelectView('top')}
              onMouseEnter={() => setHoveredFace('TOPO')}
              onMouseLeave={() => setHoveredFace(null)}
              className="absolute inset-0 flex items-center justify-center font-extrabold text-xs tracking-wider transition-all duration-200 cursor-pointer"
              style={{
                transform: 'rotateX(90deg) translateZ(40px)',
                backgroundColor: hoveredFace === 'TOPO' ? '#0891b2' : '#0f172a',
                color: hoveredFace === 'TOPO' ? '#ffffff' : '#a5f3fc',
                border: '2px solid #22d3ee',
                boxShadow:
                  hoveredFace === 'TOPO'
                    ? 'inset 0 0 15px rgba(34, 211, 238, 0.9), 0 0 15px #06b6d4'
                    : 'inset 0 0 10px rgba(34, 211, 238, 0.35)',
                textShadow: '0 0 8px #22d3ee',
              }}
              title="Vista Superior (Planta)"
            >
              TOPO
            </button>

            {/* FACE FRENTE */}
            <button
              onClick={() => onSelectView('front')}
              onMouseEnter={() => setHoveredFace('FRENTE')}
              onMouseLeave={() => setHoveredFace(null)}
              className="absolute inset-0 flex items-center justify-center font-extrabold text-xs tracking-wider transition-all duration-200 cursor-pointer"
              style={{
                transform: 'translateZ(40px)',
                backgroundColor: hoveredFace === 'FRENTE' ? '#0891b2' : '#0f172a',
                color: hoveredFace === 'FRENTE' ? '#ffffff' : '#a5f3fc',
                border: '2px solid #22d3ee',
                boxShadow:
                  hoveredFace === 'FRENTE'
                    ? 'inset 0 0 15px rgba(34, 211, 238, 0.9), 0 0 15px #06b6d4'
                    : 'inset 0 0 10px rgba(34, 211, 238, 0.35)',
                textShadow: '0 0 8px #22d3ee',
              }}
              title="Vista Frontal"
            >
              FRENTE
            </button>

            {/* FACE DIREITA (DIR) */}
            <button
              onClick={() => onSelectView('right')}
              onMouseEnter={() => setHoveredFace('DIR')}
              onMouseLeave={() => setHoveredFace(null)}
              className="absolute inset-0 flex items-center justify-center font-extrabold text-xs tracking-wider transition-all duration-200 cursor-pointer"
              style={{
                transform: 'rotateY(90deg) translateZ(40px)',
                backgroundColor: hoveredFace === 'DIR' ? '#0891b2' : '#0f172a',
                color: hoveredFace === 'DIR' ? '#ffffff' : '#a5f3fc',
                border: '2px solid #22d3ee',
                boxShadow:
                  hoveredFace === 'DIR'
                    ? 'inset 0 0 15px rgba(34, 211, 238, 0.9), 0 0 15px #06b6d4'
                    : 'inset 0 0 10px rgba(34, 211, 238, 0.35)',
                textShadow: '0 0 8px #22d3ee',
              }}
              title="Vista Direita"
            >
              DIR
            </button>

            {/* FACE ESQUERDA (ESQ) */}
            <button
              onClick={() => onSelectView('left')}
              onMouseEnter={() => setHoveredFace('ESQ')}
              onMouseLeave={() => setHoveredFace(null)}
              className="absolute inset-0 flex items-center justify-center font-extrabold text-xs tracking-wider transition-all duration-200 cursor-pointer"
              style={{
                transform: 'rotateY(-90deg) translateZ(40px)',
                backgroundColor: hoveredFace === 'ESQ' ? '#0891b2' : '#0f172a',
                color: hoveredFace === 'ESQ' ? '#ffffff' : '#a5f3fc',
                border: '2px solid #22d3ee',
                boxShadow:
                  hoveredFace === 'ESQ'
                    ? 'inset 0 0 15px rgba(34, 211, 238, 0.9), 0 0 15px #06b6d4'
                    : 'inset 0 0 10px rgba(34, 211, 238, 0.35)',
                textShadow: '0 0 8px #22d3ee',
              }}
              title="Vista Esquerda"
            >
              ESQ
            </button>

            {/* FACE ATRÁS */}
            <button
              onClick={() => onSelectView('back')}
              onMouseEnter={() => setHoveredFace('ATRÁS')}
              onMouseLeave={() => setHoveredFace(null)}
              className="absolute inset-0 flex items-center justify-center font-extrabold text-xs tracking-wider transition-all duration-200 cursor-pointer"
              style={{
                transform: 'rotateY(180deg) translateZ(40px)',
                backgroundColor: hoveredFace === 'ATRÁS' ? '#0891b2' : '#0f172a',
                color: hoveredFace === 'ATRÁS' ? '#ffffff' : '#a5f3fc',
                border: '2px solid #22d3ee',
                boxShadow:
                  hoveredFace === 'ATRÁS'
                    ? 'inset 0 0 15px rgba(34, 211, 238, 0.9), 0 0 15px #06b6d4'
                    : 'inset 0 0 10px rgba(34, 211, 238, 0.35)',
                textShadow: '0 0 8px #22d3ee',
              }}
              title="Vista Posterior (Atrás)"
            >
              ATRÁS
            </button>

            {/* FACE BASE (INFERIOR) */}
            <button
              onClick={() => onSelectView('bottom')}
              onMouseEnter={() => setHoveredFace('BASE')}
              onMouseLeave={() => setHoveredFace(null)}
              className="absolute inset-0 flex items-center justify-center font-extrabold text-xs tracking-wider transition-all duration-200 cursor-pointer"
              style={{
                transform: 'rotateX(-90deg) translateZ(40px)',
                backgroundColor: hoveredFace === 'BASE' ? '#0891b2' : '#0f172a',
                color: hoveredFace === 'BASE' ? '#ffffff' : '#a5f3fc',
                border: '2px solid #22d3ee',
                boxShadow:
                  hoveredFace === 'BASE'
                    ? 'inset 0 0 15px rgba(34, 211, 238, 0.9), 0 0 15px #06b6d4'
                    : 'inset 0 0 10px rgba(34, 211, 238, 0.35)',
                textShadow: '0 0 8px #22d3ee',
              }}
              title="Vista Inferior (Base)"
            >
              BASE
            </button>
          </div>
        </div>

        {/* Botão de Vista Isométrica Padrão (ISO) */}
        <button
          onClick={() => onSelectView('iso')}
          className="absolute bottom-1.5 right-1.5 p-1 rounded-lg bg-slate-900/90 hover:bg-cyan-600 text-cyan-300 hover:text-white border border-cyan-500/30 transition-all text-[10px] font-mono font-bold flex items-center gap-1 shadow cursor-pointer"
          title="Restaurar Vista Isométrica 3D"
        >
          <RotateCcw className="w-2.5 h-2.5" />
          <span>ISO</span>
        </button>
      </div>

      {/* Rótulo Inferior Elegante */}
      <span className="text-[9px] font-mono font-bold tracking-widest uppercase text-cyan-700 dark:text-cyan-400 mt-1">
        Cubo de Orientação
      </span>
    </div>
  );
};
