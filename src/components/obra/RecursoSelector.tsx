import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Clock } from 'lucide-react';
import { RecursoObra } from '@/hooks/useObra';
import { toast } from 'sonner';

interface RecursoSelectorProps {
  recursos: RecursoObra[];
  onSelect: (recursoId: string, horasTrabalhadas: number) => void;
  loading?: boolean;
}

export const RecursoSelector: React.FC<RecursoSelectorProps> = ({
  recursos,
  onSelect,
  loading = false,
}) => {
  const [selectedRecursoId, setSelectedRecursoId] = useState<string>('');
  const [horasTrabalhadas, setHorasTrabalhadas] = useState<string>('');

  const handleAddRecurso = () => {
    if (!selectedRecursoId) {
      toast.error('Selecione um recurso');
      return;
    }

    if (!horasTrabalhadas || parseFloat(horasTrabalhadas) <= 0) {
      toast.error('Informe as horas trabalhadas');
      return;
    }

    const horas = parseFloat(horasTrabalhadas);
    if (horas > 24) {
      toast.error('Horas trabalhadas não pode exceder 24 horas');
      return;
    }

    onSelect(selectedRecursoId, horas);
    setSelectedRecursoId('');
    setHorasTrabalhadas('');
  };

  const recursosPorTipo = recursos.reduce((acc, recurso) => {
    const tipo = recurso.tipo_recurso;
    if (!acc[tipo]) {
      acc[tipo] = [];
    }
    acc[tipo].push(recurso);
    return acc;
  }, {} as Record<string, RecursoObra[]>);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Adicionar Recurso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Recurso</Label>
            <Select
              value={selectedRecursoId}
              onValueChange={setSelectedRecursoId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecionar recurso" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(recursosPorTipo).map(([tipo, recursosDoTipo]) => (
                  <div key={tipo}>
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                      {tipo}
                    </div>
                    {recursosDoTipo.map((recurso) => (
                      <SelectItem key={recurso.id} value={recurso.id}>
                        <div>
                          <div className="font-medium">{recurso.nome_recurso}</div>
                          {recurso.descricao && (
                            <div className="text-xs text-muted-foreground">
                              {recurso.descricao}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Horas Trabalhadas</Label>
            <Input
              type="number"
              min="0"
              max="24"
              step="0.5"
              value={horasTrabalhadas}
              onChange={(e) => setHorasTrabalhadas(e.target.value)}
              placeholder="Ex: 8"
            />
          </div>
        </div>

        <Button
          onClick={handleAddRecurso}
          disabled={loading || !selectedRecursoId || !horasTrabalhadas}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Recurso
        </Button>
      </CardContent>
    </Card>
  );
};