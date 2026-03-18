
import React from 'react';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Loader2 } from 'lucide-react';
import { usePermissionControl } from '@/hooks/usePermissionControl';

interface TableActionsProps {
  selectedPecas: Set<string>;
  onExportCSV: () => void;
  onDeleteSelected: () => void;
  hasRecentImport: boolean;
  onDeleteLastImport: () => void;
  deletingSelected?: boolean;
}

export function TableActions({
  selectedPecas,
  onExportCSV,
  onDeleteSelected,
  hasRecentImport,
  onDeleteLastImport,
  deletingSelected = false
}: TableActionsProps) {
  const { canImportExport, canDelete } = usePermissionControl();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canImportExport() && (
        <Button
          onClick={onExportCSV}
          disabled={selectedPecas.size === 0 || deletingSelected}
          variant="outline"
          size="sm"
          className="h-8"
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV ({selectedPecas.size})
        </Button>
      )}

      {canDelete() && (
        <Button
          onClick={onDeleteSelected}
          disabled={selectedPecas.size === 0 || deletingSelected}
          variant="destructive"
          size="sm"
          className="h-8"
        >
          {deletingSelected ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          {deletingSelected ? 'Apagando...' : `Apagar Selecionadas (${selectedPecas.size})`}
        </Button>
      )}
      
      {canDelete() && hasRecentImport && (
        <Button
          onClick={onDeleteLastImport}
          disabled={deletingSelected}
          variant="destructive"
          size="sm"
          className="h-8"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Apagar Última Importação
        </Button>
      )}
    </div>
  );
}
