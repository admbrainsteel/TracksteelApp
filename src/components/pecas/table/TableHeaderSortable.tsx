
import React from 'react';
import { TableHead, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SortField, SortOrder } from '@/hooks/usePecasTable';
import { useAppLabels } from '@/hooks/useAppLabels';

interface TableHeaderSortableProps {
  selectAll: boolean;
  onSelectAll: (checked: boolean) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSort: (field: SortField) => void;
}

export function TableHeaderSortable({
  selectAll,
  onSelectAll,
  sortField,
  sortOrder,
  onSort
}: TableHeaderSortableProps) {
  const { labels } = useAppLabels();

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 p-0 hover:bg-transparent"
      onClick={() => onSort(field)}
    >
      <span className="text-xs font-medium">{children}</span>
      {sortField === field && (
        sortOrder === 'asc' ? (
          <ChevronUp className="ml-1 h-3 w-3" />
        ) : (
          <ChevronDown className="ml-1 h-3 w-3" />
        )
      )}
    </Button>
  );

  return (
    <TableRow className="border-b">
      <TableHead className="w-8 px-2">
        <Checkbox
          checked={selectAll}
          onCheckedChange={onSelectAll}
          aria-label="Selecionar todas as peças"
        />
      </TableHead>
      
      <TableHead className="w-16 px-2">
        <SortButton field="of_number">{labels.ofLabel}</SortButton>
      </TableHead>
      
      <TableHead className="w-12 px-2">
        <SortButton field="etapa_fase">{labels.faseLabel}</SortButton>
      </TableHead>
      
      <TableHead className="w-14 px-2">
        <SortButton field="marca">{labels.pecaLabel}</SortButton>
      </TableHead>
      
      <TableHead className="w-32 px-2">
        <SortButton field="descricao">Descrição</SortButton>
      </TableHead>
      
      <TableHead className="w-16 px-2">
        <SortButton field="prioridade">Prioridade</SortButton>
      </TableHead>
      
      <TableHead className="w-24 px-2 text-center">
        <SortButton field="tem_componentes">Componentes</SortButton>
      </TableHead>
      
      <TableHead className="w-12 px-2 text-right">
        <SortButton field="quantidade">Qtd.</SortButton>
      </TableHead>
      
      <TableHead className="w-16 px-2 text-right">
        <SortButton field="peso_unitario">Peso Unit.</SortButton>
      </TableHead>
      
      <TableHead className="w-16 px-2 text-right">
        <SortButton field="peso_total">Peso Total</SortButton>
      </TableHead>
      
      <TableHead className="w-16 px-2">
        <span className="text-xs font-medium">Material</span>
      </TableHead>
      
      <TableHead className="w-16 px-2">
        <span className="text-xs font-medium">Perfil</span>
      </TableHead>
      
      <TableHead className="w-20 px-2">
        <span className="text-xs font-medium">Ações</span>
      </TableHead>
    </TableRow>
  );
}
