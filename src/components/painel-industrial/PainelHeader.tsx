
import React from 'react';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';

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
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Painel Industrial</h1>
        <p className="text-lg text-muted-foreground">
          Acompanhamento comparativo em tempo real dos contratos.
        </p>
      </div>
      
      <div className="flex items-center gap-4">
        {totalPages > 1 && (
          <>
            <Button
              variant="outline"
              size="lg"
              onClick={onToggleAutoRotate}
              className="flex items-center gap-2"
            >
              {autoRotate ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              {autoRotate ? 'Pausar' : 'Auto'}
            </Button>
            
            <Button
              variant="outline" 
              size="lg"
              onClick={onPrevPage}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            
            <span className="text-lg font-medium text-foreground">
              {currentPage + 1} de {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="lg" 
              onClick={onNextPage}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </>
        )}
        
        <Button
          variant="destructive"
          size="lg"
          onClick={onClose}
          className="flex items-center gap-2"
        >
          <X className="h-5 w-5" />
          Fechar
        </Button>
      </div>
    </div>
  );
};
