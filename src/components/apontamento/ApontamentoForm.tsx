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
import { toast } from 'sonner';

interface ItemDisponivel {
  id: string;
  marca: string;
  descricao: string;
  perfil?: string;
  tipo: 'peca' | 'componente';
  quantidade_disponivel: number;
  processo_atual_permitido: number;
  nome_processo?: string;
}

// Cache local para manter seleções básicas do formulário
const formCache = {
  of_number: '',
  fase: '',
  processo_id: '',
  data_apontamento: new Date().toISOString().split('T')[0]
};

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
  const [saving, setSaving] = useState(false);
  const [cacheValido, setCacheValido] = useState(false);

  const { criarApontamento, refetch, processos, apontamentos, loading: loadingApontamentos } = useApontamentosProducao();
  const { pecas, loading: loadingPecas } = usePecas();
  const { ofs } = useOFs();
  const { componentesAgrupados, loading: loadingComponentes } = useComponentesAgrupados(formData.of_number, formData.fase, pecas);

  // Buscar fases únicas da OF selecionada
  const fasesDisponiveis = useMemo(() => {
    if (!formData.of_number || !pecas.length) return [];
    return Array.from(
      new Set(
        pecas
          .filter(peca => peca.of_number === formData.of_number)
          .map(peca => peca.etapa_fase)
          .filter(Boolean)
      )
    ).sort();
  }, [pecas, formData.of_number]);

  // Processo selecionado atualmente
  const processoSelecionado = useMemo(() => {
    return processos.find(p => p.id === formData.processo_id) || null;
  }, [processos, formData.processo_id]);

  // Salvar cache quando seleções básicas mudam
  const updateCache = useCallback((updates: Partial<typeof formData>) => {
    Object.assign(formCache, updates);
    try {
      localStorage.setItem('apontamento_cache', JSON.stringify(formCache));
    } catch (e) {
      console.warn('Erro ao salvar cache:', e);
    }
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

  // Cálculo reativo de peças e componentes disponíveis para o processo selecionado
  const itensDisponiveis = useMemo(() => {
    const { of_number, fase, processo_id } = formData;

    if (!of_number || !fase || !processo_id || !pecas.length) {
      return { pecasDisponiveis: [], componentesDisponiveis: [] };
    }

    const ordemProcesso = processoSelecionado?.ordem || 1;
    const nomeProcesso = processoSelecionado?.nome || `${ordemProcesso}`;

    // Reordenar processos para identificar sequencialidade
    const processosOrdenados = [...processos].sort((a, b) => a.ordem - b.ordem);
    const indexAtual = processosOrdenados.findIndex(p => p.id === processo_id);
    const procAtual = processosOrdenados[indexAtual];

    // 1. Peças da OF e Fase selecionadas
    const pecasDaFase = pecas.filter(
      p => p.of_number === of_number && p.etapa_fase === fase
    );

    const pecasDisponiveis: ItemDisponivel[] = [];

    pecasDaFase.forEach(peca => {
      // Calcular quanto já foi apontado desta peça neste processo
      const totalApontadoAtual = apontamentos
        .filter(a => a.tipo_apontamento === 'peca' && a.peca_id === peca.id && a.processo_id === processo_id)
        .reduce((sum, a) => sum + (Number(a.quantidade_produzida) || 0), 0);

      let qtdDisponivelParaEntrar = Number(peca.quantidade) || 0;

      // Regra: peças sem componentes não passam por solda
      if (!peca.tem_componentes && procAtual && procAtual.nome.toLowerCase().includes('solda')) {
        qtdDisponivelParaEntrar = 0;
      } else if (indexAtual > 0) {
        // Encontrar processo anterior válido
        let processoAnteriorValido = null;
        for (let i = indexAtual - 1; i >= 0; i--) {
          const p = processosOrdenados[i];
          if (!peca.tem_componentes && p.nome.toLowerCase().includes('solda')) {
            continue; // Pula a solda na busca do processo anterior para peças simples
          }
          processoAnteriorValido = p;
          break;
        }

        if (processoAnteriorValido) {
           qtdDisponivelParaEntrar = apontamentos
              .filter(a => a.tipo_apontamento === 'peca' && a.peca_id === peca.id && a.processo_id === processoAnteriorValido.id)
              .reduce((sum, a) => sum + (Number(a.quantidade_produzida) || 0), 0);
        }
      }

      const saldoDisponivel = Math.max(0, qtdDisponivelParaEntrar - totalApontadoAtual);

      if (saldoDisponivel > 0) {
        pecasDisponiveis.push({
          id: peca.id,
          marca: peca.marca,
          descricao: peca.descricao || peca.perfil_principal || '',
          perfil: peca.perfil_principal || peca.descricao || '',
          tipo: 'peca',
          quantidade_disponivel: saldoDisponivel,
          processo_atual_permitido: ordemProcesso,
          nome_processo: nomeProcesso
        });
      }
    });

    // 2. Componentes da OF e Fase selecionadas
    const componentesDisponiveis: ItemDisponivel[] = [];

    if (componentesAgrupados && componentesAgrupados.length > 0) {
      componentesAgrupados.forEach(comp => {
        let qtdDisponivelParaEntrarComp = Number(comp.quantidade_total) || 0;

        if (indexAtual > 0) {
           const processoAnteriorValido = processosOrdenados[indexAtual - 1];
           if (processoAnteriorValido) {
              qtdDisponivelParaEntrarComp = apontamentos
                .filter(a => a.tipo_apontamento === 'componente' && comp.componente_ids.includes(a.componente_id || '') && a.processo_id === processoAnteriorValido.id)
                .reduce((sum, a) => sum + (Number(a.quantidade_produzida) || 0), 0);
           }
        }

        const totalApontadoComp = apontamentos
          .filter(a => a.tipo_apontamento === 'componente' && comp.componente_ids.includes(a.componente_id || '') && a.processo_id === processo_id)
          .reduce((sum, a) => sum + (Number(a.quantidade_produzida) || 0), 0);

        const saldoComp = Math.max(0, qtdDisponivelParaEntrarComp - totalApontadoComp);

        if (saldoComp > 0) {
          componentesDisponiveis.push({
            id: comp.componente_ids[0] || '',
            marca: comp.marca_componente,
            descricao: comp.descricao || comp.perfil || '',
            perfil: comp.perfil || comp.descricao || '',
            tipo: 'componente',
            quantidade_disponivel: saldoComp,
            processo_atual_permitido: ordemProcesso,
            nome_processo: nomeProcesso
          });
        }
      });
    }

    return { pecasDisponiveis, componentesDisponiveis };
  }, [formData, pecas, apontamentos, processoSelecionado, componentesAgrupados, processos]);

  // Sincronizar item selecionado caso não exista mais na lista disponível
  useEffect(() => {
    if (itemSelecionado) {
      const listaAtual = itemSelecionado.tipo === 'peca' 
        ? itensDisponiveis.pecasDisponiveis 
        : itensDisponiveis.componentesDisponiveis;
      
      const itemAindaExiste = listaAtual.find(i => i.id === itemSelecionado.id);
      if (!itemAindaExiste) {
        setItemSelecionado(null);
        setFormData(prev => ({ ...prev, quantidade_produzida: '', todas_disponiveis: false }));
      } else if (itemAindaExiste.quantidade_disponivel !== itemSelecionado.quantidade_disponivel) {
        setItemSelecionado(itemAindaExiste);
      }
    }
  }, [itensDisponiveis, itemSelecionado]);

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
      `Deseja registrar ${totalItens} ${tipoTexto} com suas respectivas quantidades totais disponíveis?\n\n` +
      `Total de itens: ${totalItens}\n` +
      `Processo: ${processoSelecionado?.nome || 'N/A'}`
    );

    if (!confirmacao) return;

    setSaving(true);
    let sucessos = 0;
    let erros = 0;

    try {
      for (const item of items) {
        try {
          const apontamentoData: Parameters<typeof criarApontamento>[0] = {
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
        await refetch();
        resetFormForNewEntry();
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

  const handleApontarItemDireto = async (item: ItemDisponivel, quantidade: number): Promise<boolean> => {
    if (!formData.processo_id) {
      toast.error('Selecione um processo antes de apontar');
      return false;
    }

    if (isNaN(quantidade) || quantidade <= 0 || quantidade > item.quantidade_disponivel) {
      toast.error(`Quantidade inválida. Saldo disponível: ${item.quantidade_disponivel}`);
      return false;
    }

    setSaving(true);
    try {
      const apontamentoData: Parameters<typeof criarApontamento>[0] = {
        of_number: formData.of_number,
        tipo_apontamento: item.tipo,
        processo_id: formData.processo_id,
        quantidade_produzida: quantidade,
        data_apontamento: formData.data_apontamento,
        observacoes: formData.observacoes || undefined
      };

      if (item.tipo === 'componente') {
        apontamentoData.componente_id = item.id;
      } else {
        apontamentoData.peca_id = item.id;
      }

      const result = await criarApontamento(apontamentoData);

      if (result.success) {
        toast.success(`${quantidade} un de ${item.marca} apontada(s) com sucesso!`);
        await refetch();
        resetFormForNewEntry();
        return true;
      } else {
        toast.error('Erro ao registrar apontamento');
        return false;
      }
    } catch (error) {
      console.error('Erro no apontamento direto:', error);
      toast.error('Erro ao registrar apontamento');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const resetFormForNewEntry = () => {
    setItemSelecionado(null);
    setFormData(prev => ({
      ...prev,
      quantidade_produzida: '',
      observacoes: '',
      todas_disponiveis: false
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemSelecionado || !formData.processo_id || !formData.quantidade_produzida) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const quantidade = parseInt(formData.quantidade_produzida);
    
    if (isNaN(quantidade) || quantidade <= 0 || quantidade > itemSelecionado.quantidade_disponivel) {
      toast.error('Quantidade inválida');
      return;
    }

    setSaving(true);
    
    try {
      const apontamentoData: Parameters<typeof criarApontamento>[0] = {
        of_number: formData.of_number,
        tipo_apontamento: itemSelecionado.tipo,
        processo_id: formData.processo_id,
        quantidade_produzida: quantidade,
        data_apontamento: formData.data_apontamento,
        observacoes: formData.observacoes || undefined
      };

      if (itemSelecionado.tipo === 'componente') {
        apontamentoData.componente_id = itemSelecionado.id;
      } else {
        apontamentoData.peca_id = itemSelecionado.id;
      }

      const result = await criarApontamento(apontamentoData);

      if (result.success) {
        toast.success('Apontamento registrado com sucesso!');
        await refetch();
        resetFormForNewEntry();
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
    setCacheValido(false);
    toast.success('Cache limpo com sucesso!');
  };

  const isLoadingItens = loadingPecas || loadingApontamentos || loadingComponentes;

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
                {`Processo: ${processoSelecionado.ordem}. ${processoSelecionado.nome}. Selecione as peças ou componentes com saldo pendente para apontar.`}
              </AlertDescription>
            </Alert>
          )}

          {/* Seletor de itens otimizado com funcionalidade de lote */}
          {formData.processo_id && (
            <div className="max-h-96 overflow-y-auto">
              <SeletorItensOtimizado
                pecasDisponiveis={itensDisponiveis.pecasDisponiveis}
                componentesDisponiveis={itensDisponiveis.componentesDisponiveis}
                itemSelecionado={itemSelecionado}
                onItemSelect={handleItemSelect}
                onBatchSelect={handleBatchSelect}
                onApontarItemDireto={handleApontarItemDireto}
                loading={isLoadingItens}
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
                  Selecione um item para ver as informações ou use os botões para registro em lote
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <div><strong>Tipo:</strong> {itemSelecionado.tipo === 'componente' ? 'Componente' : 'Peça'}</div>
                  <div><strong>Marca:</strong> {itemSelecionado.marca}</div>
                  <div><strong>OF:</strong> {formData.of_number}</div>
                  <div><strong>Fase:</strong> {formData.fase}</div>
                  <div><strong>Processo:</strong> {processoSelecionado ? `${processoSelecionado.ordem}. ${processoSelecionado.nome}` : 'N/A'}</div>
                  <div><strong>Descrição:</strong> {itemSelecionado.descricao || 'N/A'}</div>
                  <div><strong>Quantidade Disponível:</strong> {itemSelecionado.quantidade_disponivel} unidades</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botões de ação */}
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
              disabled={saving || !itemSelecionado || !formData.processo_id || isLoadingItens} 
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
