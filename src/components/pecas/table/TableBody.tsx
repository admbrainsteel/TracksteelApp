
import React from 'react';
import { TableBody as UITableBody } from '@/components/ui/table';
import { Peca } from '@/hooks/usePecas';
import { TableRow } from './TableRow';
import { EmptyState } from './EmptyState';

interface TableBodyProps {
  filteredPecas: Peca[];
  selectedPecas: Set<string>;
  hasActiveFilters: boolean;
  onSelectPeca: (pecaId: string, checked: boolean) => void;
  onOpenComponentPopup: (pecaId: string) => void;
  onEditPeca: (peca: Peca) => void;
  onDeletePeca: (pecaId: string) => void;
}

export function TableBody({
  filteredPecas,
  selectedPecas,
  hasActiveFilters,
  onSelectPeca,
  onOpenComponentPopup,
  onEditPeca,
  onDeletePeca
}: TableBodyProps) {
  return (
    <UITableBody>
      {filteredPecas.length === 0 ? (
        <EmptyState hasActiveFilters={hasActiveFilters} />
      ) : (
        filteredPecas.map((peca) => (
          <TableRow
            key={peca.id}
            peca={peca}
            isSelected={selectedPecas.has(peca.id)}
            onSelect={(checked) => onSelectPeca(peca.id, checked)}
            onOpenComponentPopup={() => onOpenComponentPopup(peca.id)}
            onEdit={() => onEditPeca(peca)}
            onDelete={() => onDeletePeca(peca.id)}
          />
        ))
      )}
    </UITableBody>
  );
}
