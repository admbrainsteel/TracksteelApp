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
      <div className="mb-4 p-3.5 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between gap-2 shadow-sm">
        <div className="min-w-0">
          <span className="text-[11px] font-black uppercase text-amber-700 dark:text-amber-400 tracking-wider">
            OBRA ATIVA
          </span>
          <div className="text-base font-black text-slate-900 dark:text-slate-100 truncate">
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
          className="h-10 px-3 border-slate-300 dark:border-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/60 dark:hover:bg-slate-650 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold shrink-0 active:scale-95 gap-1.5 transition-colors"
        >
          <ArrowLeftRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>Trocar</span>
        </Button>
      </div>

      {/* Grade dos 4 Botões Principais Gigantes */}
      <div className="grid grid-cols-1 xs:grid-cols-2 gap-3.5 my-auto py-2">
        {/* BOTÃO 1: PRODUÇÃO */}
        <button
          type="button"
          onClick={() => handleAcao('producao')}
          className="min-h-[110px] sm:min-h-[125px] p-4 rounded-3xl
            bg-amber-50 hover:bg-amber-100 active:bg-amber-100
            dark:bg-gradient-to-br dark:from-amber-600 dark:to-amber-700 dark:hover:from-amber-500 dark:hover:to-amber-600
            border-2 border-amber-400 dark:border-amber-400/40
            shadow-md shadow-amber-200/60 dark:shadow-amber-950/40
            text-amber-800 dark:text-white
            flex flex-col justify-between text-left transition-all active:scale-[0.97] group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2.5 rounded-2xl bg-amber-400/25 dark:bg-white/15 text-amber-700 dark:text-white backdrop-blur-sm">
              <Hammer className="h-7 w-7" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-200 dark:bg-black/25 text-amber-800 dark:text-amber-100">
              Passo 1
            </span>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black tracking-tight leading-tight">
              1. PRODUÇÃO
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-100 font-medium opacity-90 mt-0.5">
              Corte, Dobra, Solda, Pintura...
            </div>
          </div>
        </button>

        {/* BOTÃO 2: EMBARQUE (ROMANEIO) */}
        <button
          type="button"
          onClick={() => handleAcao('embarque')}
          className="min-h-[110px] sm:min-h-[125px] p-4 rounded-3xl
            bg-blue-50 hover:bg-blue-100 active:bg-blue-100
            dark:bg-gradient-to-br dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-500 dark:hover:to-blue-600
            border-2 border-blue-500 dark:border-blue-400/40
            shadow-md shadow-blue-200/60 dark:shadow-blue-950/40
            text-blue-800 dark:text-white
            flex flex-col justify-between text-left transition-all active:scale-[0.97] group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2.5 rounded-2xl bg-blue-400/20 dark:bg-white/15 text-blue-700 dark:text-white backdrop-blur-sm">
              <Truck className="h-7 w-7" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-200 dark:bg-black/25 text-blue-800 dark:text-blue-100">
              Passo 2
            </span>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black tracking-tight leading-tight">
              2. EMBARQUE
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-100 font-medium opacity-90 mt-0.5">
              Romaneios e saída da fábrica
            </div>
          </div>
        </button>

        {/* BOTÃO 3: MONTAGEM (OBRA) */}
        <button
          type="button"
          onClick={() => handleAcao('montagem')}
          className="min-h-[110px] sm:min-h-[125px] p-4 rounded-3xl
            bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-100
            dark:bg-gradient-to-br dark:from-emerald-600 dark:to-emerald-700 dark:hover:from-emerald-500 dark:hover:to-emerald-600
            border-2 border-emerald-500 dark:border-emerald-400/40
            shadow-md shadow-emerald-200/60 dark:shadow-emerald-950/40
            text-emerald-800 dark:text-white
            flex flex-col justify-between text-left transition-all active:scale-[0.97] group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2.5 rounded-2xl bg-emerald-400/20 dark:bg-white/15 text-emerald-700 dark:text-white backdrop-blur-sm">
              <PackageCheck className="h-7 w-7" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-black/25 text-emerald-800 dark:text-emerald-100">
              Passo 3
            </span>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black tracking-tight leading-tight">
              3. MONTAGEM
            </div>
            <div className="text-xs text-emerald-600 dark:text-emerald-100 font-medium opacity-90 mt-0.5">
              Conferência e avanço na obra
            </div>
          </div>
        </button>

        {/* BOTÃO 4: CONSULTAR PEÇAS & RELATÓRIOS */}
        <button
          type="button"
          onClick={() => handleAcao('consulta')}
          className="min-h-[110px] sm:min-h-[125px] p-4 rounded-3xl
            bg-purple-50 hover:bg-purple-100 active:bg-purple-100
            dark:bg-gradient-to-br dark:from-purple-600 dark:to-purple-700 dark:hover:from-purple-500 dark:hover:to-purple-600
            border-2 border-purple-500 dark:border-purple-400/40
            shadow-md shadow-purple-200/60 dark:shadow-purple-950/40
            text-purple-800 dark:text-white
            flex flex-col justify-between text-left transition-all active:scale-[0.97] group"
        >
          <div className="flex items-center justify-between w-full">
            <div className="p-2.5 rounded-2xl bg-purple-400/20 dark:bg-white/15 text-purple-700 dark:text-white backdrop-blur-sm">
              <Search className="h-7 w-7" />
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-200 dark:bg-black/25 text-purple-800 dark:text-purple-100">
              Info
            </span>
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black tracking-tight leading-tight">
              4. PEÇAS &amp; PDF
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-100 font-medium opacity-90 mt-0.5">
              Status da peça e relatórios
            </div>
          </div>
        </button>
      </div>

      {/* Card Informativo de Produção do Operador Hoje */}
      <div className="mt-4 p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider">
              Minha Produção Hoje
            </span>
          </div>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/15 text-amber-800 dark:text-amber-400 border border-amber-300 dark:border-amber-500/30">
            <Sparkles className="h-3 w-3" />
            Turno Ativo
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-700 dark:text-amber-400 leading-tight">
              {producaoHoje.totalPecas}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Peças Apontadas</div>
          </div>
          <div className="border-l border-slate-200 dark:border-slate-800 pl-3">
            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 leading-tight">
              {producaoHoje.totalKg.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}{' '}
              <span className="text-sm text-slate-500 dark:text-slate-400">kg</span>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Peso Total</div>
          </div>
        </div>

        <Button
          type="button"
          onClick={() => {
            smartAudio.playClick();
            onGerarRelatorioTurno();
          }}
          className="w-full h-12 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 active:bg-slate-300 dark:active:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold rounded-xl gap-2 border border-slate-300 dark:border-slate-600 text-sm active:scale-98 transition-colors"
        >
          <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <span>Gerar Relatório do Meu Turno (PDF)</span>
        </Button>
      </div>
    </div>
  );
};
