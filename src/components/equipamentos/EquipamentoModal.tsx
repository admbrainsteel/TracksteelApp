
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useEquipamentos, type Equipamento, type EquipamentoFormData } from '@/hooks/useEquipamentos';

interface EquipamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipamento?: Equipamento | null;
  onSave?: (data: EquipamentoFormData) => Promise<void>;
}

export const EquipamentoModal: React.FC<EquipamentoModalProps> = ({
  isOpen,
  onClose,
  equipamento,
  onSave
}) => {
  const { createEquipamento, updateEquipamento } = useEquipamentos();

  const [formData, setFormData] = useState<EquipamentoFormData>({
    codigo: '',
    descricao: '',
    capacidade: '',
    quantidade: 1,
    local_estoque: '',
    propriedade: 'proprio',
    validade_calibracao: '',
    certificado_calibracao: '',
    periodicidade_calibracao: undefined,
    observacoes: ''
  });

  useEffect(() => {
    if (equipamento) {
      setFormData({
        codigo: equipamento.codigo,
        descricao: equipamento.descricao,
        capacidade: equipamento.capacidade || '',
        quantidade: equipamento.quantidade,
        local_estoque: equipamento.local_estoque,
        propriedade: equipamento.propriedade,
        validade_calibracao: equipamento.validade_calibracao ? formatDateToInput(equipamento.validade_calibracao) : '',
        certificado_calibracao: equipamento.certificado_calibracao || '',
        periodicidade_calibracao: equipamento.periodicidade_calibracao,
        observacoes: equipamento.observacoes || ''
      });
    } else {
      setFormData({
        codigo: '',
        descricao: '',
        capacidade: '',
        quantidade: 1,
        local_estoque: '',
        propriedade: 'proprio',
        validade_calibracao: '',
        certificado_calibracao: '',
        periodicidade_calibracao: undefined,
        observacoes: ''
      });
    }
  }, [equipamento]);

  // Função para converter data DD/MM/AA para formato input (YYYY-MM-DD)
  const formatDateToInput = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const fullYear = year.length === 2 ? `20${year}` : year;
      return `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateStr;
  };

  // Função para converter data do input (YYYY-MM-DD) para DD/MM/AA
  const formatDateFromInput = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Converter data antes de enviar
      const dataToSave = {
        ...formData,
        validade_calibracao: formData.validade_calibracao ? formatDateFromInput(formData.validade_calibracao) : ''
      };

      if (onSave) {
        await onSave(dataToSave);
      } else {
        if (equipamento) {
          await updateEquipamento.mutateAsync({ id: equipamento.id, data: dataToSave });
        } else {
          await createEquipamento.mutateAsync(dataToSave);
        }
        onClose();
      }
    } catch (error) {
      console.error('Erro ao salvar equipamento:', error);
    }
  };

  const handleInputChange = (field: keyof EquipamentoFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {equipamento ? 'Editar Equipamento' : 'Novo Equipamento'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="codigo" className="text-slate-300">Código *</Label>
              <Input
                id="codigo"
                value={formData.codigo}
                onChange={(e) => handleInputChange('codigo', e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao" className="text-slate-300">Descrição *</Label>
              <Input
                id="descricao"
                value={formData.descricao}
                onChange={(e) => handleInputChange('descricao', e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacidade" className="text-slate-300">Capacidade</Label>
              <Input
                id="capacidade"
                value={formData.capacidade}
                onChange={(e) => handleInputChange('capacidade', e.target.value)}
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantidade" className="text-slate-300">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                min="1"
                value={formData.quantidade}
                onChange={(e) => handleInputChange('quantidade', parseInt(e.target.value) || 1)}
                required
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="local_estoque" className="text-slate-300">Local de Estoque *</Label>
              <Input
                id="local_estoque"
                value={formData.local_estoque}
                onChange={(e) => handleInputChange('local_estoque', e.target.value)}
                required
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="propriedade" className="text-slate-300">Propriedade *</Label>
              <Select
                value={formData.propriedade}
                onValueChange={(value) => handleInputChange('propriedade', value)}
              >
                <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 border-slate-600">
                  <SelectItem value="proprio" className="text-white hover:bg-slate-600">Próprio</SelectItem>
                  <SelectItem value="terceiros" className="text-white hover:bg-slate-600">Terceiros</SelectItem>
                  <SelectItem value="alugado" className="text-white hover:bg-slate-600">Alugado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Calibração */}
          <div className="border-t border-slate-600 pt-4">
            <h3 className="text-lg font-semibold mb-4 text-slate-200">Calibração</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="validade_calibracao" className="text-slate-300">Validade da Calibração (DD/MM/AA)</Label>
                <Input
                  id="validade_calibracao"
                  type="date"
                  value={formData.validade_calibracao}
                  onChange={(e) => handleInputChange('validade_calibracao', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="certificado_calibracao" className="text-slate-300">Certificado de Calibração</Label>
                <Input
                  id="certificado_calibracao"
                  value={formData.certificado_calibracao}
                  onChange={(e) => handleInputChange('certificado_calibracao', e.target.value)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="periodicidade_calibracao" className="text-slate-300">Periodicidade (dias)</Label>
                <Input
                  id="periodicidade_calibracao"
                  type="number"
                  value={formData.periodicidade_calibracao || ''}
                  onChange={(e) => handleInputChange('periodicidade_calibracao', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="observacoes" className="text-slate-300">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              rows={3}
              className="bg-slate-700 border-slate-600 text-white"
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={createEquipamento.isPending || updateEquipamento.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {createEquipamento.isPending || updateEquipamento.isPending
                ? 'Salvando...'
                : equipamento
                ? 'Atualizar'
                : 'Criar'
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
