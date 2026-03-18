
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMateriaisEstoque } from '@/hooks/useMateriaisEstoque';
import { useTiposMateriais } from '@/hooks/useTiposMateriais';

interface SeletorMateriaisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddItem: (item: {
    material_id: string;
    descricao: string;
    unidade: string;
    quantidade: number;
    prazo_recebimento: string;
  }) => void;
  editingItem?: {
    material_id: string;
    descricao: string;
    unidade: string;
    quantidade: number;
    prazo_recebimento: string;
  };
}

export const SeletorMateriaisModal: React.FC<SeletorMateriaisModalProps> = ({
  isOpen,
  onClose,
  onAddItem,
  editingItem
}) => {
  const [filtros, setFiltros] = useState({
    tipo: '',
    busca: ''
  });
  
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [prazoRecebimento, setPrazoRecebimento] = useState('');

  const { materiais, isLoading: isLoadingMateriais } = useMateriaisEstoque(filtros);
  const { tiposMateriais, isLoading: isLoadingTipos } = useTiposMateriais();

  // Carregar dados do item em edição
  useEffect(() => {
    if (editingItem) {
      setSelectedMaterial(editingItem.material_id);
      setQuantidade(editingItem.quantidade.toString());
      setPrazoRecebimento(editingItem.prazo_recebimento);
    } else {
      // Reset form apenas quando não estiver editando
      setSelectedMaterial('');
      setQuantidade('');
      setPrazoRecebimento('');
    }
  }, [editingItem, isOpen]);

  // Reset form quando modal fechar
  useEffect(() => {
    if (!isOpen && !editingItem) {
      setSelectedMaterial('');
      setQuantidade('');
      setPrazoRecebimento('');
    }
  }, [isOpen, editingItem]);

  const handleAddItem = () => {
    if (!selectedMaterial || !quantidade || !prazoRecebimento) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    const materialData = materiais.find(m => m.id === selectedMaterial);
    if (!materialData) {
      alert('Material não encontrado');
      return;
    }

    const quantidadeNum = parseFloat(quantidade);
    if (isNaN(quantidadeNum) || quantidadeNum <= 0) {
      alert('Quantidade deve ser um número válido maior que zero');
      return;
    }

    onAddItem({
      material_id: selectedMaterial,
      descricao: materialData.descricao,
      unidade: materialData.unidade,
      quantidade: quantidadeNum,
      prazo_recebimento: prazoRecebimento
    });

    // Reset form apenas se não estiver editando
    if (!editingItem) {
      setSelectedMaterial('');
      setQuantidade('');
      setPrazoRecebimento('');
    }
    
    onClose();
  };

  const selectedMaterialData = materiais.find(m => m.id === selectedMaterial);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingItem ? 'Editar Material' : 'Adicionar Material'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Filtros */}
          <div className="bg-muted p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-4">Filtros</h3>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="flex-1">
                <Label htmlFor="tipo-filter">Tipo de Material</Label>
                <Select value={filtros.tipo} onValueChange={(value) => setFiltros(prev => ({ ...prev, tipo: value === 'todos' ? '' : value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os Tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os Tipos</SelectItem>
                    {tiposMateriais.map((tipo) => (
                      <SelectItem key={tipo.id} value={tipo.nome}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <Label htmlFor="busca-filter">Buscar Material</Label>
                <Input
                  id="busca-filter"
                  placeholder="Digite para buscar..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Seleção de Material */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="material">Material *</Label>
              <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um material" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingMateriais ? (
                    <SelectItem value="loading" disabled>Carregando materiais...</SelectItem>
                  ) : materiais.length === 0 ? (
                    <SelectItem value="empty" disabled>Nenhum material encontrado</SelectItem>
                  ) : (
                    materiais.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.codigo} - {material.descricao}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedMaterialData && (
              <div className="bg-muted p-3 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Código:</strong> {selectedMaterialData.codigo}
                  </div>
                  <div>
                    <strong>Unidade:</strong> {selectedMaterialData.unidade}
                  </div>
                  <div>
                    <strong>Tipo:</strong> {selectedMaterialData.tipo_material_nome || 'N/A'}
                  </div>
                  <div>
                    <strong>Disponível:</strong> {selectedMaterialData.quantidade_disponivel || 0}
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="quantidade">Quantidade *</Label>
                <Input
                  id="quantidade"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Digite a quantidade"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="prazo">Prazo de Recebimento *</Label>
                <Input
                  id="prazo"
                  type="date"
                  value={prazoRecebimento}
                  onChange={(e) => setPrazoRecebimento(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAddItem}
              disabled={!selectedMaterial || !quantidade || !prazoRecebimento}
            >
              {editingItem ? 'Atualizar Item' : 'Adicionar Item'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
