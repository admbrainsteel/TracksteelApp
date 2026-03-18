
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Package, AlertTriangle, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useEmpenhosMaterial, useOFsComEmpenhos, useCancelarEmpenho } from '@/hooks/useEmpenhosMaterial';
import { Skeleton } from '@/components/ui/skeleton';

export const EmpenhosMaterialComponent: React.FC = () => {
  const [selectedOF, setSelectedOF] = useState<string>('all');
  
  const { data: ofsComEmpenhos = [], isLoading: loadingOFs } = useOFsComEmpenhos();
  const { data: empenhos = [], isLoading: loadingEmpenhos } = useEmpenhosMaterial(selectedOF === 'all' ? undefined : selectedOF);
  const cancelarEmpenho = useCancelarEmpenho();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Empenhado':
        return 'bg-yellow-500';
      case 'Finalizado':
        return 'bg-green-500';
      case 'Cancelado':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Empenhado':
        return <AlertTriangle className="h-3 w-3" />;
      case 'Finalizado':
        return <CheckCircle className="h-3 w-3" />;
      case 'Cancelado':
        return <XCircle className="h-3 w-3" />;
      default:
        return <Package className="h-3 w-3" />;
    }
  };

  const handleCancelarEmpenho = async (empenhoId: string) => {
    try {
      await cancelarEmpenho.mutateAsync(empenhoId);
    } catch (error) {
      console.error('Erro ao cancelar empenho:', error);
    }
  };

  // Calcular totais
  const totais = empenhos.reduce((acc, empenho) => {
    acc.quantidadeEmpenhada += empenho.quantidade_empenhada;
    acc.quantidadeUtilizada += empenho.quantidade_utilizada;
    acc.valorTotal += (empenho.quantidade_empenhada * (empenho.estoque_materiais?.valor_unitario || 0));
    
    if (empenho.status === 'Empenhado') acc.empenhosAtivos++;
    else if (empenho.status === 'Finalizado') acc.empenhosFinalizados++;
    else if (empenho.status === 'Cancelado') acc.empenhosCancelados++;
    
    return acc;
  }, {
    quantidadeEmpenhada: 0,
    quantidadeUtilizada: 0,
    valorTotal: 0,
    empenhosAtivos: 0,
    empenhosFinalizados: 0,
    empenhosCancelados: 0
  });

  if (loadingOFs) {
    return <Skeleton className="w-full h-96" />;
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Gestão de Empenhos de Material
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Seletor de OF */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Ordem de Fabricação</label>
            <Select value={selectedOF} onValueChange={setSelectedOF}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma OF para ver os empenhos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as OFs</SelectItem>
                {ofsComEmpenhos.map((of) => (
                  <SelectItem key={of} value={of}>
                    {of}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cards de Resumo */}
        {selectedOF && selectedOF !== 'all' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-blue-50 dark:bg-blue-950">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{totais.empenhosAtivos}</div>
                <div className="text-sm text-blue-600">Empenhos Ativos</div>
              </CardContent>
            </Card>
            
            <Card className="bg-green-50 dark:bg-green-950">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{totais.empenhosFinalizados}</div>
                <div className="text-sm text-green-600">Finalizados</div>
              </CardContent>
            </Card>
            
            <Card className="bg-yellow-50 dark:bg-yellow-950">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">
                  {totais.quantidadeEmpenhada.toFixed(2)}
                </div>
                <div className="text-sm text-yellow-600">Qtd Empenhada</div>
              </CardContent>
            </Card>
            
            <Card className="bg-purple-50 dark:bg-purple-950">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-purple-600">
                  R$ {totais.valorTotal.toFixed(2)}
                </div>
                <div className="text-sm text-purple-600">Valor Total</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabela de Empenhos */}
        {loadingEmpenhos ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="w-full h-12" />
            ))}
          </div>
        ) : empenhos.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>OF</TableHead>
                  <TableHead>Lote</TableHead>
                  <TableHead>Qtd Empenhada</TableHead>
                  <TableHead>Qtd Utilizada</TableHead>
                  <TableHead>Restante</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {empenhos.map((empenho) => {
                  const qtdRestante = empenho.quantidade_empenhada - empenho.quantidade_utilizada;
                  
                  return (
                    <TableRow key={empenho.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {empenho.estoque_materiais?.descricao}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {empenho.estoque_materiais?.codigo}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{empenho.of_number}</TableCell>
                      <TableCell>{empenho.lote || '-'}</TableCell>
                      <TableCell>
                        {empenho.quantidade_empenhada.toFixed(2)} {empenho.estoque_materiais?.unidade}
                      </TableCell>
                      <TableCell>
                        {empenho.quantidade_utilizada.toFixed(2)} {empenho.estoque_materiais?.unidade}
                      </TableCell>
                      <TableCell>
                        <span className={qtdRestante > 0 ? 'text-yellow-600' : 'text-green-600'}>
                          {qtdRestante.toFixed(2)} {empenho.estoque_materiais?.unidade}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(empenho.status)} text-white border-none`}
                        >
                          {getStatusIcon(empenho.status)}
                          <span className="ml-1">{empenho.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(empenho.data_empenho).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        {empenho.status === 'Empenhado' && empenho.quantidade_utilizada === 0 && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                                disabled={cancelarEmpenho.isPending}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Cancelar Empenho</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja cancelar este empenho? Esta ação irá:
                                  <ul className="list-disc list-inside mt-2">
                                    <li>Reverter a quantidade empenhada para disponível</li>
                                    <li>Cancelar a movimentação de empenho relacionada</li>
                                    <li>Marcar o empenho como cancelado</li>
                                  </ul>
                                  Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleCancelarEmpenho(empenho.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Confirmar Cancelamento
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            {selectedOF && selectedOF !== 'all' ? (
              <div>
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Nenhum empenho encontrado para a OF {selectedOF}</p>
              </div>
            ) : (
              <div>
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Selecione uma OF para visualizar os empenhos de material</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
