import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Package, Plus, Wrench, Expand } from 'lucide-react';
import { RomaneioExpedicao } from '@/hooks/useRomaneios';
import { useProcessosFabricacao } from '@/hooks/useProcessosFabricacao';
import { usePecas } from '@/hooks/usePecas';
import { useMobileResponsive } from '@/hooks/useMobileResponsive';
import { supabase } from '@/integrations/supabase/client';
import { PecasRomaneioExpandido } from './PecasRomaneioExpandido';

interface ItensRomaneioModalProps {
  romaneio: RomaneioExpedicao;
  isOpen: boolean;
  onClose: () => void;
}

interface PecaDisponivel {
  id: string;
  marca: string;
  descricao: string;
  etapa_fase: string;
  quantidade_disponivel: number;
  peso_unitario: number;
  prioridade: string;
}

interface ItemRomaneioPeca {
  id: string;
  peca_id: string;
  quantidade: number;
  peso_unitario: number;
  peso_total: number;
  marca: string;
  descricao: string;
  etapa_fase: string;
  prioridade: string;
}

interface ItemRomaneioInsumo {
  id: string;
  nome: string;
  quantidade: number;
  unidade: string;
}

export const ItensRomaneioModal: React.FC<ItensRomaneioModalProps> = ({
  romaneio,
  isOpen,
  onClose
}) => {
  const { isMobile, isTablet } = useMobileResponsive();
  const { data: processos } = useProcessosFabricacao();
  const { pecas: todasPecas } = usePecas();

  // Estados para filtros
  const [processoSelecionado, setProcessoSelecionado] = useState('Pintura/Galv');
  const [faseFilter, setFaseFilter] = useState('Todas as fases');
  const [marcaFilter, setMarcaFilter] = useState('');
  const [pecaDisponivel, setPecaDisponivel] = useState('');
  const [quantidadePeca, setQuantidadePeca] = useState('');
  
  // Estados para dados dinâmicos
  const [pecasDisponiveis, setPecasDisponiveis] = useState<PecaDisponivel[]>([]);
  const [fasesDisponiveis, setFasesDisponiveis] = useState<string[]>([]);
  const [marcasDisponiveis, setMarcasDisponiveis] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Estados para itens do romaneio
  const [itensPeca, setItensPeca] = useState<ItemRomaneioPeca[]>([]);
  const [itensInsumo, setItensInsumo] = useState<ItemRomaneioInsumo[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);

  // Estados para insumos
  const [nomeInsumo, setNomeInsumo] = useState('');
  const [quantidadeInsumo, setQuantidadeInsumo] = useState('');
  const [unidadeInsumo, setUnidadeInsumo] = useState('');

  // Estados para adicionar todas as peças
  const [adicionarTodas, setAdicionarTodas] = useState(false);

  // Novo estado para o modal expandido
  const [showExpandedModal, setShowExpandedModal] = useState(false);

  // Buscar peças disponíveis baseadas no processo selecionado
  const buscarPecasDisponiveis = async (processo: string) => {
    if (!romaneio.of_number) return;

    setLoading(true);
    try {
      // Buscar peças que estão no processo selecionado e disponíveis para expedição
      const { data: apontamentosData, error } = await supabase
        .from('apontamentos_producao')
        .select(`
          peca_id,
          quantidade_produzida,
          processo_id,
          processo:processos_fabricacao!inner!apontamentos_producao_processo_id_fkey(nome),
          peca:pecas!inner!apontamentos_producao_peca_id_fkey(
            id,
            marca,
            descricao,
            etapa_fase,
            peso_unitario,
            prioridade,
            of_number
          )
        `)
        .eq('peca.of_number', romaneio.of_number)
        .eq('processo.nome', processo);

      if (error) {
        console.error('Erro ao buscar peças disponíveis:', error);
        return;
      }

      // Agrupar por peça e calcular quantidade disponível
      const pecasAgrupadas = new Map<string, PecaDisponivel>();
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (apontamentosData as any[])?.forEach((apontamento: any) => {
        const pecaId = apontamento.peca?.id;
        if (!pecaId) return;

        const quantidade = apontamento.quantidade_produzida || 0;
        
        if (pecasAgrupadas.has(pecaId)) {
          const pecaExistente = pecasAgrupadas.get(pecaId)!;
          pecaExistente.quantidade_disponivel += quantidade;
        } else {
          pecasAgrupadas.set(pecaId, {
            id: apontamento.peca.id,
            marca: apontamento.peca.marca,
            descricao: apontamento.peca.descricao || '',
            etapa_fase: apontamento.peca.etapa_fase || '',
            quantidade_disponivel: quantidade,
            peso_unitario: apontamento.peca.peso_unitario || 0,
            prioridade: apontamento.peca.prioridade || 'P4'
          });
        }
      });

      const pecasArray = Array.from(pecasAgrupadas.values());
      setPecasDisponiveis(pecasArray);

      // Extrair fases e marcas únicas
      const fasesUnicas = [...new Set(pecasArray.map(p => p.etapa_fase).filter(Boolean))];
      const marcasUnicas = [...new Set(pecasArray.map(p => p.marca).filter(Boolean))];
      
      setFasesDisponiveis(fasesUnicas);
      setMarcasDisponiveis(marcasUnicas);

    } catch (error) {
      console.error('Erro ao buscar peças disponíveis:', error);
      toast.error('Erro ao carregar peças disponíveis');
    } finally {
      setLoading(false);
    }
  };

  // Carregar itens existentes do romaneio
  const carregarItensRomaneio = async () => {
    setLoadingItens(true);
    try {
      // Carregar peças do romaneio - usando a tabela correta
      const { data: pecasData, error: pecasError } = await supabase
        .from('itens_romaneio_pecas')
        .select(`
          *,
          pecas!inner(marca, descricao, etapa_fase, peso_unitario, prioridade)
        `)
        .eq('romaneio_id', romaneio.id);

      if (pecasError) {
        console.error('Erro ao carregar peças do romaneio:', pecasError);
      } else if (pecasData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itensPecaFormatados = pecasData.map((item: any) => ({
          id: item.id,
          peca_id: item.peca_id,
          quantidade: item.quantidade_expedida,
          peso_unitario: item.peso_unitario,
          peso_total: item.peso_total,
          marca: item.marca,
          descricao: item.descricao || '',
          etapa_fase: item.fase || '',
          prioridade: 'P4'
        }));
        setItensPeca(itensPecaFormatados);
      }

      // Carregar insumos do romaneio - usando a tabela correta
      const { data: insumosData, error: insumosError } = await supabase
        .from('itens_romaneio_insumos')
        .select('*')
        .eq('romaneio_id', romaneio.id);

      if (insumosError) {
        console.error('Erro ao carregar insumos do romaneio:', insumosError);
      } else if (insumosData) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const itensInsumoFormatados = insumosData.map((item: any) => ({
          id: item.id,
          nome: item.descricao,
          quantidade: item.quantidade_expedida,
          unidade: item.unidade
        }));
        setItensInsumo(itensInsumoFormatados);
      }

    } catch (error) {
      console.error('Erro ao carregar itens do romaneio:', error);
      toast.error('Erro ao carregar itens do romaneio');
    } finally {
      setLoadingItens(false);
    }
  };

  // Carregar peças quando processo selecionado mudar
  useEffect(() => {
    if (processoSelecionado && isOpen) {
      buscarPecasDisponiveis(processoSelecionado);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [processoSelecionado, isOpen, romaneio.of_number]);

  // Definir processo padrão quando abrir o modal
  useEffect(() => {
    if (isOpen) {
      setProcessoSelecionado('Pintura/Galv');
      setFaseFilter('Todas as fases');
      setMarcaFilter('');
      setPecaDisponivel('');
      setQuantidadePeca('');
      setAdicionarTodas(false);
      carregarItensRomaneio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Filtrar peças baseado nos filtros selecionados
  const pecasFiltradas = useMemo(() => {
    let filtradas = [...pecasDisponiveis];

    if (faseFilter !== 'Todas as fases') {
      filtradas = filtradas.filter(p => p.etapa_fase === faseFilter);
    }

    if (marcaFilter.trim()) {
      filtradas = filtradas.filter(p => 
        p.marca.toLowerCase().includes(marcaFilter.toLowerCase())
      );
    }

    return filtradas.sort((a, b) => {
      const aNum = a.marca.match(/\d+/);
      const bNum = b.marca.match(/\d+/);
      
      if (aNum && bNum) {
        return parseInt(aNum[0]) - parseInt(bNum[0]);
      }
      
      return a.marca.localeCompare(b.marca);
    });
  }, [pecasDisponiveis, faseFilter, marcaFilter]);

  const handleAdicionarPeca = async () => {
    if (adicionarTodas) {
      // Adicionar todas as peças filtradas com suas quantidades disponíveis
      for (const peca of pecasFiltradas) {
        try {
          const { error } = await supabase
            .from('itens_romaneio_pecas')
            .insert({
              romaneio_id: romaneio.id,
              peca_id: peca.id,
              quantidade_expedida: peca.quantidade_disponivel,
              peso_unitario: peca.peso_unitario,
              peso_total: peca.quantidade_disponivel * peca.peso_unitario,
              marca: peca.marca,
              descricao: peca.descricao,
              fase: peca.etapa_fase
            });

          if (error) throw error;
        } catch (error) {
          console.error('Erro ao adicionar peça:', error);
          toast.error(`Erro ao adicionar peça ${peca.marca}`);
        }
      }
      toast.success('Todas as peças foram adicionadas ao romaneio');
    } else {
      // Adicionar peça individual
      if (!pecaDisponivel || !quantidadePeca) {
        toast.error('Selecione uma peça e informe a quantidade');
        return;
      }

      const pecaSelecionada = pecasDisponiveis.find(p => p.id === pecaDisponivel);
      if (!pecaSelecionada) {
        toast.error('Peça não encontrada');
        return;
      }

      try {
        const quantidade = parseInt(quantidadePeca);
        const { error } = await supabase
          .from('itens_romaneio_pecas')
          .insert({
            romaneio_id: romaneio.id,
            peca_id: pecaDisponivel,
            quantidade_expedida: quantidade,
            peso_unitario: pecaSelecionada.peso_unitario,
            peso_total: quantidade * pecaSelecionada.peso_unitario,
            marca: pecaSelecionada.marca,
            descricao: pecaSelecionada.descricao,
            fase: pecaSelecionada.etapa_fase
          });

        if (error) throw error;
        toast.success('Peça adicionada ao romaneio');
      } catch (error) {
        console.error('Erro ao adicionar peça:', error);
        toast.error('Erro ao adicionar peça ao romaneio');
      }
    }
    
    // Recarregar itens e limpar formulário
    carregarItensRomaneio();
    setPecaDisponivel('');
    setQuantidadePeca('');
    setAdicionarTodas(false);
  };

  const handleAdicionarInsumo = async () => {
    if (!nomeInsumo || !quantidadeInsumo || !unidadeInsumo) {
      toast.error('Preencha todos os campos do insumo');
      return;
    }

    try {
      const { error } = await supabase
        .from('itens_romaneio_insumos')
        .insert({
          romaneio_id: romaneio.id,
          descricao: nomeInsumo,
          quantidade_expedida: parseFloat(quantidadeInsumo),
          unidade: unidadeInsumo,
          tipo_insumo: 'Manual'
        });

      if (error) throw error;

      toast.success('Insumo adicionado ao romaneio');
      setNomeInsumo('');
      setQuantidadeInsumo('');
      setUnidadeInsumo('');
      carregarItensRomaneio();
    } catch (error) {
      console.error('Erro ao adicionar insumo:', error);
      toast.error('Erro ao adicionar insumo ao romaneio');
    }
  };

  const handleRemoverItemPeca = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('itens_romaneio_pecas')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Item removido do romaneio');
      carregarItensRomaneio();
    } catch (error) {
      console.error('Erro ao remover item:', error);
      toast.error('Erro ao remover item do romaneio');
    }
  };

  const handleRemoverItemInsumo = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('itens_romaneio_insumos')
        .delete()
        .eq('id', itemId);

      if (error) throw error;
      toast.success('Insumo removido do romaneio');
      carregarItensRomaneio();
    } catch (error) {
      console.error('Erro ao remover insumo:', error);
      toast.error('Erro ao remover insumo do romaneio');
    }
  };

  const getPrioridadeColor = (prioridade: string) => {
    switch (prioridade) {
      case 'P1': return 'bg-red-100 text-red-800';
      case 'P2': return 'bg-orange-100 text-orange-800';
      case 'P3': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const qtdTotalPecas = itensPeca.reduce((total, item) => total + item.quantidade, 0);
  const pesoTotalPecas = itensPeca.reduce((total, item) => total + item.peso_total, 0);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className={`
          ${isMobile 
            ? 'w-[95vw] max-w-none h-[95vh] m-2' 
            : isTablet 
              ? 'w-[90vw] max-w-4xl max-h-[85vh]' 
              : 'max-w-6xl max-h-[90vh]'
          } 
          overflow-hidden flex flex-col
        `}>
          <DialogHeader className="pb-3 shrink-0">
            <DialogTitle className={`flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
              <Package className={`${isMobile ? 'h-4 w-4' : 'h-5 w-5'}`} />
              <span className="truncate">
                Itens do Romaneio {romaneio.numero_romaneio} - OF: {romaneio.of_number}
              </span>
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 overflow-auto">
            <div className="px-1">
              <Tabs defaultValue="pecas" className="flex flex-col h-full">
                <TabsList className={`grid w-full grid-cols-2 ${isMobile ? 'h-10' : 'h-11'} mb-4`}>
                  <TabsTrigger value="pecas" className={isMobile ? 'text-sm' : 'text-base'}>
                    Peças
                  </TabsTrigger>
                  <TabsTrigger value="insumos" className={isMobile ? 'text-sm' : 'text-base'}>
                    Insumos
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="pecas" className="flex-1 space-y-3">
                  {/* Seção Adicionar Peça */}
                  <Card className="shrink-0">
                    <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
                      <h3 className={`font-semibold mb-3 ${isMobile ? 'text-base' : 'text-lg'}`}>
                        Adicionar Peça
                      </h3>
                      
                      {/* Filtro de Processo */}
                      <div className="grid grid-cols-1 gap-3 mb-3">
                        <div>
                          <Label className={`flex items-center gap-2 font-medium mb-2 ${isMobile ? 'text-sm' : 'text-sm'}`}>
                            <Wrench className="h-4 w-4" />
                            Processo * (Obrigatório)
                          </Label>
                          <Select 
                            value={processoSelecionado} 
                            onValueChange={(value) => {
                              setProcessoSelecionado(value);
                              setFaseFilter('Todas as fases');
                              setMarcaFilter('');
                              setPecaDisponivel('');
                            }}
                          >
                            <SelectTrigger className={isMobile ? 'h-10' : 'h-11'}>
                              <SelectValue placeholder="Selecione o processo" />
                            </SelectTrigger>
                            <SelectContent>
                              {processos?.map((processo) => (
                                <SelectItem key={processo.id} value={processo.nome}>
                                  {processo.nome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Filtros dinâmicos */}
                      <div className={`grid gap-3 mb-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                        <div>
                          <Label className={`font-medium mb-2 block ${isMobile ? 'text-sm' : 'text-sm'}`}>
                            Filtrar por Fase
                          </Label>
                          <Select value={faseFilter} onValueChange={setFaseFilter}>
                            <SelectTrigger className={isMobile ? 'h-10' : 'h-11'}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Todas as fases">Todas as fases</SelectItem>
                              {fasesDisponiveis.map((fase) => (
                                <SelectItem key={fase} value={fase}>
                                  {fase}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className={`font-medium mb-2 block ${isMobile ? 'text-sm' : 'text-sm'}`}>
                            Filtrar por Marca
                          </Label>
                          <Input
                            value={marcaFilter}
                            onChange={(e) => setMarcaFilter(e.target.value)}
                            placeholder="Digite a marca da peça..."
                            className={isMobile ? 'h-10' : 'h-11'}
                          />
                        </div>
                      </div>

                      {/* Opção para adicionar todas as peças */}
                      <div className="flex items-start space-x-2 mb-3">
                        <Checkbox
                          id="adicionar-todas"
                          checked={adicionarTodas}
                          onCheckedChange={(checked) => setAdicionarTodas(checked as boolean)}
                          className="mt-1 shrink-0"
                        />
                        <Label 
                          htmlFor="adicionar-todas" 
                          className={`leading-relaxed ${isMobile ? 'text-sm' : 'text-sm'}`}
                        >
                          Adicionar todas as peças listadas com suas respectivas quantidades
                        </Label>
                      </div>

                      {!adicionarTodas && (
                        <>
                          {/* Seletor de peça disponível */}
                          <div className={`grid gap-3 mb-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                            <div>
                              <Label className={`font-medium mb-2 block ${isMobile ? 'text-sm' : 'text-sm'}`}>
                                Peça Disponível
                              </Label>
                              <Select value={pecaDisponivel} onValueChange={setPecaDisponivel}>
                                <SelectTrigger className={isMobile ? 'h-10' : 'h-11'}>
                                  <SelectValue placeholder="Selecionar peça" />
                                </SelectTrigger>
                                <SelectContent>
                                  {loading ? (
                                    <SelectItem value="loading" disabled>Carregando...</SelectItem>
                                  ) : (
                                    <>
                                      {pecasFiltradas.length === 0 ? (
                                        <SelectItem value="empty" disabled>
                                          Nenhuma peça disponível para este processo
                                        </SelectItem>
                                      ) : (
                                        pecasFiltradas.map((peca) => (
                                          <SelectItem key={peca.id} value={peca.id}>
                                            <span className="truncate">
                                              {peca.marca} - {peca.descricao} (Qtd: {peca.quantidade_disponivel})
                                            </span>
                                          </SelectItem>
                                        ))
                                      )}
                                    </>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <Label className={`font-medium mb-2 block ${isMobile ? 'text-sm' : 'text-sm'}`}>
                                Quantidade
                              </Label>
                              <Input
                                type="number"
                                min="1"
                                value={quantidadePeca}
                                onChange={(e) => setQuantidadePeca(e.target.value)}
                                placeholder="Quantidade"
                                className={isMobile ? 'h-10' : 'h-11'}
                              />
                            </div>
                          </div>
                        </>
                      )}

                      <Button 
                        onClick={handleAdicionarPeca}
                        disabled={(!pecaDisponivel && !adicionarTodas) || loading}
                        className={`w-full ${isMobile ? 'h-10 text-sm' : 'h-11'}`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {adicionarTodas ? 'Adicionar Todas as Peças' : 'Adicionar Peça'}
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Seção de resumo das peças no romaneio */}
                  <Card className="shrink-0">
                    <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
                      <div className={`flex justify-between items-start mb-3 ${isMobile ? 'flex-col gap-2' : 'flex-row'}`}>
                        <h4 className={`font-semibold ${isMobile ? 'text-sm' : 'text-md'}`}>
                          Peças no Romaneio
                        </h4>
                        <div className={`flex gap-2 ${isMobile ? 'text-xs flex-wrap' : 'text-sm'}`}>
                          <Badge variant="outline" className={isMobile ? 'text-xs px-2 py-1' : ''}>
                            Qtd Total: {qtdTotalPecas}
                          </Badge>
                          <Badge variant="outline" className={isMobile ? 'text-xs px-2 py-1' : ''}>
                            Peso Total: {pesoTotalPecas.toFixed(2)} kg
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="flex justify-center">
                        <Button 
                          onClick={() => setShowExpandedModal(true)}
                          className={`bg-red-600 hover:bg-red-700 text-white ${isMobile ? 'h-10 px-4 text-sm' : 'px-6 py-2'}`}
                        >
                          <Expand className="h-4 w-4 mr-2" />
                          Expandir
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="insumos" className="flex-1 space-y-3">
                  {/* Seção Adicionar Insumo */}
                  <Card className="shrink-0">
                    <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
                      <h3 className={`font-semibold mb-3 ${isMobile ? 'text-base' : 'text-lg'}`}>
                        Adicionar Insumo
                      </h3>
                      
                      <div className={`grid gap-3 mb-3 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
                        <div>
                          <Label className={`font-medium mb-2 block ${isMobile ? 'text-sm' : 'text-sm'}`}>
                            Nome do Insumo
                          </Label>
                          <Input
                            value={nomeInsumo}
                            onChange={(e) => setNomeInsumo(e.target.value)}
                            placeholder="Nome do insumo"
                            className={isMobile ? 'h-10' : 'h-11'}
                          />
                        </div>

                        <div>
                          <Label className={`font-medium mb-2 block ${isMobile ? 'text-sm' : 'text-sm'}`}>
                            Quantidade
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={quantidadeInsumo}
                            onChange={(e) => setQuantidadeInsumo(e.target.value)}
                            placeholder="Quantidade"
                            className={isMobile ? 'h-10' : 'h-11'}
                          />
                        </div>

                        <div>
                          <Label className={`font-medium mb-2 block ${isMobile ? 'text-sm' : 'text-sm'}`}>
                            Unidade
                          </Label>
                          <Input
                            value={unidadeInsumo}
                            onChange={(e) => setUnidadeInsumo(e.target.value)}
                            placeholder="Ex: kg, m, unid"
                            className={isMobile ? 'h-10' : 'h-11'}
                          />
                        </div>
                      </div>

                      <Button 
                        onClick={handleAdicionarInsumo}
                        disabled={!nomeInsumo || !quantidadeInsumo || !unidadeInsumo}
                        className={`w-full ${isMobile ? 'h-10 text-sm' : 'h-11'}`}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Adicionar Insumo
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Lista de insumos no romaneio */}
                  <Card className="flex-1">
                    <CardContent className={`${isMobile ? 'p-3' : 'p-4'} h-full flex flex-col`}>
                      <h4 className={`font-semibold mb-3 ${isMobile ? 'text-sm' : 'text-md'}`}>
                        Insumos no Romaneio
                      </h4>
                      
                      <ScrollArea className="flex-1 min-h-[200px]">
                        {loadingItens ? (
                          <div className="text-center py-8">
                            <div className={`${isMobile ? 'text-sm' : 'text-base'}`}>Carregando...</div>
                          </div>
                        ) : itensInsumo.length === 0 ? (
                          <div className={`text-center py-8 text-gray-500 ${isMobile ? 'text-sm' : 'text-base'}`}>
                            Nenhum insumo adicionado
                          </div>
                        ) : (
                          <div className="space-y-2 pr-2">
                            <div className={`grid gap-2 font-medium text-gray-600 border-b pb-2 ${
                              isMobile 
                                ? 'grid-cols-2 text-xs' 
                                : 'grid-cols-4 text-xs'
                            }`}>
                              <div>Nome</div>
                              {!isMobile && <div>Quantidade</div>}
                              {!isMobile && <div>Unidade</div>}
                              <div className={isMobile ? 'text-center' : ''}>
                                {isMobile ? 'Qtd/Unid/Ações' : 'Ações'}
                              </div>
                            </div>
                            {itensInsumo.map((item) => (
                              <div 
                                key={item.id} 
                                className={`grid gap-2 border-b py-2 ${
                                  isMobile 
                                    ? 'grid-cols-2 text-sm' 
                                    : 'grid-cols-4 text-sm'
                                }`}
                              >
                                <div className="font-medium truncate">{item.nome}</div>
                                {isMobile ? (
                                  <div className="text-right">
                                    <div className="text-xs text-gray-600">
                                      {item.quantidade} {item.unidade}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleRemoverItemInsumo(item.id)}
                                      className="mt-1 h-6 w-6 p-0"
                                    >
                                      ×
                                    </Button>
                                  </div>
                                ) : (
                                  <>
                                    <div className="text-center">{item.quantidade}</div>
                                    <div>{item.unidade}</div>
                                    <div className="text-center">
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleRemoverItemInsumo(item.id)}
                                        className="h-7 w-7 p-0"
                                      >
                                        ×
                                      </Button>
                                    </div>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>

          <div className={`flex justify-end pt-3 border-t shrink-0 ${isMobile ? 'px-1' : ''}`}>
            <Button 
              variant="outline" 
              onClick={onClose}
              className={isMobile ? 'h-10 px-4 text-sm' : ''}
            >
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal expandido para peças */}
      <PecasRomaneioExpandido
        isOpen={showExpandedModal}
        onClose={() => setShowExpandedModal(false)}
        romaneio={romaneio}
        onRefresh={carregarItensRomaneio}
      />
    </>
  );
};
