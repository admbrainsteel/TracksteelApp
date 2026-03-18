
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HardHat, Building2, Users, Calendar, Settings, FileText } from 'lucide-react';
import { ObraDashboard } from '@/components/obra/ObraDashboard';
import { ObraSpecificDashboard } from '@/components/obra/ObraSpecificDashboard';
import { DiarioObraRDO } from '@/components/obra/DiarioObraRDO';
import { RelatoriosObra } from '@/components/obra/RelatoriosObra';

const Obra = () => {
  const [obraAtual, setObraAtual] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const handleSelectObra = (ofNumber: string) => {
    setObraAtual(ofNumber);
    setActiveTab('dashboard');
  };

  const handleNavigateToRDO = () => {
    setActiveTab('rdo');
  };

  const handleNavigateToRelatorios = () => {
    setActiveTab('relatorios');
  };

  if (!obraAtual) {
    return (
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground">Obra</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Sistema completo de gerenciamento de obra</p>
        </div>
        <ObraDashboard onSelectObra={handleSelectObra} />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground">
          Obra {obraAtual}
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm">Dashboard específico da obra selecionada</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3 sm:space-y-4">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="dashboard" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Obras</span>
          </TabsTrigger>
          <TabsTrigger value="rdo" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>RDO</span>
          </TabsTrigger>
          <TabsTrigger value="relatorios" className="flex flex-col sm:flex-row items-center gap-1 sm:gap-2 text-xs sm:text-sm p-2 sm:p-3">
            <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
            <span>Relatório da Obra</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4">
          <ObraSpecificDashboard 
            obraAtual={obraAtual}
            onNavigateToRDO={handleNavigateToRDO}
            onNavigateToRelatorios={handleNavigateToRelatorios}
          />
        </TabsContent>

        <TabsContent value="rdo" className="space-y-4">
          <DiarioObraRDO obraAtual={obraAtual} />
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-4">
          <RelatoriosObra />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Obra;
