
import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, BarChart3, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CronogramaOf } from '@/types/cronograma';
import { toast } from 'sonner';
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
} from "@/components/ui/alert-dialog";

interface CronogramaTableProps {
  cronogramas: CronogramaOf[];
  onEdit: (cronograma: CronogramaOf) => void;
  onDelete: (cronogramaId: string) => void;
  onViewChart: (cronograma: CronogramaOf) => void;
  onViewPDF: (cronograma: CronogramaOf) => void;
  canEdit?: boolean;
  canDelete?: boolean;
}

export const CronogramaTable: React.FC<CronogramaTableProps> = ({
  cronogramas,
  onEdit,
  onDelete,
  onViewChart,
  onViewPDF,
  canEdit = true,
  canDelete = true,
}) => {
  const calcularDiasCorridos = (dataInicio: string, dataFim: string) => {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const diffTime = Math.abs(fim.getTime() - inicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-200 dark:border-gray-700">
            <TableHead className="text-gray-900 dark:text-gray-100">OF</TableHead>
            <TableHead className="text-gray-900 dark:text-gray-100">Gestor</TableHead>
            <TableHead className="text-gray-900 dark:text-gray-100">Revisão</TableHead>
            <TableHead className="text-gray-900 dark:text-gray-100">Processos</TableHead>
            <TableHead className="text-gray-900 dark:text-gray-100">Peso Total (kg)</TableHead>
            <TableHead className="text-gray-900 dark:text-gray-100">Período Total</TableHead>
            <TableHead className="text-gray-900 dark:text-gray-100">Dias Corridos</TableHead>
            <TableHead className="text-right text-gray-900 dark:text-gray-100">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cronogramas.map((cronograma) => {
            const primeiroProcesso = cronograma.processos[0];
            const ultimoProcesso = cronograma.processos[cronograma.processos.length - 1];
            const dataInicio = primeiroProcesso?.data_inicio;
            const dataFim = ultimoProcesso?.data_fim;
            const diasCorridos = dataInicio && dataFim ? calcularDiasCorridos(dataInicio, dataFim) : 0;

            return (
              <TableRow key={cronograma.id} className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <TableCell className="font-medium">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100">{cronograma.ordem_fabricacao?.num_of}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {cronograma.ordem_fabricacao?.descritivo}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {cronograma.gestor_profile?.full_name || 'N/A'}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100">Rev. {cronograma.revisao}</Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    {cronograma.processos.length} processo{cronograma.processos.length !== 1 ? 's' : ''}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-gray-900 dark:text-gray-100 font-medium">
                    {cronograma.peso_total ? `${Number(cronograma.peso_total).toLocaleString('pt-BR')} kg` : 'N/A'}
                  </div>
                </TableCell>
                <TableCell>
                  {dataInicio && dataFim ? (
                    <div className="text-sm">
                      <div className="text-gray-900 dark:text-gray-100">{format(new Date(dataInicio + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</div>
                      <div className="text-gray-600 dark:text-gray-400">até</div>
                      <div className="text-gray-900 dark:text-gray-100">{format(new Date(dataFim + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}</div>
                    </div>
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100">{diasCorridos} dias</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewChart(cronograma)}
                      title="Ver gráfico Gantt"
                      className="border-blue-200 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-800/30 text-blue-700 dark:text-blue-300"
                    >
                      <BarChart3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onViewPDF(cronograma)}
                      title="Gerar PDF"
                      className="border-green-200 dark:border-green-600 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-800/30 text-green-700 dark:text-green-300"
                    >
                      <FileText className="w-4 h-4" />
                    </Button>
                    {canEdit && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(cronograma)}
                        title="Editar cronograma"
                        className="border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                      >
                        <Edit className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                      </Button>
                    )}
                    {canDelete && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Remover cronograma"
                            className="border-red-200 dark:border-red-600 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-800/30 text-red-700 dark:text-red-300"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-gray-900 dark:text-gray-100">Remover Cronograma</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
                              Tem certeza que deseja remover o cronograma da OF {cronograma.ordem_fabricacao?.num_of}? 
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => cronograma.id && onDelete(cronograma.id)}
                              className="bg-red-600 hover:bg-red-700 text-white"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
