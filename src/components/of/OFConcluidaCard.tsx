
import { FileText, Calendar, Package, Truck, Undo2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useUserRole } from '@/hooks/useUserRole';

interface OFConcluidaCardProps {
  of: any;
  onEntregar?: (of: any) => void;
  onReverterEntregue?: (of: any) => void;
  onReverterConcluida?: (of: any) => void;
  showEntregarButton?: boolean;
  showAdminButtons?: boolean;
}

export const OFConcluidaCard = ({
  of,
  onEntregar,
  onReverterEntregue,
  onReverterConcluida,
  showEntregarButton = false,
  showAdminButtons = false,
}: OFConcluidaCardProps) => {
  const { isAdmin } = useUserRole();
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'concluida':
        return 'bg-green-600';
      case 'entregue':
        return 'bg-blue-600';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'concluida':
        return 'Concluída';
      case 'entregue':
        return 'Entregue';
      default:
        return status;
    }
  };

  return (
    <Card className="bg-slate-700/50 border-slate-600 hover:bg-slate-700/70 transition-colors">
      <CardContent className="p-3 sm:p-4 lg:p-6">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:gap-3 lg:items-center">
          <div className="space-y-2 lg:col-span-2">
            <div className="flex items-center gap-2">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
              <span className="text-xs sm:text-sm text-slate-300 font-medium">OF</span>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-white font-bold text-sm sm:text-base">{of.num_of}</p>
              <Badge variant="outline" className={`${getStatusColor(of.status_detalhado)} text-white border-none text-xs px-2 py-1 w-fit`}>
                {getStatusLabel(of.status_detalhado)}
              </Badge>
            </div>
          </div>

          <div className="space-y-1 sm:space-y-2 lg:col-span-3">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-slate-300 font-medium">Descritivo</span>
            </div>
            <p className="text-white text-sm sm:text-base truncate" title={of.descritivo || 'Sem descrição'}>
              {of.descritivo || 'Sem descrição'}
            </p>
          </div>

          <div className="space-y-1 sm:space-y-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <Package className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
              <span className="text-xs sm:text-sm text-slate-300 font-medium">Peso</span>
            </div>
            <p className="text-white text-sm sm:text-base">{of.peso_total ? `${of.peso_total}kg` : 'N/A'}</p>
          </div>

          <div className="space-y-1 sm:space-y-2 lg:col-span-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400" />
              <span className="text-xs sm:text-sm text-slate-300 font-medium">Data Arquivamento</span>
            </div>
            <p className="text-white text-sm sm:text-base">
              {of.data_arquivamento ? new Date(of.data_arquivamento).toLocaleDateString('pt-BR') : 'N/A'}
            </p>
          </div>

          <div className="space-y-1 sm:space-y-2 lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm text-slate-300 font-medium">Critério Qualidade</span>
            </div>
            <p className="text-white text-sm sm:text-base">{of.criterio_qualidade || 'N/A'}</p>
          </div>

          <div className="flex gap-1 lg:col-span-2 flex-wrap">
            {showEntregarButton && of.status_detalhado === 'concluida' && onEntregar && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-blue-600 border-blue-500 text-white hover:bg-blue-500 text-xs h-8 px-2 flex-1"
                  >
                    <Truck className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Entregar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Entrega</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja marcar a OF {of.num_of} como entregue?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onEntregar(of)} className="bg-blue-600 hover:bg-blue-700">
                      Entregar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {showAdminButtons && isAdmin && of.status_detalhado === 'entregue' && onReverterEntregue && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-orange-600 border-orange-500 text-white hover:bg-orange-500 text-xs h-8 px-2"
                  >
                    <Undo2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Reverter
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reverter para Concluída</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja reverter a OF {of.num_of} de "Entregue" para "Concluída"? 
                      Esta ação só deve ser realizada em casos excepcionais.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onReverterEntregue(of)} className="bg-orange-600 hover:bg-orange-700">
                      Reverter
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {showAdminButtons && isAdmin && of.status_detalhado === 'concluida' && onReverterConcluida && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-red-600 border-red-500 text-white hover:bg-red-500 text-xs h-8 px-2"
                  >
                    <Undo2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    Reativar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reativar OF</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja reativar a OF {of.num_of}, movendo-a de volta para as Ordens Ativas? 
                      Esta ação só deve ser realizada em casos excepcionais.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onReverterConcluida(of)} className="bg-red-600 hover:bg-red-700">
                      Reativar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
