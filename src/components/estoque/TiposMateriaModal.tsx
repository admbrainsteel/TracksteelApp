import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit, Trash } from 'lucide-react';
import { 
  useTiposMateriaPrima, 
  useCriarTipoMaterial, 
  useAtualizarTipoMaterial, 
  useExcluirTipoMaterial 
} from '@/hooks/useEstoque';
import { toast } from 'sonner';

interface TiposMateriaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TiposMateriaModal: React.FC<TiposMateriaModalProps> = ({ isOpen, onClose }) => {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoria, setCategoria] = useState<'direto' | 'indireto'>('direto');
  const [gestaoEstoqueCritico, setGestaoEstoqueCritico] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: tipos, isLoading } = useTiposMateriaPrima();
  const criarTipo = useCriarTipoMaterial();
  const atualizarTipo = useAtualizarTipoMaterial();
  const excluirTipo = useExcluirTipoMaterial();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nome.trim()) return;

    try {
      const tipoData = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        categoria,
        gestao_estoque_critico: gestaoEstoqueCritico,
        caracteristicas: {},
        controles: {},
        ativo: true
      };

      if (editingId) {
        await atualizarTipo.mutateAsync({
          id: editingId,
          ...tipoData
        });
      } else {
        await criarTipo.mutateAsync(tipoData);
      }
      
      setNome('');
      setDescricao('');
      setCategoria('direto');
      setGestaoEstoqueCritico(true);
      setEditingId(null);
    } catch (error) {
      console.error('Erro ao salvar tipo de material:', error);
    }
  };

  const handleEdit = (tipo: any) => {
    setNome(tipo.nome);
    setDescricao(tipo.descricao || '');
    setCategoria(tipo.categoria || 'direto');
    setGestaoEstoqueCritico(tipo.gestao_estoque_critico ?? true);
    setEditingId(tipo.id);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este tipo de material?')) {
      await excluirTipo.mutateAsync(id);
    }
  };

  const handleCancel = () => {
    setNome('');
    setDescricao('');
    setCategoria('direto');
    setGestaoEstoqueCritico(true);
    setEditingId(null);
  };

  const handleToggleGestaoEstoque = async (tipo: any) => {
    try {
      const novoValor = !tipo.gestao_estoque_critico;
      
      await atualizarTipo.mutateAsync({
        id: tipo.id,
        nome: tipo.nome,
        descricao: tipo.descricao || '',
        categoria: tipo.categoria || 'direto',
        caracteristicas: tipo.caracteristicas || {},
        controles: tipo.controles || {},
        ativo: tipo.ativo ?? true,
        gestao_estoque_critico: novoValor
      });

      toast.success(`Gestão de estoque crítico ${novoValor ? 'ativada' : 'desativada'} para ${tipo.nome}`);
    } catch (error) {
      console.error('Erro ao alterar gestão de estoque crítico:', error);
      toast.error('Erro ao alterar configuração');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Tipos de Material</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="nome">Nome do Tipo *</Label>
                <Input
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Perfis Laminados"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="categoria">Categoria *</Label>
                <Select value={categoria} onValueChange={(value: 'direto' | 'indireto') => setCategoria(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="direto">Material Direto</SelectItem>
                    <SelectItem value="indireto">Material Indireto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id="gestaoEstoqueCritico"
                  checked={gestaoEstoqueCritico}
                  onCheckedChange={(checked) => setGestaoEstoqueCritico(!!checked)}
                />
                <Label htmlFor="gestaoEstoqueCritico" className="text-sm font-medium">
                  Gestão Estoque Crítico
                </Label>
              </div>
              
              <div>
                <Label htmlFor="descricao">Descrição</Label>
                <Textarea
                  id="descricao"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Descrição do tipo de material"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={criarTipo.isPending || atualizarTipo.isPending}>
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
                  <TableHead>Categoria</TableHead>
                  <TableHead>Gestão Est. Crítico (S/N)</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Carregando...</TableCell>
                  </TableRow>
                ) : tipos?.length ? (
                  tipos.map((tipo) => (
                    <TableRow key={tipo.id}>
                      <TableCell className="font-medium">{tipo.nome}</TableCell>
                      <TableCell>
                        <Badge variant={tipo.categoria === 'direto' ? 'default' : 'secondary'}>
                          {tipo.categoria === 'direto' ? 'Direto' : 'Indireto'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={(tipo as any).gestao_estoque_critico !== false ? 'default' : 'outline'}
                          className="cursor-pointer hover:opacity-80 transition-opacity select-none"
                          onDoubleClick={() => handleToggleGestaoEstoque(tipo)}
                          title="Duplo clique para alterar"
                        >
                          {(tipo as any).gestao_estoque_critico !== false ? 'SIM' : 'NÃO'}
                        </Badge>
                      </TableCell>
                      <TableCell>{tipo.descricao || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(tipo)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(tipo.id)}
                          >
                            <Trash className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Nenhum tipo encontrado</TableCell>
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
