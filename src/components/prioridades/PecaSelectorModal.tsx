import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Peca } from '@/hooks/usePecas';
import { Search, Package, Target, Filter } from 'lucide-react';
import { usePecasParaPrioridade } from '@/hooks/usePecasParaPrioridade';
import { usePrioridadesFabricacao } from '@/hooks/usePrioridadesFabricacao';
import { useItensPrioridadeFabricacao } from '@/hooks/useItensPrioridadeFabricacao';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PecaSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPecas: (pecasSelecionadas: { peca: Peca; quantidade: number; prioridade: string; ofNumber: string; etapaFase: string }[]) => void;
}

export const PecaSelectorModal: React.FC<PecaSelectorModalProps> = ({
  isOpen,
  onClose,
  onAddPecas
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrioridade, setSelectedPrioridade] = useState<string>('');
  const [selectedOF, setSelectedOF] = useState<string>('');
  const [selectedFase, setSelectedFase] = useState<string>('');
  const [pecasSelecionadas, setPecasSelecionadas] = useState<{ [key: string]: { selected: boolean; quantidade: number } }>({});
  const [saving, setSaving] = useState(false);

  const {
    pecasDisponiveis,
    ofNumbers,
    etapasFases,
    loading,
    fetchOFs,
    fetchEtapasFases,
    fetchPecasDisponiveis
  } = usePecasParaPrioridade();

  const { criarPrioridade } = usePrioridadesFabricacao();
  const { refetch } = useItensPrioridadeFabricacao();

  const pecasFiltradas = pecasDisponiveis.filter(peca =>
    peca.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (peca.descricao && peca.descricao.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const prioridadeOptions = [
    { value: 'P1', label: 'P1 - Urgente', color: 'text-red-700' },
    { value: 'P2', label: 'P2 - Alta', color: 'text-orange-700' },
    { value: 'P3', label: 'P3 - Média', color: 'text-blue-700' },
    { value: 'P4', label: 'P4 - Baixa', color: 'text-gray-700' }
  ];

  const handleSelectPeca = (pecaId: string, selected: boolean) => {
    setPecasSelecionadas(prev => ({
      ...prev,
      [pecaId]: {
        selected,
        quantidade: prev[pecaId]?.quantidade || 1
      }
    }));
  };

  const handleSelectAll = (selected: boolean) => {
    const newSelection: { [key: string]: { selected: boolean; quantidade: number } } = {};
    
    pecasFiltradas.forEach(peca => {
      const quantidadeDisponivel = peca.quantidadeDisponivel ?? peca.quantidade;
      
      newSelection[peca.id] = {
        selected,
        quantidade: selected ? quantidadeDisponivel : (pecasSelecionadas[peca.id]?.quantidade || 1)
      };
    });

    setPecasSelecionadas(newSelection);
  };

  const handleQuantidadeChange = (pecaId: string, quantidade: number) => {
    const peca = pecasDisponiveis.find(p => p.id === pecaId);
    const maxQuantidade = peca?.quantidadeDisponivel ?? peca?.quantidade ?? 1;
    
    setPecasSelecionadas(prev => ({
      ...prev,
      [pecaId]: {
        ...prev[pecaId],
        quantidade: Math.max(1, Math.min(quantidade, maxQuantidade))
      }
    }));
  };

  const handleOFChange = async (value: string) => {
    setSelectedOF(value);
    setSelectedFase('');
    setPecasSelecionadas({});
    if (value) {
      await fetchEtapasFases(value);
    }
  };

  const handleFaseChange = async (value: string) => {
    setSelectedFase(value);
    setPecasSelecionadas({});
    if (selectedOF && value) {
      await fetchPecasDisponiveis(selectedOF, value);
    }
  };

  const findOrCreatePrioridadeConfig = async (prioridadeCodigo: string) => {
    try {
      // Buscar configuração de prioridade existente
      const { data: configExistente, error: errorConfig } = await supabase
        .from('prioridades_config')
        .select('id')
        .eq('codigo', prioridadeCodigo)
        .single();

      if (errorConfig && errorConfig.code !== 'PGRST116') {
        console.error('Erro ao buscar configuração de prioridade:', errorConfig);
        throw errorConfig;
      }

      if (configExistente) {
        return configExistente.id;
      }

      // Criar nova configuração de prioridade se não existir
      const prioridadeInfo = {
        'P1': { nome: 'Urgente', cor: '#DC2626' },
        'P2': { nome: 'Alta', cor: '#EA580C' },
        'P3': { nome: 'Média', cor: '#2563EB' },
        'P4': { nome: 'Baixa', cor: '#6B7280' }
      };

      const info = prioridadeInfo[prioridadeCodigo as keyof typeof prioridadeInfo];
      
      const { data: novaConfig, error: errorNovaConfig } = await supabase
        .from('prioridades_config')
        .insert([{
          codigo: prioridadeCodigo,
          nome: info.nome,
          cor: info.cor,
          ativo: true
        }])
        .select('id')
        .single();

      if (errorNovaConfig) {
        console.error('Erro ao criar configuração de prioridade:', errorNovaConfig);
        throw errorNovaConfig;
      }

      return novaConfig.id;
    } catch (error) {
      console.error('Erro ao encontrar/criar configuração de prioridade:', error);
      throw error;
    }
  };

  const handleConfirmar = async () => {
    if (!selectedOF || !selectedFase) {
      toast.error('Selecione uma OF e uma Fase');
      return;
    }

    if (!selectedPrioridade) {
      toast.error('Selecione uma prioridade para as peças');
      return;
    }

    const pecasParaAdicionar = Object.entries(pecasSelecionadas)
      .filter(([_, config]) => config.selected)
      .map(([pecaId, config]) => {
        const peca = pecasDisponiveis.find(p => p.id === pecaId);
        if (!peca) return null;
        return { 
          peca, 
          quantidade: config.quantidade, 
          prioridade: selectedPrioridade,
          ofNumber: selectedOF,
          etapaFase: selectedFase
        };
      })
      .filter(Boolean) as { peca: Peca; quantidade: number; prioridade: string; ofNumber: string; etapaFase: string }[];

    if (pecasParaAdicionar.length === 0) {
      toast.error('Selecione pelo menos uma peça');
      return;
    }

    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    setSaving(true);

    try {
      // Buscar ou criar configuração de prioridade
      const prioridadeConfigId = await findOrCreatePrioridadeConfig(selectedPrioridade);

      // Verificar se já existe uma prioridade para esta OF + Fase + Prioridade
      const { data: prioridadeExistente, error: errorBusca } = await supabase
        .from('prioridades_fabricacao')
        .select('id')
        .eq('of_number', selectedOF)
        .eq('etapa_fase', selectedFase)
        .eq('prioridade_id', prioridadeConfigId)
        .eq('ativo', true)
        .single();

      if (errorBusca && errorBusca.code !== 'PGRST116') {
        console.error('Erro ao buscar prioridade existente:', errorBusca);
        throw errorBusca;
      }

      let prioridadeFabricacaoId: string;

      if (prioridadeExistente) {
        // Usar prioridade existente
        prioridadeFabricacaoId = prioridadeExistente.id;
        console.log('✅ Usando prioridade existente:', prioridadeFabricacaoId);
      } else {
        // Criar nova prioridade
        const { data: novaPrioridade, error: errorCriar } = await supabase
          .from('prioridades_fabricacao')
          .insert([{
            of_number: selectedOF,
            etapa_fase: selectedFase,
            prioridade_id: prioridadeConfigId,
            nome_prioridade: selectedPrioridade,
            ativo: true,
            created_by: user.id
          }])
          .select('id')
          .single();

        if (errorCriar) {
          console.error('Erro ao criar nova prioridade:', errorCriar);
          throw errorCriar;
        }

        prioridadeFabricacaoId = novaPrioridade.id;
        console.log('✅ Nova prioridade criada:', prioridadeFabricacaoId);
      }

      // Adicionar cada peça como item da prioridade
      for (const { peca, quantidade } of pecasParaAdicionar) {
        const pesoTotal = quantidade * (peca.peso_unitario || 0);
        
        const { error: errorItem } = await supabase
          .from('itens_prioridade_fabricacao')
          .insert([{
            prioridade_fabricacao_id: prioridadeFabricacaoId,
            peca_id: peca.id,
            quantidade_priorizada: quantidade,
            peso_total: pesoTotal,
            ordem_fabricacao: 1
          }]);

        if (errorItem) {
          console.error('Erro ao adicionar item de prioridade:', errorItem);
          throw errorItem;
        }
      }

      toast.success(`${pecasParaAdicionar.length} peça(s) adicionada(s) à prioridade ${selectedPrioridade}`);
      
      // Atualizar dados e chamar callback
      await refetch();
      onAddPecas(pecasParaAdicionar);
      handleCancel();

    } catch (error) {
      console.error('Erro ao salvar peças:', error);
      toast.error('Erro ao adicionar peças à prioridade');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setPecasSelecionadas({});
    setSearchTerm('');
    setSelectedPrioridade('');
    setSelectedOF('');
    setSelectedFase('');
    onClose();
  };

  const getPrioridadeColor = (value: string) => {
    const option = prioridadeOptions.find(opt => opt.value === value);
    return option?.color || 'text-gray-700';
  };

  // Verificar se todas as peças filtradas estão selecionadas
  const isAllSelected = pecasFiltradas.length > 0 && 
    pecasFiltradas.every(peca => pecasSelecionadas[peca.id]?.selected);

  // Verificar se alguma peça está selecionada (para estado indeterminado)
  const isIndeterminate = pecasFiltradas.some(peca => pecasSelecionadas[peca.id]?.selected) && !isAllSelected;

  useEffect(() => {
    fetchOFs();
  }, [fetchOFs]);

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="max-w-4xl lg:max-w-5xl max-h-[90vh] flex flex-col p-3 sm:p-6">
        <DialogHeader className="pb-3 sm:pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Package className="h-5 w-5" />
            Selecionar Peças para Prioridade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden">
          {/* Filtros de OF e Fase */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Filter className="h-4 w-4" />
                Ordem de Fabricação (OF)
              </Label>
              <Select value={selectedOF} onValueChange={handleOFChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma OF" />
                </SelectTrigger>
                <SelectContent>
                  {ofNumbers.map((ofNumber) => (
                    <SelectItem key={ofNumber} value={ofNumber}>
                      {ofNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Filter className="h-4 w-4" />
                Fase (etapa_fase)
              </Label>
              <Select 
                value={selectedFase} 
                onValueChange={handleFaseChange}
                disabled={!selectedOF}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione uma fase" />
                </SelectTrigger>
                <SelectContent>
                  {etapasFases.map((fase) => (
                    <SelectItem key={fase} value={fase}>
                      {fase}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Filtros de busca e prioridade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Busca */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por marca ou descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Seleção de Prioridade */}
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium mb-2">
                <Target className="h-4 w-4" />
                Grupo de Prioridade
              </Label>
              <Select value={selectedPrioridade} onValueChange={setSelectedPrioridade}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione a prioridade" />
                </SelectTrigger>
                <SelectContent>
                  {prioridadeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <span className={`font-medium ${option.color}`}>
                        {option.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Indicador da prioridade selecionada */}
          {selectedPrioridade && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 p-3 bg-green-50 rounded-lg border-l-4 border-green-500">
              <Target className="h-4 w-4 text-green-600 flex-shrink-0" />
              <div className="flex flex-col sm:flex-row gap-1 sm:gap-2 text-sm">
                <span className="text-green-800 font-medium">
                  Peças selecionadas serão adicionadas ao grupo: 
                </span>
                <span className={`font-bold ${getPrioridadeColor(selectedPrioridade)}`}>
                  {prioridadeOptions.find(opt => opt.value === selectedPrioridade)?.label}
                </span>
              </div>
            </div>
          )}

          {/* Lista de Peças */}
          {selectedOF && selectedFase && (
            <div className="border rounded-lg flex-1 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-muted-foreground">Carregando peças...</div>
                </div>
              ) : (
                <div className="max-h-96 overflow-auto">
                  {/* Desktop Table */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              checked={isAllSelected}
                              onCheckedChange={handleSelectAll}
                              className={isIndeterminate ? "data-[state=checked]:bg-blue-600" : ""}
                              style={isIndeterminate ? { 
                                backgroundColor: 'rgb(59 130 246)',
                                borderColor: 'rgb(59 130 246)'
                              } : {}}
                            />
                          </TableHead>
                          <TableHead>Marca</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Peso Unit. (kg)</TableHead>
                          <TableHead>Qtd. Disp.</TableHead>
                          <TableHead className="w-24">Qtd. Prior.</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pecasFiltradas.map((peca) => {
                          const quantidadeDisponivel = peca.quantidadeDisponivel ?? peca.quantidade;
                          return (
                            <TableRow key={peca.id}>
                              <TableCell>
                                <Checkbox
                                  checked={pecasSelecionadas[peca.id]?.selected || false}
                                  onCheckedChange={(checked) => handleSelectPeca(peca.id, checked as boolean)}
                                />
                              </TableCell>
                              <TableCell className="font-medium">{peca.marca}</TableCell>
                              <TableCell>{peca.descricao || '-'}</TableCell>
                              <TableCell>{peca.peso_unitario.toFixed(2)}</TableCell>
                              <TableCell className="text-green-600 font-medium">{quantidadeDisponivel}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="1"
                                  max={quantidadeDisponivel}
                                  value={pecasSelecionadas[peca.id]?.quantidade || 1}
                                  onChange={(e) => handleQuantidadeChange(peca.id, parseInt(e.target.value) || 1)}
                                  disabled={!pecasSelecionadas[peca.id]?.selected}
                                  className="w-20"
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="md:hidden space-y-3 p-3">
                    {/* Mobile Select All */}
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        className={isIndeterminate ? "data-[state=checked]:bg-blue-600" : ""}
                        style={isIndeterminate ? { 
                          backgroundColor: 'rgb(59 130 246)',
                          borderColor: 'rgb(59 130 246)'
                        } : {}}
                      />
                      <span className="text-sm font-medium">Selecionar todas as peças</span>
                    </div>

                    {pecasFiltradas.map((peca) => {
                      const quantidadeDisponivel = peca.quantidadeDisponivel ?? peca.quantidade;
                      return (
                        <div key={peca.id} className="border rounded-lg p-3 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Checkbox
                                checked={pecasSelecionadas[peca.id]?.selected || false}
                                onCheckedChange={(checked) => handleSelectPeca(peca.id, checked as boolean)}
                              />
                              <div>
                                <div className="font-medium">{peca.marca}</div>
                                <div className="text-sm text-muted-foreground">
                                  {peca.descricao || 'Sem descrição'}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Peso Unit.:</span>
                              <span className="ml-1">{peca.peso_unitario.toFixed(2)} kg</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Qtd. Disp.:</span>
                              <span className="ml-1 text-green-600 font-medium">{quantidadeDisponivel}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`qtd-${peca.id}`} className="text-sm flex-shrink-0">Qtd. Prior.:</Label>
                            <Input
                              id={`qtd-${peca.id}`}
                              type="number"
                              min="1"
                              max={quantidadeDisponivel}
                              value={pecasSelecionadas[peca.id]?.quantidade || 1}
                              onChange={(e) => handleQuantidadeChange(peca.id, parseInt(e.target.value) || 1)}
                              disabled={!pecasSelecionadas[peca.id]?.selected}
                              className="w-20"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {!loading && pecasFiltradas.length === 0 && selectedOF && selectedFase && (
                <div className="text-center py-8 text-muted-foreground">
                  {pecasDisponiveis.length === 0 ? 
                    'Todas as peças desta OF e Fase já foram priorizadas ou não há peças disponíveis' : 
                    'Nenhuma peça encontrada para os filtros atuais'
                  }
                </div>
              )}
            </div>
          )}

          {!selectedOF && (
            <div className="text-center py-8 text-muted-foreground">
              Selecione uma OF para ver as fases disponíveis
            </div>
          )}

          {selectedOF && !selectedFase && (
            <div className="text-center py-8 text-muted-foreground">
              Selecione uma Fase para ver as peças disponíveis
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t gap-3">
          <div className="text-sm text-muted-foreground order-2 sm:order-1">
            {Object.values(pecasSelecionadas).filter(p => p.selected).length} peça(s) selecionada(s)
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto order-1 sm:order-2">
            <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto" disabled={saving}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmar}
              disabled={!selectedPrioridade || !selectedOF || !selectedFase || Object.values(pecasSelecionadas).filter(p => p.selected).length === 0 || saving}
              className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
            >
              {saving ? 'Salvando...' : 'Adicionar Peças Selecionadas'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
