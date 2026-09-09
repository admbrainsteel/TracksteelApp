import React from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Play, Pause, Info } from 'lucide-react';

interface PainelHeaderProps {
  totalPages: number;
  currentPage: number;
  autoRotate: boolean;
  onToggleAutoRotate: () => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onClose: () => void;
}

export const PainelHeader: React.FC<PainelHeaderProps> = ({
  totalPages,
  currentPage,
  autoRotate,
  onToggleAutoRotate,
  onPrevPage,
  onNextPage,
  onClose
}) => {
  return (
    <div className="mb-4 sm:mb-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">Painel Industrial</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-0.5">
            Acompanhamento comparativo em tempo real dos contratos e processos de fabricação.
          </p>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-3 self-stretch lg:self-auto justify-between lg:justify-end">
          {totalPages > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleAutoRotate}
                className="flex items-center gap-2"
              >
                {autoRotate ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {autoRotate ? 'Pausar' : 'Auto'}
              </Button>
              
              <Button
                variant="outline" 
                size="sm"
                onClick={onPrevPage}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <span className="text-sm font-medium text-foreground px-1">
                {currentPage + 1} de {totalPages}
              </span>
              
              <Button
                variant="outline" 
                size="sm" 
                onClick={onNextPage}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </>
          )}
          
          <Button
            variant="destructive"
            size="sm"
            onClick={onClose}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Fechar
          </Button>
        </div>
      </div>

      {/* Barra de Legendas de Cores dos Processos */}
      <div className="mt-3 py-2 px-3.5 bg-card border border-border/80 rounded-lg shadow-sm flex flex-wrap items-center justify-between gap-y-2 gap-x-4 text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-foreground font-semibold">
          <Info className="h-4 w-4 text-primary shrink-0" />
          <span>Legenda das Cores dos Processos:</span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 sm:gap-x-6 gap-y-1.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm inline-block" />
            <span className="font-semibold text-blue-500 dark:text-blue-400">Azul:</span>
            <span className="text-muted-foreground text-xs">Adiantado (ritmo acima do cronograma)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm inline-block" />
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">Verde:</span>
            <span className="text-muted-foreground text-xs">No Prazo / Concluído (100%)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm inline-block" />
            <span className="font-semibold text-amber-500 dark:text-amber-400">Amarelo:</span>
            <span className="text-muted-foreground text-xs">Atenção (60% a 80% do ritmo planejado)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm inline-block" />
            <span className="font-semibold text-rose-500 dark:text-rose-400">Vermelho:</span>
            <span className="text-muted-foreground text-xs">Atrasado (&lt;60% ou prazo do processo expirado)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
