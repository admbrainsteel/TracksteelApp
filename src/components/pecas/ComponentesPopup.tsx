
import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Edit, Trash2, Save, X, Upload, Download, ChevronUp, ChevronDown, FileText } from 'lucide-react';
import { useComponentesPeca, ComponenteFormData, ComponentePeca } from '@/hooks/useComponentesPeca';
import { useComponentesTableActions } from '@/hooks/useComponentesTableActions';
import { Peca } from '@/hooks/usePecas';
import { useAuth } from '@/hooks/useAuth';

interface ComponentesPopupProps {
  isOpen: boolean;
  onClose: () => void;
  peca: Peca;
}

type SortField = 'marca_componente' | 'descricao' | 'perfil' | 'comprimento' | 'peso_unitario' | 'quantidade_por_peca';
type SortOrder = 'asc' | 'desc';

export function ComponentesPopup({ isOpen, onClose, peca }: ComponentesPopupProps) {
  const { user } = useAuth();
  const { componentes, loading, saveComponente, updateComponente, deleteComponente, loadComponentes } = useComponentesPeca(peca.id);
  const { importLoading, exportTemplateCSV, exportComponentesCSV, importComponentesCSV } = useComponentesTableActions();
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('marca_componente');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [formData, setFormData] = useState<ComponenteFormData>({
    marca_componente: '',
    descricao: '',
    perfil: '',
    comprimento: 0,
    peso_unitario: 0,
    quantidade_por_peca: 1
  });

  const resetForm = () => {
    setFormData({
      marca_componente: '',
      descricao: '',
      perfil: '',
      comprimento: 0,
      peso_unitario: 0,
      quantidade_por_peca: 1
    });
    setIsAdding(false);
    setEditingId(null);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronUp className="h-3 w-3 opacity-30" />;
    }
    return sortOrder === 'asc' ? 
      <ChevronUp className="h-3 w-3" /> : 
      <ChevronDown className="h-3 w-3" />;
  };

  const sortedComponentes = [...componentes].sort((a, b) => {
    let aValue = a[sortField];
    let bValue = b[sortField];

    if (aValue === null || aValue === undefined) aValue = '';
    if (bValue === null || bValue === undefined) bValue = '';

    const aStr = String(aValue).toLowerCase();
    const bStr = String(bValue).toLowerCase();

    if (sortOrder === 'asc') {
      return aStr.localeCompare(bStr, undefined, { numeric: true });
    } else {
      return bStr.localeCompare(aStr, undefined, { numeric: true });
    }
  });

  const handleSave = async () => {
    if (!formData.marca_componente) {
      return;
    }

    let success = false;
    if (editingId) {
      success = await updateComponente(editingId, formData);
    } else {
      success = await saveComponente(formData, peca.id);
    }

    if (success) {
      resetForm();
    }
  };

  const handleEdit = (componente: ComponentePeca) => {
    setFormData({
      marca_componente: componente.marca_componente,
      descricao: componente.descricao || '',
      perfil: componente.perfil || '',
      comprimento: componente.comprimento || 0,
      peso_unitario: componente.peso_unitario,
      quantidade_por_peca: componente.quantidade_por_peca
    });
    setEditingId(componente.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja apagar este componente?')) {
      await deleteComponente(id);
    }
  };

  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && user) {
      importComponentesCSV(file, peca.id, user.id, loadComponentes);
      event.target.value = '';
    }
  };

  const calculateTotalQuantity = (componenteQtd: number) => {
    return componenteQtd * (peca.quantidade || 1);
  };

  const calculateTotalWeight = (componenteQtd: number, pesoUnitario: number) => {
    return calculateTotalQuantity(componenteQtd) * pesoUnitario;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Componentes da Peça: {peca.marca}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            OF: {peca.of_number} | Fase: {peca.etapa_fase || 'N/A'} | Quantidade: {peca.quantidade}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {/* Formulário de Adição/Edição */}
          {isAdding && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {editingId ? 'Editar Componente' : 'Adicionar Componente'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="marca_componente" className="text-sm">Componente *</Label>
                    <Input
                      id="marca_componente"
                      value={formData.marca_componente}
                      onChange={(e) => setFormData(prev => ({ ...prev, marca_componente: e.target.value }))}
                      placeholder="1000-9999"
                      maxLength={4}
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="descricao" className="text-sm">Descrição</Label>
                    <Input
                      id="descricao"
                      value={formData.descricao}
                      onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                      placeholder="Descrição do componente"
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="perfil" className="text-sm">Perfil</Label>
                    <Input
                      id="perfil"
                      value={formData.perfil}
                      onChange={(e) => setFormData(prev => ({ ...prev, perfil: e.target.value }))}
                      placeholder="Perfil do componente"
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="comprimento" className="text-sm">Comp. (mm)</Label>
                    <Input
                      id="comprimento"
                      type="number"
                      step="1"
                      min="0"
                      value={formData.comprimento || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, comprimento: parseFloat(e.target.value) || 0 }))}
                      placeholder="Ex: 500"
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="peso_unitario" className="text-sm">Peso Unitário</Label>
                    <Input
                      id="peso_unitario"
                      type="number"
                      step="0.1"
                      value={formData.peso_unitario}
                      onChange={(e) => setFormData(prev => ({ ...prev, peso_unitario: parseFloat(e.target.value) || 0 }))}
                      className="h-8"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="quantidade_por_peca" className="text-sm">Qtd por Peça</Label>
                    <Input
                      id="quantidade_por_peca"
                      type="number"
                      value={formData.quantidade_por_peca}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantidade_por_peca: parseInt(e.target.value) || 1 }))}
                      className="h-8"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm" className="h-8">
                    <Save className="h-3 w-3 mr-2" />
                    {editingId ? 'Atualizar' : 'Salvar'}
                  </Button>
                  <Button variant="outline" onClick={resetForm} size="sm" className="h-8">
                    <X className="h-3 w-3 mr-2" />
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botões de ação */}
          {!isAdding && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setIsAdding(true)} size="sm" className="h-8">
                <Plus className="h-3 w-3 mr-2" />
                Adicionar Componente
              </Button>
              
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCSVImport}
                  disabled={importLoading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Button variant="outline" size="sm" disabled={importLoading} className="h-8">
                  <Upload className="h-3 w-3 mr-2" />
                  {importLoading ? 'Importando...' : 'Importar CSV'}
                </Button>
              </div>
              
              <Button variant="outline" onClick={exportTemplateCSV} size="sm" className="h-8">
                <Download className="h-3 w-3 mr-2" />
                Modelo Tabela
              </Button>
              
              {componentes.length > 0 && (
                <Button 
                  variant="outline" 
                  onClick={() => exportComponentesCSV(componentes, peca.marca)} 
                  size="sm" 
                  className="h-8"
                >
                  <FileText className="h-3 w-3 mr-2" />
                  Exportar CSV
                </Button>
              )}
            </div>
          )}

          {/* Tabela de Componentes */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Componentes Cadastrados ({componentes.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-4 text-center text-sm">Carregando componentes...</div>
              ) : componentes.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  Nenhum componente cadastrado para esta peça
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="h-8">
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none px-2 py-1"
                          onClick={() => handleSort('marca_componente')}
                        >
                          <div className="flex items-center gap-1 text-xs font-medium">
                            Componente
                            {getSortIcon('marca_componente')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none px-2 py-1"
                          onClick={() => handleSort('descricao')}
                        >
                          <div className="flex items-center gap-1 text-xs font-medium">
                            Descrição
                            {getSortIcon('descricao')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none px-2 py-1"
                          onClick={() => handleSort('perfil')}
                        >
                          <div className="flex items-center gap-1 text-xs font-medium">
                            Perfil
                            {getSortIcon('perfil')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none text-right px-2 py-1"
                          onClick={() => handleSort('comprimento')}
                        >
                          <div className="flex items-center justify-end gap-1 text-xs font-medium">
                            Comp. (mm)
                            {getSortIcon('comprimento')}
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none text-center px-2 py-1"
                          onClick={() => handleSort('quantidade_por_peca')}
                        >
                          <div className="flex items-center justify-center gap-1 text-xs font-medium">
                            Qtd/Peça
                            {getSortIcon('quantidade_por_peca')}
                          </div>
                        </TableHead>
                        <TableHead className="text-center px-2 py-1">
                          <span className="text-xs font-medium">Qtd Total</span>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-muted/50 select-none text-right px-2 py-1"
                          onClick={() => handleSort('peso_unitario')}
                        >
                          <div className="flex items-center justify-end gap-1 text-xs font-medium">
                            Peso Unit.
                            {getSortIcon('peso_unitario')}
                          </div>
                        </TableHead>
                        <TableHead className="text-right px-2 py-1">
                          <span className="text-xs font-medium">Peso Total</span>
                        </TableHead>
                        <TableHead className="text-center px-2 py-1 w-20">
                          <span className="text-xs font-medium">Ações</span>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedComponentes.map((componente) => (
                        <TableRow key={componente.id} className="h-8 hover:bg-muted/50">
                          <TableCell className="font-medium px-2 py-1 text-sm">{componente.marca_componente}</TableCell>
                          <TableCell className="px-2 py-1 text-sm">{componente.descricao || '-'}</TableCell>
                          <TableCell className="px-2 py-1 text-sm">{componente.perfil || '-'}</TableCell>
                          <TableCell className="text-right px-2 py-1 text-sm font-mono">{componente.comprimento ? `${componente.comprimento}` : '-'}</TableCell>
                          <TableCell className="text-center px-2 py-1 text-sm">{componente.quantidade_por_peca}</TableCell>
                          <TableCell className="text-center font-medium px-2 py-1 text-sm">
                            {calculateTotalQuantity(componente.quantidade_por_peca)}
                          </TableCell>
                          <TableCell className="text-right px-2 py-1 text-sm">{componente.peso_unitario.toFixed(1)}</TableCell>
                          <TableCell className="text-right font-medium px-2 py-1 text-sm">
                            {calculateTotalWeight(componente.quantidade_por_peca, componente.peso_unitario).toFixed(1)}
                          </TableCell>
                          <TableCell className="px-2 py-1">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEdit(componente)}
                                className="h-5 w-5 p-0"
                              >
                                <Edit className="h-2.5 w-2.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(componente.id)}
                                className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-2.5 w-2.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
