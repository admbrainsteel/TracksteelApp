
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, Eye, Workflow, Clock, Shield } from 'lucide-react';

interface SystemMapFiltersProps {
  currentFilter: string;
  onFilterChange: (filter: string) => void;
}

const filters = [
  {
    id: 'all',
    label: 'Ver Tudo',
    icon: Eye,
    description: 'Mostrar todos os módulos'
  },
  {
    id: 'main-flow',
    label: 'Fluxo Principal',
    icon: Workflow,
    description: 'Apenas o fluxo principal de trabalho'
  },
  {
    id: 'permissions',
    label: 'Meus Acessos',
    icon: Shield,
    description: 'Apenas módulos que tenho acesso'
  },
  {
    id: 'recent',
    label: 'Recentes',
    icon: Clock,
    description: 'Módulos utilizados recentemente'
  }
];

export function SystemMapFilters({ currentFilter, onFilterChange }: SystemMapFiltersProps) {
  const currentFilterData = filters.find(f => f.id === currentFilter);
  const CurrentIcon = currentFilterData?.icon || Filter;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 bg-card text-card-foreground border-border hover:bg-accent hover:text-accent-foreground">
          <CurrentIcon className="w-4 h-4" />
          {currentFilterData?.label || 'Filtros'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 bg-card border-border">
        {filters.map((filter) => {
          const Icon = filter.icon;
          return (
            <DropdownMenuItem
              key={filter.id}
              onClick={() => onFilterChange(filter.id)}
              className="flex items-start gap-3 p-3 text-card-foreground hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="w-4 h-4 mt-0.5 text-muted-foreground" />
              <div>
                <div className="font-medium text-sm">{filter.label}</div>
                <div className="text-xs text-muted-foreground">{filter.description}</div>
              </div>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
