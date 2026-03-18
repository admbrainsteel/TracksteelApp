
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { useEstoqueMateriais, useCriarRastreabilidade, useAtualizarRastreabilidade } from '@/hooks/useRastreabilidadeMateriais';

interface RastreabilidadeLoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  lote?: any | null;
}

export const RastreabilidadeLoteModal: React.FC<RastreabilidadeLoteModalProps> = ({
  isOpen,
  onClose,
  lote
}) => {
  const [formData, setFormData] = useState({
    lote: '',
    material_id: '',
    quantidade: '',
    data_entrada: '',
    fornecedor: '',
    certificado: '',
    corrida: '',
    data_validade: '',
    nota_fiscal: '',
    status: 'Ativo'
  });

  const [materialFilter, setMaterialFilter] = useState('');

  const { data: materiais } = useEstoqueMateriais();
  const criarRastreabilidade = useCriarRastreabilidade();
  const atualizarRastreabilidade = useAtualizarRastreabilidade();

  // Filtrar materiais baseado na busca
  const materiaisFiltrados = materiais?.filter(material => 
    material.descricao.toLowerCase().includes(materialFilter.toLowerCase()) ||
    material.codigo.toLowerCase().includes(materialFilter.toLowerCase())
  ) || [];

  useEffect(() => {
    if (lote) {
      setFormData({
        lote: lote.lote || '',
        material_id: lote.material_id || '',
        quantidade: lote.quantidade?.toString() || '',
        data_entrada: lote.data_entrada || '',
        fornecedor: lote.fornecedor || '',
        certificado: lote.certificado || '',
        corrida: lote.corrida || '',
        data_validade: lote.data_validade || '',
        nota_fiscal: lote.nota_fiscal || '',
        status: lote.status || 'Ativo'
      });
    } else {
      // Resetar formulário para novo lote
      const hoje = new Date();
      const dataFormatada = hoje.toISOString().split('T')[0];
      
      setFormData({
        lote: '',
        material_id: '',
        quantidade: '',
        data_entrada: dataFormatada,
        fornecedor: '',
        certificado: '',
        corrida: '',
        data_validade: '',
        nota_fiscal: '',
        status: 'Ativo'
      });
    }
    // Limpar filtro ao abrir/fechar modal
    setMaterialFilter('');
  }, [lote, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.material_id || !formData.quantidade || !formData.nota_fiscal) {
      alert('Por favor, preencha os campos obrigatórios: Material, Quantidade e Nota Fiscal.');
      return;
    }

    try {
      const dataToSubmit = {
        ...formData,
        quantidade: parseFloat(formData.quantidade),
        lote: formData.lote.trim() || null,
        data_validade: formData.data_validade.trim() || null
      };

      if (lote) {
        await atualizarRastreabilidade.mutateAsync({ id: lote.id, ...dataToSubmit });
      } else {
        await criarRastreabilidade.mutateAsync(dataToSubmit);
      }
      onClose();
    } catch (error) {
      console.error('Erro ao salvar rastreabilidade:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lote ? 'Editar Lote' : 'Novo Lote'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lote">Lote</Label>
              <Input
                id="lote"
                value={formData.lote}
                onChange={(e) => handleInputChange('lote', e.target.value)}
                placeholder="Deixe vazio para gerar automaticamente"
              />
            </div>

            <div>
              <Label htmlFor="material_id">Material *</Label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="filtro: Digite para buscar material..."
                    value={materialFilter}
                    onChange={(e) => setMaterialFilter(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={formData.material_id} onValueChange={(value) => handleInputChange('material_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o material" />
                  </SelectTrigger>
                  <SelectContent>
                    {materiaisFiltrados?.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.descricao} ({material.comprimento ? `${material.comprimento}mm` : 'S/ compr.'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantidade">Quantidade *</Label>
              <Input
                id="quantidade"
                type="number"
                step="0.01"
                value={formData.quantidade}
                onChange={(e) => handleInputChange('quantidade', e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="nota_fiscal">Nota Fiscal *</Label>
              <Input
                id="nota_fiscal"
                value={formData.nota_fiscal}
                onChange={(e) => handleInputChange('nota_fiscal', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data_entrada">Data de Entrada</Label>
              <Input
                id="data_entrada"
                type="date"
                value={formData.data_entrada}
                onChange={(e) => handleInputChange('data_entrada', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="fornecedor">Fornecedor</Label>
              <Input
                id="fornecedor"
                value={formData.fornecedor}
                onChange={(e) => handleInputChange('fornecedor', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="certificado">Certificado</Label>
              <Input
                id="certificado"
                value={formData.certificado}
                onChange={(e) => handleInputChange('certificado', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="corrida">Corrida</Label>
              <Input
                id="corrida"
                value={formData.corrida}
                onChange={(e) => handleInputChange('corrida', e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="data_validade">Data de Validade (Opcional)</Label>
            <Input
              id="data_validade"
              type="date"
              value={formData.data_validade}
              onChange={(e) => handleInputChange('data_validade', e.target.value)}
              placeholder="Campo opcional - pode ficar vazio"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Este campo é opcional e pode ser deixado vazio
            </p>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criarRastreabilidade.isPending || atualizarRastreabilidade.isPending}>
              {criarRastreabilidade.isPending || atualizarRastreabilidade.isPending ? 'Salvando...' : 'Salvar Lote'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
