
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Grid, List } from 'lucide-react';

interface CatalogosFiltersProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  categoriaFilter: string;
  setCategoriaFilter: (value: string) => void;
  disciplinaFilter: string;
  setDisciplinaFilter: (value: string) => void;
  onClearFilters: () => void;
  viewMode: 'table' | 'preview';
  onViewModeChange: (mode: 'table' | 'preview') => void;
}

const categorias = [
  'Aço',
  'Adesivo',
  'Tintas',
  'Parafusos',
  'Soldas',
  'Estruturas',
  'Materiais'
];

const disciplinas = [
  'Engenharia Civil',
  'Engenharia Mecânica',
  'Arquitetura',
  'Construção',
  'Fabricação',
  'Montagem'
];

export function CatalogosFilters({
  searchTerm,
  setSearchTerm,
  categoriaFilter,
  setCategoriaFilter,
  disciplinaFilter,
  setDisciplinaFilter,
  onClearFilters,
  viewMode,
  onViewModeChange
}: CatalogosFiltersProps) {
  const hasActiveFilters = searchTerm || (categoriaFilter && categoriaFilter !== 'all') || (disciplinaFilter && disciplinaFilter !== 'all');

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por título, conteúdo, palavras-chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-white border-slate-300 text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white"
          />
        </div>

        <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
          <SelectTrigger className="w-full md:w-[180px] h-10 bg-white border-slate-300 text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-300 dark:bg-slate-700 dark:border-slate-600">
            <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">Todas as Categorias</SelectItem>
            {categorias.map((categoria) => (
              <SelectItem key={categoria} value={categoria} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">
                {categoria}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={disciplinaFilter} onValueChange={setDisciplinaFilter}>
          <SelectTrigger className="w-full md:w-[180px] h-10 bg-white border-slate-300 text-slate-900 dark:bg-slate-700 dark:border-slate-600 dark:text-white">
            <SelectValue placeholder="Disciplina" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-300 dark:bg-slate-700 dark:border-slate-600">
            <SelectItem value="all" className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">Todas as Disciplinas</SelectItem>
            {disciplinas.map((disciplina) => (
              <SelectItem key={disciplina} value={disciplina} className="text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-600">
                {disciplina}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('table')}
            className={viewMode === 'table' ? '' : 'bg-slate-50 border-slate-300 text-slate-900 hover:bg-slate-100 dark:bg-transparent dark:border-slate-600 dark:text-white dark:hover:bg-slate-700'}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'preview' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('preview')}
            className={viewMode === 'preview' ? '' : 'bg-slate-50 border-slate-300 text-slate-900 hover:bg-slate-100 dark:bg-transparent dark:border-slate-600 dark:text-white dark:hover:bg-slate-700'}
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>

        {hasActiveFilters && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            size="sm"
            className="h-10 bg-white border-slate-300 text-slate-700 hover:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:hover:bg-slate-600"
          >
            <X className="h-4 w-4 mr-2" />
            Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
