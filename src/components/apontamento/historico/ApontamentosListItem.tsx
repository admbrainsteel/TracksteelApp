
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Package, Wrench, Undo2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ApontamentoProducao } from '@/hooks/useApontamentosProducao';

interface ApontamentosListItemProps {
  apontamento: ApontamentoProducao;
  onRevert: (id: string) => void;
}

export const ApontamentosListItem: React.FC<ApontamentosListItemProps> = ({
  apontamento,
  onRevert
}) => {
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString + 'T00:00:00');
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return dateString;
    }
  };

  const getMarcaItem = (apontamento: ApontamentoProducao) => {
    if (apontamento.tipo_apontamento === 'componente') {
      return apontamento.componente?.marca_componente || 'N/A';
    } else {
      return apontamento.peca?.marca || 'N/A';
    }
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        {apontamento.tipo_apontamento === 'componente' ? (
          <Wrench className="h-4 w-4 text-blue-500" />
        ) : (
          <Package className="h-4 w-4 text-green-500" />
        )}
        
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">
              {getMarcaItem(apontamento)}
            </span>
            <Badge variant="outline">
              {apontamento.of_number || 'N/A'}
            </Badge>
            {apontamento.is_forcado && (
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                apontamento.status_confirmacao === 'pendente_confirmacao'
                  ? 'bg-red-100 text-red-700 border-red-300 animate-pulse dark:bg-red-950/80 dark:text-red-400 dark:border-red-800'
                  : 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950/80 dark:text-amber-400 dark:border-amber-800'
              }`}>
                ⚡ FORÇADO {apontamento.status_confirmacao === 'pendente_confirmacao' ? '(Pendente)' : '(Confirmado)'}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
            <span>{apontamento.processo?.nome || 'N/A'} • {formatDate(apontamento.data_apontamento)}</span>
            {(apontamento.usuario_nome || apontamento.forcado_por_user_nome) && (
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                • Por: {apontamento.forcado_por_user_nome || apontamento.usuario_nome}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="font-medium">
            {apontamento.quantidade_produzida || 0} un.
          </div>
          <div className="text-xs text-muted-foreground">
            {format(new Date(apontamento.created_at), 'HH:mm', { locale: ptBR })}
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
            >
              <Undo2 className="h-3 w-3" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reverter Apontamento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza de que deseja reverter este apontamento? 
                Esta ação não pode ser desfeita e irá remover permanentemente o registro de:
                <br />
                <strong>{getMarcaItem(apontamento)}</strong> - {apontamento.quantidade_produzida} unidades
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onRevert(apontamento.id)}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Confirmar Reversão
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
