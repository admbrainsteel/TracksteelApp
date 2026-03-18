
import React from 'react';
import { TableHead } from '@/components/ui/table';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface MovimentacaoTableHeaderProps {
  label: string;
  sortKey: string;
  currentSort: {
    key: string;
    direction: 'asc' | 'desc';
  };
  onSort: (key: string) => void;
}

export function MovimentacaoTableHeader({
  label,
  sortKey,
  currentSort,
  onSort
}: MovimentacaoTableHeaderProps) {
  const getSortIcon = () => {
    if (currentSort.key !== sortKey) {
      return <ChevronUp className="h-3 w-3 opacity-30" />;
    }
    return currentSort.direction === 'asc' ? 
      <ChevronUp className="h-3 w-3" /> : 
      <ChevronDown className="h-3 w-3" />;
  };

  return (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none text-xs py-1 px-2"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {label}
        {getSortIcon()}
      </div>
    </TableHead>
  );
}
