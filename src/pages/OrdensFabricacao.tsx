
import { useState } from 'react';
import { useOFs } from '@/hooks/useOFs';
import { useNavigate } from 'react-router-dom';
import { NovaOFModal } from '@/components/of/NovaOFModal';
import { EditOFModal } from '@/components/of/EditOFModal';
import { toast } from 'sonner';
import { OrdensHeader } from '@/components/of/OrdensHeader';
import { OrdensFiltros } from '@/components/of/OrdensFiltros';
import { OrdensLista } from '@/components/of/OrdensLista';
import { usePermissionControl } from '@/hooks/usePermissionControl';

const OrdensFabricacao = () => {
  const navigate = useNavigate();
  const { ofs, loading, refetch, updateOF, deleteOF, concluirOF } = useOFs();
  const { canCreate, canEdit, canDelete } = usePermissionControl();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNovaOFModal, setShowNovaOFModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOF, setSelectedOF] = useState<any>(null);

  const filteredOrders = ofs.filter(ordem => {
    const matchesSearch = searchTerm === '' || 
      ordem.num_of.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ordem.descritivo?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || ordem.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleNovaOFSuccess = () => {
    refetch();
  };

  const handleEditOF = (ordem: any) => {
    if (!canEdit()) return;
    setSelectedOF(ordem);
    setShowEditModal(true);
  };

  const handleDeleteOF = async (ordem: any) => {
    if (!canDelete()) return;
    try {
      await deleteOF(ordem.id);
      toast.success('Ordem de Fabricação excluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao excluir Ordem de Fabricação');
    }
  };

  const handleConcluirOF = async (ordem: any) => {
    if (!canEdit()) return;
    try {
      await concluirOF(ordem.id);
      toast.success('Ordem de Fabricação concluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao concluir Ordem de Fabricação');
    }
  };

  const handleVerCronograma = (ordem: any) => {
    navigate('/ofs/cronograma');
  };

  const handleVerDashboard = (ordem: any) => {
    navigate(`/dashboard-producao?of=${ordem.num_of}`);
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6 bg-background min-h-screen">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2 text-sm">Carregando ordens...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 p-2 sm:p-4 lg:p-6 bg-background min-h-screen">
      <OrdensHeader 
        onNovaOF={canCreate() ? () => setShowNovaOFModal(true) : undefined}
        onOFsConcluidas={() => navigate('/cadastro/ofs-concluidas')}
        showNovaOF={canCreate()}
      />

      <OrdensFiltros
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <OrdensLista
        ordens={filteredOrders}
        totalOrdens={ofs.length}
        searchTerm={searchTerm}
        statusFilter={statusFilter}
        onVerCronograma={handleVerCronograma}
        onVerDashboard={handleVerDashboard}
        onEdit={canEdit() ? handleEditOF : undefined}
        onConcluir={canEdit() ? handleConcluirOF : undefined}
        onDelete={canDelete() ? handleDeleteOF : undefined}
        canEdit={canEdit()}
        canDelete={canDelete()}
      />

      {canCreate() && (
        <NovaOFModal 
          isOpen={showNovaOFModal}
          onClose={() => setShowNovaOFModal(false)}
          onSuccess={handleNovaOFSuccess}
        />
      )}

      {canEdit() && (
        <EditOFModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleNovaOFSuccess}
          ordem={selectedOF}
          onUpdate={updateOF}
        />
      )}
    </div>
  );
};

export default OrdensFabricacao;
