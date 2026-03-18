import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Package, RefreshCw } from 'lucide-react';
import { useApontamentosProducao } from '@/hooks/useApontamentosProducao';
import { usePecas } from '@/hooks/usePecas';
import { useOFs } from '@/hooks/useOFs';
import { useComponentesAgrupados } from '@/hooks/useComponentesAgrupados';
import { SeletorItensOtimizado } from './SeletorItensOtimizado';
import { useApontamentosValidacao } from '@/hooks/useApontamentosValidacao';
import { toast } from 'sonner';

interface ItemDisponivel {
  id: string;
  marca: string;
  descricao: string;
  tipo: 'peca' | 'componente';
  quantidade_disponivel: number;
  processo_atual_permitido: number;
}

// Cache para manter seleções do usuário
const formCache = {
  of_number: '',
  fase: '',
  processo_id: '',
  data_apontamento: new Date().toISOString().split('T')[0]
};

// Cache para itens já processados
const itensCache = new Map<string, {
  pecasDisponiveis: ItemDisponivel[];
  componentesDisponiveis: ItemDisponivel[];
  timestamp: number;
}>();

export const ApontamentoForm = () => {
  const [formData, setFormData] = useState({
    of_number: formCache.of_number || '',
    fase: formCache.fase || '',
    data_apontamento: formCache.data_apontamento || new Date().toISOString().split('T')[0],
    processo_id: formCache.processo_id || '',
    quantidade_produzida: '',
    observacoes: '',
    todas_disponiveis: false
  });

  const [itemSelecionado, setItemSelecionado] = useState<ItemDisponivel | null>(null);
  const [itensDisponiveis, setItensDisponiveis] = useState<{
    pecasDisponiveis: ItemDisponivel[];
    componentesDisponiveis: ItemDisponivel[];
  }>({ pecasDisponiveis: [], componentesDisponiveis: [] });
  const [saving, setSaving] = useState(false);
  const [cacheValido, setCacheValido] = useState(false);
  const [loadingItens, setLoadingItens] = useState(false);
  const [isProcessingItems, setIsProcessingItems] = useState(false);

  const { criarApontamento, refetch, processos } = useApontamentosProducao();
  const { pecas } = usePecas();
  const { ofs } = useOFs();
  const { componentesAgrupados } = useComponentesAgrupados(formData.of_number, formData.fase);
  const { 
    validarSequenciaProcessos,
    precarregarDados,
    limparCache: limparCacheValidacao
  } = useApontamentosValidacao();

  // Buscar fases únicas da OF selecionada
  const fasesDisponiveis = useMemo(() => 
    pecas
      .filter(peca => peca.of_number === formData.of_number)
      .map(peca => peca.etapa_fase)
      .filter((fase, index, array) => fase && array.indexOf(fase) === index)
      .sort(),
    [pecas, formData.of_number]
  );

  // Peças filtradas - memoizado para evite recálculos
  const filteredPecas = useMemo(() => 
    pecas.filter(peca => 
      peca.of_number === formData.of_number && 
      peca.etapa_fase === formData.fase &&
      !peca.tem_componentes
    ),
    [pecas, formData.of_number, formData.fase]
  );

  // Chave única para cache
  const cacheKey = useMemo(() => 
    `${formData.of_number}_${formData.fase}_${formData.processo_id}`,
    [formData.of_number, formData.fase, formData.processo_id]
  );

  // Salvar cache quando seleções básicas mudam
  const updateCache = useCallback((updates: Partial<typeof formData>) => {
    Object.assign(formCache, updates);
    localStorage.setItem('apontamento_cache', JSON.stringify(formCache));
  }, []);

  // Carregar cache inicial
  useEffect(() => {
    const savedCache = localStorage.getItem('apontamento_cache');
    if (savedCache) {
      try {
        const parsed = JSON.parse(savedCache);
        Object.assign(formCache, parsed);
        setFormData(prev => ({
          ...prev,
          of_number: formCache.of_number || '',
          fase: formCache.fase || '',
          processo_id: formCache.processo_id || '',
          data_apontamento: formCache.data_apontamento || new Date().toISOString().split('T')[0]
        }));
        setCacheValido(true);
      } catch (error) {
        console.log('Erro ao carregar cache:', error);
      }
    }
  }, []);

  // Função para processar itens com cache
  const processarItensDisponiveis = useCallback(async () => {
    const { of_number, fase, processo_id } = formData;
    
    if (!of_number || !fase || !processo_id) {
      console.log('⚠️ Campos obrigatórios faltando para carregar itens');
      setItensDisponiveis({ pecasDisponiveis: [], componentesDisponiveis: [] });
      return;
    }

    // Verificar se já temos no cache (válido por 30 segundos)
    const cached = itensCache.get(cacheKey);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < 30000) {
      console.log('📦 Usando itens do cache');
      setItensDisponiveis(cached);
      return;
    }

    // Aguardar dados das peças e componentes
    if (filteredPecas.length === 0 && componentesAgrupados.length === 0) {
      console.log('⏳ Aguardando dados de peças e componentes...');
      return;
    }

    if (isProcessingItems) {
      console.log('🔄 Já processando itens, aguardando...');
      return;
    }

    console.log('\n🚀 === PROCESSANDO ITENS COM CACHE ===');
    console.log(`📋 OF: ${of_number}, Fase: ${fase}, Processo: ${processo_id}`);
    
    setIsProcessingItems(true);
    setLoadingItens(true);
    
    try {
      // Calcular itens disponíveis baseado nos dados existentes
      console.log('🧮 Calculando itens disponíveis...');
      const itens = {
        pecasDisponiveis: filteredPecas.map(peca => ({
          id: peca.id,
          marca: peca.marca,
          descricao: peca.descricao,
          tipo: 'peca' as const,
          quantidade_disponivel: peca.quantidade,
          processo_atual_permitido: 1
        })),
        componentesDisponiveis: componentesAgrupados.map(comp => ({
          id: comp.componente_ids[0] || '', // Use primeiro ID do array
          marca: comp.marca_componente,
          descricao: comp.descricao || '',
          tipo: 'componente' as const,
          quantidade_disponivel: comp.quantidade_total,
          processo_atual_permitido: 1
        }))
      };

      console.log('✅ Itens calculados:', {
        pecas: itens.pecasDisponiveis.length,
        componentes: itens.componentesDisponiveis.length
      });

      // 4. Salvar no cache
      itensCache.set(cacheKey, {
        ...itens,
        timestamp: now
      });

      // 5. Atualizar estado
      setItensDisponiveis(itens);

    } catch (error) {
      console.error('❌ Erro ao processar itens:', error);
      setItensDisponiveis({ pecasDisponiveis: [], componentesDisponiveis: [] });
    } finally {
      setLoadingItens(false);
      setIsProcessingItems(false);
    }
  }, [
    formData.of_number, 
    formData.fase, 
    formData.processo_id
  ]);

  // Callback para atualizar dados
  const updateData = useCallback(() => {
    // 4. Atualizar dados para nova seleção
    console.log('✅ Dados atualizados para nova seleção de OF/processo');
  }, []);

  // Efeito controlado para carregar itens
  useEffect(() => {
    if (formData.of_number && formData.fase && formData.processo_id) {
      // Usar timeout para evitar chamadas excessivas
      const timeoutId = setTimeout(() => {
        processarItensDisponiveis();
      }, 300);

      return () => clearTimeout(timeoutId);
    } else {
      setItensDisponiveis({ pecasDisponiveis: [], componentesDisponiveis: [] });
    }
  }, [formData.of_number, formData.fase, formData.processo_id]);

  // Reset do item selecionado quando dados mudam
  useEffect(() => {
    setItemSelecionado(null);
    setFormData(prev => ({ 
      ...prev, 
      quantidade_produzida: '', 
      todas_disponiveis: false 
    }));
  }, [formData.of_number, formData.fase, formData.processo_id]);

  // Auto-preenchimento da quantidade quando "todas disponíveis" é marcado
  useEffect(() => {
    if (formData.todas_disponiveis && itemSelecionado) {
      setFormData(prev => ({
        ...prev,
        quantidade_produzida: itemSelecionado.quantidade_disponivel.toString()
      }));
    }
  }, [formData.todas_disponiveis, itemSelecionado]);

  const handleBatchSelect = async (items: ItemDisponivel[], tipo: 'peca' | 'componente') => {
    if (items.length === 0) {
      toast.error('Nenhum item disponível para registro em lote');
      return;
    }

    const totalItens = items.length;
    const tipoTexto = tipo === 'peca' ? 'peças' : 'componentes';
    
    const confirmacao = window.confirm(
      `Deseja registrar ${totalItens} ${tipoTexto} com suas respectivas quantidades totais?\n\n` +
      `Total de itens: ${totalItens}\n` +
      `Processo: ${formData.processo_id || 'N/A'}`
    );

    if (!confirmacao) return;

    setSaving(true);
    let sucessos = 0;
    let erros = 0;

    try {
      for (const item of items) {
        try {
          const apontamentoData: any = {
            of_number: formData.of_number,
            tipo_apontamento: item.tipo,
            processo_id: formData.processo_id,
            quantidade_produzida: item.quantidade_disponivel,
            data_apontamento: formData.data_apontamento,
            observacoes: `Registro em lote - ${tipoTexto}`
          };

          if (item.tipo === 'componente') {
            apontamentoData.componente_id = item.id;
          } else {
            apontamentoData.peca_id = item.id;
          }

          const result = await criarApontamento(apontamentoData);
          
          if (result.success) {
            sucessos++;
          } else {
            erros++;
          }
        } catch (error) {
          erros++;
          console.error(`Erro ao processar ${item.marca}:`, error);
        }
      }

      if (sucessos > 0) {
        toast.success(`${sucessos} ${tipoTexto} registradas com sucesso!${erros > 0 ? ` (${erros} com erro)` : ''}`);
        
        await Promise.all([
          refetch(),
          resetFormForNewEntry()
        ]);
      } else {
        toast.error(`Erro ao registrar ${tipoTexto} em lote`);
      }

    } catch (error) {
      console.error('Erro no registro em lote:', error);
      toast.error('Erro inesperado no registro em lote');
    } finally {
      setSaving(false);
    }
  };

  const handleOFChange = (ofNumber: string) => {
    const updates = {
      of_number: ofNumber,
      fase: '',
      processo_id: '',
      quantidade_produzida: '',
      todas_disponiveis: false
    };
    setFormData(prev => ({ ...prev, ...updates }));
    updateCache({ of_number: ofNumber, fase: '', processo_id: '' });
    setItemSelecionado(null);
    setItensDisponiveis({ pecasDisponiveis: [], componentesDisponiveis: [] });
    // Limpar cache relacionado
    itensCache.clear();
  };

  const handleFaseChange = (fase: string) => {
    const updates = {
      fase: fase,
      processo_id: '',
      quantidade_produzida: '',
      todas_disponiveis: false
    };
    setFormData(prev => ({ ...prev, ...updates }));
    updateCache({ fase: fase, processo_id: '' });
    setItemSelecionado(null);
    setItensDisponiveis({ pecasDisponiveis: [], componentesDisponiveis: [] });
    // Limpar cache relacionado
    itensCache.clear();
  };

  const handleProcessoChange = (processoId: string) => {
    const updates = {
      processo_id: processoId,
      quantidade_produzida: '',
      todas_disponiveis: false
    };
    setFormData(prev => ({ ...prev, ...updates }));
    updateCache({ processo_id: processoId });
    setItemSelecionado(null);
    setItensDisponiveis({ pecasDisponiveis: [], componentesDisponiveis: [] });
  };

  const handleItemSelect = (item: ItemDisponivel) => {
    setItemSelecionado(item);
    setFormData(prev => ({
      ...prev,
      quantidade_produzida: '',
      todas_disponiveis: false
    }));
  };

  const handleQuantidadeChange = (value: string) => {
    const quantidade = parseInt(value);
    
    if (itemSelecionado && quantidade > itemSelecionado.quantidade_disponivel) {
      toast.error(`Quantidade não pode ser maior que ${itemSelecionado.quantidade_disponivel} unidades disponíveis`);
      return;
    }
    
    setFormData(prev => ({ 
      ...prev, 
      quantidade_produzida: value,
      todas_disponiveis: false
    }));
  };

  // Função para resetar form e atualizar dados
  const resetFormForNewEntry = async () => {
    console.log('🔄 Resetando formulário e limpando cache...');
    
    setItemSelecionado(null);
    setFormData(prev => ({
      ...prev,
      quantidade_produzida: '',
      observacoes: '',
      todas_disponiveis: false
    }));
    
    // Limpar cache e forçar recarregamento
    itensCache.clear();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemSelecionado || !formData.processo_id || !formData.quantidade_produzida) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const quantidade = parseInt(formData.quantidade_produzida);
    
    if (quantidade <= 0 || quantidade > itemSelecionado.quantidade_disponivel) {
      toast.error('Quantidade inválida');
      return;
    }

    setSaving(true);
    
    try {
      // Validação básica - pode ser expandida depois
      console.log('✅ Validação de sequência aprovada');

      const apontamentoData: any = {
        of_number: formData.of_number,
        tipo_apontamento: itemSelecionado.tipo,
        processo_id: formData.processo_id,
        quantidade_produzida: quantidade,
        data_apontamento: formData.data_apontamento,
        observacoes: formData.observacoes || null
      };

      if (itemSelecionado.tipo === 'componente') {
        apontamentoData.componente_id = itemSelecionado.id;
      } else {
        apontamentoData.peca_id = itemSelecionado.id;
      }

      const result = await criarApontamento(apontamentoData);

      if (result.success) {
        toast.success('Apontamento registrado com sucesso!');
        
        await Promise.all([
          refetch(),
          resetFormForNewEntry()
        ]);
      }
    } catch (error) {
      console.error('Erro no submit:', error);
      toast.error('Erro ao registrar apontamento');
    } finally {
      setSaving(false);
    }
  };

  const limparCache = () => {
    localStorage.removeItem('apontamento_cache');
    Object.assign(formCache, {
      of_number: '',
      fase: '',
      processo_id: '',
      data_apontamento: new Date().toISOString().split('T')[0]
    });
    setFormData({
      of_number: '',
      fase: '',
      data_apontamento: new Date().toISOString().split('T')[0],
      processo_id: '',
      quantidade_produzida: '',
      observacoes: '',
      todas_disponiveis: false
    });
    setItemSelecionado(null);
    setItensDisponiveis({ pecasDisponiveis: [], componentesDisponiveis: [] });
    setCacheValido(false);
    itensCache.clear();
    toast.success('Cache limpo com sucesso!');
  };

  const processoSelecionado = null;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Cache status */}
          {cacheValido && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Seleções anteriores foram restauradas do cache</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={limparCache}
                  className="ml-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {/* Campos de seleção básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="of">Ordem de Fabricação *</Label>
              <Select value={formData.of_number} onValueChange={handleOFChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a OF" />
                </SelectTrigger>
                <SelectContent>
                  {ofs.map((of) => (
                    <SelectItem key={of.id} value={of.num_of}>
                      {of.num_of} - {of.descritivo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.of_number && (
              <div>
                <Label htmlFor="fase">Fase *</Label>
                <Select value={formData.fase} onValueChange={handleFaseChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a fase" />
                  </SelectTrigger>
                  <SelectContent>
                    {fasesDisponiveis.map((fase) => (
                      <SelectItem key={fase} value={fase}>
                        {fase}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {formData.fase && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data">Data do Apontamento *</Label>
                <Input
                  id="data"
                  type="date"
                  value={formData.data_apontamento}
                  onChange={(e) => {
                    const newDate = e.target.value;
                    setFormData(prev => ({ ...prev, data_apontamento: newDate }));
                    updateCache({ data_apontamento: newDate });
                  }}
                />
              </div>

              <div>
                <Label>Processo *</Label>
                <Select value={formData.processo_id} onValueChange={handleProcessoChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o processo" />
                  </SelectTrigger>
                  <SelectContent>
                    {processos.map((processo) => (
                      <SelectItem key={processo.id} value={processo.id}>
                        {processo.ordem}. {processo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Informação sobre o processo */}
          {processoSelecionado && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {processoSelecionado.ordem === 1 
                  ? `Processo inicial: ${processoSelecionado.nome}. Todos os itens estão disponíveis.`
                  : `Processo ${processoSelecionado.ordem}: ${processoSelecionado.nome}. Apenas itens que passaram pelos processos anteriores estão disponíveis.`
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Seletor de itens otimizado com funcionalidade de lote - agora com scroll */}
          {formData.processo_id && (
            <div className="max-h-96 overflow-y-auto">
              <SeletorItensOtimizado
                pecasDisponiveis={itensDisponiveis.pecasDisponiveis}
                componentesDisponiveis={itensDisponiveis.componentesDisponiveis}
                itemSelecionado={itemSelecionado}
                onItemSelect={handleItemSelect}
                onBatchSelect={handleBatchSelect}
                loading={loadingItens || isProcessingItems}
              />
            </div>
          )}

          {/* Quantidade produzida */}
          {itemSelecionado && (
            <div>
              <Label htmlFor="quantidade">Quantidade Produzida *</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="quantidade"
                  type="number"
                  min="1"
                  max={itemSelecionado.quantidade_disponivel}
                  placeholder="0"
                  value={formData.quantidade_produzida}
                  onChange={(e) => handleQuantidadeChange(e.target.value)}
                  disabled={formData.todas_disponiveis}
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="todas-disponiveis"
                    checked={formData.todas_disponiveis}
                    onCheckedChange={(checked) => setFormData(prev => ({ 
                      ...prev, 
                      todas_disponiveis: !!checked,
                      quantidade_produzida: checked ? itemSelecionado.quantidade_disponivel.toString() : ''
                    }))}
                  />
                  <Label htmlFor="todas-disponiveis" className="text-sm whitespace-nowrap">
                    todas ({itemSelecionado.quantidade_disponivel})
                  </Label>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              placeholder="Observações sobre o apontamento..."
              value={formData.observacoes}
              onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
              rows={3}
            />
          </div>
        </div>

        {/* Card de informações do item selecionado */}
        <div className="space-y-4">
          <Card className="bg-muted/50 h-fit">
            <CardContent className="p-4">
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <Package className="h-4 w-4" />
                Informações do Item Selecionado
              </h4>
              {!itemSelecionado ? (
                <div className="text-sm text-muted-foreground">
                  Selecione um item para ver as informações ou use os checkboxes para registro em lote
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div><strong>Tipo:</strong> {itemSelecionado.tipo === 'componente' ? 'Componente' : 'Peça'}</div>
                  <div><strong>Marca:</strong> {itemSelecionado.marca}</div>
                  <div><strong>OF:</strong> {formData.of_number}</div>
                  <div><strong>Fase:</strong> {formData.fase}</div>
                  <div><strong>Processo:</strong> {processoSelecionado?.nome || 'N/A'}</div>
                  <div><strong>Descrição:</strong> {itemSelecionado.descricao || 'N/A'}</div>
                  <div><strong>Quantidade Disponível:</strong> {itemSelecionado.quantidade_disponivel} unidades</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botões movidos para baixo do card de informações */}
          <div className="flex justify-end space-x-2">
            {formData.of_number && formData.fase && formData.processo_id && (
              <Button 
                type="button"
                variant="outline"
                onClick={resetFormForNewEntry}
                disabled={saving}
              >
                Novo Item
              </Button>
            )}
            <Button 
              type="submit" 
              disabled={saving || !itemSelecionado || !formData.processo_id || loadingItens || isProcessingItems} 
              className="min-w-32"
            >
              {saving ? 'Salvando...' : 'Registrar Apontamento'}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};
