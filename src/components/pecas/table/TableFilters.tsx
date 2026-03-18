
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X, Info } from 'lucide-react';
import { PriorityFilter } from './PriorityFilter';
import { SemComponentesFilter } from './SemComponentesFilter';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TableFiltersProps {
  ofFilter: string;
  onOfFilterChange: (value: string) => void;
  faseFilter: string;
  onFaseFilterChange: (value: string) => void;
  pecaFilter: string;
  onPecaFilterChange: (value: string) => void;
  descricaoFilter: string;
  onDescricaoFilterChange: (value: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (value: string) => void;
  semComponentesFilter: string;
  onSemComponentesFilterChange: (value: string) => void;
  onSearchComponent: (marca: string) => void;
  pesoTotal: number;
}

export function TableFilters({
  ofFilter,
  onOfFilterChange,
  faseFilter,
  onFaseFilterChange,
  pecaFilter,
  onPecaFilterChange,
  descricaoFilter,
  onDescricaoFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  semComponentesFilter,
  onSemComponentesFilterChange,
  onSearchComponent,
  pesoTotal
}: TableFiltersProps) {
  const handleClearOfFilter = () => {
    onOfFilterChange('');
  };

  const handleClearFaseFilter = () => {
    onFaseFilterChange('');
  };

  const handleClearPecaFilter = () => {
    onPecaFilterChange('');
  };

  const handleClearDescricaoFilter = () => {
    onDescricaoFilterChange('');
  };

  const handleClearPriorityFilter = () => {
    onPriorityFilterChange('all');
  };

  const handleClearSemComponentesFilter = () => {
    onSemComponentesFilterChange('all');
  };

  return (
    <div className="space-y-4 mb-4">
      {/* Linha dos quatro filtros individuais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Filtro por OF */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Filtrar por OF..."
            value={ofFilter}
            onChange={(e) => onOfFilterChange(e.target.value)}
            className="pl-10 bg-background border-border text-foreground placeholder-muted-foreground"
          />
          {ofFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearOfFilter}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filtro por Fase */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Filtrar por fase..."
            value={faseFilter}
            onChange={(e) => onFaseFilterChange(e.target.value)}
            className="pl-10 bg-background border-border text-foreground placeholder-muted-foreground"
          />
          {faseFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFaseFilter}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filtro por Peça com tooltip */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Filtrar peça... (ex: 32@47)"
            value={pecaFilter}
            onChange={(e) => onPecaFilterChange(e.target.value)}
            className="pl-10 pr-8 bg-background border-border text-foreground placeholder-muted-foreground"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="absolute right-8 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm space-y-1">
                  <p><strong>Filtro por range:</strong></p>
                  <p>Use @ para filtrar intervalos</p>
                  <p><strong>Exemplo:</strong> 32@47 (peças de 32 a 47)</p>
                  <p><strong>Busca normal:</strong> Digite parte da marca</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {pecaFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearPecaFilter}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filtro por Descrição */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Filtrar por descrição..."
            value={descricaoFilter}
            onChange={(e) => onDescricaoFilterChange(e.target.value)}
            className="pl-10 bg-background border-border text-foreground placeholder-muted-foreground"
          />
          {descricaoFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearDescricaoFilter}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Segunda linha com filtros de prioridade, sem componentes e busca por componente */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-6 items-center">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Prioridade</label>
            <div className="flex gap-2 items-center">
              <PriorityFilter
                value={priorityFilter}
                onChange={onPriorityFilterChange}
              />
              
              {priorityFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearPriorityFilter}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">Sem Componentes</label>
            <div className="flex gap-2 items-center">
              <SemComponentesFilter
                value={semComponentesFilter}
                onChange={onSemComponentesFilterChange}
              />
              
              {semComponentesFilter !== 'all' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSemComponentesFilter}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 items-center">
          <Button
            variant="outline"
            onClick={() => {
              const marca = prompt('Digite a marca do componente para buscar:');
              if (marca) {
                onSearchComponent(marca);
              }
            }}
            className="bg-background border-border text-foreground hover:bg-muted"
          >
            Buscar por Componente
          </Button>

          {/* Campo de Peso Total */}
          <div className="text-sm font-medium text-foreground bg-muted/50 px-3 py-2 rounded-md border border-border">
            Peso total: {pesoTotal.toFixed(2)} kg
          </div>
        </div>
      </div>
    </div>
  );
}
