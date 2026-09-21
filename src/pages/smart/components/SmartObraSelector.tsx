import React, { useState, useMemo } from 'react';
import { Search, HardHat, Building, ChevronRight, X, AlertCircle } from 'lucide-react';
import { useOFsAtivas, OFAtiva } from '@/hooks/useOFsAtivas';
import { smartAudio } from '@/utils/smartAudio';
import { Input } from '@/components/ui/input';

interface SmartObraSelectorProps {
  onSelectObra: (of: OFAtiva) => void;
}

export const SmartObraSelector: React.FC<SmartObraSelectorProps> = ({ onSelectObra }) => {
  const { ofsAtivas, isLoading } = useOFsAtivas();
  const [busca, setBusca] = useState('');

  const filteredOFs = useMemo(() => {
    if (!busca.trim()) return ofsAtivas;
    const term = busca.toLowerCase();
    return ofsAtivas.filter(
      (of) =>
        of.of_number?.toLowerCase().includes(term) ||
        of.cliente?.toLowerCase().includes(term) ||
        of.descricao_resumida?.toLowerCase().includes(term)
    );
  }, [ofsAtivas, busca]);

  const handleSelect = (of: OFAtiva) => {
    smartAudio.playClick();
    try {
      localStorage.setItem('tracksteel_smart_last_of', JSON.stringify(of));
    } catch {
      // ignore
    }
    onSelectObra(of);
  };

  return (
    <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
      {/* Título de Instrução Touch */}
      <div className="mb-4 text-center">
        <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
          <HardHat className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-black text-slate-100 uppercase tracking-wide">
          Selecione a Obra / OF
        </h2>
        <p className="text-sm text-slate-400 font-medium">
          Escolha a obra em que você está operando hoje
        </p>
      </div>

      {/* Campo de Busca Grande para Touch */}
      <div className="relative mb-5">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="h-5 w-5 text-amber-400" />
        </div>
        <Input
          type="text"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por OF ou Cliente..."
          className="h-14 pl-11 pr-11 bg-slate-800/90 border-slate-700 text-slate-100 placeholder:text-slate-500 text-base font-medium rounded-2xl focus-visible:ring-amber-500 focus-visible:border-amber-500"
        />
        {busca && (
          <button
            type="button"
            onClick={() => setBusca('')}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Lista de Obras em Cards Touch */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-8">
        {isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
            <span className="text-sm font-semibold">Carregando obras ativas...</span>
          </div>
        ) : filteredOFs.length === 0 ? (
          <div className="p-8 text-center bg-slate-800/40 rounded-2xl border border-slate-800">
            <AlertCircle className="h-10 w-10 text-amber-500/60 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-200">Nenhuma obra encontrada</h3>
            <p className="text-xs text-slate-400 mt-1">
              {busca ? 'Tente buscar com outro termo' : 'Nenhuma ordem de fabricação ativa no momento'}
            </p>
          </div>
        ) : (
          filteredOFs.map((of) => (
            <button
              key={of.of_number}
              type="button"
              onClick={() => handleSelect(of)}
              className="w-full min-h-[72px] p-4 rounded-2xl bg-slate-800/90 hover:bg-slate-750 active:bg-slate-700 border-2 border-slate-700/80 hover:border-amber-500/60 transition-all flex items-center justify-between text-left gap-3 shadow-sm active:scale-[0.98] group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="h-12 w-12 rounded-xl bg-slate-700/80 flex items-center justify-center text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors shrink-0">
                  <Building className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-amber-400 tracking-wider">
                      OF {of.of_number}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-100 truncate">
                    {of.cliente || of.descricao_resumida || 'Cliente não especificado'}
                  </div>
                  {of.descricao_resumida && of.cliente && (
                    <div className="text-xs text-slate-400 truncate">
                      {of.descricao_resumida}
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight className="h-6 w-6 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
            </button>
          ))
        )}
      </div>
    </div>
  );
};
