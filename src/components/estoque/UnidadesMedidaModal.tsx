import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Edit, Trash } from 'lucide-react';
import { 
  useUnidadesMedida, 
  useCriarUnidadeMedida, 
  useAtualizarUnidadeMedida, 
  useExcluirUnidadeMedida 
} from '@/hooks/useEstoqueCRUD';

interface UnidadesMedidaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnidadesMedidaModal: React.FC<UnidadesMedidaModalProps> = ({ isOpen, onClose }) => {
  const [nome, setNome] = useState('');
  const [abreviacao, setAbreviacao] = useState('');
  const [descricao, setDescricao] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: unidades, isLoading } = useUnidadesMedida();
  const criarUnidade = useCriarUnidadeMedida();
  const atualizarUnidade = useAtualizarUnidadeMedida();
  const excluirUnidade = useExcluirUnidadeMedida();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim() || !abreviacao.trim()) return;

    try {
      const unidadeData = {
        nome: nome.trim(),
        abreviacao: abreviacao.trim().toUpperCase(),
        descricao: descricao.trim(),
        ativo: true
      };

      if (editingId) {
        await atualizarUnidade.mutateAsync({
          id: editingId,
          ...unidadeData
        });
      } else {
        await criarUnidade.mutateAsync(unidadeData);
      }
      
      setNome('');
      setAbreviacao('');
      setDescricao('');
      setEditingId(null);
    } catch (error) {
      console.error('Erro ao salvar unidade de medida:', error);
    }
  };

  const handleEdit = (unidade: any) => {
    setNome(unidade.nome);
    setAbreviacao(unidade.abreviacao);
    setDescricao(unidade.descricao || '');
    setEditingId(unidade.id);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta unidade de medida?')) {
      await excluirUnidade.mutateAsync(id);
    }
  };

  const handleCancel = () => {
    setNome('');
    setAbreviacao('');
    setDescricao('');
    setEditingId(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Unidades de Medida</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="nome">Nome da Unidade *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Quilograma"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="abreviacao">Abreviação *</Label>
                <Input
                  id="abreviacao"
                  value={abreviacao}
                  onChange={(e) => setAbreviacao(e.target.value)}
                  placeholder="Ex: KG"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição da unidade de medida"
                  rows={2}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" disabled={criarUnidade.isPending || atualizarUnidade.isPending}>
                {editingId ? 'Atualizar' : 'Adicionar'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Abreviação</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Carregando...</TableCell>
                  </TableRow>
                ) : unidades?.length ? (
                  unidades.map((unidade) => (
                    <TableRow key={unidade.id}>
                      <TableCell className="font-medium">{unidade.nome}</TableCell>
                      <TableCell>
                        <span className="font-mono bg-muted px-2 py-1 rounded text-sm">
                          {unidade.abreviacao}
                        </span>
                      </TableCell>
                      <TableCell>{unidade.descricao || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(unidade)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(unidade.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center">Nenhuma unidade encontrada</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};