
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar, Clock, User, FileText, Filter, Search } from 'lucide-react';
import { useCronogramas } from '@/hooks/useCronogramas';
import { CronogramaTable } from '@/components/cronograma/CronogramaTable';
import { CronogramaForm } from '@/components/cronograma/CronogramaForm';
import { CronogramaGantt } from '@/components/cronograma/CronogramaGantt';
import { CronogramaPDF } from '@/components/cronograma/CronogramaPDF';
import { useMobileResponsive } from '@/hooks/useMobileResponsive';
import { usePermissionControl } from '@/hooks/usePermissionControl';
import { CronogramaOf } from '@/types/cronograma';

const CronogramaOF = () => {
  const { cronogramas, loading, loadCronogramas, deleteCronograma } = useCronogramas();
  const { isMobile } = useMobileResponsive();
  const { canCreate, canEdit, canDelete } = usePermissionControl();
  const [activeTab, setActiveTab] = useState('cronogramas');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOF, setSelectedOF] = useState<string>('');
  const [showCronogramaForm, setShowCronogramaForm] = useState(false);
  const [selectedCronograma, setSelectedCronograma] = useState<any>(null);
  const [showGanttChart, setShowGanttChart] = useState(false);
  const [showPDFGenerator, setShowPDFGenerator] = useState(false);
  const [cronogramaForGantt, setCronogramaForGantt] = useState<CronogramaOf | null>(null);
  const [cronogramaForPDF, setCronogramaForPDF] = useState<CronogramaOf | null>(null);

  // Filter and sort cronogramas based on search term and ordered by OF
  const filteredAndSortedCronogramas = cronogramas
    ?.filter(cronograma =>
      cronograma.ordem_fabricacao?.num_of?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cronograma.ordem_fabricacao?.descritivo?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      const ofA = a.ordem_fabricacao?.num_of || '';
      const ofB = b.ordem_fabricacao?.num_of || '';
      return ofA.localeCompare(ofB);
    });

  const handleEdit = (cronograma: any) => {
    if (!canEdit()) return;
    setSelectedCronograma(cronograma);
    setShowCronogramaForm(true);
  };

  const handleDelete = (cronogramaId: string) => {
    if (!canDelete()) return;
    deleteCronograma(cronogramaId);
  };

  const handleViewChart = (cronograma: CronogramaOf) => {
    setCronogramaForGantt(cronograma);
    setShowGanttChart(true);
  };

  const handleViewPDF = (cronograma: CronogramaOf) => {
    setCronogramaForPDF(cronograma);
    setShowPDFGenerator(true);
  };

  const handleCloseCronogramaForm = () => {
    setShowCronogramaForm(false);
    setSelectedCronograma(null);
  };

  const handleSaveSuccess = () => {
    loadCronogramas();
    setActiveTab('cronogramas');
  };

  const handleCloseGanttChart = () => {
    setShowGanttChart(false);
    setCronogramaForGantt(null);
  };

  const handleClosePDFGenerator = () => {
    setShowPDFGenerator(false);
    setCronogramaForPDF(null);
  };

  const MobileCronogramaCard = ({ cronograma }: { cronograma: any }) => (
    <Card className="w-full mb-4 bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg text-card-foreground">
            OF: {cronograma.ordem_fabricacao?.num_of || 'N/A'}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            Rev. {cronograma.revisao || 1}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Descrição:</span>
            <span className="text-card-foreground">{cronograma.ordem_fabricacao?.descritivo || 'N/A'}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Gestor:</span>
            <span className="text-card-foreground">{cronograma.gestor_profile?.full_name || 'N/A'}</span>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">Processos:</span>
            <span className="text-card-foreground">{cronograma.processos?.length || 0}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Peso Total:</span>
            <span className="text-card-foreground">{cronograma.peso_total ? `${Number(cronograma.peso_total).toLocaleString('pt-BR')} kg` : 'N/A'}</span>
          </div>

          <div className="mt-3">
            <span className="text-muted-foreground text-xs">Cronograma:</span>
            <div className="mt-1 text-card-foreground">
              {Array.isArray(cronograma.processos) && cronograma.processos.length > 0 ? (
                <div className="text-xs">
                  {cronograma.processos.map((processo: any, index: number) => (
                    <div key={index} className="py-1 border-b border-border last:border-0">
                      {processo.nome_processo || `Processo ${index + 1}`}
                    </div>
                  ))}
                </div>
              ) : (
                'Nenhum processo definido'
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewChart(cronograma)}
            className="flex-1 text-xs border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700"
          >
            Gráfico
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleViewPDF(cronograma)}
            className="flex-1 text-xs border-green-200 bg-green-50 hover:bg-green-100 text-green-700"
          >
            PDF
          </Button>
          {canEdit() && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleEdit(cronograma)}
              className="flex-1 text-xs"
            >
              Editar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="p-3 sm:p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
          Cronograma das OFs
        </h1>
        
        {/* Mobile Search */}
        {isMobile && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por OF ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="cronogramas" className="text-xs sm:text-sm">
            Lista
          </TabsTrigger>
          <TabsTrigger value="novo" className="text-xs sm:text-sm">
            Novo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cronogramas" className="space-y-4">
          {/* Desktop Search */}
          {!isMobile && (
            <div className="flex gap-4 items-center">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por OF ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}

          {isMobile ? (
            <div className="space-y-4">
              {filteredAndSortedCronogramas && filteredAndSortedCronogramas.length > 0 ? (
                filteredAndSortedCronogramas.map((cronograma) => (
                  <MobileCronogramaCard 
                    key={cronograma.id} 
                    cronograma={cronograma} 
                  />
                ))
              ) : (
                <Card className="p-8 text-center">
                  <p className="text-muted-foreground">Nenhum cronograma encontrado.</p>
                </Card>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <CronogramaTable 
                cronogramas={filteredAndSortedCronogramas || []}
                onEdit={canEdit() ? handleEdit : () => {}}
                onDelete={canDelete() ? handleDelete : () => {}}
                onViewChart={handleViewChart}
                onViewPDF={handleViewPDF}
                canEdit={canEdit()}
                canDelete={canDelete()}
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="novo">
          <Card className="p-4">
            {canCreate() ? (
              <Button onClick={() => setShowCronogramaForm(true)}>
                Novo Cronograma
              </Button>
            ) : (
              <div className="text-center text-muted-foreground">
                Você não tem permissão para criar cronogramas
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {isMobile && canCreate() && (
        <div className="fixed bottom-4 right-4 space-y-2">
          <Button 
            size="sm" 
            className="w-full"
            onClick={() => setShowCronogramaForm(true)}
          >
            Novo Cronograma
          </Button>
        </div>
      )}

      {canCreate() && (
        <CronogramaForm 
          cronograma={selectedCronograma}
          onClose={handleCloseCronogramaForm}
          isOpen={showCronogramaForm}
          onSaveSuccess={handleSaveSuccess}
        />
      )}

      {showGanttChart && cronogramaForGantt && (
        <CronogramaGantt 
          cronograma={cronogramaForGantt}
          onClose={handleCloseGanttChart}
        />
      )}

      {showPDFGenerator && cronogramaForPDF && (
        <CronogramaPDF 
          cronograma={cronogramaForPDF}
          onComplete={handleClosePDFGenerator}
        />
      )}
    </div>
  );
};

export default CronogramaOF;
