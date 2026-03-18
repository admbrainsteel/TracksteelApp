
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EstoqueMaterial, useTiposMateriaPrima, useAtualizarMaterial } from '@/hooks/useEstoque';
import { useUnidadesMedida, useLocalizacoesEstoque, useQualidadesAco } from '@/hooks/useEstoqueCRUD';

interface EstoqueBatchEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMaterials: EstoqueMaterial[];
  onSuccess: () => void;
}

export const EstoqueBatchEditModal: React.FC<EstoqueBatchEditModalProps> = ({
  isOpen,
  onClose,
  selectedMaterials,
  onSuccess
}) => {
  const [formData, setFormData] = useState({
    tipo_material_id: '',
    unidade: '',
    quantidade_minima: '',
    quantidade_maxima: '',
    peso_unitario: '',
    valor_unitario: '',
    lote_atual: '',
    fornecedor: '',
    localizacao: '',
    qualidade_aco: ''
  });

  const { data: tiposMaterial } = useTiposMateriaPrima();
  const { data: unidadesMedida } = useUnidadesMedida();
  const { data: localizacoes } = useLocalizacoesEstoque();
  const { data: qualidadesAco } = useQualidadesAco();
  const atualizarMaterial = useAtualizarMaterial();

  useEffect(() => {
    // Initialize form data with common values from selected materials
    if (selectedMaterials.length > 0) {
      setFormData({
        tipo_material_id: '',
        unidade: '',
        quantidade_minima: '',
        quantidade_maxima: '',
        peso_unitario: '',
        valor_unitario: '',
        lote_atual: '',
        fornecedor: '',
        localizacao: '',
        qualidade_aco: ''
      });
    }
  }, [selectedMaterials]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await Promise.all(
        selectedMaterials.map(material => {
          const updates: Partial<EstoqueMaterial> = {};
          if (formData.tipo_material_id !== '' && formData.tipo_material_id !== 'none') updates.tipo_material_id = formData.tipo_material_id;
          if (formData.unidade !== '' && formData.unidade !== 'none') updates.unidade = formData.unidade;
          if (formData.quantidade_minima !== '') updates.quantidade_minima = parseFloat(formData.quantidade_minima);
          if (formData.quantidade_maxima !== '') updates.quantidade_maxima = parseFloat(formData.quantidade_maxima);
          if (formData.peso_unitario !== '') updates.peso_unitario = parseFloat(formData.peso_unitario);
          if (formData.valor_unitario !== '') updates.valor_unitario = parseFloat(formData.valor_unitario);
          if (formData.lote_atual !== '') updates.lote_atual = formData.lote_atual;
          if (formData.fornecedor !== '') updates.fornecedor = formData.fornecedor;
          if (formData.localizacao !== '' && formData.localizacao !== 'none') updates.localizacao = formData.localizacao;
          if (formData.qualidade_aco !== '' && formData.qualidade_aco !== 'none') {
            updates.qualidade_aco = formData.qualidade_aco === "remove" ? null : formData.qualidade_aco;
          }

          return atualizarMaterial.mutateAsync({ id: material.id, ...updates });
        })
      );

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao atualizar materiais em lote:", error);
      alert("Erro ao atualizar materiais em lote.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar {selectedMaterials.length} Material(is) em Lote</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo_material_id">Tipo de Material</Label>
              <Select value={formData.tipo_material_id} onValueChange={(value) => handleInputChange('tipo_material_id', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Não alterar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não alterar</SelectItem>
                  {tiposMaterial?.map((tipo) => (
                    <SelectItem key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="unidade">Unidade</Label>
              <Select value={formData.unidade} onValueChange={(value) => handleInputChange('unidade', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Não alterar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não alterar</SelectItem>
                  {unidadesMedida?.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.abreviacao}>
                      {unidade.abreviacao} - {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantidade_minima">Quantidade Mínima</Label>
              <Input
                id="quantidade_minima"
                type="number"
                step="0.01"
                value={formData.quantidade_minima}
                onChange={(e) => handleInputChange('quantidade_minima', e.target.value)}
                placeholder="Não alterar"
              />
            </div>

            <div>
              <Label htmlFor="quantidade_maxima">Quantidade Máxima</Label>
              <Input
                id="quantidade_maxima"
                type="number"
                step="0.01"
                value={formData.quantidade_maxima}
                onChange={(e) => handleInputChange('quantidade_maxima', e.target.value)}
                placeholder="Não alterar"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="peso_unitario">Peso Unitário</Label>
              <Input
                id="peso_unitario"
                type="number"
                step="0.001"
                value={formData.peso_unitario}
                onChange={(e) => handleInputChange('peso_unitario', e.target.value)}
                placeholder="Não alterar"
              />
            </div>

            <div>
              <Label htmlFor="valor_unitario">Valor Unitário</Label>
              <Input
                id="valor_unitario"
                type="number"
                step="0.01"
                value={formData.valor_unitario}
                onChange={(e) => handleInputChange('valor_unitario', e.target.value)}
                placeholder="Não alterar"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lote_atual">Lote Atual</Label>
              <Input
                id="lote_atual"
                value={formData.lote_atual}
                onChange={(e) => handleInputChange('lote_atual', e.target.value)}
                placeholder="Não alterar"
              />
            </div>

            <div>
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Input
                id="fornecedor"
                value={formData.fornecedor}
                onChange={(e) => handleInputChange('fornecedor', e.target.value)}
                placeholder="Não alterar"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="localizacao">Localização</Label>
              <Select value={formData.localizacao} onValueChange={(value) => handleInputChange('localizacao', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Não alterar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não alterar</SelectItem>
                  {localizacoes?.map((localizacao) => (
                    <SelectItem key={localizacao.id} value={localizacao.nome}>
                      {localizacao.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="qualidade_aco">Qualidade do Aço</Label>
              <Select value={formData.qualidade_aco} onValueChange={(value) => handleInputChange('qualidade_aco', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Não alterar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não alterar</SelectItem>
                  <SelectItem value="remove">Remover qualidade</SelectItem>
                  {qualidadesAco?.map((qualidade) => (
                    <SelectItem key={qualidade.id} value={qualidade.nome}>
                      {qualidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={atualizarMaterial.isPending}>
              {atualizarMaterial.isPending ? 'Atualizando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
