import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus, Package } from 'lucide-react';
import { PecaForm } from '@/components/pecas/PecaForm';
import { PecasTable } from '@/components/pecas/PecasTable';
import { ComponentesPopup } from '@/components/pecas/ComponentesPopup';
import { usePecas, Peca } from '@/hooks/usePecas';
import { toast } from 'sonner';
import { usePermissionControl } from '@/hooks/usePermissionControl';

export default function CadastroPecasFiltrado() {
  const { ofNumber } = useParams<{ ofNumber: string }>();
  const navigate = useNavigate();
  const ofSelecionada = ofNumber || '';
  const { canCreate, canEdit, canDelete } = usePermissionControl();
  
  const { 
    pecas, 
    loading, 
    ofNumbers, 
    savePeca, 
    updatePeca, 
    deletePeca, 
    importCSV, 
    importPecas,
    undoLastImport,
    deleteLastImport, 
    hasRecentImport,
    batchUpdatePecas,
    loadPecas
  } = usePecas();
  
  const [saving, setSaving] = useState(false);
  const [editingPeca, setEditingPeca] = useState<Peca | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPecaForPopup, setSelectedPecaForPopup] = useState<Peca | null>(null);

  // Filtrar peças pela OF selecionada
  const pecasFiltradas = pecas.filter(peca => peca.of_number === ofSelecionada);

  const handleSave = async (formData: any) => {
    if (!canCreate()) return false;
    setSaving(true);
    try {
      // Garantir que a peça seja salva com a OF selecionada
      const formDataComOF = { ...formData, of_number: ofSelecionada };
      const success = await savePeca(formDataComOF);
      if (success) {
        setShowForm(false);
        // Reload data after successful save
        loadPecas();
      }
      return success;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string, formData: any) => {
    if (!canEdit()) return false;
    setSaving(true);
    try {
      const success = await updatePeca(id, formData);
      if (success) {
        setEditingPeca(null);
        setShowForm(false);
        // Reload data after successful update
        loadPecas();
      }
      return success;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pecaId: string) => {
    if (!canDelete()) return;
    if (confirm('Tem certeza que deseja apagar esta peça?')) {
      const success = await deletePeca(pecaId);
      if (success) {
        // Reload data after successful delete
        loadPecas();
      }
    }
  };

  const handleEdit = (peca: Peca) => {
    if (!canEdit()) return;
    setEditingPeca(peca);
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingPeca(null);
    setShowForm(false);
  };

  const handleDeleteLastImport = async () => {
    if (!canDelete()) return;
    if (confirm('Tem certeza que deseja apagar todas as peças da última importação?')) {
      await deleteLastImport();
      // Reload data after successful delete
      loadPecas();
    }
  };

  const handleOpenComponentPopup = (pecaId: string) => {
    const found = pecas.find(p => p.id === pecaId);
    if (found) {
      setSelectedPecaForPopup(found);
    } else {
      toast.error('Peça não encontrada');
    }
  };

  const handleImportPecas = async (pecasData: any[]) => {
    if (!canCreate()) {
      toast.error('Você não tem permissão para importar peças');
      throw new Error('Sem permissão');
    }
    try {
      // Adicionar a OF selecionada a todas as peças importadas
      const pecasComOF = pecasData.map(peca => ({
        ...peca,
        of_number: ofSelecionada
      }));
      await importPecas(pecasComOF);
      // Reload data after successful import
      loadPecas();
    } catch (error) {
      throw error;
    }
  };

  const handleImportCSV = async (file: File): Promise<boolean> => {
    if (!canCreate()) {
      toast.error('Você não tem permissão para importar peças');
      return false;
    }
    try {
      await importCSV(file);
      // Reload data after successful import
      loadPecas();
      return true;
    } catch (error) {
      console.error('Erro ao importar CSV:', error);
      return false;
    }
  };

  const handleBatchUpdatePecas = async (pecaIds: string[], updates: any) => {
    if (!canEdit()) {
      toast.error('Você não tem permissão para editar peças');
      throw new Error('Sem permissão');
    }
    
    try {
      await batchUpdatePecas(pecaIds, updates);
      // Reload data after successful batch update
      loadPecas();
    } catch (error) {
      throw error;
    }
  };

  const handleUndoLastImport = async () => {
    await undoLastImport();
    // Reload data after successful undo
    loadPecas();
  };

  const handleVoltar = () => {
    navigate('/seletor-of');
  };

  useEffect(() => {
    if (!ofSelecionada) {
      navigate('/seletor-of');
    }
  }, [ofSelecionada, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-foreground">Carregando cadastro de peças...</div>
        </div>
      </div>
    );
  }

  if (!ofSelecionada) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-bold text-foreground">Cadastro de Peças</h1>
              <Badge variant="secondary" className="text-lg px-3 py-1">
                OF: {ofSelecionada}
              </Badge>
            </div>
            <p className="text-muted-foreground">Gerencie as peças da OF selecionada</p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              onClick={handleVoltar}
              variant="outline"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-border">
              {pecasFiltradas.length} {pecasFiltradas.length === 1 ? 'peça' : 'peças'}
            </Badge>
            {canCreate() && (
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Nova Peça
              </Button>
            )}
          </div>
        </div>

        {/* Form Card */}
        {showForm && canCreate() && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground flex items-center gap-2">
                <Package className="h-5 w-5" />
                {editingPeca ? 'Editar Peça' : 'Nova Peça'} - OF: {ofSelecionada}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PecaForm 
                ofNumbers={[ofSelecionada]} // Apenas a OF selecionada
                ofDefault={ofSelecionada}
                onSave={handleSave}
                onUpdate={handleUpdate}
                onImportCSV={handleImportCSV}
                saving={saving}
                editingPeca={editingPeca}
                onCancelEdit={handleCancelEdit}
                hasRecentImport={hasRecentImport}
                onDeleteLastImport={handleDeleteLastImport}
                pecas={pecasFiltradas}
                onImportPecas={handleImportPecas}
                onUndoLastImport={handleUndoLastImport}
                canImport={canCreate()}
                canDelete={canDelete()}
              />
            </CardContent>
          </Card>
        )}

        {/* Table Card */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground flex items-center gap-2">
              <Package className="h-5 w-5" />
              Peças da OF {ofSelecionada}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PecasTable 
              pecas={pecasFiltradas}
              onOpenComponentPopup={handleOpenComponentPopup}
              onDeletePeca={canDelete() ? handleDelete : undefined}
              onEditPeca={canEdit() ? handleEdit : undefined}
              onDeleteLastImport={canDelete() ? handleDeleteLastImport : undefined}
              onBatchUpdatePecas={canEdit() ? handleBatchUpdatePecas : undefined}
              hasRecentImport={hasRecentImport}
              canEdit={canEdit()}
              canDelete={canDelete()}
              ofNumber={ofSelecionada}
            />
          </CardContent>
        </Card>

        {/* Modal de Gerenciamento de Componentes */}
        {selectedPecaForPopup && (
          <ComponentesPopup
            isOpen={!!selectedPecaForPopup}
            onClose={() => {
              setSelectedPecaForPopup(null);
              loadPecas();
            }}
            peca={selectedPecaForPopup}
          />
        )}
      </div>
    </div>
  );
}
