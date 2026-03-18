
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Factory, Plus, CheckCircle } from 'lucide-react';

interface OrdensHeaderProps {
  onNovaOF?: () => void;
  onOFsConcluidas: () => void;
  showNovaOF?: boolean;
}

export function OrdensHeader({ onNovaOF, onOFsConcluidas, showNovaOF = true }: OrdensHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
          <Factory className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
          Ordens de Fabricação
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Gerencie todas as ordens de fabricação
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button
          onClick={onOFsConcluidas}
          variant="outline"
          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600 flex items-center gap-2 text-xs sm:text-sm"
        >
          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4" />
          OFs Concluídas
        </Button>
        
        {showNovaOF && onNovaOF && (
          <Button
            onClick={onNovaOF}
            className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 text-xs sm:text-sm"
          >
            <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
            Nova OF
          </Button>
        )}
      </div>
    </div>
  );
}
