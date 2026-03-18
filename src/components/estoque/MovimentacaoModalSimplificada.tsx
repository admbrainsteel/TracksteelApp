
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEstoqueMateriais } from '@/hooks/useEstoqueSimplificado';
import { useCriarMovimentacao } from '@/hooks/useEstoqueMovimentacoes';
import { useRastreabilidadeMateriais } from '@/hooks/useRastreabilidadeMateriais';
import { useOFs } from '@/hooks/useOFs';
import { useAuth } from '@/hooks/useAuth';
import { EstoqueMaterial } from '@/hooks/useEstoque';

interface MovimentacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMaterials?: EstoqueMaterial[];
}

const localizacoes = ['Galpão A', 'Galpão B', 'Pátio', 'Estoque Externo', 'Almoxarifado'];

export const MovimentacaoModalSimplificada: React.FC<MovimentacaoModalProps> = ({
  isOpen,
  onClose,
  selectedMaterials = []
}) => {
  const [formData, setFormData] = useState({
    material_id: '',
    tipo_movimentacao: 'entrada' as 'entrada' | 'saida' | 'transferencia' | 'ajuste' | 'empenho' | 'desempenho',
    quantidade: 0,
    lote: '',
    fornecedor: '',
    nota_fiscal: '',
    of_vinculada: '',
    observacoes: '',
    nova_localizacao: '',
    data_movimentacao: new Date().toISOString().split('T')[0]
  });

  const [quantidadeMaximaDisponivel, setQuantidadeMaximaDisponivel] = useState(0);

  const { data: materiais } = useEstoqueMateriais();
  const { data: lotes } = useRastreabilidadeMateriais();
  const { data: ofs } = useOFs();
  const { user } = useAuth();
  const criarMovimentacao = useCriarMovimentacao();

  // Se há materiais selecionados, mostrar título diferente e permitir movimentação em lote
  const isBatchMode = selectedMaterials.length > 0;

  // Buscar informações do material e definir quantidade máxima
  useEffect(() => {
    if (formData.material_id && materiais) {
      const materialSelecionado = materiais.find(m => m.id === formData.material_id);
      
      if (materialSelecionado) {
        // Definir quantidade máxima baseada no tipo de movimentação
        if (formData.tipo_movimentacao === 'saida' || formData.tipo_movimentacao === 'empenho') {
          setQuantidadeMaximaDisponivel(materialSelecionado.quantidade_disponivel || 0);
        } else {
          setQuantidadeMaximaDisponivel(99999); // Sem limite para entrada, ajuste, transferência
        }

        // Preencher lote automaticamente se disponível
        if (materialSelecionado.lote_atual) {
          setFormData(prev => ({
            ...prev,
            lote: materialSelecionado.lote_atual || ''
          }));

          // Buscar informações do lote
          if (lotes) {
            const loteVinculado = lotes.find(l => l.lote === materialSelecionado.lote_atual);
            if (loteVinculado) {
              setFormData(prev => ({
                ...prev,
                lote: loteVinculado.lote,
                fornecedor: loteVinculado.fornecedor || '',
                nota_fiscal: loteVinculado.nota_fiscal || ''
              }));
            }
          }
        }
      }
    }
  }, [formData.material_id, formData.tipo_movimentacao, materiais, lotes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações específicas
    if ((formData.tipo_movimentacao === 'empenho' || formData.tipo_movimentacao === 'desempenho') && !formData.of_vinculada) {
      return;
    }

    if (formData.quantidade <= 0) {
      return;
    }

    if (formData.quantidade > quantidadeMaximaDisponivel && quantidadeMaximaDisponivel > 0) {
      return;
    }

    try {
      const currentDate = new Date().toLocaleDateString('pt-BR');
      const userName = user?.user_metadata?.full_name || user?.email || 'Usuário não identificado';
      const observacoesComplementadas = `Movimentação realizada em ${currentDate} por ${userName}${formData.observacoes ? ' - ' + formData.observacoes : ''}`;

      if (isBatchMode) {
        // Movimentação em lote para materiais selecionados
        for (const material of selectedMaterials) {
          await criarMovimentacao.mutateAsync({
            material_id: material.id,
            tipo_movimentacao: formData.tipo_movimentacao,
            quantidade: formData.quantidade,
            lote: material.lote_atual || '',
            fornecedor: formData.fornecedor,
            nota_fiscal: formData.nota_fiscal,
            of_vinculada: formData.of_vinculada,
            observacoes: observacoesComplementadas,
            data_movimentacao: formData.data_movimentacao,
            user_name: userName
          });
        }
      } else {
        // Movimentação individual
        await criarMovimentacao.mutateAsync({
          material_id: formData.material_id,
          tipo_movimentacao: formData.tipo_movimentacao,
          quantidade: formData.quantidade,
          lote: formData.lote,
          fornecedor: formData.fornecedor,
          nota_fiscal: formData.nota_fiscal,
          of_vinculada: formData.of_vinculada,
          observacoes: observacoesComplementadas,
          data_movimentacao: formData.data_movimentacao,
          user_name: userName
        });
      }

      // Reset form
      setFormData({
        material_id: '',
        tipo_movimentacao: 'entrada',
        quantidade: 0,
        lote: '',
        fornecedor: '',
        nota_fiscal: '',
        of_vinculada: '',
        observacoes: '',
        nova_localizacao: '',
        data_movimentacao: new Date().toISOString().split('T')[0]
      });
      
      onClose();
    } catch (error) {
      console.error('Erro ao criar movimentação:', error);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Filtrar materiais que possuem lote atual
  const materiaisComLote = materiais?.filter(material => material.lote_atual) || [];
  const materialSelecionado = materiais?.find(m => m.id === formData.material_id);

  const requiresOF = formData.tipo_movimentacao === 'empenho' || formData.tipo_movimentacao === 'desempenho';
  const isTransferencia = formData.tipo_movimentacao === 'transferencia';
  const showLoteInfo = formData.lote || materialSelecionado?.lote_atual;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isBatchMode 
              ? `Nova Movimentação em Lote (${selectedMaterials.length} materiais)`
              : 'Nova Movimentação de Estoque'
            }
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isBatchMode ? (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Materiais Selecionados:</h4>
              <div className="text-sm space-y-1">
                {selectedMaterials.slice(0, 3).map((material) => (
                  <div key={material.id}>
                    • {material.descricao} - {material.lote_atual || 'Sem lote'}
                  </div>
                ))}
                {selectedMaterials.length > 3 && (
                  <div>... e mais {selectedMaterials.length - 3} materiais</div>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="material_id">Material (com Lote) *</Label>
                <Select value={formData.material_id} onValueChange={(value) => handleInputChange('material_id', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o material" />
                  </SelectTrigger>
                  <SelectContent>
                    {materiaisComLote?.map((material) => (
                      <SelectItem key={material.id} value={material.id}>
                        {material.descricao} (Lote: {material.lote_atual})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tipo_movimentacao">Tipo de Movimentação *</Label>
              <Select value={formData.tipo_movimentacao} onValueChange={(value) => handleInputChange('tipo_movimentacao', value)}>
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

            <div>
              <Label htmlFor="quantidade">
                Quantidade * 
                {quantidadeMaximaDisponivel > 0 && !isBatchMode && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (Máx: {quantidadeMaximaDisponivel})
                  </span>
                )}
              </Label>
              <Input
                id="quantidade"
                type="number"
                step="0.01"
                max={quantidadeMaximaDisponivel > 0 && !isBatchMode ? quantidadeMaximaDisponivel : undefined}
                value={formData.quantidade}
                onChange={(e) => handleInputChange('quantidade', parseFloat(e.target.value) || 0)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="data_movimentacao">Data da Movimentação</Label>
            <Input
              id="data_movimentacao"
              type="date"
              value={formData.data_movimentacao}
              onChange={(e) => handleInputChange('data_movimentacao', e.target.value)}
            />
          </div>

          {!isBatchMode && showLoteInfo && (
            <div className="bg-muted p-4 rounded-lg space-y-2">
              <h4 className="font-medium">Informações do Lote</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Lote:</span> {formData.lote}
                </div>
                <div>
                  <span className="font-medium">Fornecedor:</span> {formData.fornecedor || '-'}
                </div>
                <div>
                  <span className="font-medium">NF:</span> {formData.nota_fiscal || '-'}
                </div>
              </div>
            </div>
          )}

          {requiresOF && (
            <div>
              <Label htmlFor="of_vinculada">OF Vinculada *</Label>
              <Select value={formData.of_vinculada} onValueChange={(value) => handleInputChange('of_vinculada', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a OF" />
                </SelectTrigger>
                <SelectContent>
                  {ofs?.map((of) => (
                    <SelectItem key={of.id} value={of.num_of}>
                      {of.num_of} - {of.descritivo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {isTransferencia && (
            <div>
              <Label htmlFor="nova_localizacao">Nova Localização</Label>
              <Select value={formData.nova_localizacao} onValueChange={(value) => handleInputChange('nova_localizacao', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a nova localização" />
                </SelectTrigger>
                <SelectContent>
                  {localizacoes.map((localizacao) => (
                    <SelectItem key={localizacao} value={localizacao}>
                      {localizacao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label htmlFor="observacoes">Observações Adicionais</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleInputChange('observacoes', e.target.value)}
              rows={3}
              placeholder="Observações adicionais (data e usuário serão adicionados automaticamente)"
            />
            <p className="text-xs text-muted-foreground mt-1">
              A data e o usuário da movimentação serão adicionados automaticamente às observações.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={criarMovimentacao.isPending}>
              {criarMovimentacao.isPending ? 'Criando...' : 'Criar Movimentação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
