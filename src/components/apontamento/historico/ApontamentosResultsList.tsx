
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon } from 'lucide-react';
import { ApontamentosListItem } from './ApontamentosListItem';
import { ApontamentoProducao } from '@/hooks/useApontamentosProducao';

interface ApontamentosResultsListProps {
  filteredApontamentos: ApontamentoProducao[];
  onRevert: (id: string) => void;
}

export const ApontamentosResultsList: React.FC<ApontamentosResultsListProps> = ({
  filteredApontamentos,
  onRevert
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Histórico de Apontamentos
          </div>
          <Badge variant="secondary">
            {filteredApontamentos.length} {filteredApontamentos.length === 1 ? 'registro' : 'registros'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filteredApontamentos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum apontamento encontrado</p>
            <p className="text-sm">
              Tente ajustar os filtros para ver mais resultados
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredApontamentos.map((apontamento) => (
              <ApontamentosListItem
                key={apontamento.id}
                apontamento={apontamento}
                onRevert={onRevert}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
