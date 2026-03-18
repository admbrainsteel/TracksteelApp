
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Plus } from 'lucide-react';
import { useCatalogos } from '@/hooks/useCatalogos';
import { useUserRole } from '@/hooks/useUserRole';
import { CatalogosTable } from '@/components/catalogos/CatalogosTable';
import { CatalogoModal } from '@/components/catalogos/CatalogoModal';
import { CatalogoPreviews } from '@/components/catalogos/CatalogoPreviews';
import { CatalogosFilters } from '@/components/catalogos/CatalogosFilters';
import { DocumentViewer } from '@/components/catalogos/DocumentViewer';
import { Catalogo } from '@/hooks/useCatalogos';

const Catalogos = () => {
  const { isAdmin } = useUserRole();
  const {
    catalogos,
    loading,
    searchTerm,
    setSearchTerm,
    categoriaFilter,
    setCategoriaFilter,
    disciplinaFilter,
    setDisciplinaFilter,
    createCatalogo,
    updateCatalogo,
    deleteCatalogo,
    clearFilters
  } = useCatalogos();

  const [showModal, setShowModal] = useState(false);
  const [editingCatalogo, setEditingCatalogo] = useState(null);
  const [viewMode, setViewMode] = useState<'table' | 'preview'>('table');
  const [viewingCatalogo, setViewingCatalogo] = useState<Catalogo | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);

  const handleEdit = (catalogo: any) => {
    setEditingCatalogo(catalogo);
    setShowModal(true);
  };

  const handleView = (catalogo: Catalogo) => {
    if (catalogo.arquivo_urls && catalogo.arquivo_urls.length > 0) {
      setViewingCatalogo(catalogo);
      setShowDocumentViewer(true);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingCatalogo(null);
  };

  const handleCloseDocumentViewer = () => {
    setShowDocumentViewer(false);
    setViewingCatalogo(null);
  };

  const handleSave = async (data: any) => {
    try {
      if (editingCatalogo) {
        await updateCatalogo(editingCatalogo.id, data);
      } else {
        await createCatalogo(data);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar catálogo:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Catálogos</h1>
          <p className="text-slate-600 dark:text-slate-400">Gerencie documentos técnicos e catálogos</p>
        </div>
        
        {isAdmin && (
          <Button
            onClick={() => setShowModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Documento
          </Button>
        )}
      </div>

      <CatalogosFilters
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categoriaFilter={categoriaFilter}
        setCategoriaFilter={setCategoriaFilter}
        disciplinaFilter={disciplinaFilter}
        setDisciplinaFilter={setDisciplinaFilter}
        onClearFilters={clearFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      <Card className="bg-white border-slate-300 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Documentos Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
            <CatalogosTable
              catalogos={catalogos}
              onEdit={handleEdit}
              onDelete={deleteCatalogo}
              onView={handleView}
              canModify={isAdmin}
            />
          ) : (
            <CatalogoPreviews
              catalogos={catalogos}
              onEdit={handleEdit}
              onDelete={deleteCatalogo}
              onView={handleView}
              canModify={isAdmin}
            />
          )}
        </CardContent>
      </Card>

      {showModal && (
        <CatalogoModal
          catalogo={editingCatalogo}
          onSave={handleSave}
          onClose={handleCloseModal}
        />
      )}

      <DocumentViewer
        catalogo={viewingCatalogo}
        isOpen={showDocumentViewer}
        onClose={handleCloseDocumentViewer}
      />
    </div>
  );
};

export default Catalogos;
