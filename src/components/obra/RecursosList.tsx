import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Edit, Trash2 } from 'lucide-react';
import { ApontamentoRecursoObra } from '@/hooks/useRDORecursos';

interface RecursosListProps {
  recursos: ApontamentoRecursoObra[];
  onEdit?: (recurso: ApontamentoRecursoObra) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export const RecursosList: React.FC<RecursosListProps> = ({
  recursos,
  onEdit,
  onDelete,
  loading = false,
}) => {
  if (recursos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhum recurso apontado</p>
        </CardContent>
      </Card>
    );
  }

  const totalHoras = recursos.reduce((acc, recurso) => acc + recurso.horas_trabalhadas, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recursos Utilizados
          </CardTitle>
          <Badge variant="outline">
            Total: {totalHoras.toFixed(1)}h
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {recursos.map((recurso) => (
          <div
            key={recurso.id}
            className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h5 className="font-medium">
                  {recurso.recursos_obra?.nome_recurso}
                </h5>
                <Badge variant="secondary" className="text-xs">
                  {recurso.recursos_obra?.tipo_recurso}
                </Badge>
              </div>
              {recurso.recursos_obra?.descricao && (
                <p className="text-sm text-muted-foreground mb-2">
                  {recurso.recursos_obra.descricao}
                </p>
              )}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {recurso.horas_trabalhadas}h trabalhadas
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(recurso)}
                  disabled={loading}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(recurso.id)}
                  disabled={loading}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};