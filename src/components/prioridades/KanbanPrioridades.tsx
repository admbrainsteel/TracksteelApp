
import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ItemPrioridade } from '@/hooks/usePrioridadesFabricacao';
import { usePrioridades } from '@/hooks/usePrioridades';
import { Edit, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface KanbanPrioridadesProps {
  itensPorPrioridade: { [key: string]: ItemPrioridade[] };
  onUpdateQuantidade: (itemId: string, novaQuantidade: number, pesoUnitario: number) => Promise<boolean>;
  onRemoverItem: (itemId: string) => Promise<boolean>;
  onTransferirItem: (itemId: string, novaPrioridadeId: string) => Promise<boolean>;
  onReorderItems: (prioridadeId: string, itensOrdenados: { id: string; ordem_fabricacao: number }[]) => Promise<boolean>;
}

export const KanbanPrioridades: React.FC<KanbanPrioridadesProps> = ({
  itensPorPrioridade,
  onUpdateQuantidade,
  onRemoverItem,
  onTransferirItem,
  onReorderItems
}) => {
  const { prioridades } = usePrioridades();
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);

  const getPrioridadeConfig = (codigo: string) => {
    switch (codigo) {
      case 'P1':
        return { nome: 'P1 - Urgente', cor: 'bg-red-50 border-red-200', cardBorder: 'border-l-red-500', textColor: 'text-red-800', badgeColor: 'bg-red-100 text-red-700' };
      case 'P2':
        return { nome: 'P2 - Alta', cor: 'bg-orange-50 border-orange-200', cardBorder: 'border-l-orange-500', textColor: 'text-orange-800', badgeColor: 'bg-orange-100 text-orange-700' };
      case 'P3':
        return { nome: 'P3 - Média', cor: 'bg-blue-50 border-blue-200', cardBorder: 'border-l-blue-500', textColor: 'text-blue-800', badgeColor: 'bg-blue-100 text-blue-700' };
      case 'P4':
        return { nome: 'P4 - Baixa', cor: 'bg-gray-200 border-gray-300', cardBorder: 'border-l-gray-500', textColor: 'text-gray-800', badgeColor: 'bg-gray-300 text-gray-700' };
      default:
        return { nome: 'Desconhecida', cor: 'bg-gray-50 border-gray-200', cardBorder: 'border-l-gray-500', textColor: 'text-gray-800', badgeColor: 'bg-gray-100 text-gray-700' };
    }
  };

  const calcularPesoTotal = (itens: ItemPrioridade[]) => {
    return itens.reduce((total, item) => total + (item.peso_total || 0), 0);
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    // Se moveu para uma coluna diferente (transferência)
    if (source.droppableId !== destination.droppableId) {
      const novaPrioridadeConfig = prioridades.find(p => p.codigo === destination.droppableId);
      if (!novaPrioridadeConfig) return;

      const sucesso = await onTransferirItem(draggableId, novaPrioridadeConfig.id);
      if (sucesso) {
        toast.success('Peça transferida com sucesso!');
      }
    } 
    // Se mudou apenas a ordem dentro da mesma coluna
    else if (source.index !== destination.index) {
      const itens = itensPorPrioridade[source.droppableId] || [];
      const novaOrdem = Array.from(itens);
      const [itemMovido] = novaOrdem.splice(source.index, 1);
      novaOrdem.splice(destination.index, 0, itemMovido);

      const itensOrdenados = novaOrdem.map((item, index) => ({
        id: item.id,
        ordem_fabricacao: index + 1
      }));

      const prioridadeConfig = prioridades.find(p => p.codigo === source.droppableId);
      if (prioridadeConfig) {
        await onReorderItems(prioridadeConfig.id, itensOrdenados);
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

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {['P1', 'P2', 'P3', 'P4'].map((codigo) => {
          const config = getPrioridadeConfig(codigo);
          const itens = itensPorPrioridade[codigo] || [];
          const pesoTotal = calcularPesoTotal(itens);

          return (
            <div key={codigo} className={`rounded-xl p-4 ${config.cor}`}>
              <div className="flex justify-between items-center border-b-2 pb-2 mb-4">
                <h2 className={`text-lg font-bold ${config.textColor}`}>
                  {config.nome}
                </h2>
                <Badge className={`${config.badgeColor}`}>
                  {pesoTotal.toFixed(1)} kg
                </Badge>
              </div>

              <Droppable droppableId={codigo}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`min-h-96 space-y-3 ${snapshot.isDraggingOver ? 'bg-blue-50/50 rounded-lg' : ''}`}
                  >
                    {itens.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`${config.cardBorder} border-l-4 ${snapshot.isDragging ? 'shadow-lg' : 'shadow-sm'}`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between mb-2">
                                <div
                                  {...provided.dragHandleProps}
                                  className="flex items-center gap-2 cursor-grab"
                                >
                                  <GripVertical className="h-4 w-4 text-gray-400" />
                                  <span className="font-medium">
                                    {item.peca?.marca}
                                  </span>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleStartEdit(item.id, item.quantidade_priorizada)}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemove(item.id)}
                                  >
                                    <Trash2 className="h-3 w-3 text-red-500" />
                                  </Button>
                                </div>
                              </div>

                              {item.peca?.descricao && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {item.peca.descricao}
                                </p>
                              )}

                              <div className="flex justify-between items-center">
                                {editingItem === item.id ? (
                                  <div className="flex gap-1 items-center">
                                    <Input
                                      type="number"
                                      min="1"
                                      max={item.peca?.quantidade || 999}
                                      value={editQuantity}
                                      onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                                      className="w-16 h-8"
                                    />
                                    <Button size="sm" onClick={() => handleSaveEdit(item)}>
                                      ✓
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                                      ✕
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-sm">
                                    Qtd: {item.quantidade_priorizada}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {item.peso_total?.toFixed(1)} kg
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {itens.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        Arraste peças aqui
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
  );
};
