import React, { useState, useMemo } from 'react';
import { StandardCard } from '@/components/layout/StandardCard';
import { Package, Search, Download, Upload, Settings, Users, Plus, Database, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEstoque } from '@/hooks/useEstoque';
import { EstoqueDashboardCards } from './EstoqueDashboardCards';
import { EstoqueMaterialModal } from './EstoqueMaterialModal';
import { TiposFiltroButtonsOtimizado } from './TiposFiltroButtonsOtimizado';
import { EstoqueBatchActions } from './EstoqueBatchActions';
import { EstoqueBatchEditModal } from './EstoqueBatchEditModal';
import { MovimentacaoModalSimplificada } from './MovimentacaoModalSimplificada';
import { EstoqueDesktopTable } from './table/EstoqueDesktopTable';
import { EstoqueMobileView } from './table/EstoqueMobileView';
import { CrudModalsManager } from './CrudModalsManager';
import { RastreabilidadeMP } from './RastreabilidadeMP';
import { EstoqueCriticoModal } from './EstoqueCriticoModal';
import { EstoqueMaterial } from '@/hooks/useEstoque';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function EstoqueTable() {
  const { materiais, loading } = useEstoque();
  const [tipoSelecionado, setTipoSelecionado] = useState('all');
  const [categoriaFilter, setCategoriaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('Normal');
  const [searchTerm, setSearchTerm] = useState('');
  const [descricaoFilter, setDescricaoFilter] = useState('');
  const [loteFilter, setLoteFilter] = useState('');
  const [selectedMaterials, setSelectedMaterials] = useState<EstoqueMaterial[]>([]);
  const [sortField, setSortField] = useState('descricao');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [editingMaterial, setEditingMaterial] = useState<EstoqueMaterial | null>(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showMovimentacaoModal, setShowMovimentacaoModal] = useState(false);
  const [showBatchEditModal, setShowBatchEditModal] = useState(false);
  const [showRastreabilidadeModal, setShowRastreabilidadeModal] = useState(false);
  const [showEstoqueCriticoModal, setShowEstoqueCriticoModal] = useState(false);

  const materiaisFiltrados = useMemo(() => {
    let filtered = materiais;

    // Filtro por termo de busca geral
    if (searchTerm) {
      filtered = filtered.filter(material =>
        material.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.lote_atual?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        material.codigo.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro específico por descrição
    if (descricaoFilter) {
      filtered = filtered.filter(material =>
        material.descricao.toLowerCase().includes(descricaoFilter.toLowerCase())
      );
    }

    // Filtro específico por lote
    if (loteFilter) {
      filtered = filtered.filter(material =>
        material.lote_atual?.toLowerCase().includes(loteFilter.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(material => material.status === statusFilter);
    }

    // Filtro por categoria (direto/indireto)
    if (categoriaFilter !== 'all') {
      filtered = filtered.filter(material => material.tipos_materia_prima?.categoria === categoriaFilter);
    }

    // Filtro por tipo específico (botões dos grupos)
    if (tipoSelecionado !== 'all') {
      filtered = filtered.filter(material => material.tipos_materia_prima?.nome === tipoSelecionado);
    }

    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (sortField) {
        case 'descricao':
          aValue = a.descricao;
          bValue = b.descricao;
          break;
        case 'tipo':
          aValue = a.tipos_materia_prima?.nome || '';
          bValue = b.tipos_materia_prima?.nome || '';
          break;
        case 'quantidade_total':
          aValue = a.quantidade_total;
          bValue = b.quantidade_total;
          break;
        case 'quantidade_disponivel':
          aValue = a.quantidade_disponivel;
          bValue = b.quantidade_disponivel;
          break;
        case 'quantidade_empenhada':
          aValue = a.quantidade_empenhada;
          bValue = b.quantidade_empenhada;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.descricao;
          bValue = b.descricao;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }

      return 0;
    });

    return filtered;
  }, [materiais, searchTerm, descricaoFilter, loteFilter, statusFilter, categoriaFilter, tipoSelecionado, sortField, sortOrder]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const handleSelectMaterial = (material: EstoqueMaterial, isSelected: boolean) => {
    if (isSelected) {
      setSelectedMaterials(prev => [...prev, material]);
    } else {
      setSelectedMaterials(prev => prev.filter(m => m.id !== material.id));
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedMaterials(materiaisFiltrados);
    } else {
      setSelectedMaterials([]);
    }
  };

  const isAllSelected = () => {
    return materiaisFiltrados.length > 0 && selectedMaterials.length === materiaisFiltrados.length;
  };

  const handleEditMaterial = (material: EstoqueMaterial) => {
    setEditingMaterial(material);
    setShowMaterialModal(true);
  };

  const handleCloseModal = () => {
    setShowMaterialModal(false);
    setEditingMaterial(null);
  };

  const handleBatchEditSuccess = () => {
    setSelectedMaterials([]);
    setShowBatchEditModal(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Crítico':
        return 'text-red-600 bg-red-100 border-red-300';
      case 'Normal':
        return 'text-green-600 bg-green-100 border-green-300';
      case 'Excesso':
        return 'text-yellow-600 bg-yellow-100 border-yellow-300';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-300';
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDescricaoFilter('');
    setLoteFilter('');
    setStatusFilter('Normal');
    setCategoriaFilter('all');
    setTipoSelecionado('all');
    setSelectedMaterials([]);
    toast.success('Filtros limpos');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Cards */}
      <EstoqueDashboardCards materiais={materiais} />

      <StandardCard title="Materiais em Estoque" icon={Package}>
        <div className="space-y-4">
          {/* Header com botões de ação */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Controle de Materiais</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShowMaterialModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Material
              </Button>
              <Button
                onClick={() => setShowEstoqueCriticoModal(true)}
                variant="outline"
                className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                Estoque Crítico
              </Button>
              <CrudModalsManager />
              <Button
                variant="outline"
                onClick={() => setShowRastreabilidadeModal(true)}
                className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
              >
                <Database className="w-4 h-4 mr-2" />
                Rastreabilidade
              </Button>
            </div>
          </div>

          {/* Filtros de Tipos */}
          <TiposFiltroButtonsOtimizado
            tipoSelecionado={tipoSelecionado}
            onTipoChange={setTipoSelecionado}
            categoriaFilter={categoriaFilter}
            onCategoriaChange={setCategoriaFilter}
          />

          {/* Filtros superiores com novos filtros específicos */}
          <div className="space-y-4">
            {/* Primeira linha - filtros principais */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por descrição ou lote..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="Normal">Normal</SelectItem>
                  <SelectItem value="Crítico">Crítico</SelectItem>
                  <SelectItem value="Excesso">Excesso</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={handleClearFilters}>
                Limpar Filtros
              </Button>
            </div>

            {/* Segunda linha - filtros específicos para Descrição e Lote */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-muted/30 p-3 rounded-lg border">
              <div className="flex-1">
                <Input
                  placeholder="Filtrar por descrição..."
                  value={descricaoFilter}
                  onChange={(e) => setDescricaoFilter(e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="flex-1">
                <Input
                  placeholder="Filtrar por lote..."
                  value={loteFilter}
                  onChange={(e) => setLoteFilter(e.target.value)}
                  className="bg-background"
                />
              </div>
            </div>
          </div>

          {/* Informações dos filtros */}
          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>Total: {materiaisFiltrados.length} materiais</span>
            {searchTerm && (
              <Badge variant="secondary">
                Busca: {searchTerm}
              </Badge>
            )}
            {descricaoFilter && (
              <Badge variant="secondary">
                Descrição: {descricaoFilter}
              </Badge>
            )}
            {loteFilter && (
              <Badge variant="secondary">
                Lote: {loteFilter}
              </Badge>
            )}
            {statusFilter !== 'all' && (
              <Badge variant="secondary">
                Status: {statusFilter}
              </Badge>
            )}
            {categoriaFilter !== 'all' && (
              <Badge variant="secondary">
                Categoria: {categoriaFilter === 'direto' ? 'Diretos' : 'Indiretos'}
              </Badge>
            )}
            {tipoSelecionado !== 'all' && (
              <Badge variant="secondary">
                Tipo: {tipoSelecionado}
              </Badge>
            )}
          </div>

          {/* Ações em lote */}
          {selectedMaterials.length > 0 && (
            <EstoqueBatchActions
              selectedMaterials={selectedMaterials}
              onClearSelection={() => setSelectedMaterials([])}
              onShowMovimentacao={() => setShowMovimentacaoModal(true)}
              onShowBatchEdit={() => setShowBatchEditModal(true)}
            />
          )}

          {/* Tabela Desktop */}
          <EstoqueDesktopTable
            materiais={materiaisFiltrados}
            selectedMaterials={selectedMaterials}
            onSelectMaterial={handleSelectMaterial}
            onEditMaterial={handleEditMaterial}
            onSelectAll={handleSelectAll}
            isAllSelected={isAllSelected}
            sortField={sortField}
            sortOrder={sortOrder}
            onSort={handleSort}
            getStatusColor={getStatusColor}
          />

          {/* Vista Mobile */}
          <EstoqueMobileView
            materiais={materiaisFiltrados}
            selectedMaterials={selectedMaterials}
            onSelectMaterial={handleSelectMaterial}
            onEditMaterial={handleEditMaterial}
            getStatusColor={getStatusColor}
          />
        </div>
      </StandardCard>

      {/* Modal de Material */}
      <EstoqueMaterialModal
        isOpen={showMaterialModal}
        onClose={handleCloseModal}
        material={editingMaterial}
      />

      {/* Modal de Edição em Lote */}
      <EstoqueBatchEditModal
        isOpen={showBatchEditModal}
        onClose={() => setShowBatchEditModal(false)}
        selectedMaterials={selectedMaterials}
        onSuccess={handleBatchEditSuccess}
      />

      {/* Modal de Movimentação */}
      <MovimentacaoModalSimplificada
        isOpen={showMovimentacaoModal}
        onClose={() => setShowMovimentacaoModal(false)}
        selectedMaterials={selectedMaterials}
      />

      {/* Modal de Estoque Crítico */}
      <EstoqueCriticoModal
        isOpen={showEstoqueCriticoModal}
        onClose={() => setShowEstoqueCriticoModal(false)}
      />

      {/* Modal de Rastreabilidade */}
      <Dialog open={showRastreabilidadeModal} onOpenChange={setShowRastreabilidadeModal}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Rastreabilidade de Matéria Prima</DialogTitle>
          </DialogHeader>
          <RastreabilidadeMP />
        </DialogContent>
      </Dialog>
    </div>
  );
}
