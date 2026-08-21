
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DashboardDataOtimizado } from '@/hooks/useDashboardProducaoOtimizado';


interface TabelaResumoProcessosProps {
  data: DashboardDataOtimizado | null;
  loading: boolean;
}

export const TabelaResumoProcessos: React.FC<TabelaResumoProcessosProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 bg-muted rounded w-full"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!data || !data.processos.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum processo encontrado para esta OF
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'azul':
        return <Badge className="bg-blue-500">Adiantado</Badge>;
      case 'verde':
        return <Badge className="bg-green-500">No Prazo</Badge>;
      case 'amarelo':
        return <Badge className="bg-yellow-500">Atenção</Badge>;
      case 'vermelho':
        return <Badge variant="destructive">Atrasado</Badge>;
      default:
        return <Badge variant="secondary">Indefinido</Badge>;
    }
  };

  return (
    <div className="w-full overflow-x-auto">
      <Table disableOverflow>
        <TableHeader>
          <TableRow className="h-10">
            <TableHead>Processo</TableHead>
            <TableHead>Progresso Real</TableHead>
            <TableHead>Progresso Esperado</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Peso Processado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.processos.map((processo) => (
            <TableRow key={processo.id} className="h-12">
              <TableCell className="font-medium py-2">{processo.nome}</TableCell>
              <TableCell className="py-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{processo.progressoReal.toFixed(1)}%</span>
                  </div>
                  <Progress value={processo.progressoReal} className="h-2" />
                </div>
              </TableCell>
              <TableCell className="py-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{processo.progressoEsperado.toFixed(1)}%</span>
                  </div>
                  <Progress value={processo.progressoEsperado} className="h-2 opacity-50" />
                </div>
              </TableCell>
              <TableCell className="py-2">
                {getStatusBadge(processo.status)}
              </TableCell>
              <TableCell className="text-right py-2">
                {processo.pesoFabricado.toFixed(1)} kg
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
