
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';
import { Search, Package, Shield, AlertTriangle, Settings } from 'lucide-react';
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

interface ItemDisponivel {
  id: string;
  marca: string;
  descricao: string;
  tipo: 'peca' | 'componente';
  quantidade_disponivel: number;
  processo_atual_permitido: number;
}

interface SeletorItensOtimizadoProps {
  pecasDisponiveis?: ItemDisponivel[];
  componentesDisponiveis?: ItemDisponivel[];
  itemSelecionado?: ItemDisponivel | null;
  onItemSelect?: (item: ItemDisponivel) => void;
  onBatchSelect?: (items: ItemDisponivel[], tipo: 'peca' | 'componente') => Promise<void>;
  loading?: boolean;
  onSelectPeca?: (peca: PecaWithComponents) => void;
  onSelectComponente?: (componente: any) => void;
  pecaId?: string | null;
}

interface PecaWithComponents extends Peca {
  componentes?: any[];
}

export const SeletorItensOtimizado: React.FC<SeletorItensOtimizadoProps> = ({
  pecasDisponiveis = [],
  componentesDisponiveis = [],
  itemSelecionado,
  onItemSelect,
  onBatchSelect,
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
  const [componentes, setComponentes] = useState<any[]>([]);
  const [showComponentes, setShowComponentes] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Estados para funcionalidade administrativa
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [selectedPecaForAdmin, setSelectedPecaForAdmin] = useState<ItemDisponivel | null>(null);
  const [apontamentosPeca, setApontamentosPeca] = useState<any[]>([]);
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
          processo:processos_fabricacao!processo_id(nome, ordem),
          peca:pecas!peca_id(marca, of_number)
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
      pecasFiltradas = pecasDisponiveis.filter(peca => 
        peca.marca.toLowerCase().includes(filtroNumeroPeca.toLowerCase())
      );
    }
    return pecasFiltradas.sort((a, b) => a.marca.localeCompare(b.marca));
  }, [pecasDisponiveis, filtroNumeroPeca]);

  const componentesOrdenados = useMemo(() => {
    return componentesDisponiveis.sort((a, b) => a.marca.localeCompare(b.marca));
  }, [componentesDisponiveis]);

  const fetchPecas = useCallback(async (term: string) => {
    if (!term.trim()) {
      setPecasFiltradas([]);
      return;
    }
    try {
      setLoadingPecas(true);
      // Implementar busca de peças aqui
    } catch (error) {
      console.error('Erro ao buscar peças:', error);
    } finally {
      setLoadingPecas(false);
    }
  }, []);

  useEffect(() => {
    if (onSelectPeca) {
      fetchPecas(debouncedSearchTerm);
    }
  }, [debouncedSearchTerm, fetchPecas, onSelectPeca]);

  useEffect(() => {
    if (pecaId && onSelectComponente) {
      loadComponentes(pecaId);
    }
  }, [pecaId, onSelectComponente]);

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
        processo_atual_permitido: (peca as any).processo_atual_permitido || 0
      };
      onItemSelect(itemDisponivel);
    }
  }, [onSelectPeca, onItemSelect]);

  const handleComponenteSelect = useCallback((componente: any) => {
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
      case 'alta': return 'text-red-400';
      case 'média': return 'text-yellow-400';
      case 'baixa': return 'text-green-400';
      default: return 'text-slate-400';
    }
  };

  const PecaItem = ({ peca, onSelect }: { peca: PecaWithComponents; onSelect: (peca: PecaWithComponents) => void }) => {
    return (
      <div className="p-2 border border-slate-600 rounded-md hover:bg-slate-700/50 cursor-pointer transition-colors"
           onClick={() => onSelect(peca)}>
        <div className="space-y-1">
          <div className="font-medium text-sm text-blue-300">{peca.marca}</div>
          <div className="text-xs text-slate-400">
            Prioridade: <span className={getPrioridadeColor(peca.prioridade)}>{peca.prioridade || 'N/A'}</span>
          </div>
          {peca.descricao && (
            <div className="text-xs text-slate-400 truncate" title={peca.descricao}>
              {peca.descricao}
            </div>
          )}
          <div className="text-xs text-green-400">
            Qtd Disponível: {peca.quantidadeDisponivel || 0}
          </div>
        </div>
      </div>
    );
  };

  const ComponenteItem = ({ componente }: { componente: any }) => (
    <div
      className="p-2 border border-slate-600 rounded-md hover:bg-slate-700/50 cursor-pointer transition-colors"
      onClick={() => handleComponenteSelect(componente)}
    >
      <div className="space-y-1">
        <div className="font-medium text-sm text-blue-300">{componente.marca_componente}</div>
        <div className="text-xs text-slate-400">
          Perfil: {componente.perfil || 'N/A'}
        </div>
        <div className="text-xs text-slate-400">
          Peso Unitário: {componente.peso_unitario || 0}kg | Qtd por Peça: {componente.quantidade_por_peca || 1}
        </div>
        {componente.descricao && (
          <div className="text-xs text-slate-400 truncate" title={componente.descricao}>
            {componente.descricao}
          </div>
        )}
      </div>
    </div>
  );

  const ItemDisponivelComponentBase = ({ item, isSelected }: { item: ItemDisponivel; isSelected: boolean }) => {
    return (
      <div 
        className={`p-3 border rounded-md cursor-pointer transition-colors relative ${
          isSelected 
            ? 'border-blue-500 bg-blue-900/20' 
            : 'border-slate-600 hover:bg-slate-700/50'
        }`}
        onClick={() => handleItemSelect(item)}
      >
        <div className="space-y-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-medium text-sm text-blue-300">{item.marca}</div>
              <div className="text-xs text-slate-400 mt-1">
                {item.descricao}
              </div>
            </div>
            
            {/* Botão administrativo - DISPONÍVEL PARA TODAS AS PEÇAS */}
            {isAdmin && item.tipo === 'peca' && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0 text-orange-400 hover:text-orange-300 hover:bg-orange-900/20 ml-2"
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
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-green-400 font-bold">
              Disponível: {item.quantidade_disponivel}
            </span>
            <span className="text-slate-400">
              Processo: {item.processo_atual_permitido}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const ItemDisponivelComponent = React.memo(({ item, isSelected }: { item: ItemDisponivel; isSelected: boolean }) => (
    <div className="relative">
      <div
        className={`p-3 border rounded-md cursor-pointer transition-colors ${
          isSelected
            ? 'border-blue-500 bg-blue-900/20'
            : 'border-slate-600 hover:bg-slate-700/50'
        }`}
        onClick={() => handleItemSelect(item)}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-medium text-sm text-blue-300">{item.marca}</div>
            <div className="text-xs text-green-400 font-bold">
              {item.quantidade_disponivel} disponível
            </div>
          </div>
          {item.descricao && (
            <div className="text-xs text-slate-400 truncate" title={item.descricao}>
              {item.descricao}
            </div>
          )}
          <div className="text-xs text-slate-500">
            Processo: {item.processo_atual_permitido}
          </div>
        </div>
      </div>

      {isAdmin && (
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 h-6 w-6 p-0 text-orange-400 hover:text-orange-300 hover:bg-orange-900/20"
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
  ));

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
            className="bg-slate-800 border-slate-700 text-slate-300 placeholder-slate-500 shadow-none focus-visible:ring-slate-600 h-9"
          />
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-500" />
        </div>

        {loadingPecas ? (
          <div className="text-center text-slate-400">Carregando peças...</div>
        ) : (
          <ScrollArea className="rounded-md border border-slate-700 h-[300px] p-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pecasFiltradas.map((peca) => (
                <PecaItem key={peca.id} peca={peca} onSelect={handlePecaSelect} />
              ))}
              {pecasFiltradas.length === 0 && (
                <div className="text-center text-slate-400 col-span-full">
                  Nenhuma peça encontrada.
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {showComponentes && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-slate-300">Componentes da Peça</h3>
            {loadingComponentes ? (
              <div className="text-center text-slate-400">Carregando componentes...</div>
            ) : (
              <ScrollArea className="rounded-md border border-slate-700 h-[200px] p-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {componentes.map((componente) => (
                    <ComponenteItem key={componente.id} componente={componente} />
                  ))}
                  {componentes.length === 0 && (
                    <div className="text-center text-slate-400 col-span-full">
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
          <div className="text-center text-slate-400">Carregando itens disponíveis...</div>
        ) : (
          <>
            {/* Seção de Peças Disponíveis */}
            {pecasDisponiveis.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <h3 className="text-lg font-semibold text-slate-300 flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Peças Disponíveis
                  </h3>
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="Filtrar por número da peça..."
                      value={filtroNumeroPeca}
                      onChange={(e) => setFiltroNumeroPeca(e.target.value)}
                      className="bg-slate-800 border-slate-700 text-slate-300 placeholder-slate-500 h-8 w-48"
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
                <ScrollArea className="rounded-md border border-slate-700 h-[300px] p-2">
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
                            className="absolute top-2 right-2 h-6 w-6 p-0 text-orange-400 hover:text-orange-300 hover:bg-orange-900/20"
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
                      <div className="text-center text-slate-400 py-8">
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
                  <h3 className="text-lg font-semibold text-slate-300">Componentes Disponíveis</h3>
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
                <ScrollArea className="rounded-md border border-slate-700 h-[300px] p-2">
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
              <div className="text-center text-slate-400 py-8">
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
              <div className="bg-slate-800 p-4 rounded-lg">
                <h4 className="font-semibold text-slate-300 mb-2">Informações da Peça</h4>
                <div className="space-y-1 text-sm">
                  <div><span className="text-slate-400">Marca:</span> <span className="text-slate-200">{selectedPecaForAdmin.marca}</span></div>
                  <div><span className="text-slate-400">Descrição:</span> <span className="text-slate-200">{selectedPecaForAdmin.descricao}</span></div>
                  <div><span className="text-slate-400">Quantidade Disponível:</span> <span className="text-green-400 font-bold">{selectedPecaForAdmin.quantidade_disponivel}</span></div>
                  <div><span className="text-slate-400">Processo Atual:</span> <span className="text-blue-400">{selectedPecaForAdmin.processo_atual_permitido}</span></div>
                </div>
              </div>

              {loadingApontamentos ? (
                <div className="text-center text-slate-400 py-4">
                  Carregando histórico de apontamentos...
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-300">Histórico de Apontamentos ({apontamentosPeca.length})</h4>
                  
                  {apontamentosPeca.length > 0 ? (
                    <>
                      <div className="bg-orange-900/20 border border-orange-700 p-4 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-orange-400 mt-0.5" />
                          <div>
                            <h5 className="font-semibold text-orange-300">Atenção!</h5>
                            <p className="text-sm text-orange-200 mt-1">
                              Esta peça possui {apontamentosPeca.length} apontamento(s) registrado(s). 
                              Forçar a exclusão irá removê-la da exibição atual, mas não afetará os dados já salvos.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <ScrollArea className="h-[200px] border border-slate-700 rounded-lg p-3">
                        <div className="space-y-2">
                          {apontamentosPeca.map((apontamento, index) => (
                            <div key={apontamento.id || index} className="bg-slate-800 p-3 rounded border border-slate-600">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="text-slate-400">Processo:</span> <span className="text-blue-300">{apontamento.processos?.nome || 'N/A'}</span></div>
                                <div><span className="text-slate-400">Quantidade:</span> <span className="text-green-400">{apontamento.quantidade_produzida}</span></div>
                                <div><span className="text-slate-400">Data:</span> <span className="text-slate-300">{new Date(apontamento.created_at).toLocaleString('pt-BR')}</span></div>
                                <div><span className="text-slate-400">Usuário:</span> <span className="text-slate-300">{apontamento.usuario_id}</span></div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </>
                  ) : (
                    <div className="bg-green-900/20 border border-green-700 p-4 rounded-lg">
                      <div className="text-green-300 text-sm">
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
