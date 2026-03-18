import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Edit, Trash2, Clock } from 'lucide-react';
import { ApontamentoImprodutivo, calculateDuration } from '@/hooks/useRDOImprodutivos';

interface ImprodutivosListProps {
  improdutivos: ApontamentoImprodutivo[];
  onEdit?: (improdutivo: ApontamentoImprodutivo) => void;
  onDelete?: (id: string) => void;
  loading?: boolean;
}

export const ImproduitvosList: React.FC<ImprodutivosListProps> = ({
  improdutivos,
  onEdit,
  onDelete,
  loading = false,
}) => {
  if (improdutivos.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">Nenhum tempo improdutivo registrado</p>
        </CardContent>
      </Card>
    );
  }

  // Calcular total de tempo improdutivo
  const totalMinutos = improdutivos.reduce((acc, item) => {
    const duracao = calculateDuration(item.hora_inicio, item.hora_fim);
    const [horas, minutos] = duracao.split(':').map(Number);
    return acc + (horas * 60) + minutos;
  }, 0);

  const totalHoras = Math.floor(totalMinutos / 60);
  const restoMinutos = totalMinutos % 60;
  const totalFormatado = `${totalHoras}h ${restoMinutos.toString().padStart(2, '0')}m`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Tempos Improdutivos
          </CardTitle>
          <Badge variant="destructive">
            Total: {totalFormatado}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {improdutivos.map((improdutivo) => (
          <div
            key={improdutivo.id}
            className="flex items-start justify-between p-3 border rounded-lg bg-muted/30"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h5 className="font-medium">
                  {improdutivo.motivos_improdutivos?.motivo}
                </h5>
                <Badge variant="outline" className="text-xs">
                  {improdutivo.motivos_improdutivos?.categoria}
                </Badge>
              </div>
              
              {improdutivo.motivos_improdutivos?.descricao && (
                <p className="text-sm text-muted-foreground mb-2">
                  {improdutivo.motivos_improdutivos.descricao}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-sm text-muted-foreground mb-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {improdutivo.hora_inicio} - {improdutivo.hora_fim}
                </span>
                <Badge variant="secondary" className="text-xs">
                  Duração: {calculateDuration(improdutivo.hora_inicio, improdutivo.hora_fim)}
                </Badge>
              </div>

              {improdutivo.descricao && (
                <div className="text-sm bg-muted/50 p-2 rounded">
                  <p className="text-muted-foreground text-xs mb-1">Descrição:</p>
                  <p>{improdutivo.descricao}</p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 ml-4">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(improdutivo)}
                  disabled={loading}
                >
                  <Edit className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(improdutivo.id)}
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