
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useQualidadesAco, useCriarQualidadeAco, useAtualizarQualidadeAco, useExcluirQualidadeAco } from '@/hooks/useEstoqueCRUD';
import { toast } from 'sonner';

interface QualidadeAcoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QualidadeAcoModal: React.FC<QualidadeAcoModalProps> = ({ isOpen, onClose }) => {
  const { data: qualidades = [], isLoading } = useQualidadesAco();
  const criarQualidade = useCriarQualidadeAco();
  const atualizarQualidade = useAtualizarQualidadeAco();
  const excluirQualidade = useExcluirQualidadeAco();
  
  const [novaQualidade, setNovaQualidade] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAdd = async () => {
    if (novaQualidade.trim() && !qualidades.some(qual => qual.nome === novaQualidade.trim())) {
      try {
        await criarQualidade.mutateAsync({
          nome: novaQualidade.trim(),
          descricao: `Qualidade ${novaQualidade.trim()}`,
          ativo: true
        });
        setNovaQualidade('');
        toast.success('Qualidade criada com sucesso!');
      } catch (error) {
        toast.error('Erro ao criar qualidade');
      }
    }
  };

  const handleEdit = (qualidade: any) => {
    setEditingId(qualidade.id);
    setEditValue(qualidade.nome);
  };

  const handleSaveEdit = async () => {
    if (editValue.trim() && editingId && !qualidades.some(qual => qual.nome === editValue.trim() && qual.id !== editingId)) {
      try {
        const qualidade = qualidades.find(qual => qual.id === editingId);
        if (qualidade) {
          await atualizarQualidade.mutateAsync({
            ...qualidade,
            nome: editValue.trim(),
            descricao: `Qualidade ${editValue.trim()}`
          });
          setEditingId(null);
          setEditValue('');
          toast.success('Qualidade atualizada com sucesso!');
        }
      } catch (error) {
        toast.error('Erro ao atualizar qualidade');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta qualidade?')) {
      try {
        await excluirQualidade.mutateAsync(id);
        toast.success('Qualidade excluída com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir qualidade');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Qualidades do Material</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="nova-qualidade">Nova Qualidade</Label>
              <Input
                id="nova-qualidade"
                value={novaQualidade}
                onChange={(e) => setNovaQualidade(e.target.value)}
                placeholder="Ex: A572G50"
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleAdd} disabled={!novaQualidade.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Qualidades Cadastradas ({qualidades.length})</h3>
            
            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="py-2">Qualidade</TableHead>
                  <TableHead className="w-24 py-2">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qualidades.map((qualidade) => (
                  <TableRow key={qualidade.id} className="h-8">
                    <TableCell className="py-1">
                      {editingId === qualidade.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                            className="h-7"
                          />
                          <Button size="sm" onClick={handleSaveEdit} className="h-7">
                            Salvar
                          </Button>
                          <Button size="sm" variant="outline" onClick={handleCancelEdit} className="h-7">
                            Cancelar
                          </Button>
                        </div>
                      ) : (
                        <span className="font-medium">{qualidade.nome}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-1">
                      {editingId !== qualidade.id && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(qualidade)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(qualidade.id)}
                            className="h-6 w-6 p-0 text-red-500"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
