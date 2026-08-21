import React, { useState, useMemo } from 'react';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { KanbanPrioridadesFabricacao } from '@/components/prioridades/KanbanPrioridadesFabricacao';
import { PecaSelectorModal } from '@/components/prioridades/PecaSelectorModal';
import { PrioridadesPDF } from '@/components/prioridades/PrioridadesPDF';
import { FiltrosVisualizacao } from '@/components/prioridades/FiltrosVisualizacao';
import { useItensPrioridadeFabricacaoFiltrado } from '@/hooks/useItensPrioridadeFabricacaoFiltrado';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, FileText, RefreshCw, Printer } from 'lucide-react';
import { toast } from 'sonner';

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
    onFiltroChange
  } = useItensPrioridadeFabricacaoFiltrado();
  
  const [showPecaSelector, setShowPecaSelector] = useState(false);
  const [showPrioridadesPDF, setShowPrioridadesPDF] = useState(false);

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

  const generateTickBoxesHTML = (quantity: number): string => {
    let boxesHtml = '';
    if (quantity > 10) {
      const numBigBoxes = Math.floor(quantity / 5);
      const numSmallBoxes = quantity % 5;
      for (let i = 0; i < numBigBoxes; i++) {
        boxesHtml += `<div class="tick-box-large"><span>5</span></div>`;
      }
      for (let i = 0; i < numSmallBoxes; i++) {
        boxesHtml += `<div class="tick-box"></div>`;
      }
    } else {
      for (let i = 0; i < quantity; i++) {
        boxesHtml += `<div class="tick-box"></div>`;
      }
    }
    return `<div class="flex items-center flex-wrap gap-1">${boxesHtml}</div>`;
  };

  const handleImprimirRelatorio = async () => {
    if (!ofSelecionada || !faseSelecionada) {
      toast.error('Selecione uma OF e Fase para imprimir o relatório');
      return;
    }

    try {
      // Criar nova janela para impressão
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('Não foi possível abrir janela de impressão');
      }

      // Obter data atual formatada
      const dataAtual = new Date().toLocaleDateString('pt-BR');

      // Gerar conteúdo dos itens por prioridade
      let itemsContent = '';
      
      ['P1', 'P2', 'P3', 'P4'].forEach((codigo, priorityIndex) => {
        const itens = itensPorPrioridade[codigo] || [];
        if (itens.length === 0) return;

        const getPrioridadeNome = (codigo: string) => {
          switch (codigo) {
            case 'P1': return 'Prioridade P1 - Urgente';
            case 'P2': return 'Prioridade P2 - Alta';
            case 'P3': return 'Prioridade P3 - Média';
            case 'P4': return 'Prioridade P4 - Baixa';
            default: return 'Desconhecida';
          }
        };

        const getCoresPrioridade = (codigo: string) => {
          switch (codigo) {
            case 'P1': return 'text-red-700 bg-red-100';
            case 'P2': return 'text-orange-700 bg-orange-100';
            case 'P3': return 'text-blue-700 bg-blue-100';
            case 'P4': return 'text-gray-700 bg-gray-200';
            default: return 'text-gray-700 bg-gray-200';
          }
        };

        // Adicionar classe page-break para P2, P3 e P4
        const pageBreakClass = priorityIndex > 0 ? 'page-break' : '';
        
        itemsContent += `
          <div class="priority-group ${pageBreakClass}">
            <h2 class="text-lg font-semibold ${getCoresPrioridade(codigo)} px-3 py-1 rounded-md inline-block mb-3">
              ${getPrioridadeNome(codigo)}
            </h2>
            <div class="space-y-1">
        `;

        // Gerar linhas de itens (3 por linha)
        for (let i = 0; i < Math.ceil(itens.length / 3); i++) {
          const bgColorClass = i % 2 !== 0 ? 'bg-gray-50' : 'bg-white';
          const rowItems = itens.slice(i * 3, (i + 1) * 3);
          
          itemsContent += `<div class="grid grid-cols-3 gap-2 p-1 rounded-md ${bgColorClass}">`;
          
          rowItems.forEach((item) => {
            const quantidade = item.quantidade_priorizada;
            const marca = item.peca?.marca || 'N/A';
            const temComponentes = item.peca?.tem_componentes;
            const infoType = temComponentes ? '(C/M)' : '(S/M)';
            const tickBoxes = generateTickBoxesHTML(quantidade);
            
            itemsContent += `
              <div class="item-card">
                <div class="flex items-center flex-wrap gap-2 mb-2">
                  <span class="font-semibold text-sm whitespace-nowrap">${marca} (${quantidade})</span>
                  <span class="text-xs font-medium text-gray-500">${infoType}</span>
                  ${tickBoxes}
                </div>
                <div class="mt-2 text-xs">
                  <div class="border-b border-gray-400 pb-1 h-5">Data/Operador:</div>
                </div>
              </div>
            `;
          });
          
          // Preencher células vazias se necessário
          for (let j = rowItems.length; j < 3; j++) {
            itemsContent += `<div></div>`;
          }
          
          itemsContent += `</div>`;
        }
        
        itemsContent += `
            </div>
          </div>
        `;
      });

      // HTML completo seguindo exatamente o modelo fornecido
      const printContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Checklist de Produção por Prioridade</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                @media print {
                    body {
                        font-size: 9px;
                    }
                    .check-box-print {
                        border: 1px solid #333 !important;
                    }
                    .page-break {
                        page-break-before: always;
                    }
                    h2 {
                        page-break-after: avoid; 
                    }
                    .item-card {
                        page-break-inside: avoid;
                    }
                }
                .item-card {
                    border: 1px solid #e5e7eb;
                    padding: 8px;
                    border-radius: 6px;
                }
                .tick-box {
                    width: 12px;
                    height: 12px;
                    border: 1px solid #6b7280;
                    display: inline-block;
                    flex-shrink: 0;
                }
                .tick-box-large {
                    width: 16px;
                    height: 16px;
                    border: 1px solid #6b7280;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    flex-shrink: 0;
                }
                .tick-box-large span {
                    color: #d1d5db;
                    font-size: 10px;
                    font-weight: 600;
                }
            </style>
        </head>
        <body class="bg-white">
            <div class="max-w-4xl mx-auto p-6 sm:p-8">
                <!-- Cabeçalho do Relatório -->
                <div class="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-4">
                    <div>
                        <h1 class="text-2xl font-bold text-gray-900">Checklist de Produção</h1>
                        <p class="text-gray-600">Formulário para apontamento da fabricação.</p>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold">Data de Emissão: <span class="font-normal">${dataAtual}</span>
                        ${versaoAtual ? `<span class="ml-2 text-gray-500">Rev. ${versaoAtual.revisao}</span>` : ''}
                        </p>
                    </div>
                </div>
                
                <!-- Informações da OF e Fase (Layout Melhorado) -->
                <div class="border border-gray-200 bg-white p-4 rounded-lg mb-2">
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
                        <!-- Coluna OF -->
                        <div>
                            <p class="text-xs font-medium text-gray-500">Ordem de Fabricação (OF)</p>
                            <p class="text-base font-bold text-gray-800">${ofSelecionada}</p>
                        </div>
                        <!-- Coluna Fase -->
                        <div>
                            <p class="text-xs font-medium text-gray-500">Fase</p>
                            <p class="text-base font-bold text-gray-800">${faseSelecionada}</p>
                        </div>
                        <!-- Coluna Processo -->
                        <div class="md:col-span-2">
                            <p class="text-xs font-medium text-gray-500">PROCESSO</p>
                            <div class="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1">
                                <div class="flex items-center gap-1"><div class="w-4 h-4 border-2 border-gray-500 check-box-print"></div><span class="text-sm font-semibold text-gray-700">Corte</span></div>
                                <div class="flex items-center gap-1"><div class="w-4 h-4 border-2 border-gray-500 check-box-print"></div><span class="text-sm font-semibold text-gray-700">Solda</span></div>
                                <div class="flex items-center gap-1"><div class="w-4 h-4 border-2 border-gray-500 check-box-print"></div><span class="text-sm font-semibold text-gray-700">Pintura</span></div>
                                <div class="flex items-center gap-1"><div class="w-4 h-4 border-2 border-gray-500 check-box-print"></div><span class="text-sm font-semibold text-gray-700">Expedição</span></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Legenda -->
                <div class="text-xs text-gray-600 mb-6 flex items-center flex-wrap gap-x-3">
                    <span class="font-semibold">Legenda:</span>
                    <span>Marca (Qtd)</span>
                    <span class="font-medium text-gray-500">(S/M)</span>
                    <span>= Sem Montagem,</span>
                    <span class="font-medium text-gray-500">(C/M)</span>
                    <span>= Com Montagem. Os quadrados</span>
                    <div class="tick-box inline-block"></div>
                    <span>indicam o controle de peças fabricadas.</span>
                </div>
                
                <div id="main-container" class="space-y-8">
                    ${itemsContent}
                </div>
            </div>

            <script>
                window.onload = function() {
                    setTimeout(() => {
                        window.print();
                        window.close();
                    }, 800);
                }
            </script>
        </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();

      toast.success('Relatório enviado para impressão');
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast.error('Erro ao imprimir o relatório');
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
              disabled={!ofSelecionada || !faseSelecionada}
            >
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPrioridadesPDF(true)}
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
        />
      </div>
    </StandardPageLayout>
  );
};

export default PrioridadesFabricacao;
