import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Filter, Download, Upload } from 'lucide-react';
import { EquipamentosTable } from '@/components/equipamentos/EquipamentosTable';
import { EquipamentosFilters } from '@/components/equipamentos/EquipamentosFilters';
import { EquipamentosStats } from '@/components/equipamentos/EquipamentosStats';
import { EquipamentoModal } from '@/components/equipamentos/EquipamentoModal';
import { useEquipamentos } from '@/hooks/useEquipamentos';
import { useUserRole } from '@/hooks/useUserRole';
import { usePermissionControl } from '@/hooks/usePermissionControl';
import { EquipamentoLoanControl } from '@/components/equipamentos/EquipamentoLoanControl';

const Equipamentos = () => {
  const { canCreate } = usePermissionControl();
  const { isAdmin } = useUserRole();
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState(null);

  const {
    equipamentos,
    isLoading,
    loading,
    filters,
    updateFilters,
    clearFilters,
    createEquipamento,
    updateEquipamento,
    deleteEquipamento,
    stats
  } = useEquipamentos();

  const filteredEquipamentos = equipamentos.filter(equip =>
    equip.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    equip.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (equipamento: any) => {
    setEditingEquipamento(equipamento);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingEquipamento(null);
  };

  const handleSave = async (data: any) => {
    try {
      if (editingEquipamento) {
        await updateEquipamento.mutateAsync({ id: editingEquipamento.id, data });
      } else {
        await createEquipamento.mutateAsync(data);
      }
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar equipamento:', error);
    }
  };

  const handleDelete = (id: string) => {
    deleteEquipamento.mutate(id);
  };

  const [loanControlOpen, setLoanControlOpen] = useState(false);
  const [selectedEquipamento, setSelectedEquipamento] = useState<any | null>(null);
  
  const handleLoanControl = (equipamento: any) => {
    setSelectedEquipamento(equipamento);
    setLoanControlOpen(true);
  };

  if (isLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Equipamentos</h1>
          <p className="text-sm md:text-base text-slate-600 dark:text-slate-400">Gerencie equipamentos e máquinas</p>
        </div>
        
        {canCreate && (
          <Button
            onClick={() => setShowModal(true)}
            className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            <span className="text-sm md:text-base">Novo Equipamento</span>
          </Button>
        )}
      </div>

      <EquipamentosStats stats={stats} />

      <Card className="bg-white border-slate-300 shadow-sm dark:bg-slate-800/50 dark:border-slate-700">
        <CardHeader className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <CardTitle className="text-lg md:text-xl text-slate-900 dark:text-white">
              Lista de Equipamentos
            </CardTitle>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <Input
                  placeholder="Buscar equipamentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full sm:w-64"
                />
              </div>
              
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full sm:w-auto"
              >
                <Filter className="w-4 h-4 mr-2" />
                <span className="text-sm">Filtros</span>
              </Button>
              
              {isAdmin && (
                <>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Upload className="w-4 h-4 mr-2" />
                    <span className="text-sm">Importar</span>
                  </Button>
                  <Button variant="outline" className="w-full sm:w-auto">
                    <Download className="w-4 h-4 mr-2" />
                    <span className="text-sm">Exportar</span>
                  </Button>
                </>
              )}
            </div>
          </div>

          {showFilters && (
            <EquipamentosFilters
              searchTerm={filters.search}
              statusFilter={filters.status}
              propriedadeFilter={filters.propriedade}
              onSearchChange={(value) => updateFilters({ search: value })}
              onStatusChange={(value) => updateFilters({ status: value })}
              onPropriedadeChange={(value) => updateFilters({ propriedade: value })}
              onResetFilters={clearFilters}
            />
          )}
        </CardHeader>

        <CardContent className="p-0 md:p-6">
          <EquipamentosTable
            equipamentos={filteredEquipamentos}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onLoanControl={handleLoanControl}
          />
          
          {/* Modal de controle de empréstimo */}
          {selectedEquipamento && (
            <EquipamentoLoanControl
              isOpen={loanControlOpen}
              onClose={() => {
                setLoanControlOpen(false);
                setSelectedEquipamento(null);
              }}
              equipamento={selectedEquipamento}
            />
          )}
        </CardContent>
      </Card>

      <EquipamentoModal
        isOpen={showModal}
        onClose={handleCloseModal}
        equipamento={editingEquipamento}
        onSave={handleSave}
      />
    </div>
  );
};

export default Equipamentos;
