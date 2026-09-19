import React from 'react';

interface ViewCubeProps {
  onSelectView: (view: 'top' | 'bottom' | 'front' | 'back' | 'left' | 'right' | 'iso') => void;
}

export const ViewCube: React.FC<ViewCubeProps> = ({ onSelectView }) => {
  return (
    <div className="relative w-28 h-28 select-none">
      <div className="w-full h-full flex items-center justify-center p-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-cyan-500/30 shadow-2xl shadow-cyan-950/40">
        <div className="relative w-20 h-20 perspective-[600px] flex items-center justify-center">
          {/* Central Cube Simulation with Interactive Buttons */}
          <div className="grid grid-cols-3 grid-rows-3 gap-1 w-full h-full text-[10px] font-bold tracking-wider">
            <button
              onClick={() => onSelectView('top')}
              className="col-span-3 py-1 bg-cyan-950/70 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 rounded border border-cyan-500/40 transition-all flex items-center justify-center shadow"
              title="Vista Superior (Planta)"
            >
              TOPO
            </button>
            <button
              onClick={() => onSelectView('left')}
              className="py-2 bg-cyan-950/70 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 rounded border border-cyan-500/40 transition-all flex items-center justify-center shadow"
              title="Vista Esquerda"
            >
              ESQ
            </button>
            <button
              onClick={() => onSelectView('front')}
              className="py-2 bg-cyan-600/80 hover:bg-cyan-400 hover:text-slate-950 text-white rounded border border-cyan-400 transition-all flex items-center justify-center shadow font-extrabold"
              title="Vista Frontal"
            >
              FRENTE
            </button>
            <button
              onClick={() => onSelectView('right')}
              className="py-2 bg-cyan-950/70 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 rounded border border-cyan-500/40 transition-all flex items-center justify-center shadow"
              title="Vista Direita"
            >
              DIR
            </button>
            <button
              onClick={() => onSelectView('back')}
              className="col-span-3 py-1 bg-cyan-950/70 hover:bg-cyan-500 hover:text-slate-950 text-cyan-300 rounded border border-cyan-500/40 transition-all flex items-center justify-center shadow"
              title="Vista Posterior (Atrás)"
            >
              ATRÁS
            </button>
          </div>
        </div>
      </div>
      <div className="text-center mt-1 text-[9px] font-mono uppercase text-cyan-400/80 tracking-widest">
        Orientação 3D
      </div>
    </div>
  );
};
