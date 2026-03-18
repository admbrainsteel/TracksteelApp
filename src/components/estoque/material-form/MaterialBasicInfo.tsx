
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EstoqueMaterial } from '@/hooks/useEstoque';
import { useUnidadesMedida, useLocalizacoesEstoque } from '@/hooks/useEstoqueCRUD';

interface MaterialBasicInfoProps {
  formData: Partial<EstoqueMaterial>;
  onInputChange: (field: string, value: any) => void;
  tiposMaterial?: any[];
  lotes?: any[];
  isEditing?: boolean;
}

export const MaterialBasicInfo: React.FC<MaterialBasicInfoProps> = ({
  formData,
  onInputChange,
  tiposMaterial,
  lotes,
  isEditing = false
}) => {
  // Hooks para buscar dados das tabelas relacionadas
  const { data: unidadesMedida, isLoading: loadingUnidades } = useUnidadesMedida();
  const { data: localizacoes, isLoading: loadingLocalizacoes } = useLocalizacoesEstoque();

  // Filtrar lotes disponíveis baseado na descrição e qualidade do aço
  const lotesDisponiveis = React.useMemo(() => {
    if (!lotes || !formData.descricao) return [];
    
    return lotes.filter(lote => {
      if (lote.status !== 'Ativo') return false;
      
      // Se o material tem descrição e qualidade do aço, filtrar por ambos
      if (formData.descricao && formData.qualidade_aco) {
        return lote.estoque_materiais?.descricao === formData.descricao &&
               lote.estoque_materiais?.qualidade_aco === formData.qualidade_aco;
      }
      
      // Se tem apenas descrição, filtrar só por descrição
      if (formData.descricao) {
        return lote.estoque_materiais?.descricao === formData.descricao;
      }
      
      return true;
    });
  }, [lotes, formData.descricao, formData.qualidade_aco]);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Informações Básicas</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="descricao">Descrição *</Label>
          <Input
            id="descricao"
            value={formData.descricao || ''}
            onChange={(e) => onInputChange('descricao', e.target.value)}
            required={!isEditing}
          />
        </div>

        <div>
          <Label htmlFor="tipo_material_id">Tipo de Material</Label>
          <Select value={formData.tipo_material_id || ''} onValueChange={(value) => onInputChange('tipo_material_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              {tiposMaterial?.map((tipo) => (
                <SelectItem key={tipo.id} value={tipo.id}>
                  {tipo.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="unidade">Unidade</Label>
          <Select value={formData.unidade || ''} onValueChange={(value) => onInputChange('unidade', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a unidade" />
            </SelectTrigger>
            <SelectContent>
              {loadingUnidades ? (
                <SelectItem value="loading" disabled>
                  Carregando unidades...
                </SelectItem>
              ) : unidadesMedida && unidadesMedida.length > 0 ? (
                unidadesMedida.map((unidade) => (
                  <SelectItem key={unidade.id} value={unidade.abreviacao}>
                    {unidade.abreviacao} - {unidade.nome}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-units" disabled>
                  Nenhuma unidade cadastrada
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="lote_atual">Lote Atual (Opcional)</Label>
          <Select value={formData.lote_atual || ''} onValueChange={(value) => onInputChange('lote_atual', value === 'none' ? '' : value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o lote (opcional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nenhum lote</SelectItem>
              {lotesDisponiveis.length > 0 ? (
                lotesDisponiveis.map((lote) => (
                  <SelectItem key={lote.id} value={lote.lote}>
                    {lote.lote} - {lote.estoque_materiais?.descricao || 'Sem descrição'}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-lots" disabled>
                  Nenhum lote disponível para este material
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="localizacao">Localização</Label>
          <Select value={formData.localizacao || ''} onValueChange={(value) => onInputChange('localizacao', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a localização" />
            </SelectTrigger>
            <SelectContent>
              {loadingLocalizacoes ? (
                <SelectItem value="loading" disabled>
                  Carregando localizações...
                </SelectItem>
              ) : localizacoes && localizacoes.length > 0 ? (
                localizacoes.map((localizacao) => (
                  <SelectItem key={localizacao.id} value={localizacao.nome}>
                    {localizacao.nome}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="no-locations" disabled>
                  Nenhuma localização cadastrada
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="kg_por_metro">Kg/m ou Kg/m2</Label>
          <Input
            id="kg_por_metro"
            type="number"
            step="0.001"
            value={formData.kg_por_metro || ''}
            onChange={(e) => onInputChange('kg_por_metro', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="Peso por metro/metro quadrado"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status || 'Normal'} onValueChange={(value) => onInputChange('status', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Normal">Normal</SelectItem>
            <SelectItem value="Crítico">Crítico</SelectItem>
            <SelectItem value="Excesso">Excesso</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
