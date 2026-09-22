import React, { useState } from 'react';
import { OfPcpCard } from '@/hooks/usePcpAnalysis';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Layers, Trash2, CheckSquare, Sparkles, Scale, AlertCircle, X } from 'lucide-react';

interface PcpMesaTaticaProps {
  ofsNaMesa: OfPcpCard[];
  totais: {
    totalOfs: number;
    pesoTotalKg: number;
    pesoTotalTon: string;
    pesoConcluidoKg: number;
    pesoConcluidoTon: string;
    progressoMedio: number;
  };
  onRemoveOf: (numOf: string) => void;
  onDropOf: (numOf: string) => void;
  onClear: () => void;
  onSelectAll: () => void;
  onAnalisar: () => void;
}

export const PcpMesaTatica: React.FC<PcpMesaTaticaProps> = ({
  ofsNaMesa,
  totais,
  onRemoveOf,
  onDropOf,
  onClear,
  onSelectAll,
  onAnalisar,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const numOf = e.dataTransfer.getData('text/plain');
    if (numOf) {
      onDropOf(numOf);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-2xl border-2 transition-all duration-200 p-4 md:p-6 bg-card/60 backdrop-blur-sm ${
        isDragOver
          ? 'border-primary border-dashed bg-primary/10 shadow-lg ring-4 ring-primary/20 scale-[1.005]'
          : ofsNaMesa.length > 0
          ? 'border-border shadow-sm'
          : 'border-dashed border-border/80 bg-muted/20'
      }`}
    >
      {/* Cabeçalho da Mesa */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base md:text-lg font-bold text-foreground">
                Mesa Tática de Agrupamento Multi-OF
              </h2>
              <Badge variant="secondary" className="font-semibold text-xs">
                {ofsNaMesa.length} {ofsNaMesa.length === 1 ? 'OF agrupada' : 'OFs agrupadas'}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Arraste figurinhas de OF para esta área ou clique nos cards para adicionar à análise acumulada.
            </p>
          </div>
        </div>

        {/* Ações da Mesa */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <Button
            size="sm"
            variant="ghost"
            onClick={onSelectAll}
            className="text-xs h-8 text-muted-foreground hover:text-foreground"
          >
            <CheckSquare className="h-3.5 w-3.5 mr-1.5" />
            Todas as OFs
          </Button>
          {ofsNaMesa.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={onClear}
              className="text-xs h-8 text-rose-400 hover:text-rose-500 hover:bg-rose-500/10 border-rose-500/30"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Limpar Mesa
            </Button>
          )}
          <Button
            size="sm"
            onClick={onAnalisar}
            disabled={ofsNaMesa.length === 0}
            className="text-xs h-8 bg-primary hover:bg-primary/90 shadow-sm"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            Analisar Cenário Acumulado
          </Button>
        </div>
      </div>

      {/* Cards Agrupados na Mesa */}
      {ofsNaMesa.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-muted/40 border border-dashed border-border flex items-center justify-center mb-3 text-muted-foreground">
            <Layers className="h-8 w-8 opacity-40 animate-pulse" />
          </div>
          <p className="text-sm font-medium text-foreground">
            A mesa de simulação está vazia
          </p>
          <p className="text-xs text-muted-foreground max-w-sm mt-1">
            Arraste os thumbnails do catálogo ao lado para agrupar as OFs e calcular o impacto acumulado na fábrica e na obra.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Tags de OFs na Mesa */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-semibold text-muted-foreground mr-1">
              Ordens na Mesa:
            </span>
            {ofsNaMesa.map((of) => (
              <Badge
                key={of.id}
                variant="outline"
                className="pl-2.5 pr-1.5 py-1 text-xs bg-card/80 border-border/80 flex items-center gap-2 group hover:border-primary/50 transition-colors"
              >
                <span className="font-bold text-foreground">OF {of.num_of}</span>
                <span className="text-muted-foreground text-[11px]">
                  ({(of.pesoTotalKg / 1000).toFixed(1)} t)
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveOf(of.num_of);
                  }}
                  className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Remover da mesa"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            ))}
          </div>

          {/* Cards Rápidos de Totais Acumulados */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
            <div className="bg-muted/40 border border-border/50 rounded-xl p-3">
              <span className="text-[11px] text-muted-foreground block mb-0.5">
                Carga Total em Análise
              </span>
              <div className="flex items-center gap-1.5 text-foreground font-bold text-lg md:text-xl">
                <Scale className="h-4 w-4 text-sky-400" />
                {totais.pesoTotalTon} <span className="text-xs font-normal text-muted-foreground">toneladas</span>
              </div>
            </div>

            <div className="bg-muted/40 border border-border/50 rounded-xl p-3">
              <span className="text-[11px] text-muted-foreground block mb-0.5">
                Produzido Acumulado
              </span>
              <div className="flex items-center gap-1.5 text-foreground font-bold text-lg md:text-xl">
                <span className="text-emerald-400 font-bold">{totais.pesoConcluidoTon}</span>
                <span className="text-xs font-normal text-muted-foreground">toneladas</span>
              </div>
            </div>

            <div className="bg-muted/40 border border-border/50 rounded-xl p-3">
              <span className="text-[11px] text-muted-foreground block mb-0.5">
                Saldo Pendente a Fabricar
              </span>
              <div className="flex items-center gap-1.5 text-foreground font-bold text-lg md:text-xl">
                <span className="text-amber-400 font-bold">
                  {((totais.pesoTotalKg - totais.pesoConcluidoKg) / 1000).toFixed(1)}
                </span>
                <span className="text-xs font-normal text-muted-foreground">toneladas</span>
              </div>
            </div>

            <div className="bg-muted/40 border border-border/50 rounded-xl p-3">
              <span className="text-[11px] text-muted-foreground block mb-0.5">
                Avanço Médio Ponderado
              </span>
              <div className="flex items-center gap-1.5 text-foreground font-bold text-lg md:text-xl">
                <span className="text-primary font-bold">{totais.progressoMedio}%</span>
                <span className="text-xs font-normal text-muted-foreground">concluído</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
