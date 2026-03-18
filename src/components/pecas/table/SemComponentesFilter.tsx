
import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SemComponentesFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export function SemComponentesFilter({ value, onChange }: SemComponentesFilterProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[160px] bg-background border-border text-foreground">
        <SelectValue placeholder="Sem Componentes" />
      </SelectTrigger>
      <SelectContent className="bg-background border-border">
        <SelectItem value="all" className="text-foreground hover:bg-muted">
          Todas
        </SelectItem>
        <SelectItem value="sim" className="text-foreground hover:bg-muted">
          Sim
        </SelectItem>
        <SelectItem value="nao" className="text-foreground hover:bg-muted">
          Não
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
