
import React from 'react';
import { Button } from '@/components/ui/button';
import { useTiposMateriaPrima } from '@/hooks/useEstoque';

interface TiposFiltroButtonsProps {
  tipoSelecionado: string;
  onTipoChange: (tipo: string) => void;
}

export const TiposFiltroButtons: React.FC<TiposFiltroButtonsProps> = ({
  tipoSelecionado,
  onTipoChange
}) => {
  const { data: tipos, isLoading } = useTiposMateriaPrima();

  if (isLoading) {
    return (
      <div className="flex flex-wrap gap-2 mb-4 p-3 bg-muted/30 rounded-lg border">
        <div className="h-8 bg-gray-200 rounded animate-pulse flex-[0_0_calc(18%_-_0.5rem)] min-w-[120px]"></div>
        <div className="h-8 bg-gray-200 rounded animate-pulse flex-[0_0_calc(18%_-_0.5rem)] min-w-[120px]"></div>
        <div className="h-8 bg-gray-200 rounded animate-pulse flex-[0_0_calc(18%_-_0.5rem)] min-w-[120px]"></div>
      </div>
    );
  }

  // Criar uma estrutura unificada para todos os tipos
  const allTiposItem = { id: 'all', nome: 'Todos os Tipos', isSpecial: true };
  const tipoItems = tipos?.map(tipo => ({ ...tipo, isSpecial: false })) || [];
  const allItems = [allTiposItem, ...tipoItems];

  // Dividir os tipos em duas linhas
  const firstLine = allItems.slice(0, Math.ceil(allItems.length / 2));
  const secondLine = allItems.slice(Math.ceil(allItems.length / 2));

  return (
    <div className="mb-4 p-3 bg-muted/30 rounded-lg border space-y-2">
      <div className="flex flex-wrap gap-2">
        {firstLine.map((item) => (
          <Button
            key={item.id}
            variant={tipoSelecionado === (item.isSpecial ? 'all' : item.nome) ? 'default' : 'outline'}
            size="sm"
            onClick={() => onTipoChange(item.isSpecial ? 'all' : item.nome)}
            className="h-8 text-xs flex-[0_0_calc(18%_-_0.5rem)] min-w-[180px] max-w-none"
            title={item.nome}
          >
            {item.nome}
          </Button>
        ))}
      </div>
      {secondLine.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {secondLine.map((item) => (
            <Button
              key={item.id}
              variant={tipoSelecionado === item.nome ? 'default' : 'outline'}
              size="sm"
              onClick={() => onTipoChange(item.nome)}
              className="h-8 text-xs flex-[0_0_calc(18%_-_0.5rem)] min-w-[180px] max-w-none"
              title={item.nome}
            >
              {item.nome}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};
