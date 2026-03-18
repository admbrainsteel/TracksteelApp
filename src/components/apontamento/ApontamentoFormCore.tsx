import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Package, RefreshCw, Loader2 } from 'lucide-react';
import { SeletorPecasSimples } from './SeletorPecasSimples';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface ItemDisponivel {
  id: string;
  marca: string;
  descricao: string;
  tipo: 'peca' | 'componente';
  quantidade_disponivel: number;
  processo_atual_permitido: number;
}

interface ApontamentoFormCoreProps {
  pecas: any[];
  ofs: any[];
  componentesAgrupados: any[];
  processosOrdenados: any[];
  onCarregarItensDisponiveis: (ofNumber: string, processoId: string, filteredPecas: any[], componentesAgrupados: any[]) => Promise<{
    pecasDisponiveis: ItemDisponivel[];
    componentesDisponiveis: ItemDisponivel[];
  }>;
  onValidarSequencia: (ofNumber: string, marca: string, processoId: string, quantidade: number, fase?: string) => Promise<{ valido: boolean; erro?: string }>;
  onCriarApontamento: (data: any) => Promise<{ success: boolean; error?: any }>;
  onRefetch: () => Promise<any>;
  onInvalidateCache: (ofNumber: string, fase?: string) => void;
  loading: boolean;
  validacaoLoading: boolean;
}

const getStoredCache = () => {
  try {
    const stored = localStorage.getItem('apontamento_form_cache');
    return stored ? JSON.parse(stored) : {
      of_number: '',
      fase: '',
      processo_id: '',
      data_apontamento: new Date().toISOString().split('T')[0]
    };
  } catch {
    return {
      of_number: '',
      fase: '',
      processo_id: '',
      data_apontamento: new Date().toISOString().split('T')[0]
    };
  }
};

export const ApontamentoFormCore: React.FC<ApontamentoFormCoreProps> = ({
  pecas = [],
  ofs = [],
  componentesAgrupados = [],
  processosOrdenados = [],
  onCarregarItensDisponiveis,
  onValidarSequencia,
  onCriarApontamento,
  onRefetch,
  onInvalidateCache,
  loading,
  validacaoLoading
}) => {
  const { user } = useAuth();
  
  const [formData, setFormData] = useState(() => ({
    ...getStoredCache(),
    quantidade_produzida: '',
    observacoes: '',
    todas_disponiveis: false
  }));

  const [itemSelecionado, setItemSelecionado] = useState<ItemDisponivel | null>(null);
  const [itensDisponiveis, setItensDisponiveis] = useState<{
    pecasDisponiveis: ItemDisponivel[];
    componentesDisponiveis: ItemDisponivel[];
  }>({ pecasDisponiveis: [], componentesDisponiveis: [] });
  const [saving, setSaving] = useState(false);
  const [loadingItens, setLoadingItens] = useState(false);
  const [lastApontamentoId, setLastApontamentoId] = useState<string | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [undoLoading, setUndoLoading] = useState(false);

  const fasesDisponiveis = useMemo(() => {
    if (!pecas || !Array.isArray(pecas) || !formData.of_number) return [];
    
    return pecas
      .filter(peca => peca && peca.of_number === formData.of_number)
      .map(peca => peca.etapa_fase)
      .filter((fase, index, array) => fase && array.indexOf(fase) === index)
      .sort();
  }, [pecas, formData.of_number]);

  const filteredPecas = useMemo(() => {
    if (!pecas || !Array.isArray(pecas)) return [];
    
    return pecas.filter(peca => 
      peca && 
      peca.of_number === formData.of_number && 
      peca.etapa_fase === formData.fase
    );
  }, [pecas, formData.of_number, formData.fase]);

  const updateCache = useCallback((updates: Partial<typeof formData>) => {
    const newCache = { ...getStoredCache(), ...updates };
    localStorage.setItem('apontamento_form_cache', JSON.stringify(newCache));
  }, []);

  const carregarItensDisponiveis = useCallback(async () => {
    if (!formData.of_number || !formData.fase || !formData.processo_id) {
      console.log('⚠️ Dados insuficientes para carregar itens:', {
        of: formData.of_number,
        fase: formData.fase,
        processo: formData.processo_id
      });
      setItensDisponiveis({ pecasDisponiveis: [], componentesDisponiveis: [] });
      return;
    }

    if (!filteredPecas || (filteredPecas.length === 0 && (!componentesAgrupados || componentesAgrupados.length === 0))) {
      console.log('⚠️ Sem peças ou componentes para processar');
      setItensDisponiveis({ pecasDisponiveis: [], componentesDisponiveis: [] });
      return;
    }

    setLoadingItens(true);
    console.log('🔄 Carregando itens disponíveis...', {
      of: formData.of_number,
      fase: formData.fase,
      processo: formData.processo_id,
      pecasCount: filteredPecas.length,
      componentesCount: componentesAgrupados?.length || 0
    });
    
    try {
      const itens = await onCarregarItensDisponiveis(
        formData.of_number,
        formData.processo_id,
        filteredPecas || [],
        componentesAgrupados || []
      );

      console.log('✅ Itens carregados:', {
        pecasDisponiveis: itens?.pecasDisponiveis?.length || 0,
        componentesDisponiveis: itens?.componentesDisponiveis?.length || 0
      });

      setItensDisponiveis(itens || { pecasDisponiveis: [], componentesDisponiveis: [] });
    } catch (error) {
      console.error('❌ Erro ao carregar itens:', error);
      setItensDisponiveis({ pecasDisponiveis: [], componentesDisponiveis: [] });
    } finally {
      setLoadingItens(false);
    }
  }, [
    formData.of_number, 
    formData.fase, 
    formData.processo_id, 
    filteredPecas,
    componentesAgrupados,
    onCarregarItensDisponiveis
  ]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      carregarItensDisponiveis();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [carregarItensDisponiveis]);

  useEffect(() => {
    setItemSelecionado(null);
    setFormData(prev => ({ 
      ...prev, 
      quantidade_produzida: '', 
      todas_disponiveis: false 
    }));
  }, [formData.of_number, formData.fase, formData.processo_id]);

  useEffect(() => {
    if (formData.todas_disponiveis && itemSelecionado) {
      setFormData(prev => ({
        ...prev,
        quantidade_produzida: itemSelecionado.quantidade_disponivel.toString()
      }));
    }
  }, [formData.todas_disponiveis, itemSelecionado]);

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
    console.log('🔄 Mudança de processo detectada, limpando cache específico...');
    
    // LIMPAR CACHE ESPECÍFICO ANTES DE ALTERAR O PROCESSO
    if (formData.of_number && formData.fase) {
      console.log(`🗑️ Invalidando cache para OF: ${formData.of_number}, Fase: ${formData.fase}`);
      onInvalidateCache(formData.of_number, formData.fase);
    }

    const updates = {
      processo_id: processoId,
      quantidade_produzida: '',
      todas_disponiveis: false
    };
    setFormData(prev => ({ ...prev, ...updates }));
    updateCache({ processo_id: processoId });
    setItemSelecionado(null);
    
    // Limpar itens disponíveis imediatamente para forçar nova consulta
    setItensDisponiveis({ pecasDisponiveis: [], componentesDisponiveis: [] });
    
    console.log('✅ Cache limpo, nova consulta será realizada automaticamente');
  };

  const handleItemSelect = useCallback((item: ItemDisponivel) => {
    console.log('🎯 Item selecionado:', {
      marca: item.marca,
      tipo: item.tipo,
      quantidade_disponivel: item.quantidade_disponivel
    });
    setItemSelecionado(item);
    setFormData(prev => ({
      ...prev,
      quantidade_produzida: '',
      todas_disponiveis: false
    }));
  }, []);

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

  const handleTodasDisponiveisChange = (checked: boolean) => {
    console.log('🔄 Checkbox "Todas" alterado:', {
      checked,
      itemSelecionado: itemSelecionado?.marca,
      quantidade_disponivel: itemSelecionado?.quantidade_disponivel
    });
    
    setFormData(prev => ({ 
      ...prev, 
      todas_disponiveis: checked,
      quantidade_produzida: checked && itemSelecionado ? itemSelecionado.quantidade_disponivel.toString() : prev.quantidade_produzida
    }));
  };

  const resetFormForNewEntry = async () => {
    console.log('🔄 Resetando formulário para nova entrada...');
    setItemSelecionado(null);
    setFormData(prev => ({
      ...prev,
      quantidade_produzida: '',
      observacoes: '',
      todas_disponiveis: false
    }));
    
    console.log('📋 Recarregando itens disponíveis após reset...');
    await carregarItensDisponiveis();
  };

  const handleBatchSelect = async (items: ItemDisponivel[], tipo: 'peca' | 'componente') => {
    setSaving(true);
    let sucessos = 0;
    let erros = 0;

    try {
      for (const item of items) {
        try {
          const validacao = await onValidarSequencia(
            formData.of_number,
            item.marca,
            formData.processo_id,
            item.quantidade_disponivel,
            formData.fase
          );

          if (!validacao.valido) {
            erros++;
            continue;
          }

          const apontamentoData: any = {
            of_number: formData.of_number,
            tipo_apontamento: item.tipo,
            processo_id: formData.processo_id,
            quantidade_produzida: item.quantidade_disponivel,
            data_apontamento: formData.data_apontamento,
            observacoes: `Apontamento em lote - ${tipo}`
          };

          if (item.tipo === 'componente') {
            apontamentoData.componente_id = item.id;
          } else {
            apontamentoData.peca_id = item.id;
          }

          const result = await onCriarApontamento(apontamentoData);

          if (result.success) {
            sucessos++;
          } else {
            erros++;
          }
        } catch (error) {
          erros++;
        }
      }

      if (sucessos > 0) {
        toast.success(`${sucessos} apontamentos realizados com sucesso!`);
        await Promise.all([
          onRefetch(),
          resetFormForNewEntry()
        ]);
      }

      if (erros > 0) {
        toast.error(`${erros} apontamentos falharam.`);
      }

    } catch (error) {
      toast.error('Erro ao realizar apontamento em lote');
    } finally {
      setSaving(false);
    }
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
      console.log('🔍 Iniciando validação de sequência:', {
        of: formData.of_number,
        marca: itemSelecionado.marca,
        processo: formData.processo_id,
        quantidade,
        metodo: formData.todas_disponiveis ? 'CHECKBOX_TODAS' : 'MANUAL'
      });

      const validacao = await onValidarSequencia(
        formData.of_number,
        itemSelecionado.marca,
        formData.processo_id,
        quantidade,
        formData.fase
      );

      if (!validacao.valido) {
        toast.error(validacao.erro);
        return;
      }

      console.log('✅ Validação aprovada, criando apontamento...');

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

      console.log('📝 Dados do apontamento sendo criado:', {
        ...apontamentoData,
        metodo_utilizado: formData.todas_disponiveis ? 'CHECKBOX_TODAS' : 'DIGITACAO_MANUAL',
        quantidade_original_disponivel: itemSelecionado.quantidade_disponivel,
        quantidade_sendo_apontada: quantidade
      });

      const result = await onCriarApontamento(apontamentoData);

      if (result.success) {
        console.log('✅ Apontamento criado com sucesso!');
        toast.success('Apontamento registrado com sucesso!');
        
        // Atualizar estado do último apontamento
        if (result.success) {
          // Para desfazer, buscar o último apontamento criado
          const { data: lastApontamento } = await supabase
            .from('apontamentos_producao')
            .select('id')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (lastApontamento) {
            setLastApontamentoId(lastApontamento.id);
            setCanUndo(true);
          }
        }
        
        // INVALIDAR CACHE ESPECÍFICO DA OF E FASE ANTES DE RECARREGAR
        console.log('🗑️ Invalidando cache após apontamento bem-sucedido...');
        onInvalidateCache(formData.of_number, formData.fase);
        
        // Aguardar atualização e reset
        await Promise.all([
          onRefetch(),
          resetFormForNewEntry()
        ]);
        
        console.log('✅ Formulário resetado e dados atualizados após apontamento');
      }
    } catch (error) {
      console.error('❌ Erro ao registrar apontamento:', error);
      toast.error('Erro ao registrar apontamento');
    } finally {
      setSaving(false);
    }
  };

  const limparCacheCompleto = () => {
    localStorage.removeItem('apontamento_form_cache');
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
    toast.success('Cache limpo completamente!');
  };

  // Função para desfazer último apontamento
  const handleUndo = useCallback(async () => {
    if (!lastApontamentoId || !user?.id) return;

    setUndoLoading(true);
    try {
      const { error } = await supabase
        .from('apontamentos_producao')
        .delete()
        .eq('id', lastApontamentoId)
        .eq('created_by', user.id);

      if (error) {
        console.error('Erro ao desfazer apontamento:', error);
        toast.error('Erro ao desfazer apontamento');
        return;
      }

      // Resetar estado do botão de desfazer
      setLastApontamentoId(null);
      setCanUndo(false);
      
      // Recarregar itens disponíveis se necessário
      if (formData.of_number && formData.fase && formData.processo_id) {
        await carregarItensDisponiveis();
      }
      
      toast.success('Apontamento desfeito com sucesso!');
    } catch (error) {
      console.error('Erro inesperado ao desfazer:', error);
      toast.error('Erro inesperado ao desfazer apontamento');
    } finally {
      setUndoLoading(false);
    }
  }, [lastApontamentoId, user?.id, supabase, formData.of_number, formData.fase, formData.processo_id, carregarItensDisponiveis]);

  const processoSelecionado = processosOrdenados?.find(p => p.id === formData.processo_id);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 space-y-4">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-muted-foreground">Carregando dados...</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {/* Cache status */}
          {(formData.of_number || formData.fase || formData.processo_id) && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>Formulário restaurado do cache</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={limparCacheCompleto}
                  className="ml-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Limpar Cache
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
                  {(ofs || []).map((of) => (
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
                    {(processosOrdenados || []).map((processo) => (
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

          {/* Seletor de Itens */}
          {formData.processo_id && (
            <SeletorPecasSimples
              pecasDisponiveis={itensDisponiveis.pecasDisponiveis || []}
              componentesDisponiveis={itensDisponiveis.componentesDisponiveis || []}
              onItemSelect={handleItemSelect}
              onBatchSelect={handleBatchSelect}
              loading={loadingItens || validacaoLoading}
              onSubmit={() => handleSubmit({} as React.FormEvent)}
              submitDisabled={saving || !itemSelecionado || !formData.processo_id || !formData.quantidade_produzida || loadingItens}
              submitLoading={saving}
              canUndo={canUndo}
              onUndo={handleUndo}
              undoLoading={undoLoading}
              lastApontamentoId={lastApontamentoId}
            />
          )}

          {/* Campos de Quantidade */}
          {itemSelecionado && (
            <div className="space-y-4 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
              <h4 className="font-medium text-slate-200">Quantidade a Apontar</h4>
              <div className="space-y-3">
                <Input
                  type="number"
                  min="1"
                  max={itemSelecionado.quantidade_disponivel}
                  placeholder="Digite a quantidade..."
                  value={formData.quantidade_produzida}
                  onChange={(e) => handleQuantidadeChange(e.target.value)}
                  disabled={formData.todas_disponiveis}
                  className="w-full text-lg h-12 bg-slate-800 border-slate-600"
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="todas-disponiveis"
                    checked={formData.todas_disponiveis}
                    onCheckedChange={handleTodasDisponiveisChange}
                  />
                  <Label htmlFor="todas-disponiveis" className="text-sm cursor-pointer">
                    Todas ({itemSelecionado.quantidade_disponivel})
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
        <div>
          <Card className="bg-muted/50 h-fit">
            <CardContent className="p-4">
              <h4 className="font-medium flex items-center gap-2 mb-3">
                <Package className="h-4 w-4" />
                Informações do Item Selecionado
              </h4>
              {!itemSelecionado ? (
                <div className="text-sm text-muted-foreground">
                  Selecione um item para ver as informações
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
                  {formData.quantidade_produzida && (
                    <div className="pt-2 border-t">
                      <div><strong>Quantidade a Apontar:</strong> {formData.quantidade_produzida} unidades</div>
                      <div><strong>Método:</strong> {formData.todas_disponiveis ? 'Checkbox "Todas"' : 'Digitação Manual'}</div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

    </form>
  );
};
