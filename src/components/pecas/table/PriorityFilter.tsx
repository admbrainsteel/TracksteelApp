
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { usePrioridades } from '@/hooks/usePrioridades';

interface PriorityFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export const PriorityFilter: React.FC<PriorityFilterProps> = ({ value, onChange }) => {
  const { prioridades, loading } = usePrioridades();

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className="w-48 priority-filter-trigger">
          <SelectValue placeholder="Carregando..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-48 priority-filter-trigger">
        <SelectValue placeholder="Filtrar por prioridade" />
      </SelectTrigger>
      <SelectContent className="priority-filter-content">
        <SelectItem value="all" className="priority-filter-item">
          Todas as prioridades
        </SelectItem>
        {prioridades.map((prioridade) => (
          <SelectItem key={prioridade.codigo} value={prioridade.codigo} className="priority-filter-item">
            <div className="flex items-center gap-2">
              <Badge
                className="text-white font-medium text-xs"
                style={{ backgroundColor: prioridade.cor }}
              >
                {prioridade.codigo}
              </Badge>
              {prioridade.nome}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
