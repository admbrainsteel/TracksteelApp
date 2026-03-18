
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCriarMovimentacao } from '@/hooks/useEstoqueMovimentacoes';
import { EstoqueMaterial } from '@/hooks/useEstoque';
import { useOFsAtivas } from '@/hooks/useOFsAtivas';
import { toast } from 'sonner';

interface EstoqueBatchMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMaterials: EstoqueMaterial[];
  onSuccess: () => void;
}

export function EstoqueBatchMovementModal({ 
  isOpen, 
  onClose, 
  selectedMaterials,
  onSuccess 
}: EstoqueBatchMovementModalProps) {
  const [formData, setFormData] = useState({
    tipo_movimentacao: 'entrada' as 'entrada' | 'saida' | 'transferencia' | 'ajuste' | 'empenho' | 'desempenho',
    quantidade: '',
    of_vinculada: '',
    observacoes: '',
    data_movimentacao: new Date().toISOString().split('T')[0]
  });

  const criarMovimentacao = useCriarMovimentacao();
  const { data: ofsAtivas = [] } = useOFsAtivas();

  const handleSubmit = async () => {
    if (!formData.quantidade || !formData.tipo_movimentacao) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    // Validar se OF é obrigatória para empenho e desempenho
    if ((formData.tipo_movimentacao === 'empenho' || formData.tipo_movimentacao === 'desempenho') && !formData.of_vinculada) {
      toast.error('OF vinculada é obrigatória para movimentações de empenho e desempenho');
      return;
    }

    try {
      const quantidade = parseFloat(formData.quantidade);

      // Create movement for each selected material
      for (const material of selectedMaterials) {
        await criarMovimentacao.mutateAsync({
          material_id: material.id,
          tipo_movimentacao: formData.tipo_movimentacao,
          quantidade,
          of_vinculada: formData.of_vinculada || undefined,
          observacoes: formData.observacoes || undefined,
          data_movimentacao: formData.data_movimentacao
        });
      }

      toast.success(`Movimentação criada para ${selectedMaterials.length} material(is)!`);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Erro ao criar movimentação em lote:', error);
      toast.error('Erro ao criar movimentação em lote');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const requiresOF = formData.tipo_movimentacao === 'empenho' || formData.tipo_movimentacao === 'desempenho';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Movimentação em Lote</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Criará a mesma movimentação para {selectedMaterials.length} material(is) selecionado(s)
          </p>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Tipo de Movimentação *</Label>
            <Select value={formData.tipo_movimentacao} onValueChange={(value: any) => handleInputChange('tipo_movimentacao', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entrada">Entrada</SelectItem>
                <SelectItem value="saida">Saída</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="ajuste">Ajuste</SelectItem>
                <SelectItem value="empenho">Empenho</SelectItem>
                <SelectItem value="desempenho">Desempenho</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quantidade *</Label>
            <Input
              type="number"
              value={formData.quantidade}
              onChange={(e) => handleInputChange('quantidade', e.target.value)}
              placeholder="Quantidade a movimentar"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Data da Movimentação</Label>
            <Input
              type="date"
              value={formData.data_movimentacao}
              onChange={(e) => handleInputChange('data_movimentacao', e.target.value)}
            />
          </div>

          {requiresOF ? (
            <div className="space-y-2">
              <Label>OF Vinculada *</Label>
              <Select value={formData.of_vinculada} onValueChange={(value) => handleInputChange('of_vinculada', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a OF" />
                </SelectTrigger>
                <SelectContent>
                  {ofsAtivas.map((of) => (
                    <SelectItem key={of.of_number} value={of.of_number}>
                      {of.of_number} - {of.cliente || 'Cliente não informado'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>OF Vinculada</Label>
              <Input
                value={formData.of_vinculada}
                onChange={(e) => handleInputChange('of_vinculada', e.target.value)}
                placeholder="Número da OF (opcional)"
              />
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              placeholder="Observações sobre a movimentação"
              rows={3}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={criarMovimentacao.isPending}
          >
            {criarMovimentacao.isPending ? 'Criando...' : 'Criar Movimentação'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
