
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EstoqueMaterial, useTiposMateriaPrima, useCriarMaterial, useAtualizarMaterial } from '@/hooks/useEstoque';
import { useRastreabilidadeMateriais } from '@/hooks/useRastreabilidadeMateriais';
import { useAuth } from '@/hooks/useAuth';
import { MaterialBasicInfo } from './material-form/MaterialBasicInfo';
import { MaterialTechnicalSpecs } from './material-form/MaterialTechnicalSpecs';
import { MaterialQuantitiesValues } from './material-form/MaterialQuantitiesValues';
import { MaterialAdditionalInfo } from './material-form/MaterialAdditionalInfo';

interface EstoqueMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  material?: EstoqueMaterial | null;
}

export const EstoqueMaterialModal: React.FC<EstoqueMaterialModalProps> = ({
  isOpen,
  onClose,
  material
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<Partial<EstoqueMaterial>>({
    codigo: '',
    descricao: '',
    tipo_material_id: '',
    unidade: 'PC',
    quantidade_total: 0,
    quantidade_disponivel: 0,
    quantidade_empenhada: 0,
    quantidade_minima: 0,
    quantidade_maxima: null,
    peso_unitario: 0,
    lote_atual: '',
    localizacao: '',
    status: 'Normal',
    observacoes: '',
    comprimento: null,
    largura: null,
    espessura: null,
    qualidade_aco: ''
  });

  useEffect(() => {
    if (material) {
      setFormData({
        codigo: material.codigo || '',
        descricao: material.descricao || '',
        tipo_material_id: material.tipo_material_id || '',
        unidade: material.unidade || 'PC',
        quantidade_total: material.quantidade_total || 0,
        quantidade_disponivel: material.quantidade_disponivel || 0,
        quantidade_empenhada: material.quantidade_empenhada || 0,
        quantidade_minima: material.quantidade_minima || 0,
        quantidade_maxima: material.quantidade_maxima || null,
        peso_unitario: material.peso_unitario || 0,
        lote_atual: material.lote_atual || '',
        localizacao: material.localizacao || '',
        status: material.status || 'Normal',
        observacoes: material.observacoes || '',
        comprimento: material.comprimento || null,
        largura: material.largura || null,
        espessura: material.espessura || null,
        qualidade_aco: material.qualidade_aco || ''
      });
    } else {
      setFormData({
        codigo: '',
        descricao: '',
        tipo_material_id: '',
        unidade: 'PC',
        quantidade_total: 0,
        quantidade_disponivel: 0,
        quantidade_empenhada: 0,
        quantidade_minima: 0,
        quantidade_maxima: null,
        peso_unitario: 0,
        lote_atual: '',
        localizacao: '',
        status: 'Normal',
        observacoes: '',
        comprimento: null,
        largura: null,
        espessura: null,
        qualidade_aco: ''
      });
    }
  }, [material]);

  const { data: tiposMaterial } = useTiposMateriaPrima();
  const { data: lotes } = useRastreabilidadeMateriais();
  const criarMaterial = useCriarMaterial();
  const atualizarMaterial = useAtualizarMaterial();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.descricao?.trim()) {
      alert('Por favor, preencha a descrição do material.');
      return;
    }

    if (!formData.codigo?.trim()) {
      alert('Por favor, preencha o código do material.');
      return;
    }

    try {
      // Preparar as observações com log de usuário e data
      const currentDate = new Date().toLocaleString('pt-BR');
      const userEmail = user?.email || 'Usuário não identificado';
      const actionType = material ? 'atualização' : 'criação';
      
      const logEntry = `\n[${currentDate}] ${actionType.charAt(0).toUpperCase() + actionType.slice(1)} realizada por: ${userEmail}`;
      const observacoesComLog = (formData.observacoes || '') + logEntry;

      const dataToSubmit = {
        codigo: formData.codigo!,
        descricao: formData.descricao!,
        tipo_material_id: formData.tipo_material_id || '',
        unidade: formData.unidade || 'PC',
        quantidade_total: formData.quantidade_total || 0,
        quantidade_disponivel: formData.quantidade_disponivel || 0,
        quantidade_empenhada: formData.quantidade_empenhada || 0,
        quantidade_minima: formData.quantidade_minima || 0,
        quantidade_maxima: formData.quantidade_maxima,
        peso_unitario: formData.peso_unitario || 0,
        valor_unitario: formData.valor_unitario,
        lote_atual: formData.lote_atual,
        fornecedor: formData.fornecedor,
        localizacao: formData.localizacao,
        status: formData.status || 'Normal',
        certificado: formData.certificado,
        observacoes: observacoesComLog,
        comprimento: formData.comprimento,
        largura: formData.largura,
        espessura: formData.espessura,
        qualidade_aco: formData.qualidade_aco,
        kg_por_metro: formData.kg_por_metro,
        created_by: user?.id
      };

      if (material) {
        if (material.id) {
          await atualizarMaterial.mutateAsync({ id: material.id, ...dataToSubmit });
        } else {
          console.error("ID do material não encontrado para atualização.");
          return;
        }
      } else {
        await criarMaterial.mutateAsync(dataToSubmit);
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar material:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {material ? 'Editar Material' : 'Novo Material'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <MaterialBasicInfo
            formData={formData}
            onInputChange={handleInputChange}
            tiposMaterial={tiposMaterial}
            lotes={lotes}
            isEditing={!!material}
          />

          <MaterialTechnicalSpecs
            formData={formData}
            onInputChange={handleInputChange}
          />

          <MaterialQuantitiesValues
            formData={formData}
            onInputChange={handleInputChange}
          />

          <MaterialAdditionalInfo
            formData={formData}
            onInputChange={handleInputChange}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criarMaterial.isPending || atualizarMaterial.isPending}>
              {criarMaterial.isPending || atualizarMaterial.isPending ? 'Salvando...' : 'Salvar Material'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
