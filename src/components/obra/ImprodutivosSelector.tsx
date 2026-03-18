import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, AlertTriangle } from 'lucide-react';
import { MotivoImprodutivo } from '@/hooks/useObra';
import { calculateDuration } from '@/hooks/useRDOImprodutivos';
import { toast } from 'sonner';

interface ImproduviosSelectorProps {
  motivos: MotivoImprodutivo[];
  onSelect: (motivoId: string, horaInicio: string, horaFim: string, descricao?: string) => void;
  loading?: boolean;
}

export const ImprodutivosSelector: React.FC<ImproduviosSelectorProps> = ({
  motivos,
  onSelect,
  loading = false,
}) => {
  const [selectedMotivoId, setSelectedMotivoId] = useState<string>('');
  const [horaInicio, setHoraInicio] = useState<string>('');
  const [horaFim, setHoraFim] = useState<string>('');
  const [descricao, setDescricao] = useState<string>('');

  const handleAddImprodutivo = () => {
    if (!selectedMotivoId) {
      toast.error('Selecione um motivo');
      return;
    }

    if (!horaInicio || !horaFim) {
      toast.error('Informe o horário de início e fim');
      return;
    }

    // Validar que hora fim é posterior à hora início
    const inicio = new Date(`2000-01-01T${horaInicio}`);
    const fim = new Date(`2000-01-01T${horaFim}`);
    
    if (fim <= inicio) {
      toast.error('Horário de fim deve ser posterior ao horário de início');
      return;
    }

    onSelect(selectedMotivoId, horaInicio, horaFim, descricao);
    setSelectedMotivoId('');
    setHoraInicio('');
    setHoraFim('');
    setDescricao('');
  };

  const motivosPorCategoria = motivos.reduce((acc, motivo) => {
    const categoria = motivo.categoria;
    if (!acc[categoria]) {
      acc[categoria] = [];
    }
    acc[categoria].push(motivo);
    return acc;
  }, {} as Record<string, MotivoImprodutivo[]>);

  const duracao = horaInicio && horaFim ? calculateDuration(horaInicio, horaFim) : '';

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Adicionar Tempo Improdutivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Motivo</Label>
          <Select
            value={selectedMotivoId}
            onValueChange={setSelectedMotivoId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecionar motivo" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(motivosPorCategoria).map(([categoria, motivosCategoria]) => (
                <div key={categoria}>
                  <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                    {categoria}
                  </div>
                  {motivosCategoria.map((motivo) => (
                    <SelectItem key={motivo.id} value={motivo.id}>
                      <div>
                        <div className="font-medium">{motivo.motivo}</div>
                        {motivo.descricao && (
                          <div className="text-xs text-muted-foreground">
                            {motivo.descricao}
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Hora Início</Label>
            <Input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Hora Fim</Label>
            <Input
              type="time"
              value={horaFim}
              onChange={(e) => setHoraFim(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Duração</Label>
            <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
              <Badge variant="outline">
                {duracao || '00:00'}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Descrição (Opcional)</Label>
          <Textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva detalhes específicos sobre o tempo improdutivo..."
            rows={2}
          />
        </div>

        <Button
          onClick={handleAddImprodutivo}
          disabled={loading || !selectedMotivoId || !horaInicio || !horaFim}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Tempo Improdutivo
        </Button>
      </CardContent>
    </Card>
  );
};