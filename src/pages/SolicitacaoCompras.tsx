
import React, { useState } from 'react';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { StandardCard } from '@/components/layout/StandardCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Printer, Edit, Trash2, Eye, RefreshCw, Check, ShoppingCart } from 'lucide-react';
import { useSolicitacoesCompra, SolicitacaoCompra, ItemSolicitacao } from '@/hooks/useSolicitacoesCompra';
import { useUserFunction } from '@/hooks/useUserFunction';
import { SolicitacaoComprasModal } from '@/components/solicitacao-compras/SolicitacaoComprasModal';
import { SolicitacaoComprasPreviewModal } from '@/components/solicitacao-compras/SolicitacaoComprasPreviewModal';
import { UserAvatar } from '@/components/ui/user-avatar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors = {
  'Em planejamento': 'bg-yellow-500',
  'Revisado': 'bg-orange-500',
  'Solicitado': 'bg-blue-500',
  'Comprado': 'bg-blue-600',
  'Recebido': 'bg-lime-500',
  'Arquivado': 'bg-red-500',
};

export default function SolicitacaoCompras() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<SolicitacaoCompra | null>(null);
  const { isComprador } = useUserFunction();
  const { 
    solicitacoes, 
    isLoading, 
    canEdit,
    canDelete,
    deleteSolicitacao,
    updateStatus,
    revisar,
    aceitar,
    comprar,
    comprarDireto,
    isRevisando,
    isAceitando,
    isComprando,
    isComprandoDireto
  } = useSolicitacoesCompra();

  const handlePrint = (solicitacao: SolicitacaoCompra) => {
    try {
      const printContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Solicitação de Compra - ${solicitacao.numero_sc}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Inter', sans-serif;
                }
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        color-adjust: exact;
                    }
                    .print-container {
                        box-shadow: none;
                        margin: 0;
                        max-width: 100%;
                        border: 1px solid #ddd;
                    }
                }
            </style>
        </head>
        <body class="bg-gray-100 p-4 sm:p-6">

            <div class="print-container max-w-4xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
                <header class="bg-gray-100 text-gray-800 p-4 md:p-5 border-b border-gray-200">
                    <h1 class="text-xl md:text-2xl font-bold">Solicitação de Compra</h1>
                    <p class="text-gray-600 text-sm">Revise os detalhes da sua solicitação abaixo.</p>
                </header>

                <main class="p-4 md:p-6">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <h3 class="font-semibold text-gray-500 text-xs">Número SC</h3>
                            <p class="text-gray-900 text-base font-medium">${solicitacao.numero_sc}</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <h3 class="font-semibold text-gray-500 text-xs">Data da Solicitação</h3>
                            <p class="text-gray-900 text-base font-medium">${format(new Date(solicitacao.data_solicitacao), 'dd/MM/yyyy', { locale: ptBR })}</p>
                        </div>
                        <div class="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-lg col-span-1 sm:col-span-2 lg:col-span-1">
                            <h3 class="font-semibold text-blue-800 text-xs">Status</h3>
                            <p class="text-blue-900 text-base font-medium">${solicitacao.status}</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <h3 class="font-semibold text-gray-500 text-xs">Solicitante</h3>
                            <p class="text-gray-900 text-base font-medium">${solicitacao.creator?.full_name || 'Usuário não encontrado'}</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <h3 class="font-semibold text-gray-500 text-xs">Objetivo</h3>
                            <p class="text-gray-900 text-base font-medium">${solicitacao.objetivo || 'N/A'}</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-lg">
                            <h3 class="font-semibold text-gray-500 text-xs">OF / Revisão</h3>
                            <p class="text-gray-900 text-base font-medium">${solicitacao.of_number || 'N/A'} / Rev. ${solicitacao.revisao}</p>
                        </div>
                        <div class="bg-gray-50 p-3 rounded-lg col-span-1 sm:col-span-2 lg:col-span-3">
                            <h3 class="font-semibold text-gray-500 text-xs">Justificativa</h3>
                            <p class="text-gray-900 text-base font-medium">${solicitacao.justificativa || 'N/A'}</p>
                        </div>
                    </div>

                    ${solicitacao.itens && solicitacao.itens.length > 0 ? `
                        <div class="mb-6">
                            <h2 class="text-lg font-bold text-gray-800 mb-3">Itens Solicitados</h2>
                            <div class="overflow-x-auto rounded-lg border border-gray-200">
                                <table class="min-w-full divide-y divide-gray-200 text-xs">
                                    <thead class="bg-gray-50">
                                        <tr>
                                            <th scope="col" class="px-4 py-2 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Descrição</th>
                                            <th scope="col" class="px-4 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Unidade</th>
                                            <th scope="col" class="px-4 py-2 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Quantidade</th>
                                            <th scope="col" class="px-4 py-2 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">Prazo Recebimento</th>
                                        </tr>
                                    </thead>
                                    <tbody class="bg-white divide-y divide-gray-200">
                                        ${solicitacao.itens.map((item: ItemSolicitacao, index: number) => `
                                            <tr${index % 2 === 1 ? ' class="hover:bg-gray-50"' : ''}>
                                                <td class="px-4 py-3 text-xs font-medium text-gray-800 break-words">${item.material?.descricao || 'Material não encontrado'}</td>
                                                <td class="px-4 py-3 whitespace-nowrap text-center text-gray-600 text-xs">${item.material?.unidade || 'UN'}</td>
                                                <td class="px-4 py-3 whitespace-nowrap text-center text-gray-600 text-xs">${item.quantidade}</td>
                                                <td class="px-4 py-3 whitespace-nowrap text-right text-gray-600 text-xs">${format(new Date(item.prazo_recebimento), 'dd/MM/yyyy', { locale: ptBR })}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ` : ''}
                </main>

                <footer class="text-center text-xs text-gray-400 p-3 bg-gray-50 border-t">
                    <p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
                </footer>
            </div>

        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printContent);
        printWindow.document.close();
        
        // Aguardar o carregamento antes de focar e imprimir
        printWindow.onload = function() {
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        };
        
        // Fallback caso onload não funcione
        setTimeout(() => {
          if (printWindow && !printWindow.closed) {
            printWindow.focus();
            printWindow.print();
          }
        }, 1000);
      }
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      alert('Erro ao imprimir. Tente novamente.');
    }
  };

  const handleEdit = (solicitacao: SolicitacaoCompra) => {
    if (!canEdit(solicitacao)) {
      alert('Você só pode editar suas próprias solicitações.');
      return;
    }
    setSelectedSolicitacao(solicitacao);
    setIsModalOpen(true);
  };

  const handlePreview = (solicitacao: SolicitacaoCompra) => {
    setSelectedSolicitacao(solicitacao);
    setIsPreviewOpen(true);
  };

  const handleDelete = (solicitacao: SolicitacaoCompra) => {
    if (!canDelete(solicitacao)) {
      if (solicitacao.status !== 'Em planejamento') {
        alert('⚠️ PERMISSÃO NEGADA\n\nSolicitações com status diferente de "Em planejamento" só podem ser excluídas por compradores.');
      } else {
        alert('⚠️ PERMISSÃO NEGADA\n\nVocê só pode excluir suas próprias solicitações.');
      }
      return;
    }

    if (window.confirm('⚠️ CONFIRMAÇÃO DE EXCLUSÃO\n\nTem certeza que deseja excluir esta solicitação de compra?\n\nEsta ação não pode ser desfeita!')) {
      deleteSolicitacao(solicitacao.id);
    }
  };

  const handleRevisar = (solicitacao: SolicitacaoCompra) => {
    if (window.confirm(`Tem certeza que deseja enviar a solicitação ${solicitacao.numero_sc} para revisão?`)) {
      revisar({ id: solicitacao.id, created_by: solicitacao.created_by });
    }
  };

  const handleAceitar = (solicitacao: SolicitacaoCompra) => {
    if (window.confirm(`Tem certeza que deseja aceitar a solicitação ${solicitacao.numero_sc}?`)) {
      aceitar({ id: solicitacao.id, created_by: solicitacao.created_by });
    }
  };

  const handleComprar = (solicitacao: SolicitacaoCompra) => {
    if (window.confirm(`Tem certeza que deseja marcar a solicitação ${solicitacao.numero_sc} como comprada?`)) {
      comprar({ id: solicitacao.id, created_by: solicitacao.created_by });
    }
  };

  const handleComprarDireto = (solicitacao: SolicitacaoCompra) => {
    if (window.confirm(`Você deseja passar o status dessa SC ${solicitacao.numero_sc} para "Comprado"?`)) {
      comprarDireto({ id: solicitacao.id, created_by: solicitacao.created_by });
    }
  };

  return (
    <StandardPageLayout
      title="Solicitação de Compras"
      subtitle="Gerencie suas solicitações de compras de materiais"
    >
      <StandardCard title="Solicitações de Compra">
        <div className="flex justify-between items-center mb-6">
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nova Solicitação
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Carregando solicitações...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted">
                <tr>
                  <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
                    Número SC
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                    Usuário
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
                    Data
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-24">
                    OF/Objetivo
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-20">
                    Status
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">
                    Revisão
                  </th>
                  <th className="px-2 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-16">
                    Itens
                  </th>
                  <th className="px-2 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-32">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-background divide-y divide-border">
                {solicitacoes.map((solicitacao) => (
                  <tr key={solicitacao.id} className="hover:bg-muted/50">
                    <td className="px-2 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-foreground">
                        {solicitacao.numero_sc}
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <UserAvatar
                          imageUrl={solicitacao.creator?.profile_image_url}
                          name={solicitacao.creator?.full_name}
                          email={solicitacao.creator?.email}
                          size="sm"
                        />
                        <div className="text-sm text-foreground">
                          {solicitacao.creator?.full_name || 'Usuário não encontrado'}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(solicitacao.data_solicitacao), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <div className="text-sm text-foreground">
                        {solicitacao.of_number || solicitacao.objetivo}
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <Badge 
                        variant="secondary"
                        className={`${statusColors[solicitacao.status as keyof typeof statusColors]} text-white text-xs ${
                          isComprador && solicitacao.status === 'Em planejamento' ? 'cursor-pointer hover:opacity-80 select-none' : ''
                        }`}
                        onDoubleClick={
                          isComprador && solicitacao.status === 'Em planejamento' 
                            ? (e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleComprarDireto(solicitacao);
                              }
                            : undefined
                        }
                        title={
                          isComprador && solicitacao.status === 'Em planejamento'
                            ? 'Duplo clique para marcar como "Comprado"'
                            : undefined
                        }
                      >
                        {solicitacao.status}
                      </Badge>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">
                        {solicitacao.revisao}
                      </div>
                    </td>
                    <td className="px-2 py-3 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">
                        {solicitacao.itens?.length || 0}
                      </div>
                    </td>
                    
                    <td className="px-2 py-3 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-1">
                        {/* Ações básicas - sempre visíveis */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePreview(solicitacao)}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrint(solicitacao)}
                          title="Imprimir"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        
                        {/* Ações condicionais baseadas em permissões */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(solicitacao)}
                          title="Editar"
                          disabled={!canEdit(solicitacao)}
                          className={!canEdit(solicitacao) ? "opacity-50 cursor-not-allowed" : ""}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(solicitacao)}
                          title="Excluir"
                          disabled={!canDelete(solicitacao)}
                          className={`${!canDelete(solicitacao) ? "opacity-50 cursor-not-allowed" : "text-red-600 hover:text-red-700"}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>

                        {/* Ações exclusivas para compradores */}
                        {isComprador && (
                          <>
                            {/* Botão Revisar - só para status 'Em planejamento' */}
                            {solicitacao.status === 'Em planejamento' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRevisar(solicitacao)}
                                title="Enviar para Revisão"
                                disabled={isRevisando}
                                className="text-orange-600 hover:text-orange-700"
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            )}
                            
                            {/* Botão Aceitar - para status 'Em planejamento' e 'Revisado' */}
                            {(solicitacao.status === 'Em planejamento' || solicitacao.status === 'Revisado') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAceitar(solicitacao)}
                                title="Aceitar Solicitação"
                                disabled={isAceitando}
                                className="text-green-600 hover:text-green-700"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}

                            {/* Botão Comprar - só para status 'Solicitado' */}
                            {solicitacao.status === 'Solicitado' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleComprar(solicitacao)}
                                title="Marcar como Comprado"
                                disabled={isComprando}
                                className="text-blue-600 hover:text-blue-700"
                              >
                                <ShoppingCart className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </StandardCard>

      <SolicitacaoComprasModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedSolicitacao(null);
        }}
        solicitacao={selectedSolicitacao}
      />

      <SolicitacaoComprasPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => {
          setIsPreviewOpen(false);
          setSelectedSolicitacao(null);
        }}
        solicitacao={selectedSolicitacao}
      />
    </StandardPageLayout>
  );
}
