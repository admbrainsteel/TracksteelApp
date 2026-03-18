
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEstoqueMateriais } from '@/hooks/useEstoque';
import { useRastreabilidadeMateriais } from '@/hooks/useRastreabilidadeMateriais';
import { useOFs } from '@/hooks/useOFs';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCriarMovimentacao } from '@/hooks/useEstoqueMovimentacoes';
import { useEmpenhosAtivosPorMaterial } from '@/hooks/useEmpenhosMaterial';

interface MovimentacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const localizacoes = ['Galpão A', 'Galpão B', 'Pátio', 'Estoque Externo', 'Almoxarifado'];

export const MovimentacaoModal: React.FC<MovimentacaoModalProps> = ({
  isOpen,
  onClose
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
  const [empenhosAtivos, setEmpenhosAtivos] = useState<any[]>([]);

  const { data: materiais } = useEstoqueMateriais();
  const { data: lotes } = useRastreabilidadeMateriais();
  const { data: ofs } = useOFs();
  const { user } = useAuth();
  const criarMovimentacao = useCriarMovimentacao();

  // Buscar empenhos ativos quando material for selecionado e tipo for desempenho
  useEffect(() => {
    const fetchEmpenhosAtivos = async () => {
      if (formData.material_id && formData.tipo_movimentacao === 'desempenho') {
        const { data, error } = await supabase
          .from('empenhos_material')
          .select('*')
          .eq('material_id', formData.material_id)
          .eq('status', 'Empenhado');
        
        if (!error && data) {
          setEmpenhosAtivos(data);
        }
      } else {
        setEmpenhosAtivos([]);
      }
    };
    
    fetchEmpenhosAtivos();
  }, [formData.material_id, formData.tipo_movimentacao]);

  // Buscar informações do material e definir quantidade máxima
  useEffect(() => {
    if (formData.material_id && materiais) {
      const materialSelecionado = materiais.find(m => m.id === formData.material_id);
      
      if (materialSelecionado) {
        // Definir quantidade máxima baseada no tipo de movimentação
        if (formData.tipo_movimentacao === 'saida' || formData.tipo_movimentacao === 'empenho') {
          setQuantidadeMaximaDisponivel(materialSelecionado.quantidade_disponivel || 0);
        } else if (formData.tipo_movimentacao === 'desempenho') {
          // Para desempenho, limitar pela quantidade empenhada disponível
          const totalEmpenhado = empenhosAtivos.reduce((sum, emp) => 
            sum + ((emp.quantidade_empenhada || 0) - (emp.quantidade_utilizada || 0)), 0);
          setQuantidadeMaximaDisponivel(totalEmpenhado);
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
  }, [formData.material_id, formData.tipo_movimentacao, materiais, lotes, empenhosAtivos]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações básicas
    if (!formData.material_id) {
      toast.error('Material é obrigatório');
      return;
    }

    if (formData.quantidade <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    // Validação para empenho e desempenho
    if (formData.tipo_movimentacao === 'empenho' && !formData.of_vinculada) {
      toast.error('OF vinculada é obrigatória para movimentações de empenho');
      return;
    }

    if (formData.tipo_movimentacao === 'desempenho' && !formData.of_vinculada) {
      toast.error('OF vinculada é obrigatória para movimentações de desempenho');
      return;
    }

    try {
      const currentDate = new Date().toLocaleDateString('pt-BR');
      const userName = user?.user_metadata?.full_name || user?.email || 'Usuário não identificado';
      const observacoesComplementadas = `Movimentação realizada em ${currentDate} por ${userName}${formData.observacoes ? ' - ' + formData.observacoes : ''}`;

      const dadosMovimentacao = {
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
      };

      await criarMovimentacao.mutateAsync(dadosMovimentacao);
      
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
      
      toast.success('Movimentação criada com sucesso!');
      onClose();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro ao criar movimentação: ${errorMessage}`);
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
          <DialogTitle>Nova Movimentação de Estoque</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
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
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="quantidade">
                Quantidade * 
                {quantidadeMaximaDisponivel > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    (Máx: {quantidadeMaximaDisponivel})
                  </span>
                )}
              </Label>
              <Input
                id="quantidade"
                type="number"
                step="0.01"
                max={quantidadeMaximaDisponivel > 0 ? quantidadeMaximaDisponivel : undefined}
                value={formData.quantidade}
                onChange={(e) => handleInputChange('quantidade', parseFloat(e.target.value) || 0)}
                required
              />
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
          </div>

          {showLoteInfo && (
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
              {formData.tipo_movimentacao === 'desempenho' && empenhosAtivos.length === 0 && formData.material_id && (
                <p className="text-sm text-yellow-600 mt-1">
                  ⚠️ Este material não possui empenhos ativos. Verifique se há empenho para a OF selecionada.
                </p>
              )}
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
            <Button 
              type="submit" 
              disabled={criarMovimentacao.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {criarMovimentacao.isPending ? 'Criando...' : 'Criar Movimentação'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
