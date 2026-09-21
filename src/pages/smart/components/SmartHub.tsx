import React from 'react';
import { 
  Hammer, 
  Truck, 
  PackageCheck, 
  Search, 
  ArrowLeftRight, 
  FileText, 
  TrendingUp, 
  Sparkles 
} from 'lucide-react';
import { OFAtiva } from '@/hooks/useOFsAtivas';
import { smartAudio } from '@/utils/smartAudio';
import { Button } from '@/components/ui/button';

interface SmartHubProps {
  obra: OFAtiva;
  onTrocarObra: () => void;
  onNavigate: (destino: 'producao' | 'embarque' | 'montagem' | 'consulta') => void;
  producaoHoje: { totalPecas: number; totalKg: number };
  onGerarRelatorioTurno: () => void;
}

export const SmartHub: React.FC<SmartHubProps> = ({
  obra,
  onTrocarObra,
  onNavigate,
  producaoHoje,
  onGerarRelatorioTurno,
}) => {
  const handleAcao = (destino: 'producao' | 'embarque' | 'montagem' | 'consulta') => {
    smartAudio.playClick();
    onNavigate(destino);
  };

  return (
    <div className="flex flex-col flex-1 p-4 max-w-xl mx-auto w-full">
      {/* Barra de Contexto da Obra */}
      <div className="mb-4 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between gap-2 shadow-sm">
        <div className="min-w-0">
          <span className="text-[11px] font-black uppercase text-amber-400 tracking-wider">
            OBRA ATIVA
          </span>
          <div className="text-base font-black text-slate-100 truncate">
            OF {obra.of_number} — {obra.cliente || 'Obra Industrial'}
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            smartAudio.playClick();
            onTrocarObra();
          }}
          className="h-10 px-3 border-slate-600 bg-slate-700/60 hover:bg-slate-650 text-slate-200 hover:text-white rounded-xl text-xs font-bold shrink-0 active:scale-95 gap-1.5"
        >
          <ArrowLeftRight className="h-4 w-4 text-amber-400" />
          <span>Trocar</span>
        </Button>
      </div>

      {/* Grade dos 4 Botões Principais Gigantes */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3.5 my-auto py-2">
        {/* BOTÃO 1: PRODUÇÃO */}
        <button
          type="button"
          onClick={() => handleAcao('producao')}
          className="min-h-[110px] sm:min-h-[125px] p-4 rounded-3xl bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 active:from-amber-700 active:to-amber-800 text-white shadow-lg shadow-amber-950/40 border-2 border-amber-400/40 flex flex-col justify-between text-left transition-all active:scale-[0.97] group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2.5 rounded-2xl bg-white/15 text-white backdrop-blur-sm">
              <Hammer className="h-7 w-7" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/25 text-amber-100">
              Passo 1
            </span>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black tracking-tight leading-tight">
              1. PRODUÇÃO
            </div>
            <div className="text-xs text-amber-100 font-medium opacity-90 mt-0.5">
              Corte, Dobra, Solda, Pintura...
            </div>
          </div>
        </button>

        {/* BOTÃO 2: EMBARQUE (ROMANEIO) */}
        <button
          type="button"
          onClick={() => handleAcao('embarque')}
          className="min-h-[110px] sm:min-h-[125px] p-4 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 active:from-blue-700 active:to-blue-800 text-white shadow-lg shadow-blue-950/40 border-2 border-blue-400/40 flex flex-col justify-between text-left transition-all active:scale-[0.97] group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2.5 rounded-2xl bg-white/15 text-white backdrop-blur-sm">
              <Truck className="h-7 w-7" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/25 text-blue-100">
              Passo 2
            </span>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black tracking-tight leading-tight">
              2. EMBARQUE
            </div>
            <div className="text-xs text-blue-100 font-medium opacity-90 mt-0.5">
              Romaneios e saída da fábrica
            </div>
          </div>
        </button>

        {/* BOTÃO 3: MONTAGEM (OBRA) */}
        <button
          type="button"
          onClick={() => handleAcao('montagem')}
          className="min-h-[110px] sm:min-h-[125px] p-4 rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 active:from-emerald-700 active:to-emerald-800 text-white shadow-lg shadow-emerald-950/40 border-2 border-emerald-400/40 flex flex-col justify-between text-left transition-all active:scale-[0.97] group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2.5 rounded-2xl bg-white/15 text-white backdrop-blur-sm">
              <PackageCheck className="h-7 w-7" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/25 text-emerald-100">
              Passo 3
            </span>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black tracking-tight leading-tight">
              3. MONTAGEM
            </div>
            <div className="text-xs text-emerald-100 font-medium opacity-90 mt-0.5">
              Conferência e avanço na obra
            </div>
          </div>
        </button>

        {/* BOTÃO 4: CONSULTAR PEÇAS & RELATÓRIOS */}
        <button
          type="button"
          onClick={() => handleAcao('consulta')}
          className="min-h-[110px] sm:min-h-[125px] p-4 rounded-3xl bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 active:from-purple-700 active:to-purple-800 text-white shadow-lg shadow-purple-950/40 border-2 border-purple-400/40 flex flex-col justify-between text-left transition-all active:scale-[0.97] group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2.5 rounded-2xl bg-white/15 text-white backdrop-blur-sm">
              <Search className="h-7 w-7" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/25 text-purple-100">
              Info
            </span>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black tracking-tight leading-tight">
              4. PEÇAS & PDF
            </div>
            <div className="text-xs text-purple-100 font-medium opacity-90 mt-0.5">
              Status da peça e relatórios
            </div>
          </div>
        </button>
      </div>

      {/* Card Informativo de Produção do Operador Hoje */}
      <div className="mt-4 p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-300">
            <TrendingUp className="h-5 w-5 text-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider">
              Minha Produção Hoje
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Sparkles className="h-3 w-3" />
            Turno Ativo
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-400 leading-tight">
              {producaoHoje.totalPecas}
            </div>
            <div className="text-xs text-slate-400 font-medium">Peças Apontadas</div>
          </div>
          <div className="border-l border-slate-800 pl-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-100 leading-tight">
              {producaoHoje.totalKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
              <span className="text-sm text-slate-400">kg</span>
            </div>
            <div className="text-xs text-slate-400 font-medium">Peso Total</div>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => {
            smartAudio.playClick();
            onGerarRelatorioTurno();
          }}
          className="w-full h-12 bg-slate-700 hover:bg-slate-650 active:bg-slate-600 text-slate-100 font-bold rounded-xl gap-2 border border-slate-600 text-sm active:scale-98"
        >
          <FileText className="h-4 w-4 text-amber-400" />
          <span>Gerar Relatório do Meu Turno (PDF)</span>
        </Button>
      </div>
    </div>
  );
};
