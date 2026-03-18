
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EstoqueMaterial } from '@/hooks/useEstoque';

interface MaterialTechnicalSpecsProps {
  formData: Partial<EstoqueMaterial>;
  onInputChange: (field: string, value: any) => void;
}

export const MaterialTechnicalSpecs = ({ formData, onInputChange }: MaterialTechnicalSpecsProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Especificações Técnicas</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="comprimento">Comprimento (mm)</Label>
          <Input
            id="comprimento"
            type="number"
            step="1"
            min="0"
            value={formData.comprimento || ''}
            onChange={(e) => onInputChange('comprimento', e.target.value ? Math.floor(Number(e.target.value)) : null)}
            placeholder="Comprimento em mm"
          />
        </div>

        <div>
          <Label htmlFor="largura">Largura (mm)</Label>
          <Input
            id="largura"
            type="number"
            step="1"
            min="0"
            value={formData.largura || ''}
            onChange={(e) => onInputChange('largura', e.target.value ? Math.floor(Number(e.target.value)) : null)}
            placeholder="Largura em mm"
          />
        </div>

        <div>
          <Label htmlFor="espessura">Espessura (mm)</Label>
          <Input
            id="espessura"
            type="number"
            step="1"
            min="0"
            value={formData.espessura || ''}
            onChange={(e) => onInputChange('espessura', e.target.value ? Math.floor(Number(e.target.value)) : null)}
            placeholder="Espessura em mm"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="qualidade_aco">Qualidade do Aço</Label>
        <Input
          id="qualidade_aco"
          value={formData.qualidade_aco || ''}
          onChange={(e) => onInputChange('qualidade_aco', e.target.value)}
          placeholder="Ex: SAE 1020, ASTM A36, etc."
        />
      </div>

      <div>
        <Label htmlFor="peso_unitario">Peso Unitário (kg)</Label>
        <Input
          id="peso_unitario"
          type="number"
          step="0.001"
          min="0"
          value={formData.peso_unitario || ''}
          onChange={(e) => onInputChange('peso_unitario', e.target.value ? parseFloat(e.target.value) : null)}
          placeholder="Peso unitário em kg"
        />
      </div>
    </div>
  );
};
