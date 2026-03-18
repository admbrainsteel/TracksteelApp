
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useLocalizacoesEstoque, useCriarLocalizacao, useAtualizarLocalizacao, useExcluirLocalizacao } from '@/hooks/useEstoqueCRUD';
import { toast } from 'sonner';

interface LocalizacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LocalizacaoModal: React.FC<LocalizacaoModalProps> = ({ isOpen, onClose }) => {
  const { data: localizacoes = [], isLoading } = useLocalizacoesEstoque();
  const criarLocalizacao = useCriarLocalizacao();
  const atualizarLocalizacao = useAtualizarLocalizacao();
  const excluirLocalizacao = useExcluirLocalizacao();
  
  const [novaLocalizacao, setNovaLocalizacao] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleAdd = async () => {
    if (novaLocalizacao.trim() && !localizacoes.some(loc => loc.nome === novaLocalizacao.trim())) {
      try {
        await criarLocalizacao.mutateAsync({
          nome: novaLocalizacao.trim(),
          codigo: novaLocalizacao.trim().substring(0, 10).toUpperCase(),
          descricao: `Localização ${novaLocalizacao.trim()}`,
          ativo: true
        });
        setNovaLocalizacao('');
        toast.success('Localização criada com sucesso!');
      } catch (error) {
        toast.error('Erro ao criar localização');
      }
    }
  };

  const handleEdit = (localizacao: any) => {
    setEditingId(localizacao.id);
    setEditValue(localizacao.nome);
  };

  const handleSaveEdit = async () => {
    if (editValue.trim() && editingId && !localizacoes.some(loc => loc.nome === editValue.trim() && loc.id !== editingId)) {
      try {
        const localizacao = localizacoes.find(loc => loc.id === editingId);
        if (localizacao) {
          await atualizarLocalizacao.mutateAsync({
            ...localizacao,
            nome: editValue.trim(),
            codigo: editValue.trim().substring(0, 10).toUpperCase(),
            descricao: `Localização ${editValue.trim()}`
          });
          setEditingId(null);
          setEditValue('');
          toast.success('Localização atualizada com sucesso!');
        }
      } catch (error) {
        toast.error('Erro ao atualizar localização');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta localização?')) {
      try {
        await excluirLocalizacao.mutateAsync(id);
        toast.success('Localização excluída com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir localização');
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Localizações</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="nova-localizacao">Nova Localização</Label>
              <Input
                id="nova-localizacao"
                value={novaLocalizacao}
                onChange={(e) => setNovaLocalizacao(e.target.value)}
                placeholder="Ex: Estoque A1, Galpão Principal"
                onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
              />
            </div>
            <div className="flex items-end gap-2">
              <Button onClick={handleAdd} disabled={!novaLocalizacao.trim()}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-medium">Localizações Cadastradas ({localizacoes.length})</h3>
            
            <Table>
              <TableHeader>
                <TableRow className="h-8">
                  <TableHead className="py-2">Localização</TableHead>
                  <TableHead className="w-24 py-2">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localizacoes.map((localizacao) => (
                  <TableRow key={localizacao.id} className="h-8">
                    <TableCell className="py-1">
                      {editingId === localizacao.id ? (
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
                        <span className="font-medium">{localizacao.nome}</span>
                      )}
                    </TableCell>
                    <TableCell className="py-1">
                      {editingId !== localizacao.id && (
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(localizacao)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(localizacao.id)}
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
