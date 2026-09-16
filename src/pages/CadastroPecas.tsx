
import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { usePecas, Peca } from '@/hooks/usePecas';
import { usePecasP4Listener } from '@/hooks/usePecasP4Listener';
import { PecaForm } from '@/components/pecas/PecaForm';
import { PecasTable } from '@/components/pecas/PecasTable';
import { ComponentesPopup } from '@/components/pecas/ComponentesPopup';
import { Package, Plus, RefreshCw } from 'lucide-react';
import { usePermissionControl } from '@/hooks/usePermissionControl';

export default function CadastroPecas() {
  // Inicializar listener para peças P4
  usePecasP4Listener();

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
    loadPecas,
    sincronizarPrioridades
  } = usePecas();
  
  const { canCreate, canEdit, canDelete } = usePermissionControl();
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingPeca, setEditingPeca] = useState<Peca | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedPecaForPopup, setSelectedPecaForPopup] = useState<Peca | null>(null);

  const handleSave = async (formData: any) => {
    if (!canCreate()) return false;
    setSaving(true);
    try {
      const success = await savePeca(formData);
      if (success) {
        setShowForm(false);
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
      }
      return success;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pecaId: string) => {
    if (!canDelete()) return;
    if (confirm('Tem certeza que deseja apagar esta peça e seus vínculos?')) {
      await deletePeca(pecaId);
    }
  };

  const handleDeleteBatch = async (pecaIds: string[]) => {
    if (!canDelete()) return;
    await deletePecasBatch(pecaIds);
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
      await importPecas(pecasData);
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
      return true;
    } catch (error) {
      console.error('Erro ao importar CSV:', error);
      return false;
    }
  };

  const handleSyncPriorities = async () => {
    setSyncing(true);
    try {
      await sincronizarPrioridades();
      toast.success('Prioridades sincronizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao sincronizar prioridades:', error);
      toast.error('Erro ao sincronizar prioridades');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-foreground">Carregando cadastro de peças...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Cadastro de Peças</h1>
            <p className="text-muted-foreground">
              Gerencie o cadastro de peças do sistema. 
              <span className="text-sm block mt-1">
                ℹ️ As prioridades são controladas automaticamente pelo sistema de Prioridades de Fabricação e são sincronizadas em tempo real.
              </span>
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-border">
              {pecas.length} {pecas.length === 1 ? 'peça' : 'peças'}
            </Badge>
            <Button 
              onClick={handleSyncPriorities}
              disabled={syncing}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Sincronizando...' : 'Sincronizar Prioridades'}
            </Button>
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
                {editingPeca ? 'Editar Peça' : 'Nova Peça'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PecaForm 
                ofNumbers={ofNumbers}
                onSave={handleSave}
                onUpdate={handleUpdate}
                onImportCSV={handleImportCSV}
                saving={saving}
                editingPeca={editingPeca}
                onCancelEdit={handleCancelEdit}
                hasRecentImport={hasRecentImport}
                onDeleteLastImport={handleDeleteLastImport}
                pecas={pecas}
                onImportPecas={handleImportPecas}
                onUndoLastImport={undoLastImport}
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
              Peças Cadastradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PecasTable 
              pecas={pecas}
              onOpenComponentPopup={handleOpenComponentPopup}
              onDeletePeca={canDelete() ? handleDelete : undefined}
              onDeletePecasBatch={canDelete() ? handleDeleteBatch : undefined}
              onEditPeca={canEdit() ? handleEdit : undefined}
              onDeleteLastImport={canDelete() ? handleDeleteLastImport : undefined}
              hasRecentImport={hasRecentImport}
              canEdit={canEdit()}
              canDelete={canDelete()}
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
