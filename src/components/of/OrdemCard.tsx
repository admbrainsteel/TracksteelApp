
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, Weight, BarChart3, Monitor, Edit, CheckCircle, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OrdemCardProps {
  ordem: any;
  onVerCronograma: (ordem: any) => void;
  onVerDashboard: (ordem: any) => void;
  onEdit?: (ordem: any) => void;
  onConcluir?: (ordem: any) => void;
  onDelete?: (ordem: any) => void;
  showActions?: boolean;
}

export function OrdemCard({ 
  ordem, 
  onVerCronograma, 
  onVerDashboard, 
  onEdit, 
  onConcluir, 
  onDelete,
  showActions = true
}: OrdemCardProps) {
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'normal':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Normal</Badge>;
      case 'especial':
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Especial</Badge>;
      case 'concluida':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Concluída</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Não definido'}</Badge>;
    }
  };

  return (
    <Card className="bg-card border-border hover:bg-accent/5 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-card-foreground">
              OF: {ordem.num_of}
            </h3>
            {getStatusBadge(ordem.status)}
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onVerCronograma(ordem)}
              className="border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 dark:border-blue-800 dark:bg-blue-900/20 dark:hover:bg-blue-800/30 dark:text-blue-300"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Ver Cronograma
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => onVerDashboard(ordem)}
              className="border-green-200 bg-green-50 hover:bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:hover:bg-green-800/30 dark:text-green-300"
            >
              <Monitor className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-semibold text-card-foreground">{ordem.descritivo}</h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Weight className="w-4 h-4" />
              <span>Peso: {ordem.peso_total || 'N/A'}</span>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                Abertura: {ordem.data_abertura 
                  ? format(new Date(ordem.data_abertura), 'dd/MM/yyyy', { locale: ptBR })
                  : 'N/A'
                }
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Gestor: {ordem.gestor || 'N/A'}</span>
            </div>
          </div>

          {ordem.prazo_termino && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>
                Prazo: {format(new Date(ordem.prazo_termino), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            </div>
          )}
        </div>

        {showActions && (onEdit || onConcluir || onDelete) && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(ordem)}
                className="border-gray-200 hover:bg-gray-100 text-gray-700 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
            )}
            
            {onConcluir && ordem.status !== 'concluida' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onConcluir(ordem)}
                className="border-green-200 bg-green-50 hover:bg-green-100 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:hover:bg-green-800/30 dark:text-green-300"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Concluir
              </Button>
            )}
            
            {onDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (window.confirm(`Tem certeza que deseja excluir a OF ${ordem.num_of}?`)) {
                    onDelete(ordem);
                  }
                }}
                className="border-red-200 bg-red-50 hover:bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:hover:bg-red-800/30 dark:text-red-300"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
