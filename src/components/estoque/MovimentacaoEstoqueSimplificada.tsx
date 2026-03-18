
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Plus, TrendingUp, Trash2, Package } from 'lucide-react';
import { useMovimentacoesEstoque, useExcluirMovimentacao } from '@/hooks/useEstoqueMovimentacoes';
import { MovimentacaoModal } from './MovimentacaoModal';
import { MovimentacaoTableHeader } from './MovimentacaoTableHeader';
import { Skeleton } from '@/components/ui/skeleton';

export const MovimentacaoEstoqueSimplificada = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{
    key: string;
    direction: 'asc' | 'desc';
  }>({ key: 'created_at', direction: 'desc' });

  const { data: movimentacoes = [], isLoading } = useMovimentacoesEstoque();
  const excluirMovimentacao = useExcluirMovimentacao();

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedMovimentacoes = React.useMemo(() => {
    if (!movimentacoes) return [];
    
    return [...movimentacoes].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'material':
          aValue = a.estoque_materiais?.codigo || '';
          bValue = b.estoque_materiais?.codigo || '';
          break;
        case 'data_movimentacao':
          aValue = new Date(a.data_movimentacao);
          bValue = new Date(b.data_movimentacao);
          break;
        case 'created_at':
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        default:
          aValue = a[sortConfig.key as keyof typeof a];
          bValue = b[sortConfig.key as keyof typeof b];
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [movimentacoes, sortConfig]);

  const getStatusColor = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return 'bg-green-500';
      case 'saida':
        return 'bg-red-500';
      case 'empenho':
        return 'bg-yellow-500';
      case 'desempenho':
        return 'bg-blue-500';
      case 'ajuste':
        return 'bg-purple-500';
      case 'transferencia':
        return 'bg-orange-500';
      default:
        return 'bg-gray-500';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="w-full h-12" />
        ))}
      </div>
    );
  }

  return (
    <>
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Histórico de Movimentações
            </CardTitle>
            <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Nova Movimentação
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {sortedMovimentacoes.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <MovimentacaoTableHeader
                      label="Material"
                      sortKey="material"
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                    <MovimentacaoTableHeader
                      label="Tipo"
                      sortKey="tipo_movimentacao"
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                    <MovimentacaoTableHeader
                      label="Quantidade"
                      sortKey="quantidade"
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                    <TableHead>OF Vinculada</TableHead>
                    <MovimentacaoTableHeader
                      label="Data Movim."
                      sortKey="data_movimentacao"
                      currentSort={sortConfig}
                      onSort={handleSort}
                    />
                    <TableHead>Lote</TableHead>
                    <TableHead>Observações</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedMovimentacoes.map((movimentacao) => (
                    <TableRow key={movimentacao.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {movimentacao.estoque_materiais?.codigo}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {movimentacao.estoque_materiais?.descricao}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`${getStatusColor(movimentacao.tipo_movimentacao)} text-white border-none`}
                        >
                          {movimentacao.tipo_movimentacao}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {movimentacao.quantidade.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {movimentacao.of_vinculada || '-'}
                      </TableCell>
                      <TableCell>
                        {new Date(movimentacao.data_movimentacao).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>{movimentacao.lote || '-'}</TableCell>
                      <TableCell>
                        <div className="max-w-xs truncate" title={movimentacao.observacoes || ''}>
                          {movimentacao.observacoes || '-'}
                        </div>
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                              disabled={excluirMovimentacao.isPending}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Movimentação</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir esta movimentação de{' '}
                                <strong>{movimentacao.tipo_movimentacao}</strong> para{' '}
                                <strong>{movimentacao.estoque_materiais?.codigo}</strong>?
                                {movimentacao.tipo_movimentacao === 'empenho' && (
                                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                                    <strong>Atenção:</strong> Esta ação também cancelará o empenho vinculado e reverterá as quantidades no estoque.
                                  </div>
                                )}
                                <br />
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => excluirMovimentacao.mutate(movimentacao.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Nenhuma movimentação registrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      <MovimentacaoModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};
