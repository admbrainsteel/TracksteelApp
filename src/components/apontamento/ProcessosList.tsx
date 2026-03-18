
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Save, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useApontamentosProducao } from '@/hooks/useApontamentosProducao';
import { toast } from 'sonner';

type SortField = 'ordem' | 'nome' | 'descricao' | 'ativo';
type SortDirection = 'asc' | 'desc';

export const ProcessosList = () => {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('ordem');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    ordem: 0
  });

  const { processos, loading, criarProcesso, atualizarProcesso } = useApontamentosProducao();

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedProcessos = React.useMemo(() => {
    return [...processos].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'ordem':
          aValue = a.ordem;
          bValue = b.ordem;
          break;
        case 'nome':
          aValue = a.nome;
          bValue = b.nome;
          break;
        case 'descricao':
          aValue = a.descricao || '';
          bValue = b.descricao || '';
          break;
        case 'ativo':
          aValue = a.ativo;
          bValue = b.ativo;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [processos, sortField, sortDirection]);

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-foreground transition-colors w-full text-left"
    >
      {children}
      {sortField === field && (
        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
      )}
    </button>
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error('Nome do processo é obrigatório');
      return;
    }

    let result;
    if (editingId) {
      result = await atualizarProcesso(editingId, formData);
    } else {
      result = await criarProcesso({
        ...formData,
        ativo: true
      });
    }

    if (result.success) {
      setFormData({ nome: '', descricao: '', ordem: 0 });
      setShowForm(false);
      setEditingId(null);
    }
  };

  const handleEdit = (processo: any) => {
    setFormData({
      nome: processo.nome,
      descricao: processo.descricao || '',
      ordem: processo.ordem || 0
    });
    setEditingId(processo.id);
    setShowForm(true);
  };

  const handleCancel = () => {
    setFormData({ nome: '', descricao: '', ordem: 0 });
    setShowForm(false);
    setEditingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="text-muted-foreground">Carregando processos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Processos de Fabricação</h3>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Processo
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? 'Editar Processo' : 'Novo Processo'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="nome">Nome *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome do processo"
                  />
                </div>
                <div>
                  <Label htmlFor="ordem">Ordem</Label>
                  <Input
                    id="ordem"
                    type="number"
                    min="0"
                    value={formData.ordem}
                    onChange={(e) => setFormData(prev => ({ ...prev, ordem: parseInt(e.target.value) || 0 }))}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descrição opcional"
                    rows={1}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? 'Atualizar' : 'Salvar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="h-6">
              <TableHead className="py-1">
                <SortButton field="ordem">Ordem</SortButton>
              </TableHead>
              <TableHead className="py-1">
                <SortButton field="nome">Nome</SortButton>
              </TableHead>
              <TableHead className="py-1">
                <SortButton field="descricao">Descrição</SortButton>
              </TableHead>
              <TableHead className="py-1">
                <SortButton field="ativo">Status</SortButton>
              </TableHead>
              <TableHead className="py-1 w-24">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProcessos.map((processo) => (
              <TableRow key={processo.id} className="h-6">
                <TableCell className="py-1 text-center text-sm">{processo.ordem}</TableCell>
                <TableCell className="py-1 font-medium text-sm">{processo.nome}</TableCell>
                <TableCell className="py-1 text-sm">{processo.descricao || '-'}</TableCell>
                <TableCell className="py-1">
                  <Badge variant={processo.ativo ? 'default' : 'secondary'} className="text-xs">
                    {processo.ativo ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell className="py-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(processo)}
                    className="h-5 w-5 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Card className="mt-4">
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">
            <p><strong>Informações:</strong></p>
            <p>Os processos são utilizados para categorizar os apontamentos de produção.</p>
            <p>A ordem define a sequência dos processos no fluxo de fabricação.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
