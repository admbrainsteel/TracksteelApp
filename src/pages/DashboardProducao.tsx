
import React, { useState } from 'react';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { StandardCard } from '@/components/layout/StandardCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, TrendingUp, Activity, RefreshCw, Clock } from 'lucide-react';
import { ResumoOF } from '@/components/dashboard-producao/ResumoOF';
import { GraficoMestre } from '@/components/dashboard-producao/GraficoMestre';
import { GraficoProgressoIndividual } from '@/components/dashboard-producao/GraficoProgressoIndividual';
import { TabelaResumoProcessos } from '@/components/dashboard-producao/TabelaResumoProcessos';
import { useDashboardProducaoOtimizado } from '@/hooks/useDashboardProducaoOtimizado';
import { useOFs } from '@/hooks/useOFs';
import { useIsMobile } from '@/hooks/use-mobile';

const DashboardProducao = () => {
  const [selectedOF, setSelectedOF] = useState<string>('');
  const [activeTab, setActiveTab] = useState('geral');
  const isMobile = useIsMobile();
  
  // Converter o valor selecionado para o hook (vazio se for "all")
  const ofForDashboard = selectedOF === 'all' ? '' : selectedOF;
  const { dashboardData, loading, refetch } = useDashboardProducaoOtimizado(ofForDashboard);
  const { ofs, loading: ofsLoading } = useOFs();

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <StandardPageLayout
        title="Dashboard de Produção"
        subtitle="Acompanhamento em tempo real da produção"
        badge={{
          text: selectedOF && selectedOF !== 'all' ? `OF: ${selectedOF}` : 'Visão Geral',
          variant: 'secondary'
        }}
        actions={
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={selectedOF} onValueChange={setSelectedOF}>
              <SelectTrigger className="w-full sm:w-[200px] text-xs md:text-sm">
                <SelectValue placeholder={ofsLoading ? "Carregando..." : "Selecionar OF"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as OFs</SelectItem>
                {ofs.map((of) => (
                  <SelectItem key={of.id} value={of.num_of}>
                    OF {of.num_of} {of.descritivo ? `- ${of.descritivo}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={refetch}
              variant="outline"
              className="mobile-full-width text-xs md:text-sm"
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 md:h-4 md:w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`w-full bg-muted h-auto p-1 ${
            isMobile 
              ? 'grid grid-cols-1 gap-1' 
              : 'grid grid-cols-3'
          }`}>
            <TabsTrigger 
              value="geral" 
              className={`flex items-center gap-1 md:gap-2 text-xs md:text-sm ${
                isMobile ? 'w-full justify-start p-3' : 'p-2 md:p-3'
              }`}
            >
              <BarChart3 className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Visão Geral</span>
              <span className="sm:hidden">Geral</span>
            </TabsTrigger>
            <TabsTrigger 
              value="grafico" 
              className={`flex items-center gap-1 md:gap-2 text-xs md:text-sm ${
                isMobile ? 'w-full justify-start p-3' : 'p-2 md:p-3'
              }`}
            >
              <TrendingUp className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Gráficos</span>
              <span className="sm:hidden">Gráfico</span>
            </TabsTrigger>
            <TabsTrigger 
              value="progresso" 
              className={`flex items-center gap-1 md:gap-2 text-xs md:text-sm ${
                isMobile ? 'w-full justify-start p-3' : 'p-2 md:p-3'
              }`}
            >
              <Clock className="h-3 w-3 md:h-4 md:w-4" />
              <span className="hidden sm:inline">Progresso</span>
              <span className="sm:hidden">Prog</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 mt-4">
            <div className="dashboard-grid">
              <ResumoOF 
                of={ofForDashboard}
                data={dashboardData} 
                loading={loading} 
              />
            </div>
            <StandardCard title="Resumo dos Processos" icon={Activity}>
              <div className="overflow-x-auto custom-scrollbar">
                <TabelaResumoProcessos 
                  data={dashboardData} 
                  loading={loading} 
                />
              </div>
            </StandardCard>
          </TabsContent>

          <TabsContent value="grafico" className="space-y-4 mt-4">
            <StandardCard title="Gráfico de Produção" icon={TrendingUp}>
              <div className="dashboard-card">
                {dashboardData?.processos && dashboardData.processos.length > 0 ? (
                  <GraficoMestre 
                    processos={dashboardData.processos}
                    onProcessoClick={(processoNome) => console.log('Processo selecionado:', processoNome)}
                    processoSelecionado={null}
                  />
                ) : (
                  <div className="flex items-center justify-center h-96 text-muted-foreground">
                    <p>Selecione uma OF para visualizar o gráfico de produção</p>
                  </div>
                )}
              </div>
            </StandardCard>
          </TabsContent>

          <TabsContent value="progresso" className="space-y-4 mt-4">
            <StandardCard title="Progresso por Processo" icon={Clock}>
              <div className="dashboard-card">
                {dashboardData?.processos && dashboardData.processos.length > 0 ? (
                  <GraficoProgressoIndividual processos={dashboardData.processos} />
                ) : (
                  <div className="flex items-center justify-center h-96 text-muted-foreground">
                    <p>Selecione uma OF para visualizar o progresso dos processos</p>
                  </div>
                )}
              </div>
            </StandardCard>
          </TabsContent>
        </Tabs>
      </StandardPageLayout>
    </div>
  );
};

export default DashboardProducao;
