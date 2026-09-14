import React, { useState, useMemo } from 'react';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { KanbanPrioridadesFabricacao } from '@/components/prioridades/KanbanPrioridadesFabricacao';
import { PecaSelectorModal } from '@/components/prioridades/PecaSelectorModal';
import { PrioridadesPDF } from '@/components/prioridades/PrioridadesPDF';
import { PrioridadesPDFTemplate } from '@/components/prioridades/PrioridadesPDFTemplate';
import { FiltrosVisualizacao } from '@/components/prioridades/FiltrosVisualizacao';
import { useItensPrioridadeFabricacaoFiltrado } from '@/hooks/useItensPrioridadeFabricacaoFiltrado';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, RefreshCw, Printer, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { printProfessionalPDF } from '@/utils/pdfGenerator';

const PrioridadesFabricacao = () => {
  const { 
    itensPorPrioridade, 
    loading, 
    atualizarQuantidade, 
    removerItem,
    removerItensPorPrioridade,
    transferirItem,
    reorderItems,
    refetch,
    ofSelecionada,
    faseSelecionada,
    versaoAtual,
    onFiltroChange,
    incrementarRevisao,
    resetarRevisao
  } = useItensPrioridadeFabricacaoFiltrado();
  
  const [showPecaSelector, setShowPecaSelector] = useState(false);
  const [showPrioridadesPDF, setShowPrioridadesPDF] = useState(false);
  const [isPrintingDirect, setIsPrintingDirect] = useState(false);

  // Construir título dinâmico
  const tituloCompleto = useMemo(() => {
    if (ofSelecionada && faseSelecionada) {
      return `Prioridades de Fabricação - OF: ${ofSelecionada} - FASE: ${faseSelecionada}`;
    }
    return 'Prioridades de Fabricação';
  }, [ofSelecionada, faseSelecionada]);

  const calcularTotalPecas = () => {
    return Object.values(itensPorPrioridade).reduce((total, itens) => total + itens.length, 0);
  };

  const calcularPesoTotal = () => {
    return Object.values(itensPorPrioridade).reduce((total, itens) => {
      return total + itens.reduce((pesoItens, item) => pesoItens + (item.peso_total || 0), 0);
    }, 0);
  };

  const handleAddPecas = async () => {
    await refetch();
  };

  const handleResetarRevisao = async () => {
    if (!ofSelecionada || !faseSelecionada) return;
    if (window.confirm(`Deseja resetar o número de revisão desta lista de prioridades (OF: ${ofSelecionada} - Fase: ${faseSelecionada}) para 0?`)) {
      await resetarRevisao(0);
    }
  };

  const handleImprimirRelatorio = async () => {
    if (!ofSelecionada || !faseSelecionada) {
      toast.error('Selecione uma OF e Fase para imprimir o relatório');
      return;
    }

    const querSubir = window.confirm(
      `Deseja incrementar a revisão para Rev. ${(versaoAtual?.revisao || 0) + 1} para esta impressão?\n\n- Clique em OK para subir a revisão para Rev. ${(versaoAtual?.revisao || 0) + 1}\n- Clique em Cancelar para manter a revisão atual (Rev. ${versaoAtual?.revisao || 0})`
    );
    if (querSubir) {
      await incrementarRevisao();
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    try {
      setIsPrintingDirect(true);
      await printProfessionalPDF('prioridades-direct-print-content');
      toast.success('Relatório enviado para impressão');
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast.error('Erro ao imprimir o relatório');
    } finally {
      setIsPrintingDirect(false);
    }
  };

  return (
    <StandardPageLayout
      title={tituloCompleto}
      subtitle="Gerencie as prioridades de fabricação das peças"
    >
      <div className="space-y-6">
        {/* Filtros de Visualização */}
        <FiltrosVisualizacao
          onFiltroChange={onFiltroChange}
          ofSelecionada={ofSelecionada}
          faseSelecionada={faseSelecionada}
        />

        {/* Header com resumo e ações */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex flex-wrap gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Total de Peças:</span>
                <Badge variant="secondary">{calcularTotalPecas()}</Badge>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Peso Total:</span>
                <Badge variant="secondary">{calcularPesoTotal().toFixed(1)} kg</Badge>
              </div>
            </Card>
            {versaoAtual && (
              <Card className="p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Revisão:</span>
                  <Badge variant="outline">{versaoAtual.revisao}</Badge>
                  <button
                    type="button"
                    onClick={handleResetarRevisao}
                    className="h-5 w-5 inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-red-600 hover:bg-muted transition-colors ml-0.5"
                    title="Resetar revisão para 0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </Card>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImprimirRelatorio}
              disabled={!ofSelecionada || !faseSelecionada || isPrintingDirect}
            >
              {isPrintingDirect ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Imprimindo...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 mr-2" />
                  Imprimir
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const querSubir = window.confirm(
                  `Deseja incrementar a revisão para Rev. ${(versaoAtual?.revisao || 0) + 1} antes de gerar o PDF?\n\n- Clique em OK para subir a revisão para Rev. ${(versaoAtual?.revisao || 0) + 1}\n- Clique em Cancelar para manter a revisão atual (Rev. ${versaoAtual?.revisao || 0})`
                );
                if (querSubir) {
                  await incrementarRevisao();
                }
                setShowPrioridadesPDF(true);
              }}
              disabled={!ofSelecionada || !faseSelecionada}
            >
              <FileText className="h-4 w-4 mr-2" />
              Gerar PDF
            </Button>
            <Button
              size="sm"
              onClick={() => setShowPecaSelector(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Peças
            </Button>
          </div>
        </div>

        {/* Componente Kanban */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : ofSelecionada && faseSelecionada ? (
          <KanbanPrioridadesFabricacao
            itensPorPrioridade={itensPorPrioridade}
            onUpdateQuantidade={atualizarQuantidade}
            onRemoverItem={removerItem}
            onRemoverItensPorPrioridade={removerItensPorPrioridade}
            onTransferirItem={transferirItem}
            onReorderItems={reorderItems}
          />
        ) : (
          <Card className="p-8 text-center">
            <CardContent>
              <p className="text-muted-foreground">
                Selecione uma OF e Fase nos filtros acima para visualizar o Kanban de prioridades.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Modais */}
        <PecaSelectorModal
          isOpen={showPecaSelector}
          onClose={() => setShowPecaSelector(false)}
          onAddPecas={handleAddPecas}
        />

        <PrioridadesPDF
          isOpen={showPrioridadesPDF}
          onClose={() => setShowPrioridadesPDF(false)}
          itensPorPrioridade={itensPorPrioridade}
          ofSelecionada={ofSelecionada}
          faseSelecionada={faseSelecionada}
          versaoAtual={versaoAtual}
          onIncrementarRevisao={incrementarRevisao}
        />

        {/* Container para impressão direta 100% idêntica ao PDF gerado */}
        {ofSelecionada && faseSelecionada && (
          <div style={{ position: 'fixed', left: '-9999px', top: 0, width: '850px', opacity: 0, pointerEvents: 'none', zIndex: -9999 }}>
            <PrioridadesPDFTemplate
              id="prioridades-direct-print-content"
              itensPorPrioridade={itensPorPrioridade}
              ofSelecionada={ofSelecionada}
              faseSelecionada={faseSelecionada}
              versaoAtual={versaoAtual}
            />
          </div>
        )}
      </div>
    </StandardPageLayout>
  );
};

export default PrioridadesFabricacao;
