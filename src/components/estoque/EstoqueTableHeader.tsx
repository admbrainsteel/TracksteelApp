
import React from 'react';
import { TableHead, TableRow } from '@/components/ui/table';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EstoqueTableHeaderProps {
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
  isAllSelected: boolean;
  onSelectAll: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EstoqueTableHeader: React.FC<EstoqueTableHeaderProps> = ({
  sortField,
  sortOrder,
  onSort,
  isAllSelected,
  onSelectAll
}) => {
  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3" />;
    return sortOrder === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <TableRow>
      <TableHead className="w-8 px-1">
        <input
          type="checkbox"
          className="w-3 h-3"
          checked={isAllSelected}
          onChange={onSelectAll}
        />
      </TableHead>
      <TableHead className="w-80 px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSort('descricao')}
          className="h-6 px-1 text-xs font-medium"
        >
          Descrição
          {getSortIcon('descricao')}
        </Button>
      </TableHead>
      <TableHead className="w-24 px-2 text-xs font-medium">Lote</TableHead>
      <TableHead className="w-32 px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSort('tipo')}
          className="h-6 px-1 text-xs font-medium"
        >
          Tipo
          {getSortIcon('tipo')}
        </Button>
      </TableHead>
      <TableHead className="w-16 px-2 text-xs font-medium">Un.</TableHead>
      <TableHead className="w-16 px-2 text-xs font-medium">Comp.</TableHead>
      <TableHead className="w-20 px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSort('quantidade_total')}
          className="h-6 px-1 text-xs font-medium"
        >
          Total
          {getSortIcon('quantidade_total')}
        </Button>
      </TableHead>
      <TableHead className="w-20 px-2 text-xs font-medium">Peso</TableHead>
      <TableHead className="w-20 px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSort('quantidade_disponivel')}
          className="h-6 px-1 text-xs font-medium"
        >
          Disp.
          {getSortIcon('quantidade_disponivel')}
        </Button>
      </TableHead>
      <TableHead className="w-20 px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSort('quantidade_empenhada')}
          className="h-6 px-1 text-xs font-medium"
        >
          Emp.
          {getSortIcon('quantidade_empenhada')}
        </Button>
      </TableHead>
      <TableHead className="w-24 px-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onSort('status')}
          className="h-6 px-1 text-xs font-medium"
        >
          Status
          {getSortIcon('status')}
        </Button>
      </TableHead>
      <TableHead className="w-24 px-2 text-xs font-medium">Ações</TableHead>
    </TableRow>
  );
};
