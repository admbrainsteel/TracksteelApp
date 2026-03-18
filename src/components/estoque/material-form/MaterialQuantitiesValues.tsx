
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EstoqueMaterial } from '@/hooks/useEstoque';

interface MaterialQuantitiesValuesProps {
  formData: Partial<EstoqueMaterial>;
  onInputChange: (field: string, value: any) => void;
}

export const MaterialQuantitiesValues = ({ formData, onInputChange }: MaterialQuantitiesValuesProps) => {
  // Calcular quantidade disponível automaticamente
  const quantidadeTotal = formData.quantidade_total || 0;
  const quantidadeEmpenhada = formData.quantidade_empenhada || 0;
  const quantidadeDisponivel = quantidadeTotal - quantidadeEmpenhada;

  // Atualizar quantidade disponível sempre que total ou empenhada mudarem
  React.useEffect(() => {
    onInputChange('quantidade_disponivel', quantidadeDisponivel);
  }, [quantidadeTotal, quantidadeEmpenhada, quantidadeDisponivel, onInputChange]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Quantidades e Valores</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="quantidade_total">Quantidade Total *</Label>
          <Input
            id="quantidade_total"
            type="number"
            step="1"
            min="0"
            value={formData.quantidade_total || ''}
            onChange={(e) => onInputChange('quantidade_total', e.target.value ? Math.floor(Number(e.target.value)) : 0)}
            placeholder="Quantidade total"
          />
        </div>

        <div>
          <Label htmlFor="quantidade_empenhada">Quantidade Empenhada</Label>
          <Input
            id="quantidade_empenhada"
            type="number"
            step="1"
            min="0"
            value={formData.quantidade_empenhada || ''}
            onChange={(e) => onInputChange('quantidade_empenhada', e.target.value ? Math.floor(Number(e.target.value)) : 0)}
            placeholder="Quantidade empenhada"
          />
        </div>

        <div>
          <Label htmlFor="quantidade_disponivel">Quantidade Disponível</Label>
          <Input
            id="quantidade_disponivel"
            type="number"
            value={quantidadeDisponivel}
            readOnly
            className="bg-gray-100 cursor-not-allowed"
            placeholder="Calculado automaticamente"
          />
        </div>

        <div>
          <Label htmlFor="quantidade_minima">Quantidade Mínima</Label>
          <Input
            id="quantidade_minima"
            type="number"
            step="1"
            min="0"
            value={formData.quantidade_minima || ''}
            onChange={(e) => onInputChange('quantidade_minima', e.target.value ? Math.floor(Number(e.target.value)) : null)}
            placeholder="Estoque mínimo"
          />
        </div>

        <div>
          <Label htmlFor="quantidade_maxima">Quantidade Máxima</Label>
          <Input
            id="quantidade_maxima"
            type="number"
            step="1"
            min="0"
            value={formData.quantidade_maxima || ''}
            onChange={(e) => onInputChange('quantidade_maxima', e.target.value ? Math.floor(Number(e.target.value)) : null)}
            placeholder="Estoque máximo"
          />
        </div>

        <div>
          <Label htmlFor="valor_unitario">Preço Unitário (R$)</Label>
          <Input
            id="valor_unitario"
            type="number"
            step="0.01"
            min="0"
            value={formData.valor_unitario || ''}
            onChange={(e) => onInputChange('valor_unitario', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="0,00"
          />
        </div>
      </div>
    </div>
  );
};
