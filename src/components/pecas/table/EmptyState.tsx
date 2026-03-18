
import React from 'react';
import { TableCell, TableRow } from '@/components/ui/table';

interface EmptyStateProps {
  hasActiveFilters: boolean;
}

export function EmptyState({ hasActiveFilters }: EmptyStateProps) {
  return (
    <TableRow>
      <TableCell colSpan={12} className="text-center py-8">
        {hasActiveFilters
          ? 'Nenhuma peça encontrada com os filtros aplicados'
          : 'Nenhuma peça cadastrada'
        }
      </TableCell>
    </TableRow>
  );
}
