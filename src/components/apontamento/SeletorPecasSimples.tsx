
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Search, CheckSquare, Loader2, Weight, Info, ArrowUpDown, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { applyMarcaFilter } from '@/utils/rangeFilter';
import { naturalSort } from '@/utils/naturalSort';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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

interface ItemDisponivel {
  id: string;
  marca: string;
  descricao: string;
  tipo: 'peca' | 'componente';
  quantidade_disponivel: number;
  processo_atual_permitido: number;
  peso_unitario?: number;
}

interface SeletorPecasSimplesProps {
  pecasDisponiveis: ItemDisponivel[];
  componentesDisponiveis: ItemDisponivel[];
  onItemSelect: (item: ItemDisponivel) => void;
  onBatchSelect: (items: ItemDisponivel[], tipo: 'peca' | 'componente') => void;
  loading: boolean;
  onSubmit?: () => void;
  submitDisabled?: boolean;
  submitLoading?: boolean;
  // Props para o botão de desfazer
  canUndo?: boolean;
  onUndo?: () => void;
  undoLoading?: boolean;
  lastApontamentoId?: string;
}

export const SeletorPecasSimples: React.FC<SeletorPecasSimplesProps> = ({
  pecasDisponiveis = [],
  componentesDisponiveis = [],
  onItemSelect,
  onBatchSelect,
  loading,
  onSubmit,
  submitDisabled = false,
  submitLoading = false,
  canUndo = false,
  onUndo,
  undoLoading = false,
  lastApontamentoId
}) => {
  const [filtro, setFiltro] = useState('');
  const [activeTab, setActiveTab] = useState('pecas');
  const [itemSelecionado, setItemSelecionado] = useState<ItemDisponivel | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Filtrar e ordenar peças com suporte a range
  const pecasFiltradas = useMemo(() => {
    let pecas = pecasDisponiveis;
    if (filtro) {
      pecas = pecasDisponiveis.filter(peca =>
        applyMarcaFilter(peca.marca, filtro) ||
        peca.descricao.toLowerCase().includes(filtro.toLowerCase())
      );
    }
    
    // Ordenar numericamente usando naturalSort
    return [...pecas].sort((a, b) => {
      const comparison = naturalSort(a.marca, b.marca);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [pecasDisponiveis, filtro, sortOrder]);

  // Filtrar e ordenar componentes com suporte a range
  const componentesFiltrados = useMemo(() => {
    let componentes = componentesDisponiveis;
    if (filtro) {
      componentes = componentesDisponiveis.filter(comp =>
        applyMarcaFilter(comp.marca, filtro) ||
        comp.descricao.toLowerCase().includes(filtro.toLowerCase())
      );
    }
    
    // Ordenar numericamente usando naturalSort
    return [...componentes].sort((a, b) => {
      const comparison = naturalSort(a.marca, b.marca);
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [componentesDisponiveis, filtro, sortOrder]);

  // Calcular peso total das peças disponíveis/filtradas
  const pesoTotalPecas = useMemo(() => {
    return pecasFiltradas.reduce((total, peca) => {
      const pesoUnitario = peca.peso_unitario || 0;
      return total + (pesoUnitario * peca.quantidade_disponivel);
    }, 0);
  }, [pecasFiltradas]);

  // Calcular peso total dos componentes disponíveis/filtrados
  const pesoTotalComponentes = useMemo(() => {
    return componentesFiltrados.reduce((total, comp) => {
      const pesoUnitario = comp.peso_unitario || 0;
      return total + (pesoUnitario * comp.quantidade_disponivel);
    }, 0);
  }, [componentesFiltrados]);

  const handleItemClick = (item: ItemDisponivel) => {
    setItemSelecionado(item);
    onItemSelect(item);
  };

  const handleBatchPecas = () => {
    if (pecasFiltradas.length === 0) {
      toast.error('Nenhuma peça disponível para apontamento em lote');
      return;
    }
    onBatchSelect(pecasFiltradas, 'peca');
  };

  const handleBatchComponentes = () => {
    if (componentesFiltrados.length === 0) {
      toast.error('Nenhum componente disponível para apontamento em lote');
      return;
    }
    onBatchSelect(componentesFiltrados, 'componente');
  };

  const formatarPeso = (peso: number) => {
    return peso.toFixed(2);
  };

  const handleToggleSort = () => {
    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
  };

  if (loading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Carregando itens disponíveis...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-card-foreground flex items-center gap-2 text-lg">
            <Package className="h-5 w-5" />
            Itens Disponíveis
          </CardTitle>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleSort}
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Ordenar {sortOrder === 'asc' ? 'crescente' : 'decrescente'}</p>
                  <p className="text-xs text-muted-foreground">Clique para alternar</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {/* Botão Desfazer Último Apontamento */}
            {onUndo && (
              <AlertDialog>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={!canUndo || undoLoading}
                          className="border-orange-200 text-orange-600 hover:bg-orange-50 hover:text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {undoLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Undo2 className="h-4 w-4 mr-2" />
                          )}
                          {undoLoading ? 'Desfazendo...' : 'Desfazer Ult. Apont.'}
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Desfazer o último apontamento realizado</p>
                      <p className="text-xs text-muted-foreground">
                        {canUndo ? 'Clique para desfazer' : 'Nenhum apontamento para desfazer'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Reversão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja desfazer o último apontamento?
                      <br />
                      <strong>Esta ação não pode ser desfeita.</strong>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onUndo}
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Confirmar Reversão
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            {onSubmit && (
              <Button 
                onClick={onSubmit}
                disabled={submitDisabled || submitLoading}
                className="min-w-32"
              >
                {submitLoading ? 'Salvando...' : 'Registrar Apontamento'}
              </Button>
            )}
          </div>
        </div>
        
        {/* Campo de busca com tooltip */}
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por número da peça... (ex: 32@47)"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            className="pl-10 pr-8 bg-background border-border"
          />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="absolute right-3 top-3 h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm space-y-1">
                  <p><strong>Filtro por range:</strong></p>
                  <p>Use @ para filtrar intervalos</p>
                  <p><strong>Exemplo:</strong> 32@47 (peças de 32 a 47)</p>
                  <p><strong>Busca normal:</strong> Digite parte da marca</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-muted border-border">
            <TabsTrigger 
              value="pecas" 
              className="flex-1 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <Package className="h-4 w-4 mr-2" />
              Peças ({pecasFiltradas.length}) - {formatarPeso(pesoTotalPecas)} kg
              <Weight className="h-3 w-3 ml-1 text-muted-foreground" />
            </TabsTrigger>
            <TabsTrigger 
              value="componentes" 
              className="flex-1 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              <Package className="h-4 w-4 mr-2" />
              Componentes ({componentesFiltrados.length}) - {formatarPeso(pesoTotalComponentes)} kg
              <Weight className="h-3 w-3 ml-1 text-muted-foreground" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pecas" className="space-y-3 mt-4">
            {pecasFiltradas.length > 0 && (
              <Button
                onClick={handleBatchPecas}
                variant="outline"
                size="sm"
                className="w-full border-border hover:bg-muted"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Apontar Todas as Peças ({pecasFiltradas.length})
              </Button>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {pecasFiltradas.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma peça disponível</p>
                </div>
              ) : (
                pecasFiltradas.map((peca) => (
                  <div
                    key={peca.id}
                    onClick={() => handleItemClick(peca)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      itemSelecionado?.id === peca.id
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-background border-border hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-primary" />
                        <div>
                          <div className="font-medium">{peca.marca}</div>
                          <div className="text-sm text-muted-foreground">{peca.descricao}</div>
                          {peca.peso_unitario && (
                            <div className="text-xs text-muted-foreground">
                              Peso unitário: {formatarPeso(peca.peso_unitario)} kg
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                        {peca.quantidade_disponivel} un.
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="componentes" className="space-y-3 mt-4">
            {componentesFiltrados.length > 0 && (
              <Button
                onClick={handleBatchComponentes}
                variant="outline"
                size="sm"
                className="w-full border-border hover:bg-muted"
              >
                <CheckSquare className="h-4 w-4 mr-2" />
                Apontar Todos os Componentes ({componentesFiltrados.length})
              </Button>
            )}

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {componentesFiltrados.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum componente disponível</p>
                </div>
              ) : (
                componentesFiltrados.map((comp) => (
                  <div
                    key={comp.id}
                    onClick={() => handleItemClick(comp)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all duration-200 ${
                      itemSelecionado?.id === comp.id
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-background border-border hover:bg-muted text-foreground'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Package className="h-4 w-4 text-orange-500" />
                        <div>
                          <div className="font-medium">{comp.marca}</div>
                          <div className="text-sm text-muted-foreground">{comp.descricao}</div>
                          {comp.peso_unitario && (
                            <div className="text-xs text-muted-foreground">
                              Peso unitário: {formatarPeso(comp.peso_unitario)} kg
                            </div>
                          )}
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-secondary text-secondary-foreground">
                        {comp.quantidade_disponivel} un.
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
