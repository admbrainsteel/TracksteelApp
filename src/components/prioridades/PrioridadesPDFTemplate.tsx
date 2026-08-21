
import React from 'react';
import { ItemPrioridade } from '@/hooks/useItensPrioridadeFabricacao';

interface PrioridadesPDFTemplateProps {
  itensPorPrioridade: { [key: string]: ItemPrioridade[] };
  ofSelecionada?: string | null;
  faseSelecionada?: string | null;
  versaoAtual?: {
    revisao: number;
    dataModificacao: string;
    modificadoPor?: string;
  } | null;
}

export const PrioridadesPDFTemplate: React.FC<PrioridadesPDFTemplateProps> = ({ 
  itensPorPrioridade,
  ofSelecionada,
  faseSelecionada,
  versaoAtual
}) => {
  const todosItens = Object.values(itensPorPrioridade).flat();
  
  const primeiroItem = todosItens[0];
  const ofNumber = ofSelecionada || primeiroItem?.peca?.of_number || primeiroItem?.prioridade_fabricacao?.of_number || 'N/A';
  const etapaFase = faseSelecionada || primeiroItem?.peca?.etapa_fase || primeiroItem?.prioridade_fabricacao?.etapa_fase || 'N/A';
  
  const dataAtual = new Date().toLocaleDateString('pt-BR');

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

  const generateTickBoxes = (quantity: number) => {
    const boxes = [];
    
    if (quantity > 10) {
      const numBigBoxes = Math.floor(quantity / 5);
      const numSmallBoxes = quantity % 5;
      
      // Quadrados grandes com "5"
      for (let i = 0; i < numBigBoxes; i++) {
        boxes.push(
          <div key={`big-${i}`} className="tick-box-large">
            <span>5</span>
          </div>
        );
      }
      
      // Quadrados pequenos restantes
      for (let i = 0; i < numSmallBoxes; i++) {
        boxes.push(<div key={`small-${i}`} className="tick-box"></div>);
      }
    } else {
      // Apenas quadrados pequenos
      for (let i = 0; i < quantity; i++) {
        boxes.push(<div key={i} className="tick-box"></div>);
      }
    }
    
    return <div className="flex items-center flex-wrap gap-1">{boxes}</div>;
  };

  return (
    <div id="prioridades-pdf-content" className="bg-white text-black max-w-4xl mx-auto p-6">
      <style>{`
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
        .item-card {
          border: 1px solid #e5e7eb;
          padding: 8px;
          border-radius: 6px;
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
      `}</style>

      {/* Cabeçalho do Relatório */}
      <div className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklist de Produção</h1>
          <p className="text-gray-600">Formulário para apontamento da fabricação.</p>
        </div>
        <div className="text-right">
          <p className="font-semibold">
            Data de Emissão: <span className="font-normal">{dataAtual}</span>
            {versaoAtual && (
              <span className="ml-2 text-gray-500">Rev. {versaoAtual.revisao}</span>
            )}
          </p>
        </div>
      </div>
      
      {/* Informações da OF e Fase */}
      <div className="border border-gray-200 bg-white p-4 rounded-lg mb-2">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
          {/* Coluna OF */}
          <div>
            <p className="text-xs font-medium text-gray-500">Ordem de Fabricação (OF)</p>
            <p className="text-base font-bold text-gray-800">{ofNumber}</p>
          </div>
          {/* Coluna Fase */}
          <div>
            <p className="text-xs font-medium text-gray-500">Fase</p>
            <p className="text-base font-bold text-gray-800">{etapaFase}</p>
          </div>
          {/* Coluna Processo */}
          <div className="md:col-span-2">
            <p className="text-xs font-medium text-gray-500">PROCESSO</p>
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mt-1">
              {['Corte', 'Solda', 'Pintura', 'Expedição'].map((processo) => (
                <div key={processo} className="flex items-center gap-1">
                  <div className="w-4 h-4 border-2 border-gray-500 check-box-print"></div>
                  <span className="text-sm font-semibold text-gray-700">{processo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="text-xs text-gray-600 mb-6 flex items-center flex-wrap gap-x-3">
        <span className="font-semibold">Legenda:</span>
        <span>Marca (Qtd)</span>
        <span className="font-medium text-gray-500">(S/M)</span>
        <span>= Sem Montagem,</span>
        <span className="font-medium text-gray-500">(C/M)</span>
        <span>= Com Montagem. Os quadrados</span>
        <div className="tick-box inline-block"></div>
        <span>indicam o controle de peças fabricadas.</span>
      </div>

      {/* Itens por Prioridade */}
      <div className="space-y-8">
        {['P1', 'P2', 'P3', 'P4'].map((codigo, priorityIndex) => {
          const itens = itensPorPrioridade[codigo] || [];
          if (itens.length === 0) return null;

          return (
            <div key={codigo} className={priorityIndex > 0 ? 'page-break' : ''}>
              <h2 className={`text-lg font-semibold ${getCoresPrioridade(codigo)} px-3 py-1 rounded-md inline-block mb-3`}>
                {getPrioridadeNome(codigo)}
              </h2>
              
              <div className="space-y-1">
                {Array.from({ length: Math.ceil(itens.length / 3) }, (_, i) => {
                  const bgColorClass = i % 2 !== 0 ? 'bg-gray-50' : 'bg-white';
                  const rowItems = itens.slice(i * 3, (i + 1) * 3);
                  
                  return (
                    <div key={i} className={`grid grid-cols-3 gap-2 p-1 rounded-md ${bgColorClass}`}>
                      {rowItems.map((item) => {
                        const quantidade = item.quantidade_priorizada;
                        const marca = item.peca?.marca || 'N/A';
                        const temComponentes = item.peca?.tem_componentes;
                        const infoType = temComponentes ? '(C/M)' : '(S/M)';
                        
                        return (
                          <div key={item.id} className="item-card">
                            <div className="flex items-center flex-wrap gap-2 mb-2">
                              <span className="font-semibold text-sm whitespace-nowrap">
                                {marca} ({quantidade})
                              </span>
                              <span className="text-xs font-medium text-gray-500">{infoType}</span>
                              {generateTickBoxes(quantidade)}
                            </div>
                            <div className="mt-2 text-xs">
                              <div className="border-b border-gray-400 pb-1 h-5">Data/Operador:</div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Preencher células vazias se necessário */}
                      {Array.from({ length: 3 - rowItems.length }, (_, emptyIndex) => (
                        <div key={`empty-${emptyIndex}`}></div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
