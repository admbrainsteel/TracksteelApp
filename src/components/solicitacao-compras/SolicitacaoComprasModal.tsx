
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSolicitacoesCompra } from '@/hooks/useSolicitacoesCompra';
import { useOFs } from '@/hooks/useOFs';
import { SeletorMateriaisModal } from './SeletorMateriaisModal';
import { FileUploadSection } from './FileUploadSection';

interface ItemSolicitacao {
  material_id: string;
  quantidade: number;
  prazo_recebimento: string;
  material?: {
    descricao: string;
    unidade: string;
  };
}

interface SolicitacaoComprasModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitacao?: any;
}

export function SolicitacaoComprasModal({ isOpen, onClose, solicitacao }: SolicitacaoComprasModalProps) {
  const [vinculo, setVinculo] = useState<'of' | 'objetivo'>('of');
  const [formData, setFormData] = useState({
    data_solicitacao: new Date().toISOString().split('T')[0],
    of_number: '',
    objetivo: '',
    justificativa: '',
  });
  
  const [itens, setItens] = useState<ItemSolicitacao[]>([]);
  const [isSeletorOpen, setIsSeletorOpen] = useState(false);
  const [anexosFiles, setAnexosFiles] = useState<File[]>([]);
  const [anexosUrls, setAnexosUrls] = useState<string[]>([]);
  
  const { createSolicitacao, isCreating } = useSolicitacoesCompra();
  const { ofs, loading } = useOFs();

  useEffect(() => {
    if (solicitacao) {
      setFormData({
        data_solicitacao: solicitacao.data_solicitacao,
        of_number: solicitacao.of_number || '',
        objetivo: solicitacao.objetivo || '',
        justificativa: solicitacao.justificativa || '',
      });
      setVinculo(solicitacao.of_number ? 'of' : 'objetivo');
      setItens(solicitacao.itens || []);
      setAnexosUrls(solicitacao.anexos_urls || []);
    } else {
      resetForm();
    }
  }, [solicitacao]);

  const resetForm = () => {
    setVinculo('of');
    setFormData({
      data_solicitacao: new Date().toISOString().split('T')[0],
      of_number: '',
      objetivo: '',
      justificativa: '',
    });
    setItens([]);
    setAnexosFiles([]);
    setAnexosUrls([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.justificativa.trim()) {
      toast.error('Justificativa é obrigatória');
      return;
    }

    if (vinculo === 'of' && !formData.of_number.trim()) {
      toast.error('Selecione uma OF');
      return;
    }

    if (vinculo === 'objetivo' && !formData.objetivo.trim()) {
      toast.error('Informe o objetivo');
      return;
    }

    if (itens.length === 0) {
      toast.error('Adicione pelo menos um item à solicitação');
      return;
    }

    const solicitacaoData = {
      ...formData,
      of_number: vinculo === 'of' ? formData.of_number : null,
      objetivo: vinculo === 'objetivo' ? formData.objetivo : null,
      itens: itens.map(item => ({
        material_id: item.material_id,
        quantidade: item.quantidade,
        prazo_recebimento: item.prazo_recebimento,
      })),
      anexos_urls: anexosUrls,
    };

    createSolicitacao(solicitacaoData);
    onClose();
    resetForm();
  };

  const adicionarItem = (item: {
    material_id: string;
    descricao: string;
    unidade: string;
    quantidade: number;
    prazo_recebimento: string;
  }) => {
    const novoItem: ItemSolicitacao = {
      material_id: item.material_id,
      quantidade: item.quantidade,
      prazo_recebimento: item.prazo_recebimento,
      material: {
        descricao: item.descricao,
        unidade: item.unidade,
      },
    };
    
    setItens([...itens, novoItem]);
  };

  const removerItem = (index: number) => {
    setItens(itens.filter((_, i) => i !== index));
  };

  const atualizarItem = (index: number, campo: string, valor: any) => {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [campo]: valor };
    setItens(novosItens);
  };

  const handleFilesChange = (files: File[], urls: string[]) => {
    setAnexosFiles(files);
    setAnexosUrls(urls);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {solicitacao ? 'Editar Solicitação de Compra' : 'Nova Solicitação de Compra'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_solicitacao">Data da Solicitação</Label>
                <Input
                  id="data_solicitacao"
                  type="date"
                  value={formData.data_solicitacao}
                  onChange={(e) => setFormData({ ...formData, data_solicitacao: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Vínculo</Label>
                <RadioGroup
                  value={vinculo}
                  onValueChange={(value: 'of' | 'objetivo') => {
                    setVinculo(value);
                    setFormData({ ...formData, of_number: '', objetivo: '' });
                  }}
                  className="flex space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="of" id="vinculo-of" />
                    <Label htmlFor="vinculo-of">Vincular a uma OF</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="objetivo" id="vinculo-objetivo" />
                    <Label htmlFor="vinculo-objetivo">Objetivo (ADM, Fábrica, Estoque)</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {vinculo === 'of' && (
              <div className="space-y-2">
                <Label htmlFor="of_number">Número da OF</Label>
                <Select
                  value={formData.of_number}
                  onValueChange={(value) => setFormData({ ...formData, of_number: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma OF" />
                  </SelectTrigger>
                  <SelectContent>
                    {ofs.map((of) => (
                      <SelectItem key={of.num_of} value={of.num_of}>
                        {of.num_of} - {of.descritivo || 'Sem descrição'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {vinculo === 'objetivo' && (
              <div className="space-y-2">
                <Label htmlFor="objetivo">Objetivo</Label>
                <Input
                  id="objetivo"
                  value={formData.objetivo}
                  onChange={(e) => setFormData({ ...formData, objetivo: e.target.value })}
                  placeholder="Descreva o objetivo da solicitação"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="justificativa">Justificativa / Comentários *</Label>
              <Textarea
                id="justificativa"
                value={formData.justificativa}
                onChange={(e) => setFormData({ ...formData, justificativa: e.target.value })}
                placeholder="Digite a justificativa para a solicitação..."
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Anexos</Label>
              </div>
              <FileUploadSection 
                onFilesChange={handleFilesChange}
                initialFiles={anexosUrls}
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Adicione os materiais necessários para a sua solicitação de compra.</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsSeletorOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>

              {itens.length > 0 && (
                <div className="space-y-3">
                  <div className="grid grid-cols-12 gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                    <div className="col-span-4">DESCRIÇÃO DO MATERIAL</div>
                    <div className="col-span-2">QUANTIDADE</div>
                    <div className="col-span-2">UNIDADE</div>
                    <div className="col-span-3">PRAZO DE RECEBIMENTO</div>
                    <div className="col-span-1">AÇÕES</div>
                  </div>
                  {itens.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 items-center p-2 border rounded">
                      <div className="col-span-4">
                        <p className="text-sm">{item.material?.descricao}</p>
                      </div>
                      <div className="col-span-2">
                        <Input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.quantidade}
                          onChange={(e) => atualizarItem(index, 'quantidade', parseFloat(e.target.value) || 0)}
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-2">
                        <p className="text-sm">{item.material?.unidade}</p>
                      </div>
                      <div className="col-span-3">
                        <Input
                          type="date"
                          value={item.prazo_recebimento}
                          onChange={(e) => atualizarItem(index, 'prazo_recebimento', e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removerItem(index)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Salvando...' : solicitacao ? 'Atualizar' : 'Salvar Solicitação'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <SeletorMateriaisModal
        isOpen={isSeletorOpen}
        onClose={() => setIsSeletorOpen(false)}
        onAddItem={adicionarItem}
      />
    </>
  );
}
