
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ItemPrioridade } from '@/hooks/useItensPrioridadeFabricacao';
import { usePrioridades } from '@/hooks/usePrioridades';
import { Edit, Trash2, GripVertical, X, Search, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';

interface KanbanPrioridadesFabricacaoProps {
  itensPorPrioridade: { [key: string]: ItemPrioridade[] };
  onUpdateQuantidade: (itemId: string, novaQuantidade: number, pesoUnitario: number) => Promise<boolean>;
  onRemoverItem: (itemId: string) => Promise<boolean>;
  onRemoverItensPorPrioridade?: (codigoPrioridade: string) => Promise<{ sucessos: number; falhas: number }>;
  onTransferirItem: (itemId: string, codigoPrioridadeDestino: string) => Promise<boolean>;
  onReorderItems: (prioridadeId: string, itensOrdenados: { id: string; ordem_fabricacao: number }[]) => Promise<boolean>;
}

export const KanbanPrioridadesFabricacao: React.FC<KanbanPrioridadesFabricacaoProps> = ({
  itensPorPrioridade,
  onUpdateQuantidade,
  onRemoverItem,
  onRemoverItensPorPrioridade,
  onTransferirItem,
  onReorderItems
}) => {
  const { prioridades } = usePrioridades();
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState<string | null>(null);
  const [showSortDialog, setShowSortDialog] = useState<string | null>(null);
  const [isSorting, setIsSorting] = useState(false);
  const [filtrosPecas, setFiltrosPecas] = useState<{ [key: string]: string }>({
    P1: '',
    P2: '',
    P3: '',
    P4: ''
  });

  const getPrioridadeConfig = (codigo: string) => {
    switch (codigo) {
      case 'P1':
        return { 
          nome: 'P1 - Urgente', 
          cor: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800', 
          cardBorder: 'border-l-red-500', 
          textColor: 'text-red-800 dark:text-red-200', 
          badgeColor: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' 
        };
      case 'P2':
        return { 
          nome: 'P2 - Alta', 
          cor: 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800', 
          cardBorder: 'border-l-orange-500', 
          textColor: 'text-orange-800 dark:text-orange-200', 
          badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300' 
        };
      case 'P3':
        return { 
          nome: 'P3 - Média', 
          cor: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800', 
          cardBorder: 'border-l-blue-500', 
          textColor: 'text-blue-800 dark:text-blue-200', 
          badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
        };
      case 'P4':
        return { 
          nome: 'P4 - Baixa', 
          cor: 'bg-gray-200 dark:bg-gray-800 border-gray-300 dark:border-gray-600', 
          cardBorder: 'border-l-gray-500', 
          textColor: 'text-gray-800 dark:text-gray-200', 
          badgeColor: 'bg-gray-300 text-gray-700 dark:bg-gray-700 dark:text-gray-300' 
        };
      default:
        return { 
          nome: 'Desconhecida', 
          cor: 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700', 
          cardBorder: 'border-l-gray-500', 
          textColor: 'text-gray-800 dark:text-gray-200', 
          badgeColor: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' 
        };
    }
  };

  const calcularPesoTotal = (itens: ItemPrioridade[]) => {
    return itens.reduce((total, item) => total + (item.peso_total || 0), 0);
  };

  const filtrarItens = (itens: ItemPrioridade[], filtro: string) => {
    if (!filtro.trim()) return itens;
    
    return itens.filter(item => 
      item.peca?.marca?.toLowerCase().includes(filtro.toLowerCase())
    );
  };

  const handleFiltroChange = (codigo: string, valor: string) => {
    setFiltrosPecas(prev => ({
      ...prev,
      [codigo]: valor
    }));
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Se moveu para uma coluna diferente (transferência)
    if (source.droppableId !== destination.droppableId) {
      const codigoPrioridadeDestino = destination.droppableId;
      
      console.log('Transferindo item:', draggableId, 'para código:', codigoPrioridadeDestino);
      
      // Forçar a peça a ser posicionada no final da lista de destino
      // Isso é feito automaticamente pela função de transferência no backend
      const sucesso = await onTransferirItem(draggableId, codigoPrioridadeDestino);
      if (sucesso) {
        toast.success('Peça transferida com sucesso!');
      }
    } 
    // Se mudou apenas a ordem dentro da mesma coluna
    else if (source.index !== destination.index) {
      const itens = itensPorPrioridade[source.droppableId] || [];
      const itensFiltrados = filtrarItens(itens, filtrosPecas[source.droppableId]);
      
      // Trabalhar com os itens filtrados para reordenação
      const novaOrdem = Array.from(itensFiltrados);
      const [itemMovido] = novaOrdem.splice(source.index, 1);
      novaOrdem.splice(destination.index, 0, itemMovido);

      const itensOrdenados = novaOrdem.map((item, index) => ({
        id: item.id,
        ordem_fabricacao: index + 1
      }));

      // Usar o ID da prioridade_fabricacao do primeiro item da lista
      const primeiroItem = itens[0];
      if (primeiroItem?.prioridade_fabricacao_id) {
        await onReorderItems(primeiroItem.prioridade_fabricacao_id, itensOrdenados);
      }
    }
  };

  const handleStartEdit = (itemId: string, quantidadeAtual: number) => {
    setEditingItem(itemId);
    setEditQuantity(quantidadeAtual);
  };

  const handleSaveEdit = async (item: ItemPrioridade) => {
    const sucesso = await onUpdateQuantidade(item.id, editQuantity, item.peca?.peso_unitario || 0);
    if (sucesso) {
      setEditingItem(null);
      toast.success('Quantidade atualizada!');
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditQuantity(1);
  };

  const handleRemove = async (itemId: string) => {
    const sucesso = await onRemoverItem(itemId);
    if (sucesso) {
      toast.success('Peça removida!');
    }
  };

  const handleDeleteAll = async (codigo: string) => {
    const itens = itensPorPrioridade[codigo] || [];
    
    if (itens.length === 0) {
      toast.warning('Não há peças para excluir nesta prioridade');
      setShowDeleteAllDialog(null);
      return;
    }

    console.log(`🗑️ Iniciando exclusão em lote para prioridade ${codigo} (${itens.length} itens)`);

    // Usar a função de remoção em lote do hook que considera OF e fase
    const { sucessos, falhas } = await onRemoverItensPorPrioridade?.(codigo) || { sucessos: 0, falhas: itens.length };

    if (sucessos > 0) {
      toast.success(`${sucessos} peça(s) removida(s) da prioridade ${codigo}`);
    }
    
    if (falhas > 0) {
      toast.error(`${falhas} peça(s) não puderam ser removidas (validação de OF/Fase)`);
    }

    setShowDeleteAllDialog(null);
  };

  const handleShowDeleteAllDialog = (codigo: string) => {
    setShowDeleteAllDialog(codigo);
  };

  const handleCancelDeleteAll = () => {
    setShowDeleteAllDialog(null);
  };

  const handleOrdenarPorMarca = async (codigo: string) => {
    const itens = itensPorPrioridade[codigo] || [];
    if (itens.length <= 1) {
      setShowSortDialog(null);
      return;
    }

    try {
      setIsSorting(true);
      // Ordenação sequencial natural por Marca (tag)
      const itensOrdenadosPorMarca = [...itens].sort((a, b) => {
        const marcaA = a.peca?.marca || '';
        const marcaB = b.peca?.marca || '';
        return marcaA.localeCompare(marcaB, undefined, { numeric: true, sensitivity: 'base' });
      });

      const itensOrdenados = itensOrdenadosPorMarca.map((item, index) => ({
        id: item.id,
        ordem_fabricacao: index + 1
      }));

      const primeiroItem = itens[0];
      if (primeiroItem?.prioridade_fabricacao_id) {
        const sucesso = await onReorderItems(primeiroItem.prioridade_fabricacao_id, itensOrdenados);
        if (sucesso) {
          toast.success(`Peças da prioridade ${codigo} ordenadas sequencialmente por marca!`);
        } else {
          toast.error(`Não foi possível salvar a nova ordenação da prioridade ${codigo}`);
        }
      }
    } catch (error) {
      console.error('Erro ao ordenar peças por marca:', error);
      toast.error('Ocorreu um erro ao tentar ordenar as peças');
    } finally {
      setIsSorting(false);
      setShowSortDialog(null);
    }
  };

  return (
    <>
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {['P1', 'P2', 'P3', 'P4'].map((codigo) => {
            const config = getPrioridadeConfig(codigo);
            const itens = itensPorPrioridade[codigo] || [];
            const itensFiltrados = filtrarItens(itens, filtrosPecas[codigo]);
            const pesoTotal = calcularPesoTotal(itens);
            const quantidadePecas = itens.length;

            return (
              <div key={codigo} className={`rounded-xl p-4 ${config.cor} min-h-[500px]`}>
                {/* Header do painel com título e badges */}
                <div className="flex flex-col gap-3 border-b-2 pb-3 mb-4">
                  <div className="flex items-center justify-between">
                    <h2 className={`text-sm font-bold ${config.textColor} truncate flex-1`}>
                      {config.nome}
                    </h2>
                    {itens.length > 0 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleShowDeleteAllDialog(codigo)}
                        className="h-6 w-6 p-0 hover:bg-red-100 dark:hover:bg-red-900/20 ml-2 flex-shrink-0"
                        title="Excluir todas as peças desta prioridade"
                      >
                        <X className="h-3 w-3 text-red-500" />
                      </Button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Badge className={`${config.badgeColor} text-xs px-2 py-1`}>
                      {quantidadePecas} peça{quantidadePecas !== 1 ? 's' : ''}
                    </Badge>
                    <Badge className={`${config.badgeColor} text-xs px-2 py-1`}>
                      {Math.round(pesoTotal)} kg
                    </Badge>
                  </div>
                </div>

                {/* Campo de filtro e botão de ordenação por marca */}
                <div className="mb-3 flex items-center gap-1.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filtrar peça..."
                      value={filtrosPecas[codigo]}
                      onChange={(e) => handleFiltroChange(codigo, e.target.value)}
                      className="pl-8 h-8 text-sm bg-background/50 border-input/50 focus:bg-background focus:border-input"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowSortDialog(codigo)}
                    disabled={itens.length <= 1 || isSorting}
                    className="h-8 px-2 bg-background/80 hover:bg-background border-input/50 text-xs font-medium flex items-center gap-1 shrink-0"
                    title="Ordenar sequencialmente por marca (tag)"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5 text-primary" />
                  </Button>
                </div>

                {/* Área de drop dos itens */}
                <Droppable droppableId={codigo}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`min-h-[300px] space-y-2 ${snapshot.isDraggingOver ? 'bg-blue-50/50 dark:bg-blue-900/20 rounded-lg' : ''}`}
                    >
                      {itensFiltrados.map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(provided, snapshot) => (
                            <Card
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              className={`${config.cardBorder} border-l-4 bg-card text-card-foreground ${snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'}`}
                            >
                              <CardContent className="p-2">
                                {/* Linha única compacta */}
                                <div className="flex items-center gap-2">
                                  <div
                                    {...provided.dragHandleProps}
                                    className="cursor-grab flex-shrink-0"
                                  >
                                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                                  </div>
                                  <span className="text-xs font-medium text-muted-foreground bg-muted px-1 py-0.5 rounded flex-shrink-0">
                                    {index + 1}
                                  </span>
                                  <span className="font-medium text-xs truncate flex-1">
                                    {item.peca?.marca || 'N/A'}
                                  </span>
                                  
                                  {editingItem === item.id ? (
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      <span className="text-xs text-muted-foreground">Qtd:</span>
                                      <Input
                                        type="number"
                                        min="1"
                                        max={item.peca?.quantidade || 999}
                                        value={editQuantity}
                                        onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                                        className="w-12 h-5 text-xs border-0 bg-background p-1"
                                      />
                                      <Button 
                                        size="sm" 
                                        onClick={() => handleSaveEdit(item)}
                                        className="h-5 w-5 p-0 text-xs bg-green-500 hover:bg-green-600"
                                      >
                                        ✓
                                      </Button>
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={handleCancelEdit}
                                        className="h-5 w-5 p-0 text-xs"
                                      >
                                        ✕
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className="text-xs text-muted-foreground">
                                        Qtd: <span className="font-medium text-foreground">{item.quantidade_priorizada}</span>
                                      </span>
                                      <span className="text-xs text-foreground font-medium">
                                        {Math.round(item.peso_total || 0)} kg
                                      </span>
                                      <span className="text-xs text-muted-foreground font-medium">
                                        {item.peca?.tem_componentes ? '(C/M)' : '(S/M)'}
                                      </span>
                                      <div className="flex gap-1">
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleStartEdit(item.id, item.quantidade_priorizada)}
                                          className="h-5 w-5 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                                        >
                                          <Edit className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => handleRemove(item.id)}
                                          className="h-5 w-5 p-0 hover:bg-red-100 dark:hover:bg-red-900/20"
                                          title="Excluir peça"
                                        >
                                          <Trash2 className="h-3 w-3 text-red-500" />
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {/* Estados vazios */}
                      {itensFiltrados.length === 0 && itens.length === 0 && (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                          Arraste peças aqui
                        </div>
                      )}

                      {itensFiltrados.length === 0 && itens.length > 0 && (
                        <div className="text-center text-muted-foreground py-8 text-sm">
                          Nenhuma peça encontrada
                        </div>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Dialog de confirmação para excluir todas as peças */}
      {/* Dialog de confirmação para exclusão de todas as peças */}
      <AlertDialog open={showDeleteAllDialog !== null} onOpenChange={handleCancelDeleteAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir todas as peças da prioridade {showDeleteAllDialog}?
              <br />
              <br />
              Esta ação irá remover {itensPorPrioridade[showDeleteAllDialog || '']?.length || 0} peça(s) desta prioridade.
              <br />
              <br />
              <strong>Validação de Segurança:</strong> Apenas peças da mesma OF e etapa/fase serão removidas.
              <br />
              <br />
              As peças removidas voltarão para a lista de peças disponíveis na tela "Selecionar Peças para Prioridade".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelDeleteAll}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => showDeleteAllDialog && handleDeleteAll(showDeleteAllDialog)}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir Todas
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de confirmação para ordenação por Marca */}
      <AlertDialog open={showSortDialog !== null} onOpenChange={() => setShowSortDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Ordenação por Marca</AlertDialogTitle>
            <AlertDialogDescription>
              Atenção: A ordem manual atual das peças da prioridade <strong>{showSortDialog}</strong> será perdida e substituída pela sequência ordenada de <strong>Marca (Tag)</strong>.
              <br /><br />
              Tem certeza que deseja aplicar esta ordenação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowSortDialog(null)} disabled={isSorting}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => showSortDialog && handleOrdenarPorMarca(showSortDialog)}
              disabled={isSorting}
              className="bg-primary hover:bg-primary/90"
            >
              {isSorting ? 'Ordenando...' : 'Ordenar por Marca'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
