import React from 'react';
import { Button } from '@/components/ui/button';
import { useTiposMateriaPrima } from '@/hooks/useEstoque';

interface TiposFiltroButtonsOtimizadoProps {
  tipoSelecionado: string;
  onTipoChange: (tipo: string) => void;
  categoriaFilter: string;
  onCategoriaChange: (categoria: string) => void;
}

export const TiposFiltroButtonsOtimizado: React.FC<TiposFiltroButtonsOtimizadoProps> = ({
  tipoSelecionado,
  onTipoChange,
  categoriaFilter,
  onCategoriaChange
}) => {
  const { data: tipos, isLoading } = useTiposMateriaPrima();

  if (isLoading) {
    return (
      <div className="space-y-3 mb-4 p-3 bg-muted/30 rounded-lg border">
        <div className="flex flex-wrap gap-2">
          <div className="h-8 bg-gray-200 rounded animate-pulse flex-[0_0_calc(25%_-_0.5rem)] min-w-[120px]"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse flex-[0_0_calc(25%_-_0.5rem)] min-w-[120px]"></div>
          <div className="h-8 bg-gray-200 rounded animate-pulse flex-[0_0_calc(25%_-_0.5rem)] min-w-[120px]"></div>
        </div>
      </div>
    );
  }

  // Separar tipos por categoria
  const tiposDiretos = tipos?.filter(tipo => tipo.categoria === 'direto') || [];
  const tiposIndiretos = tipos?.filter(tipo => tipo.categoria === 'indireto') || [];

  const renderCategoriaSection = (titulo: string, tiposList: any[], categoria: string) => {
    if (tiposList.length === 0) return null;

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-muted-foreground">{titulo}</h4>
          <div className="flex-1 h-px bg-border"></div>
        </div>
        <div className="flex flex-wrap gap-2">
          {tiposList.map((tipo) => (
            <Button
              key={tipo.id}
              variant={tipoSelecionado === tipo.nome ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTipoChange(tipo.nome)}
              className="h-8 text-xs min-w-[120px]"
              title={tipo.nome}
            >
              {tipo.nome}
            </Button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3 mb-4 p-3 bg-muted/30 rounded-lg border">
      {/* Filtros de categoria e "Todos" */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={tipoSelecionado === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onTipoChange('all')}
          className="h-8 text-xs min-w-[120px]"
        >
          Todos os Tipos
        </Button>
        
        <div className="flex items-center gap-1 ml-4">
          <span className="text-sm text-muted-foreground">Filtrar por:</span>
          <select
            value={categoriaFilter}
            onChange={(e) => onCategoriaChange(e.target.value)}
            className="h-8 text-xs border border-input bg-background rounded px-2"
          >
            <option value="all">Todas as Categorias</option>
            <option value="direto">Material Direto</option>
            <option value="indireto">Material Indireto</option>
          </select>
        </div>
      </div>

      {/* Seções por categoria */}
      {(categoriaFilter === 'all' || categoriaFilter === 'direto') && 
        renderCategoriaSection('Materiais Diretos', tiposDiretos, 'direto')}
      
      {(categoriaFilter === 'all' || categoriaFilter === 'indireto') && 
        renderCategoriaSection('Materiais Indiretos', tiposIndiretos, 'indireto')}
    </div>
  );
};