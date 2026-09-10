
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
      case 'P1': return 'text-red-700 bg-red-100 border-red-300';
      case 'P2': return 'text-orange-700 bg-orange-100 border-orange-300';
      case 'P3': return 'text-blue-700 bg-blue-100 border-blue-300';
      case 'P4': return 'text-gray-700 bg-gray-200 border-gray-300';
      default: return 'text-gray-700 bg-gray-200 border-gray-300';
    }
  };

  const generateTickBoxes = (quantity: number) => {
    if (!quantity || quantity <= 0) return null;

    let qtd50 = 0;
    let qtd10 = 0;
    let qtd5 = 0;
    let qtd1 = 0;

    if (quantity <= 10) {
      qtd1 = quantity;
    } else if (quantity <= 50) {
      qtd5 = Math.floor(quantity / 5);
      qtd1 = quantity % 5;
    } else if (quantity <= 100) {
      qtd10 = Math.floor(quantity / 10);
      const resto10 = quantity % 10;
      qtd5 = Math.floor(resto10 / 5);
      qtd1 = resto10 % 5;
    } else {
      // Acima de 100 unidades
      qtd50 = Math.floor(quantity / 50);
      const resto50 = quantity % 50;
      qtd10 = Math.floor(resto50 / 10);
      const resto10 = resto50 % 10;
      qtd5 = Math.floor(resto10 / 5);
      qtd1 = resto10 % 5;
    }

    const boxes: React.ReactNode[] = [];

    // Quadrados de peso 50
    for (let i = 0; i < qtd50; i++) {
      boxes.push(
        <svg 
          key={`box50-${i}`} 
          width="13" 
          height="13" 
          viewBox="0 0 13 13" 
          style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: '2px' }}
        >
          <rect x="0.5" y="0.5" width="12" height="12" rx="1.5" fill="#f3f4f6" stroke="#4b5563" strokeWidth="1" />
          <text x="6.5" y="9.2" textAnchor="middle" fontSize="7" fontFamily="Arial, sans-serif" fontWeight="bold" fill="#374151">50</text>
        </svg>
      );
    }

    // Quadrados de peso 10
    for (let i = 0; i < qtd10; i++) {
      boxes.push(
        <svg 
          key={`box10-${i}`} 
          width="13" 
          height="13" 
          viewBox="0 0 13 13" 
          style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: '2px' }}
        >
          <rect x="0.5" y="0.5" width="12" height="12" rx="1.5" fill="#f3f4f6" stroke="#4b5563" strokeWidth="1" />
          <text x="6.5" y="9.2" textAnchor="middle" fontSize="7" fontFamily="Arial, sans-serif" fontWeight="bold" fill="#374151">10</text>
        </svg>
      );
    }

    // Quadrados de peso 5
    for (let i = 0; i < qtd5; i++) {
      boxes.push(
        <svg 
          key={`box5-${i}`} 
          width="13" 
          height="13" 
          viewBox="0 0 13 13" 
          style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: '2px' }}
        >
          <rect x="0.5" y="0.5" width="12" height="12" rx="1.5" fill="#f3f4f6" stroke="#4b5563" strokeWidth="1" />
          <text x="6.5" y="9.5" textAnchor="middle" fontSize="8.5" fontFamily="Arial, sans-serif" fontWeight="bold" fill="#4b5563">5</text>
        </svg>
      );
    }

    // Quadrados unitários (vazios)
    for (let i = 0; i < qtd1; i++) {
      boxes.push(
        <svg 
          key={`box1-${i}`} 
          width="13" 
          height="13" 
          viewBox="0 0 13 13" 
          style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: '2px' }}
        >
          <rect x="0.5" y="0.5" width="12" height="12" rx="1.5" fill="#ffffff" stroke="#4b5563" strokeWidth="1" />
        </svg>
      );
    }

    return <span style={{ display: 'inline-block', verticalAlign: 'middle', marginLeft: '4px' }}>{boxes}</span>;
  };

  return (
    <div id="prioridades-pdf-content" className="bg-white text-black max-w-4xl mx-auto p-6">
      <style>{`
        .checklist-container {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #111827;
        }
        .item-card {
          border: 1px solid #e5e7eb;
          padding: 8px 10px;
          border-radius: 6px;
          background-color: #ffffff;
          box-sizing: border-box;
        }
        .item-signature {
          margin-top: 6px;
          font-size: 11px;
          color: #4b5563;
          border-bottom: 1px solid #9ca3af;
          padding-bottom: 2px;
          height: 18px;
          line-height: 14px;
        }
        @media print {
          body {
            font-size: 9px;
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

      <div className="checklist-container">
        {/* Cabeçalho do Relatório */}
        <div className="flex justify-between items-center border-b-2 border-gray-800 pb-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">Checklist de Produção</h1>
            <p className="text-xs text-gray-600">Formulário para apontamento da fabricação.</p>
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm">
              Data de Emissão: <span className="font-normal">{dataAtual}</span>
              {versaoAtual && (
                <span className="ml-2 text-gray-500 font-medium">Rev. {versaoAtual.revisao}</span>
              )}
            </p>
          </div>
        </div>
        
        {/* Informações da OF e Fase */}
        <div className="border border-gray-200 bg-white p-3.5 rounded-lg mb-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-3">
            {/* Coluna OF */}
            <div>
              <p className="text-xs font-medium text-gray-500">Ordem de Fabricação (OF)</p>
              <p className="text-base font-bold text-gray-800 leading-snug">{ofNumber}</p>
            </div>
            {/* Coluna Fase */}
            <div>
              <p className="text-xs font-medium text-gray-500">Fase</p>
              <p className="text-base font-bold text-gray-800 leading-snug">{etapaFase}</p>
            </div>
            {/* Coluna Processo */}
            <div className="md:col-span-2">
              <p className="text-xs font-medium text-gray-500 mb-1">PROCESSO</p>
              <div style={{ marginTop: '2px' }}>
                {['Corte', 'Solda', 'Pintura', 'Expedição'].map((processo) => (
                  <div 
                    key={processo} 
                    style={{ 
                      display: 'inline-block', 
                      verticalAlign: 'middle', 
                      marginRight: '16px', 
                      whiteSpace: 'nowrap' 
                    }}
                  >
                    <svg 
                      width="14" 
                      height="14" 
                      viewBox="0 0 14 14" 
                      style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: '4px' }}
                    >
                      <rect x="0.75" y="0.75" width="12.5" height="12.5" rx="1.5" fill="#ffffff" stroke="#4b5563" strokeWidth="1.5" />
                    </svg>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151', verticalAlign: 'middle' }}>
                      {processo}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Legenda */}
        <div className="text-xs text-gray-600 mb-5 flex items-center flex-wrap">
          <span className="font-semibold" style={{ marginRight: '6px' }}>Legenda:</span>
          <span style={{ marginRight: '6px' }}>Marca (Qtd)</span>
          <span className="font-medium text-gray-500" style={{ marginRight: '4px' }}>(S/M)</span>
          <span style={{ marginRight: '6px' }}>= Sem Montagem,</span>
          <span className="font-medium text-gray-500" style={{ marginRight: '4px' }}>(C/M)</span>
          <span style={{ marginRight: '4px' }}>= Com Montagem. Os quadrados</span>
          <svg 
            width="13" 
            height="13" 
            viewBox="0 0 13 13" 
            style={{ display: 'inline-block', verticalAlign: '-2px', margin: '0 4px' }}
          >
            <rect x="0.5" y="0.5" width="12" height="12" rx="1.5" fill="#ffffff" stroke="#4b5563" strokeWidth="1" />
          </svg>
          <span>indicam o controle de peças (quadrados com número = lotes de 50, 10 ou 5 unidades; vazios = 1 unidade).</span>
        </div>

        {/* Itens por Prioridade */}
        <div className="space-y-6">
          {['P1', 'P2', 'P3', 'P4'].map((codigo, priorityIndex) => {
            const itens = itensPorPrioridade[codigo] || [];
            if (itens.length === 0) return null;

            return (
              <div key={codigo} className={priorityIndex > 0 ? 'page-break' : ''}>
                <h2 className={`text-base font-semibold ${getCoresPrioridade(codigo)} px-3 py-1 rounded-md inline-block mb-2.5 border`}>
                  {getPrioridadeNome(codigo)}
                </h2>
                
                <div className="space-y-1.5">
                  {Array.from({ length: Math.ceil(itens.length / 3) }, (_, i) => {
                    const bgColorClass = i % 2 !== 0 ? 'bg-gray-50/70' : 'bg-white';
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
                              <div style={{ marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                <span style={{ fontSize: '13px', fontWeight: 700, color: '#111827', verticalAlign: 'middle', marginRight: '4px' }}>
                                  {marca} ({quantidade})
                                </span>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', verticalAlign: 'middle' }}>
                                  {infoType}
                                </span>
                                {generateTickBoxes(quantidade)}
                              </div>
                              <div className="item-signature">
                                Data/Operador:
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
    </div>
  );
};
