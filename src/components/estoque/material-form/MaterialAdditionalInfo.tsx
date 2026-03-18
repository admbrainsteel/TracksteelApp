
import React from 'react';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EstoqueMaterial } from '@/hooks/useEstoque';

interface MaterialAdditionalInfoProps {
  formData: Partial<EstoqueMaterial>;
  onInputChange: (field: string, value: any) => void;
}

export const MaterialAdditionalInfo: React.FC<MaterialAdditionalInfoProps> = ({
  formData,
  onInputChange
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Outras Informações</h3>
      <div>
        <Label htmlFor="observacoes">Observações</Label>
        <Textarea
          id="observacoes"
          value={formData.observacoes || ''}
          onChange={(e) => onInputChange('observacoes', e.target.value)}
          rows={3}
        />
      </div>
    </div>
  );
};
