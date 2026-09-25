import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { 
  Plus, 
  Search, 
  Filter, 
  Truck, 
  Package, 
  Calendar,
  FileText,
  Edit,
  Eye,
  Menu,
  X
} from 'lucide-react';
import { RomaneioTable } from '@/components/expedicao/RomaneioTable';
import { RomaneioForm } from '@/components/expedicao/RomaneioForm';
import { ItensRomaneioModal } from '@/components/expedicao/ItensRomaneioModal';
import { useRomaneios, useCriarRomaneio, useAtualizarRomaneio } from '@/hooks/useRomaneios';
import { useRemoverRomaneio } from '@/hooks/useRemoverRomaneio';
import { useOFsAtivas } from '@/hooks/useOFsAtivas';
import { useMobileResponsive } from '@/hooks/useMobileResponsive';
import { RomaneioExpedicao } from '@/hooks/useRomaneios';
import { RelatoriosExpedicao } from '@/components/expedicao/RelatoriosExpedicao';
import { usePermissions } from '@/hooks/usePermissions';
import { toast } from 'sonner';

const Expedicao = () => {
  const { canRegra } = usePermissions();
  const { isMobile } = useMobileResponsive();
  const { data: romaneios, isLoading, refetch } = useRomaneios();
  const { data: ofsAtivas, isLoading: isLoadingOFs } = useOFsAtivas();
  const criarRomaneioMutation = useCriarRomaneio();
  const atualizarRomaneioMutation = useAtualizarRomaneio();
  const removerRomaneioMutation = useRemoverRomaneio();
  
  const [activeTab, setActiveTab] = useState('romaneios');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pecaFilter, setPecaFilter] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showRomaneioForm, setShowRomaneioForm] = useState(false);
  const [showItensModal, setShowItensModal] = useState(false);
  const [selectedRomaneio, setSelectedRomaneio] = useState<RomaneioExpedicao | null>(null);
  const [romaneioToDelete, setRomaneioToDelete] = useState<string | null>(null);

  // Memorizar última OF visualizada
  const [ofFilter, setOfFilter] = useState(() => {
    const saved = localStorage.getItem('expedicao-last-of-filter');
    return saved || 'all';
  });

  // Salvar OF selecionada no localStorage
  useEffect(() => {
    if (ofFilter !== 'all') {
      localStorage.setItem('expedicao-last-of-filter', ofFilter);
    }
  }, [ofFilter]);

  const filteredRomaneios = romaneios?.filter(romaneio => {
    const matchesSearch = romaneio.numero_romaneio?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         romaneio.of_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || romaneio.status === statusFilter;
    
    const matchesOF = ofFilter === 'all' || romaneio.of_number === ofFilter;
    
    const matchesPeca = !pecaFilter || romaneio.itens_pecas?.some(item => 
      item.marca?.toLowerCase().includes(pecaFilter.toLowerCase())
    );
    
    return matchesSearch && matchesStatus && matchesOF && matchesPeca;
  });

  const stats = {
    total: filteredRomaneios?.length || 0,
    planejamento: filteredRomaneios?.filter(r => r.status === 'Em planejamento').length || 0,
    entregue: filteredRomaneios?.filter(r => r.status === 'Entregue').length || 0,
    conferidoEmObra: filteredRomaneios?.filter(r => r.status === 'Conferido em Obra').length || 0,
  };

  // Calcular peso total dos romaneios filtrados
  const totalPesoFiltrado = filteredRomaneios?.reduce((sum, romaneio) => sum + (romaneio.peso_total_romaneio || 0), 0) || 0;

  const ofNumbers = ofsAtivas?.map(of => of.of_number) || [];
  const uniqueOFs = [...new Set(romaneios?.map(r => r.of_number) || [])];

  const handleEdit = (romaneio: RomaneioExpedicao) => {
    setSelectedRomaneio(romaneio);
    setShowRomaneioForm(true);
  };

  const handleView = (romaneio: RomaneioExpedicao) => {
    setSelectedRomaneio(romaneio);
    setShowItensModal(true);
  };

  const handleDelete = (romaneioId: string) => {
    setRomaneioToDelete(romaneioId);
  };

  const confirmDelete = async () => {
    if (!canRegra('exp_cancelar_estornar')) {
      toast.error('Atenção: Você não possui permissão para cancelar ou estornar romaneios de expedição.');
      return;
    }

    if (romaneioToDelete) {
      try {
        await removerRomaneioMutation.mutateAsync(romaneioToDelete);
        setRomaneioToDelete(null);
        refetch();
      } catch (error) {
        console.error('Error deleting romaneio:', error);
      }
    }
  };

  // Função de print simplificada (removida a lógica de PDF)
  const handlePrint = (romaneio: RomaneioExpedicao) => {
    // A funcionalidade de impressão agora é tratada pelo RomaneioReportModal
    console.log('Print function called for romaneio:', romaneio.numero_romaneio);
  };

  const handleSaveRomaneio = async (data: any) => {
    try {
      if (selectedRomaneio) {
        // Atualizando romaneio existente
        await atualizarRomaneioMutation.mutateAsync({
          id: selectedRomaneio.id,
          ...data
        });
      } else {
        // Criando novo romaneio
        await criarRomaneioMutation.mutateAsync(data);
      }
      setShowRomaneioForm(false);
      setSelectedRomaneio(null);
      refetch();
    } catch (error) {
      console.error('Error saving romaneio:', error);
    }
  };

  const handleCancelRomaneio = () => {
    setShowRomaneioForm(false);
    setSelectedRomaneio(null);
  };

  const handleCloseItensModal = () => {
    setShowItensModal(false);
    setSelectedRomaneio(null);
  };

  const MobileRomaneioCard = ({ romaneio }: { romaneio: any }) => (
    <Card className="w-full mb-4 bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg text-card-foreground">
            #{romaneio.numero_romaneio}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {romaneio.status === 'Em planejamento' ? 'Em planejamento' :
             romaneio.status === 'Confirmado' ? 'Entregue' :
             romaneio.status === 'Conferido em Obra' ? 'Conferido em Obra' : romaneio.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">OF:</span>
            <span className="text-card-foreground">{romaneio.of_number || 'N/A'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Transporte:</span>
            <span className="text-card-foreground">{romaneio.tipo_transporte || 'N/A'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Data:</span>
            <span className="text-card-foreground">
              {romaneio.data_criacao 
                ? new Date(romaneio.data_criacao).toLocaleDateString('pt-BR')
                : 'N/A'
              }
            </span>
          </div>

          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Peso:</span>
            <span className="text-card-foreground">{romaneio.peso_total_romaneio || 0} kg</span>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Button size="sm" variant="outline" className="flex-1" onClick={() => handleView(romaneio)}>
            <Eye className="w-4 h-4 mr-1" />
            Ver
          </Button>
          <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEdit(romaneio)}>
            <Edit className="w-4 h-4 mr-1" />
            Editar
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const MobileFilters = () => (
    <div className="space-y-4 p-4">
      <div>
        <Label htmlFor="mobile-search" className="text-sm font-medium">
          Buscar
        </Label>
        <div className="relative mt-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            id="mobile-search"
            placeholder="Número, OF..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="mobile-status" className="text-sm font-medium">
          Status
        </Label>
        <select
          id="mobile-status"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
        >
          <option value="all">Todos</option>
          <option value="Em planejamento">Em planejamento</option>
          <option value="Confirmado">Entregue</option>
          <option value="Conferido em Obra">Conferido em Obra</option>
        </select>
      </div>

      <div>
        <Label htmlFor="mobile-of" className="text-sm font-medium">
          OF
        </Label>
        <select
          id="mobile-of"
          value={ofFilter}
          onChange={(e) => setOfFilter(e.target.value)}
          className="mt-1 w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
        >
          <option value="all">Todas as OFs</option>
          {uniqueOFs.map(ofNumber => (
            <option key={ofNumber} value={ofNumber}>{ofNumber}</option>
          ))}
        </select>
      </div>

      <div>
        <Label htmlFor="mobile-peca" className="text-sm font-medium">
          Buscar Peça
        </Label>
        <Input
          id="mobile-peca"
          placeholder="Marca da peça..."
          value={pecaFilter}
          onChange={(e) => setPecaFilter(e.target.value)}
        />
      </div>
    </div>
  );

  if (isLoading || isLoadingOFs) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
          Expedição
        </h1>
        
        <div className="flex items-center gap-2">
          {isMobile && (
            <Sheet open={showMobileFilters} onOpenChange={setShowMobileFilters}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Filtros</SheetTitle>
                  <SheetDescription>
                    Filtre os romaneios por diversos critérios
                  </SheetDescription>
                </SheetHeader>
                <MobileFilters />
              </SheetContent>
            </Sheet>
          )}

          {canRegra('exp_criar_romaneio') && (
            <Button size={isMobile ? "sm" : "default"} onClick={() => setShowRomaneioForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Romaneio
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4'}`}>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Romaneios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Em planejamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.planejamento}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Entregue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.entregue}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conferido em Obra
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.conferidoEmObra}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-2'} mb-4`}>
          <TabsTrigger value="romaneios" className="text-xs sm:text-sm">
            Romaneios
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="text-xs sm:text-sm">
            Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="romaneios" className="space-y-4">
          {/* Desktop Filters */}
          {!isMobile && (
            <Card className="p-4">
              <div className="flex gap-4 items-center flex-wrap">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Buscar romaneios..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">Todos os Status</option>
                  <option value="Em planejamento">Em planejamento</option>
                  <option value="Confirmado">Entregue</option>
                  <option value="Conferido em Obra">Conferido em Obra</option>
                </select>

                <select
                  value={ofFilter}
                  onChange={(e) => setOfFilter(e.target.value)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="all">Todas as OFs</option>
                  {uniqueOFs.map(ofNumber => (
                    <option key={ofNumber} value={ofNumber}>{ofNumber}</option>
                  ))}
                </select>

                <Input
                  placeholder="Buscar peça..."
                  value={pecaFilter}
                  onChange={(e) => setPecaFilter(e.target.value)}
                  className="max-w-xs"
                />
              </div>
            </Card>
          )}

          {/* Content */}
          {isMobile ? (
            <div className="space-y-4">
              {filteredRomaneios && filteredRomaneios.length > 0 ? (
                filteredRomaneios.map((romaneio) => (
                  <MobileRomaneioCard 
                    key={romaneio.id} 
                    romaneio={romaneio} 
                  />
                ))
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">Nenhum romaneio encontrado.</p>
                </Card>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Info header with counts and total weight */}
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-semibold text-foreground">Romaneios de Expedição</h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {filteredRomaneios?.length || 0} {(filteredRomaneios?.length || 0) === 1 ? 'romaneio' : 'romaneios'}
                  </span>
                  <span className="font-medium">
                    Peso Total: {totalPesoFiltrado.toFixed(2)} kg
                  </span>
                </div>
              </div>
              
              <RomaneioTable 
                romaneios={filteredRomaneios || []}
                onEdit={handleEdit}
                onView={handleView}
                onDelete={handleDelete}
                onPrint={handlePrint}
                loading={isLoading}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="relatorios">
          <RelatoriosExpedicao />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <RomaneioForm 
        isOpen={showRomaneioForm}
        onClose={handleCancelRomaneio}
        romaneio={selectedRomaneio}
        ofNumbers={ofNumbers}
        onSave={handleSaveRomaneio}
        onCancel={handleCancelRomaneio}
        loading={criarRomaneioMutation.isPending || atualizarRomaneioMutation.isPending}
      />

      {showItensModal && selectedRomaneio && (
        <ItensRomaneioModal
          romaneio={selectedRomaneio}
          isOpen={showItensModal}
          onClose={handleCloseItensModal}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!romaneioToDelete} onOpenChange={() => setRomaneioToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este romaneio? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={removerRomaneioMutation.isPending}>
              {removerRomaneioMutation.isPending ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Expedicao;
