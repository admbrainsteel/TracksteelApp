import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, FileText, Trash2, Download, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Peca } from '@/hooks/usePecas';
import { ImportarPecasModal } from './ImportarPecasModal';

interface PecaFormProps {
  ofNumbers: string[];
  onSave: (data: any) => Promise<boolean>;
  onUpdate: (id: string, data: any) => Promise<boolean>;
  onImportCSV: (file: File) => Promise<boolean>;
  saving: boolean;
  editingPeca?: Peca | null;
  onCancelEdit: () => void;
  hasRecentImport: boolean;
  onDeleteLastImport: () => void;
  pecas: Peca[];
  onImportPecas: (pecas: any[]) => Promise<void>;
  onUndoLastImport: () => void;
  canImport: boolean;
  canDelete: boolean;
}

export function PecaForm({
  ofNumbers,
  onSave,
  onUpdate,
  onImportCSV,
  saving,
  editingPeca,
  onCancelEdit,
  hasRecentImport,
  onDeleteLastImport,
  pecas,
  onImportPecas,
  onUndoLastImport,
  canImport,
  canDelete
}: PecaFormProps) {
  const [formData, setFormData] = useState({
    of_number: '',
    etapa_fase: '',
    marca: '',
    descricao: '',
    quantidade: 1,
    peso_unitario: 0,
    peso_total: 0,
    tratamento_superficial: '',
    material: '',
    perfil_principal: '',
    tem_componentes: false
  });

  useEffect(() => {
    if (editingPeca) {
      setFormData({
        of_number: editingPeca.of_number,
        etapa_fase: editingPeca.etapa_fase,
        marca: editingPeca.marca,
        descricao: editingPeca.descricao || '',
        quantidade: editingPeca.quantidade,
        peso_unitario: editingPeca.peso_unitario,
        peso_total: editingPeca.peso_total,
        tratamento_superficial: editingPeca.tratamento_superficial || '',
        material: editingPeca.material || '',
        perfil_principal: editingPeca.perfil_principal || '',
        tem_componentes: editingPeca.tem_componentes || false
      });
    } else {
      setFormData({
        of_number: '',
        etapa_fase: '',
        marca: '',
        descricao: '',
        quantidade: 1,
        peso_unitario: 0,
        peso_total: 0,
        tratamento_superficial: '',
        material: '',
        perfil_principal: '',
        tem_componentes: false
      });
    }
  }, [editingPeca]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast.error('Por favor, selecione um arquivo CSV');
      return;
    }

    const success = await onImportCSV(file);
    if (success && fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      if (field === 'quantidade' || field === 'peso_unitario') {
        newData.peso_total = newData.quantidade * newData.peso_unitario;
      }
      
      return newData;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.of_number || !formData.marca) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    let success = false;
    if (editingPeca) {
      success = await onUpdate(editingPeca.id, formData);
    } else {
      success = await onSave(formData);
    }

    if (success) {
      setFormData({
        of_number: '',
        etapa_fase: '',
        marca: '',
        descricao: '',
        quantidade: 1,
        peso_unitario: 0,
        peso_total: 0,
        tratamento_superficial: '',
        material: '',
        perfil_principal: '',
        tem_componentes: false
      });
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="of_number">Número OF *</Label>
            <Select 
              value={formData.of_number} 
              onValueChange={(value) => handleInputChange('of_number', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a OF" />
              </SelectTrigger>
              <SelectContent>
                {ofNumbers.map(ofNumber => (
                  <SelectItem key={ofNumber} value={ofNumber}>
                    {ofNumber}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="etapa_fase">Etapa/Fase</Label>
            <Input
              id="etapa_fase"
              value={formData.etapa_fase}
              onChange={(e) => handleInputChange('etapa_fase', e.target.value)}
              placeholder="Ex: Fabricação"
            />
          </div>

          <div>
            <Label htmlFor="marca">Marca *</Label>
            <Input
              id="marca"
              value={formData.marca}
              onChange={(e) => handleInputChange('marca', e.target.value)}
              placeholder="Marca da peça"
              required
            />
          </div>

          <div className="md:col-span-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              placeholder="Descrição detalhada da peça"
              rows={2}
            />
          </div>

          <div>
            <Label htmlFor="quantidade">Quantidade</Label>
            <Input
              id="quantidade"
              type="number"
              min="1"
              value={formData.quantidade}
              onChange={(e) => handleInputChange('quantidade', parseInt(e.target.value) || 1)}
            />
          </div>

          <div>
            <Label htmlFor="peso_unitario">Peso Unitário (kg)</Label>
            <Input
              id="peso_unitario"
              type="number"
              step="0.01"
              min="0"
              value={formData.peso_unitario}
              onChange={(e) => handleInputChange('peso_unitario', parseFloat(e.target.value) || 0)}
            />
          </div>

          <div>
            <Label htmlFor="peso_total">Peso Total (kg)</Label>
            <Input
              id="peso_total"
              type="number"
              step="0.01"
              value={formData.peso_total.toFixed(2)}
              readOnly
              className="bg-muted"
            />
          </div>

          <div>
            <Label htmlFor="tratamento_superficial">Tratamento Superficial</Label>
            <Input
              id="tratamento_superficial"
              value={formData.tratamento_superficial}
              onChange={(e) => handleInputChange('tratamento_superficial', e.target.value)}
              placeholder="Ex: Galvanização, Pintura"
            />
          </div>

          <div>
            <Label htmlFor="material">Material</Label>
            <Input
              id="material"
              value={formData.material}
              onChange={(e) => handleInputChange('material', e.target.value)}
              placeholder="Ex: Aço A36"
            />
          </div>

          <div>
            <Label htmlFor="perfil_principal">Perfil Principal</Label>
            <Input
              id="perfil_principal"
              value={formData.perfil_principal}
              onChange={(e) => handleInputChange('perfil_principal', e.target.value)}
              placeholder="Ex: Viga H, Coluna"
            />
          </div>
          
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="tem_componentes"
            checked={formData.tem_componentes}
            onCheckedChange={(checked) => handleInputChange('tem_componentes', checked)}
          />
          <Label htmlFor="tem_componentes">Esta peça possui componentes</Label>
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : editingPeca ? 'Atualizar Peça' : 'Salvar Peça'}
          </Button>
          
          {editingPeca && (
            <Button type="button" variant="outline" onClick={onCancelEdit}>
              Cancelar Edição
            </Button>
          )}
        </div>
      </form>

      {canImport && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Importar Peças</h3>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Importar CSV
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowImportModal(true)}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Importar de Lista
                </Button>

                {hasRecentImport && canDelete && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onUndoLastImport}
                      className="flex items-center gap-2 text-yellow-600 hover:text-yellow-700"
                    >
                      <Undo2 className="h-4 w-4" />
                      Desfazer Importação
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      onClick={onDeleteLastImport}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Apagar Última Importação
                    </Button>
                  </>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = '/modelo_pecas.csv';
                    link.download = 'modelo_pecas.csv';
                    link.click();
                  }}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download Modelo CSV
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      )}

      <ImportarPecasModal
        open={showImportModal}
        onOpenChange={setShowImportModal}
        onImport={onImportPecas}
        pecasExistentes={pecas.map(peca => ({
          marca: peca.marca,
          of_number: peca.of_number,
          etapa_fase: peca.etapa_fase
        }))}
      />
    </div>
  );
}
