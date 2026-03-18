
import React from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EquipamentosFiltersProps {
  searchTerm: string;
  statusFilter: string;
  propriedadeFilter: string;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onPropriedadeChange: (value: string) => void;
  onResetFilters: () => void;
}

export function EquipamentosFilters({
  searchTerm,
  statusFilter,
  propriedadeFilter,
  onSearchChange,
  onStatusChange,
  onPropriedadeChange,
  onResetFilters,
}: EquipamentosFiltersProps) {
  return (
    <Card className="mb-6 no-print bg-card border-border">
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            placeholder="Buscar por código ou descrição..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="bg-background border-border text-foreground"
          />
          
          <Select value={statusFilter} onValueChange={onStatusChange}>
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue placeholder="Todos os Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="disponivel">Disponível</SelectItem>
              <SelectItem value="em_uso">Em Uso</SelectItem>
              <SelectItem value="calibracao_vencida">Calibração Vencida</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={propriedadeFilter} onValueChange={onPropriedadeChange}>
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue placeholder="Todas as Propriedades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Propriedades</SelectItem>
              <SelectItem value="proprio">Próprio</SelectItem>
              <SelectItem value="terceiros">Terceiros</SelectItem>
              <SelectItem value="alugado">Alugado</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            onClick={onResetFilters}
            className="border-border hover:bg-accent"
          >
            Limpar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
