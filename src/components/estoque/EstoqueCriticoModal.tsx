
import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, ShoppingCart, Clock } from 'lucide-react';
import { useMateriaisCriticos } from '@/hooks/useMateriaisCriticos';
import { useMateriaisEmSC } from '@/hooks/useMateriaisEmSC';
import { useSolicitacoesCompra } from '@/hooks/useSolicitacoesCompra';
import { EstoqueMaterial } from '@/hooks/useEstoque';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface EstoqueCriticoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EstoqueCriticoModal({ isOpen, onClose }: EstoqueCriticoModalProps) {
  const { materiaisCriticos, loading } = useMateriaisCriticos();
  const { data: materiaisEmSCMap, isLoading: loadingMateriaisEmSC } = useMateriaisEmSC();
  const { createSolicitacao, isCreating } = useSolicitacoesCompra();
  const [selectedMaterials, setSelectedMaterials] = useState<EstoqueMaterial[]>([]);
  const navigate = useNavigate();

  // Separar materiais críticos em dois grupos
  const { materiaisDisponiveis, materiaisEmSC } = useMemo(() => {
    if (!materiaisEmSCMap) {
      return {
        materiaisDisponiveis: materiaisCriticos,
        materiaisEmSC: []
      };
    }

    const disponiveis: EstoqueMaterial[] = [];
    const emSC: Array<EstoqueMaterial & { solicitacoes: any[] }> = [];

    materiaisCriticos.forEach(material => {
      if (materiaisEmSCMap.has(material.id)) {
        const scInfo = materiaisEmSCMap.get(material.id);
        emSC.push({
          ...material,
          solicitacoes: scInfo.solicitacoes
        });
      } else {
        disponiveis.push(material);
      }
    });

    return { materiaisDisponiveis: disponiveis, materiaisEmSC: emSC };
  }, [materiaisCriticos, materiaisEmSCMap]);

  const handleSelectMaterial = (material: EstoqueMaterial, isSelected: boolean) => {
    if (isSelected) {
      setSelectedMaterials(prev => [...prev, material]);
    } else {
      setSelectedMaterials(prev => prev.filter(m => m.id !== material.id));
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedMaterials(materiaisDisponiveis);
    } else {
      setSelectedMaterials([]);
    }
  };

  const handleGerarSC = async () => {
    if (selectedMaterials.length === 0) {
      toast.error('Selecione pelo menos um material para gerar a SC');
      return;
    }

    try {
      const hoje = new Date();
      const prazoRecebimento = new Date();
      prazoRecebimento.setDate(hoje.getDate() + 3);

      const itens = selectedMaterials.map(material => ({
        material_id: material.id,
        quantidade: Math.ceil((material.quantidade_minima || 1) * 3),
        prazo_recebimento: prazoRecebimento.toISOString().split('T')[0]
      }));

      const solicitacaoData = {
        data_solicitacao: hoje.toISOString().split('T')[0],
        objetivo: 'Geração de SC automática',
        justificativa: `SC gerada automaticamente para reposição de ${selectedMaterials.length} material(is) crítico(s) em estoque.`,
        itens,
        anexos_urls: []
      };

      await createSolicitacao(solicitacaoData);
      
      toast.success('Solicitação de compra gerada com sucesso!');
      setSelectedMaterials([]);
      onClose();
      
      navigate('/solicitacao-compras');
      
    } catch (error) {
      console.error('Erro ao gerar SC:', error);
      toast.error('Erro ao gerar solicitação de compra');
    }
  };

  const isAllSelected = () => {
    return materiaisDisponiveis.length > 0 && selectedMaterials.length === materiaisDisponiveis.length;
  };

  if (loading || loadingMateriaisEmSC) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Materiais com Estoque Crítico
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {materiaisCriticos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum material crítico encontrado
              </h3>
              <p className="text-muted-foreground">
                Todos os materiais estão com quantidades adequadas em estoque.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Materiais já em SC */}
              {materiaisEmSC.length > 0 && (
                <Card className="border-orange-200 bg-orange-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <Clock className="h-5 w-5" />
                      Materiais já em Solicitação de Compra ({materiaisEmSC.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {materiaisEmSC.map((material) => (
                      <div key={material.id} className="bg-white p-4 rounded-lg border border-orange-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-foreground">{material.descricao}</h4>
                            <p className="text-sm text-muted-foreground">
                              Código: {material.codigo} | Disponível: {material.quantidade_disponivel} {material.unidade}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-orange-600 bg-orange-100 border-orange-300">
                            Em SC
                          </Badge>
                        </div>
                        <div className="space-y-1">
                          {material.solicitacoes.map((sc, index) => (
                            <div key={index} className="text-xs bg-orange-100 px-2 py-1 rounded">
                              <span className="font-medium">{sc.numero_sc}</span> - 
                              Qtd: {sc.quantidade} - 
                              Status: <span className="font-medium">{sc.status}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Materiais disponíveis para nova SC */}
              {materiaisDisponiveis.length > 0 && (
                <Card className="border-red-200 bg-red-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-700">
                      <AlertTriangle className="h-5 w-5" />
                      Materiais Disponíveis para Nova SC ({materiaisDisponiveis.length})
                    </CardTitle>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {selectedMaterials.length > 0 && (
                          <Badge variant="secondary">
                            {selectedMaterials.length} selecionado(s)
                          </Badge>
                        )}
                      </div>
                      <Button
                        onClick={handleGerarSC}
                        disabled={selectedMaterials.length === 0 || isCreating}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {isCreating ? 'Gerando SC...' : 'Gerar SC Automática'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader className="sticky top-0 bg-background z-10">
                          <TableRow>
                            <TableHead className="w-12">
                              <input
                                type="checkbox"
                                checked={isAllSelected()}
                                onChange={handleSelectAll}
                                className="w-4 h-4"
                              />
                            </TableHead>
                            <TableHead>Descrição</TableHead>
                            <TableHead>Código</TableHead>
                            <TableHead>Lote</TableHead>
                            <TableHead>Unidade</TableHead>
                            <TableHead>Qtd. Disponível</TableHead>
                            <TableHead>Qtd. Mínima</TableHead>
                            <TableHead>Qtd. Sugerida</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {materiaisDisponiveis.map((material) => {
                            const quantidadeSugerida = Math.ceil((material.quantidade_minima || 1) * 3);
                            
                            return (
                              <TableRow key={material.id}>
                                <TableCell>
                                  <input
                                    type="checkbox"
                                    checked={selectedMaterials.some(m => m.id === material.id)}
                                    onChange={(e) => handleSelectMaterial(material, e.target.checked)}
                                    className="w-4 h-4"
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {material.descricao}
                                </TableCell>
                                <TableCell>{material.codigo}</TableCell>
                                <TableCell>{material.lote_atual || '-'}</TableCell>
                                <TableCell>{material.unidade}</TableCell>
                                <TableCell className="text-red-600 font-medium">
                                  {material.quantidade_disponivel}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {material.quantidade_minima}
                                </TableCell>
                                <TableCell className="text-green-600 font-medium">
                                  {quantidadeSugerida}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-red-600 bg-red-100 border-red-300">
                                    {material.status}
                                  </Badge>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
