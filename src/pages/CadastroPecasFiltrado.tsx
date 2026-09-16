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
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';

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
    deletePecasBatch,
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
      const pecaComOF = { ...formData, of_number: ofSelecionada };
      const success = await savePeca(pecaComOF);
      if (success) {
        setShowForm(false);
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
      const pecaComOF = { ...formData, of_number: ofSelecionada };
      const success = await updatePeca(id, pecaComOF);
      if (success) {
        setEditingPeca(null);
        setShowForm(false);
        loadPecas();
      }
      return success;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pecaId: string) => {
    if (!canDelete()) return;
    if (confirm('Tem certeza que deseja apagar esta peça e seus vínculos?')) {
      const success = await deletePeca(pecaId);
      if (success) {
        loadPecas();
      }
    }
  };

  const handleDeleteBatch = async (pecaIds: string[]) => {
    if (!canDelete()) return;
    const success = await deletePecasBatch(pecaIds);
    if (success) {
      loadPecas();
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
      const pecasComOF = pecasData.map(peca => ({
        ...peca,
        of_number: ofSelecionada
      }));
      await importPecas(pecasComOF);
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
      loadPecas();
      return true;
    } catch (error) {
      return false;
    }
  };

  const handleUndoLastImport = async () => {
    if (!canDelete()) return;
    if (confirm('Tem certeza que deseja desfazer a última importação?')) {
      await undoLastImport();
      loadPecas();
    }
  };

  const handleBatchUpdatePecas = async (pecaIds: string[], updates: any) => {
    if (!canEdit()) return;
    await batchUpdatePecas(pecaIds, updates);
    loadPecas();
  };

  useEffect(() => {
    if (!ofSelecionada) {
      navigate('/seletor-of');
    }
  }, [ofSelecionada, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Carregando peças da OF {ofSelecionada}...</p>
        </div>
      </div>
    );
  }

  if (!ofSelecionada) {
    return null;
  }

  return (
    <StandardPageLayout
      title="Cadastro de Peças"
      subtitle="Gerencie as peças da OF selecionada"
      badge={{ text: `OF: ${ofSelecionada}`, variant: "secondary" }}
      actions={
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => navigate('/ordens-fabricacao')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {pecasFiltradas.length} peças
          </Badge>
          {canCreate() && (
            <Button
              onClick={() => {
                setEditingPeca(null);
                setShowForm(!showForm);
              }}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              {showForm ? 'Fechar' : 'Nova Peça'}
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {/* Form Card */}
        {showForm && canCreate() && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">
                {editingPeca ? 'Editar Peça' : 'Nova Peça'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PecaForm
                ofNumbers={[ofSelecionada]}
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
              onDeletePecasBatch={canDelete() ? handleDeleteBatch : undefined}
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
    </StandardPageLayout>
  );
}
