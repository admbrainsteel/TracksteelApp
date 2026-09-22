
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';
import { Search, Package, Shield, AlertTriangle, Settings, Check, Loader2 } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { Peca } from '@/hooks/usePecas';
import { useComponentesPeca } from '@/hooks/useComponentesPeca';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ItemDisponivel {
  id: string;
  marca: string;
  descricao: string;
  perfil?: string;
  tipo: 'peca' | 'componente';
  quantidade_disponivel: number;
  processo_atual_permitido: number;
  nome_processo?: string;
}

interface ComponenteItemData {
  id: string;
  marca_componente: string;
  perfil?: string;
  peso_unitario?: number;
  quantidade_por_peca?: number;
  descricao?: string;
}

interface ApontamentoPecaRecord {
  id: string;
  quantidade_produzida: number;
  data_apontamento?: string;
  created_at: string;
  usuario_id?: string;
  processo?: { nome?: string; ordem?: number } | null;
  peca?: { marca?: string; of_number?: string } | null;
}

interface SeletorItensOtimizadoProps {
  pecasDisponiveis?: ItemDisponivel[];
  componentesDisponiveis?: ItemDisponivel[];
  itemSelecionado?: ItemDisponivel | null;
  onItemSelect?: (item: ItemDisponivel) => void;
  onBatchSelect?: (items: ItemDisponivel[], tipo: 'peca' | 'componente') => Promise<void>;
  onApontarItemDireto?: (item: ItemDisponivel, quantidade: number) => Promise<boolean>;
  loading?: boolean;
  onSelectPeca?: (peca: PecaWithComponents) => void;
  onSelectComponente?: (componente: ComponenteItemData) => void;
  pecaId?: string | null;
}

interface PecaWithComponents extends Peca {
  componentes?: ComponenteItemData[];
  processo_atual_permitido?: number;
}

export const SeletorItensOtimizado: React.FC<SeletorItensOtimizadoProps> = ({
  pecasDisponiveis = [],
  componentesDisponiveis = [],
  itemSelecionado,
  onItemSelect,
  onBatchSelect,
  onApontarItemDireto,
  loading = false,
  onSelectPeca, 
  onSelectComponente, 
  pecaId 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroNumeroPeca, setFiltroNumeroPeca] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 300);
  const [pecasFiltradas, setPecasFiltradas] = useState<PecaWithComponents[]>([]);
  const [loadingPecas, setLoadingPecas] = useState(false);
  const [loadingComponentes, setLoadingComponentes] = useState(false);
  const [componentes, setComponentes] = useState<ComponenteItemData[]>([]);

  // Estados locais para apontamento direto por card (quantidade, modo todas e loading)
  const [qtdCards, setQtdCards] = useState<Record<string, string>>({});
  const [todasCards, setTodasCards] = useState<Record<string, boolean>>({});
  const [loadingApontandoId, setLoadingApontandoId] = useState<string | null>(null);
  const [showComponentes, setShowComponentes] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Estados para funcionalidade administrativa
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedPecaForAdmin, setSelectedPecaForAdmin] = useState<ItemDisponivel | null>(null);
  const [apontamentosPeca, setApontamentosPeca] = useState<ApontamentoPecaRecord[]>([]);
  const [loadingApontamentos, setLoadingApontamentos] = useState(false);

  const { isAdmin } = useUserRole();
  const { fetchComponentesPeca } = useComponentesPeca();

  // Função para buscar apontamentos de uma peça específica
  const buscarApontamentosPeca = useCallback(async (peca: ItemDisponivel) => {
    setLoadingApontamentos(true);
    try {
      const { data, error } = await supabase
        .from('apontamentos_producao')
        .select(`
          id,
          quantidade_produzida,
          data_apontamento,
          created_at,
          processo:processos_fabricacao!apontamentos_producao_processo_id_fkey(nome, ordem),
          peca:pecas!apontamentos_producao_peca_id_fkey(marca, of_number)
        `)
        .eq('tipo_apontamento', 'peca')
        .eq('peca_id', peca.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar apontamentos da peça:', error);
        toast.error('Erro ao buscar apontamentos da peça');
        return;
      }

      setApontamentosPeca(data || []);
    } catch (error) {
      console.error('Erro ao buscar apontamentos:', error);
      toast.error('Erro ao buscar apontamentos');
    } finally {
      setLoadingApontamentos(false);
    }
  }, []);

  // Função para abrir o modal administrativo
  const handleAdminAction = useCallback(async (peca: ItemDisponivel) => {
    setSelectedPecaForAdmin(peca);
    setShowAdminModal(true);
    await buscarApontamentosPeca(peca);
  }, [buscarApontamentosPeca]);

  // Função para forçar exclusão da peça da tela
  const handleForceRemove = useCallback(async () => {
    if (!selectedPecaForAdmin) return;

    try {
      toast.success(`Peça ${selectedPecaForAdmin.marca} foi removida da exibição`);
      setShowAdminModal(false);
      setSelectedPecaForAdmin(null);
      setApontamentosPeca([]);
    } catch (error) {
      console.error('Erro ao remover peça:', error);
      toast.error('Erro ao remover peça da exibição');
    }
  }, [selectedPecaForAdmin]);

  const pecasOrdenadas = useMemo(() => {
    let pecasFiltradas = pecasDisponiveis;
    if (filtroNumeroPeca) {
      const termo = filtroNumeroPeca.toLowerCase().trim();
      pecasFiltradas = pecasDisponiveis.filter(peca => 
        peca.marca.toLowerCase().includes(termo) ||
        (peca.perfil && peca.perfil.toLowerCase().includes(termo)) ||
        (peca.descricao && peca.descricao.toLowerCase().includes(termo))
      );
    }
    return pecasFiltradas.sort((a, b) => a.marca.localeCompare(b.marca, undefined, { numeric: true, sensitivity: 'base' }));
  }, [pecasDisponiveis, filtroNumeroPeca]);

  const componentesOrdenados = useMemo(() => {
    let comps = componentesDisponiveis;
    if (filtroNumeroPeca) {
      const termo = filtroNumeroPeca.toLowerCase().trim();
      comps = componentesDisponiveis.filter(comp =>
        comp.marca.toLowerCase().includes(termo) ||
        (comp.perfil && comp.perfil.toLowerCase().includes(termo)) ||
        (comp.descricao && comp.descricao.toLowerCase().includes(termo))
      );
    }
    return comps.sort((a, b) => a.marca.localeCompare(b.marca, undefined, { numeric: true, sensitivity: 'base' }));
  }, [componentesDisponiveis, filtroNumeroPeca]);

  const handleQtdCardChange = useCallback((itemId: string, value: string) => {
    setQtdCards(prev => ({ ...prev, [itemId]: value }));
    setTodasCards(prev => ({ ...prev, [itemId]: false }));
  }, []);

  const handleToggleTodas = useCallback((itemId: string, qtdDisponivel: number) => {
    setTodasCards(prev => {
      const novoEstado = !prev[itemId];
      if (novoEstado) {
        setQtdCards(q => ({ ...q, [itemId]: qtdDisponivel.toString() }));
      } else {
        setQtdCards(q => ({ ...q, [itemId]: '' }));
      }
      return { ...prev, [itemId]: novoEstado };
    });
  }, []);

  const handleExecutarBaixa = useCallback(async (item: ItemDisponivel) => {
    if (!onApontarItemDireto) return;
    const isTodas = todasCards[item.id];
    const qtdDigitada = qtdCards[item.id];
    const quantidade = isTodas ? item.quantidade_disponivel : parseInt(qtdDigitada);

    if (isNaN(quantidade) || quantidade <= 0) {
      toast.error(`Informe a quantidade para ${item.marca} ou ative 'Todas'`);
      return;
    }

    if (quantidade > item.quantidade_disponivel) {
      toast.error(`Quantidade não pode ser maior que ${item.quantidade_disponivel} disponível`);
      return;
    }

    setLoadingApontandoId(item.id);
    try {
      const sucesso = await onApontarItemDireto(item, quantidade);
      if (sucesso) {
        setQtdCards(prev => {
          const copia = { ...prev };
          delete copia[item.id];
          return copia;
        });
        setTodasCards(prev => {
          const copia = { ...prev };
          delete copia[item.id];
          return copia;
        });
      }
    } finally {
      setLoadingApontandoId(null);
    }
  }, [onApontarItemDireto, todasCards, qtdCards]);

  const fetchPecas = useCallback(async (term: string) => {
    if (!term.trim()) {
      setPecasFiltradas([]);
      return;
    }
    try {
      setLoadingPecas(true);
    } catch (error) {
      console.error('Erro ao buscar peças:', error);
    } finally {
      setLoadingPecas(false);
    }
  }, []);

  const loadComponentes = useCallback(async (pecaId: string) => {
    try {
      setLoadingComponentes(true);
      const componentesData = await fetchComponentesPeca(pecaId);
      setComponentes(componentesData || []);
      setShowComponentes(true);
    } catch (error) {
      console.error('Erro ao carregar componentes:', error);
      toast.error('Erro ao carregar componentes da peça');
    } finally {
      setLoadingComponentes(false);
    }
  }, [fetchComponentesPeca]);

  useEffect(() => {
    if (onSelectPeca) {
      fetchPecas(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, fetchPecas, onSelectPeca]);

  useEffect(() => {
    if (pecaId && onSelectComponente) {
      loadComponentes(pecaId);
    }
  }, [pecaId, onSelectComponente, loadComponentes]);

  const handlePecaSelect = useCallback((peca: PecaWithComponents) => {
    if (onSelectPeca) {
      onSelectPeca(peca);
    } else if (onItemSelect) {
      const itemDisponivel: ItemDisponivel = {
        id: peca.id,
        marca: peca.marca,
        descricao: peca.descricao || '',
        tipo: 'peca',
        quantidade_disponivel: peca.quantidadeDisponivel || 0,
        processo_atual_permitido: peca.processo_atual_permitido || 0,
        nome_processo: (peca as any).nome_processo
      };
      onItemSelect(itemDisponivel);
    }
  }, [onSelectPeca, onItemSelect]);

  const handleComponenteSelect = useCallback((componente: ComponenteItemData) => {
    if (onSelectComponente) {
      onSelectComponente(componente);
    }
  }, [onSelectComponente]);

  const handleItemSelect = useCallback((item: ItemDisponivel) => {
    if (onItemSelect) {
      onItemSelect(item);
    }
  }, [onItemSelect]);

  const handleBatchApontamento = useCallback(async (tipo: 'peca' | 'componente') => {
    if (!onBatchSelect) return;

    try {
      const items = tipo === 'peca' ? pecasOrdenadas : componentesOrdenados;
      await onBatchSelect(items, tipo);
    } catch (error) {
      console.error('Erro no apontamento em lote:', error);
      toast.error('Erro ao realizar apontamento em lote');
    }
  }, [onBatchSelect, pecasOrdenadas, componentesOrdenados]);

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade?.toLowerCase()) {
      case 'alta': return 'text-red-600 dark:text-red-400';
      case 'média': return 'text-amber-600 dark:text-yellow-400';
      case 'baixa': return 'text-emerald-600 dark:text-green-400';
      default: return 'text-muted-foreground';
    }
  };

  const PecaItem = ({ peca, onSelect }: { peca: PecaWithComponents; onSelect: (peca: PecaWithComponents) => void }) => {
    return (
      <div className="p-2 border border-border bg-card hover:bg-accent/50 rounded-md cursor-pointer transition-colors"
           onClick={() => onSelect(peca)}>
        <div className="space-y-1">
          <div className="font-semibold text-sm text-foreground">{peca.marca}</div>
          <div className="text-xs text-muted-foreground">
            Prioridade: <span className={getPrioridadeColor(peca.prioridade)}>{peca.prioridade || 'N/A'}</span>
          </div>
          {peca.descricao && (
            <div className="text-xs text-muted-foreground truncate" title={peca.descricao}>
              {peca.descricao}
            </div>
          )}
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
            Qtd Disponível: {peca.quantidadeDisponivel || 0}
          </div>
        </div>
      </div>
    );
  };

  const ComponenteItem = ({ componente }: { componente: ComponenteItemData }) => (
    <div
      className="p-2 border border-border bg-card hover:bg-accent/50 rounded-md cursor-pointer transition-colors"
      onClick={() => handleComponenteSelect(componente)}
    >
      <div className="space-y-1">
        <div className="font-semibold text-sm text-foreground">{componente.marca_componente}</div>
        <div className="text-xs text-muted-foreground">
          Perfil: {componente.perfil || 'N/A'}
        </div>
        <div className="text-xs text-muted-foreground">
          Peso Unitário: {componente.peso_unitario || 0}kg | Qtd por Peça: {componente.quantidade_por_peca || 1}
        </div>
        {componente.descricao && (
          <div className="text-xs text-muted-foreground truncate" title={componente.descricao}>
            {componente.descricao}
          </div>
        )}
      </div>
    </div>
  );

  const ItemDisponivelComponent = ({ item, isSelected }: { item: ItemDisponivel; isSelected: boolean }) => {
    const isTodas = Boolean(todasCards[item.id]);
    const qtdValue = qtdCards[item.id] ?? (isTodas ? item.quantidade_disponivel.toString() : '');
    const isLoading = loadingApontandoId === item.id;

    return (
      <div className="relative">
        <div
          className={`p-3 border rounded-md transition-colors ${
            isSelected
              ? 'border-primary bg-primary/10 ring-1 ring-primary'
              : 'border-border bg-card hover:bg-accent/40'
          }`}
          onClick={() => handleItemSelect(item)}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                <span>{item.marca}</span>
                {item.perfil && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono font-normal">
                    {item.perfil}
                  </span>
                )}
              </div>
              <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {item.quantidade_disponivel} disponível
              </div>
            </div>

            {item.descricao && item.descricao !== item.perfil && (
              <div className="text-xs text-muted-foreground truncate" title={item.descricao}>
                {item.descricao}
              </div>
            )}

            {/* Linha com processo e controles rápidos de apontamento desenhados pelo usuário */}
            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <div className="text-xs text-muted-foreground font-medium">
                Processo: {item.nome_processo || item.processo_atual_permitido}
              </div>

              {onApontarItemDireto && (
                <div 
                  className="flex items-center gap-1.5 ml-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Input
                    type="number"
                    min="1"
                    max={item.quantidade_disponivel}
                    placeholder="Quant."
                    value={qtdValue}
                    onChange={(e) => handleQtdCardChange(item.id, e.target.value)}
                    disabled={isTodas || isLoading}
                    className="h-7 w-20 text-xs px-2 text-center font-medium bg-background border-input shadow-none"
                  />

                  <Button
                    type="button"
                    size="sm"
                    variant={isTodas ? "default" : "outline"}
                    onClick={() => handleToggleTodas(item.id, item.quantidade_disponivel)}
                    disabled={isLoading}
                    className={`h-7 px-2.5 text-xs font-semibold transition-colors ${
                      isTodas 
                        ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 shadow-sm" 
                        : "hover:bg-accent text-foreground"
                    }`}
                    title="Habilitar/desabilitar apontar todas as unidades disponíveis"
                  >
                    Todas
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    disabled={isLoading || (!isTodas && (!qtdValue || parseInt(qtdValue) <= 0))}
                    onClick={() => handleExecutarBaixa(item)}
                    className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-1 shadow-sm transition-all"
                    title="Baixar quantidade no apontamento"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Baixar</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <Button
            size="sm"
            variant="ghost"
            className="absolute top-2 right-2 h-6 w-6 p-0 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
            onClick={(e) => {
              e.stopPropagation();
              handleAdminAction(item);
            }}
            title="Verificar apontamentos e forçar exclusão"
          >
            <Settings className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  if (onSelectPeca) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Input
            type="text"
            placeholder="Buscar peças por marca, OF ou fase..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            ref={inputRef}
            className="bg-background border-input text-foreground placeholder:text-muted-foreground shadow-sm h-9"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {loadingPecas ? (
          <div className="text-center text-muted-foreground">Carregando peças...</div>
        ) : (
          <ScrollArea className="rounded-md border border-border h-[300px] p-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pecasFiltradas.map((peca) => (
                <PecaItem key={peca.id} peca={peca} onSelect={handlePecaSelect} />
              ))}
              {pecasFiltradas.length === 0 && (
                <div className="text-center text-muted-foreground col-span-full">
                  Nenhuma peça encontrada.
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {showComponentes && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">Componentes da Peça</h3>
            {loadingComponentes ? (
              <div className="text-center text-muted-foreground">Carregando componentes...</div>
            ) : (
              <ScrollArea className="rounded-md border border-border h-[200px] p-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {componentes.map((componente) => (
                    <ComponenteItem key={componente.id} componente={componente} />
                  ))}
                  {componentes.length === 0 && (
                    <div className="text-center text-muted-foreground col-span-full">
                      Nenhum componente cadastrado para esta peça.
                    </div>
                  )}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-muted-foreground">Carregando itens disponíveis...</div>
        ) : (
          <>
            {/* Seção de Peças Disponíveis */}
            {pecasDisponiveis.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Peças Disponíveis
                  </h3>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Filtrar por marca ou perfil..."
                      value={filtroNumeroPeca}
                      onChange={(e) => setFiltroNumeroPeca(e.target.value)}
                      className="bg-background border-input text-foreground placeholder:text-muted-foreground h-8 w-56 shadow-sm text-xs"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleBatchApontamento('peca')}
                      className="text-xs whitespace-nowrap"
                      disabled={pecasOrdenadas.length === 0}
                    >
                      Apontar Todas ({pecasOrdenadas.length})
                    </Button>

                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="text-xs whitespace-nowrap flex items-center gap-1"
                        title="Ferramenta administrativa para forçar exclusão de peças"
                      >
                        <Shield className="h-3 w-3" />
                        Admin
                      </Button>
                    )}
                  </div>
                </div>
                <ScrollArea className="rounded-md border border-border h-[300px] p-2">
                  <div className="space-y-2">
                    {pecasOrdenadas.map((item) => (
                      <div key={item.id} className="relative">
                        <ItemDisponivelComponent 
                          item={item}
                          isSelected={itemSelecionado?.id === item.id}
                        />

                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-6 w-6 p-0 text-orange-500 hover:text-orange-600 hover:bg-orange-500/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdminAction(item);
                            }}
                            title="Verificar apontamentos e forçar exclusão"
                          >
                            <AlertTriangle className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                    {pecasOrdenadas.length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        {filtroNumeroPeca ? 'Nenhuma peça encontrada com esse filtro.' : 'Nenhuma peça disponível.'}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Seção de Componentes Disponíveis */}
            {componentesDisponiveis.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground">Componentes Disponíveis</h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBatchApontamento('componente')}
                    className="text-xs"
                    disabled={componentesOrdenados.length === 0}
                  >
                    Apontar Todos ({componentesOrdenados.length})
                  </Button>
                </div>
                <ScrollArea className="rounded-md border border-border h-[300px] p-2">
                  <div className="space-y-2">
                    {componentesOrdenados.map((item) => (
                      <ItemDisponivelComponent 
                        key={item.id} 
                        item={item}
                        isSelected={itemSelecionado?.id === item.id}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}

            {/* Mensagem quando não há itens */}
            {pecasDisponiveis.length === 0 && componentesDisponiveis.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Nenhum item disponível para este processo.
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal Administrativo */}
      <Dialog open={showAdminModal} onOpenChange={setShowAdminModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-orange-400" />
              Ferramenta Administrativa - Forçar Exclusão
            </DialogTitle>
            <DialogDescription>
              Verificação de apontamentos e opção de forçar exclusão da peça da exibição atual.
            </DialogDescription>
          </DialogHeader>

          {selectedPecaForAdmin && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Informações da Peça</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="text-muted-foreground">Marca:</span> <span className="text-foreground font-medium">{selectedPecaForAdmin.marca}</span></div>
                  <div><span className="text-muted-foreground">Descrição:</span> <span className="text-foreground">{selectedPecaForAdmin.descricao}</span></div>
                  <div><span className="text-muted-foreground">Quantidade Disponível:</span> <span className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedPecaForAdmin.quantidade_disponivel}</span></div>
                  <div><span className="text-muted-foreground">Processo Atual:</span> <span className="text-primary font-medium">{selectedPecaForAdmin.nome_processo || selectedPecaForAdmin.processo_atual_permitido}</span></div>
                </div>
              </div>

              {loadingApontamentos ? (
                <div className="text-center text-muted-foreground py-4">
                  Carregando histórico de apontamentos...
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-semibold text-foreground">Histórico de Apontamentos ({apontamentosPeca.length})</h4>
                  
                  {apontamentosPeca.length > 0 ? (
                    <>
                      <div className="bg-orange-500/10 border border-orange-500/30 p-4 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                          <div>
                            <h5 className="font-semibold text-orange-600 dark:text-orange-400">Atenção!</h5>
                            <p className="text-sm text-muted-foreground mt-1">
                              Esta peça possui {apontamentosPeca.length} apontamento(s) registrado(s). 
                              Forçar a exclusão irá removê-la da exibição atual, mas não afetará os dados já salvos.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <ScrollArea className="h-[200px] border border-border rounded-lg p-3">
                        <div className="space-y-2">
                          {apontamentosPeca.map((apontamento, index) => (
                            <div key={apontamento.id || index} className="bg-card p-3 rounded border border-border">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="text-muted-foreground">Processo:</span> <span className="text-foreground font-medium">{apontamento.processo?.nome || 'N/A'}</span></div>
                                <div><span className="text-muted-foreground">Quantidade:</span> <span className="text-emerald-600 dark:text-emerald-400 font-bold">{apontamento.quantidade_produzida}</span></div>
                                <div><span className="text-muted-foreground">Data:</span> <span className="text-muted-foreground">{new Date(apontamento.created_at).toLocaleString('pt-BR')}</span></div>
                                <div><span className="text-muted-foreground">Usuário:</span> <span className="text-muted-foreground">{apontamento.usuario_id}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </>
                  ) : (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-lg">
                      <div className="text-emerald-600 dark:text-emerald-400 text-sm">
                        ✅ Nenhum apontamento encontrado para esta peça. É seguro removê-la da exibição.
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAdminModal(false);
                setSelectedPecaForAdmin(null);
                setApontamentosPeca([]);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleForceRemove()}
              disabled={loadingApontamentos}
            >
              Forçar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
