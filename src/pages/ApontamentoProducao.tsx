
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, BarChart3, Settings } from 'lucide-react';
import { ApontamentoForm } from '@/components/apontamento/ApontamentoForm';
import { ApontamentosListOtimizado } from '@/components/apontamento/ApontamentosListOtimizado';
import { ProcessosList } from '@/components/apontamento/ProcessosList';
import { useApontamentosProducao } from '@/hooks/useApontamentosProducao';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePermissionControl } from '@/hooks/usePermissionControl';

const ApontamentoProducao = () => {
  const [activeTab, setActiveTab] = useState('apontamento');
  const { apontamentos, loading } = useApontamentosProducao();
  const isMobile = useIsMobile();
  const { canCreate, canEdit } = usePermissionControl();

  return (
    <div className="min-h-screen bg-background p-2 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            Apontamento de Produção
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Controle diário de produção por processo com cache inteligente
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`w-full bg-muted border-border ${
            isMobile 
              ? 'grid grid-cols-1 gap-1 h-auto p-1' 
              : 'grid grid-cols-3 h-10'
          }`}>
            <TabsTrigger 
              value="apontamento" 
              className={`flex items-center gap-2 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground ${
                isMobile ? 'w-full justify-start p-3 text-sm' : ''
              }`}
            >
              <ClipboardList className="h-4 w-4" />
              Novo Apontamento
            </TabsTrigger>
            <TabsTrigger 
              value="historico" 
              className={`flex items-center gap-2 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground ${
                isMobile ? 'w-full justify-start p-3 text-sm' : ''
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Histórico
            </TabsTrigger>
            <TabsTrigger 
              value="processos" 
              className={`flex items-center gap-2 text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground ${
                isMobile ? 'w-full justify-start p-3 text-sm' : ''
              }`}
            >
              <Settings className="h-4 w-4" />
              Processos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="apontamento" className="space-y-4 sm:space-y-6 mt-4">
            {canCreate() ? (
              <Card className="bg-card border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="text-card-foreground flex items-center gap-2 text-lg sm:text-xl">
                    <ClipboardList className="h-5 w-5" />
                    Novo Apontamento de Produção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ApontamentoForm />
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    Você não tem permissão para criar apontamentos de produção.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="historico" className="space-y-4 sm:space-y-6 mt-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-card-foreground flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    <span className="text-lg sm:text-xl">Histórico de Apontamentos</span>
                  </div>
                  <Badge variant="secondary" className="bg-secondary text-secondary-foreground border-border">
                    {apontamentos.length} apontamentos
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ApontamentosListOtimizado />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="processos" className="space-y-4 sm:space-y-6 mt-4">
            {canEdit() ? (
              <Card className="bg-card border-border">
                <CardHeader className="pb-4">
                  <CardTitle className="text-card-foreground flex items-center gap-2 text-lg sm:text-xl">
                    <Settings className="h-5 w-5" />
                    Gerenciar Processos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProcessosList />
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    Você não tem permissão para gerenciar processos.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ApontamentoProducao;
