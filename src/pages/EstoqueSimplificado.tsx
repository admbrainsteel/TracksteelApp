
import React, { useState } from 'react';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { StandardCard } from '@/components/layout/StandardCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Warehouse, BarChart3, TrendingUp, Package, Download, Upload, AlertTriangle } from 'lucide-react';
import { EstoqueDashboardCards } from '@/components/estoque/EstoqueDashboardCards';
import { EstoqueTable } from '@/components/estoque/EstoqueTable';
import { MovimentacaoEstoqueSimplificada } from '@/components/estoque/MovimentacaoEstoqueSimplificada';
import { EstoqueReports } from '@/components/estoque/EstoqueReports';
import { EmpenhosMaterialSimplificado } from '@/components/estoque/EmpenhosMaterialSimplificado';
import { EstoqueCSVImportModal } from '@/components/estoque/EstoqueCSVImportModal';
import { useEstoque } from '@/hooks/useEstoqueSimplificado';
import { usePermissionControl } from '@/hooks/usePermissionControl';
import { generateCSV, downloadCSV } from '@/utils/csvUtils';
import { toast } from 'sonner';

const EstoqueSimplificado = () => {
  const [activeTab, setActiveTab] = useState('estoque');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const { canImportExport } = usePermissionControl();
  
  const { materiais, loading } = useEstoque();

  const handleExportCSV = () => {
    if (materiais.length === 0) {
      toast.error('Nenhum material disponível para exportar');
      return;
    }

    const headers = [
      'codigo',
      'descricao',
      'tipo_material',
      'unidade',
      'quantidade_total',
      'quantidade_disponivel',
      'quantidade_empenhada',
      'quantidade_minima',
      'quantidade_maxima',
      'peso_unitario',
      'valor_unitario',
      'lote_atual',
      'fornecedor',
      'localizacao',
      'status',
      'observacoes'
    ];

    const csvData = materiais.map(material => ({
      codigo: material.codigo,
      descricao: material.descricao,
      tipo_material: material.tipos_materia_prima?.nome || '',
      unidade: material.unidade,
      quantidade_total: material.quantidade_total,
      quantidade_disponivel: material.quantidade_disponivel,
      quantidade_empenhada: material.quantidade_empenhada,
      quantidade_minima: material.quantidade_minima,
      quantidade_maxima: material.quantidade_maxima || '',
      peso_unitario: material.peso_unitario,
      valor_unitario: material.valor_unitario || '',
      lote_atual: material.lote_atual || '',
      fornecedor: material.fornecedor || '',
      localizacao: material.localizacao || '',
      status: material.status,
      observacoes: material.observacoes || ''
    }));

    const csvContent = generateCSV(csvData, headers);
    const fileName = `estoque_materiais_${new Date().toISOString().split('T')[0]}.csv`;
    
    downloadCSV(csvContent, fileName);
    toast.success(`${materiais.length} materiais exportados com sucesso!`);
  };

  const renderActions = () => {
    const actions = [];

    if (canImportExport()) {
      actions.push(
        <Button
          key="export"
          variant="outline"
          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          onClick={handleExportCSV}
        >
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      );

      actions.push(
        <Button
          key="import"
          variant="outline"
          className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600"
          onClick={() => setIsImportModalOpen(true)}
        >
          <Upload className="h-4 w-4 mr-2" />
          Importar
        </Button>
      );
    }

    return actions.length > 0 ? (
      <div className="flex gap-2">
        {actions}
      </div>
    ) : null;
  };

  return (
    <>
      <StandardPageLayout
        title="Controle de Estoque"
        subtitle="Gerenciamento simplificado de materiais e movimentações"
        badge={{
          text: `${materiais.length} itens`,
          variant: 'secondary'
        }}
        actions={renderActions()}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-slate-800 border-slate-700">
            <TabsTrigger 
              value="estoque" 
              className="flex items-center gap-2 text-blue-400 data-[state=active]:bg-slate-700 data-[state=active]:text-blue-300"
            >
              <Warehouse className="h-4 w-4" />
              Estoque
            </TabsTrigger>
            <TabsTrigger 
              value="dashboard" 
              className="flex items-center gap-2 text-green-400 data-[state=active]:bg-slate-700 data-[state=active]:text-green-300"
            >
              <BarChart3 className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger 
              value="movimentacao" 
              className="flex items-center gap-2 text-purple-400 data-[state=active]:bg-slate-700 data-[state=active]:text-purple-300"
            >
              <TrendingUp className="h-4 w-4" />
              Movimentação
            </TabsTrigger>
            <TabsTrigger 
              value="empenhos" 
              className="flex items-center gap-2 text-yellow-400 data-[state=active]:bg-slate-700 data-[state=active]:text-yellow-300"
            >
              <AlertTriangle className="h-4 w-4" />
              Empenhos
            </TabsTrigger>
            <TabsTrigger 
              value="relatorios" 
              className="flex items-center gap-2 text-orange-400 data-[state=active]:bg-slate-700 data-[state=active]:text-orange-300"
            >
              <Package className="h-4 w-4" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          <TabsContent value="estoque" className="space-y-6">
            <StandardCard title="Materiais em Estoque" icon={Warehouse}>
              <EstoqueTable />
            </StandardCard>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6">
            <EstoqueDashboardCards materiais={materiais} />
          </TabsContent>

          <TabsContent value="movimentacao" className="space-y-6">
            <MovimentacaoEstoqueSimplificada />
          </TabsContent>

          <TabsContent value="empenhos" className="space-y-6">
            <EmpenhosMaterialSimplificado />
          </TabsContent>

          <TabsContent value="relatorios" className="space-y-6">
            <StandardCard title="Relatórios de Estoque" icon={Package}>
              <EstoqueReports />
            </StandardCard>
          </TabsContent>
        </Tabs>
      </StandardPageLayout>

      <EstoqueCSVImportModal 
        isOpen={isImportModalOpen} 
        onClose={() => setIsImportModalOpen(false)} 
      />
    </>
  );
};

export default EstoqueSimplificado;
