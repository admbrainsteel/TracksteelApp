
import React from 'react';
import { TableHead, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ArrowUpDown } from 'lucide-react';

interface TableHeaderProps {
  selectAll: boolean;
  onSelectAll: (checked: boolean) => void;
  sortField: string;
  sortOrder: 'asc' | 'desc';
  onSort: (field: string) => void;
}

export function TableHeader({
  selectAll,
  onSelectAll,
  sortField,
  sortOrder,
  onSort
}: TableHeaderProps) {
  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 p-1 font-medium hover:bg-slate-700"
      onClick={() => onSort(field)}
    >
      {children}
      <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <TableRow className="border-slate-700 hover:bg-slate-700/50">
      <TableHead className="w-12 text-slate-300">
        <Checkbox
          checked={selectAll}
          onCheckedChange={onSelectAll}
        />
      </TableHead>
      <TableHead className="text-slate-300">
        <SortButton field="of_number">OF</SortButton>
      </TableHead>
      <TableHead className="text-slate-300">
        <SortButton field="etapa_fase">Fase</SortButton>
      </TableHead>
      <TableHead className="text-slate-300">
        <SortButton field="marca">Marca</SortButton>
      </TableHead>
      <TableHead className="text-slate-300">
        <SortButton field="descricao">Descrição</SortButton>
      </TableHead>
      <TableHead className="text-slate-300">
        <SortButton field="prioridade">Prioridade</SortButton>
      </TableHead>
      <TableHead className="text-slate-300 text-center">
        <SortButton field="quantidade">Qtd</SortButton>
      </TableHead>
      <TableHead className="text-slate-300 text-right">
        <SortButton field="peso_unitario">Peso Unit.</SortButton>
      </TableHead>
      <TableHead className="text-slate-300 text-right">
        <SortButton field="peso_total">Peso Total</SortButton>
      </TableHead>
      <TableHead className="text-slate-300">Material</TableHead>
      <TableHead className="text-slate-300">
        <SortButton field="perfil_principal">Perfil</SortButton>
      </TableHead>
      <TableHead className="text-slate-300 text-center">Ações</TableHead>
    </TableRow>
  );
}
