import React from 'react';
import { RomaneioExpedicao } from '@/hooks/useRomaneios';

interface RomaneioPDFTemplateProps {
  romaneio: RomaneioExpedicao;
}

export const RomaneioPDFTemplate: React.FC<RomaneioPDFTemplateProps> = ({ romaneio }) => {
  const totalPecas = romaneio.itens_pecas?.reduce((sum, item) => sum + item.quantidade_expedida, 0) || 0;
  const pesoTotalPecas = romaneio.itens_pecas?.reduce((sum, item) => sum + item.peso_total, 0) || 0;
  const pesoTotalInsumos = romaneio.itens_insumos?.reduce((sum, item) => sum + (item.peso_total || 0), 0) || 0;
  const pesoTotalGeral = pesoTotalPecas + pesoTotalInsumos;
  const totalItens = totalPecas + (romaneio.itens_insumos?.reduce((sum, item) => sum + item.quantidade_expedida, 0) || 0);
  
  const previsaoKg = romaneio.previsao_kg || 0;
  const discrepancia = pesoTotalGeral - previsaoKg;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const formatTransporte = (tipo: string) => {
    const tipos: Record<string, string> = {
      'carro': 'Carro',
      'utilitario': 'Utilitário',
      'caminho_pequeno': 'Caminhão Pequeno',
      'caminhao_trucado': 'Caminhão Trucado',
      'caminhao_munck': 'Caminhão Munck',
      'carreta_12m': 'Carreta 12m',
      'carreta_15m': 'Carreta 15m',
      'especial': 'Especial'
    };
    return tipos[tipo] || tipo;
  };

  const formatFrete = (tipo: string) => {
    return tipo === 'proprio' ? 'Próprio' : 'Terceiros';
  };

  return (
    <div id="pdf-template" className="bg-slate-50 text-slate-800 font-sans">
      <div className="container mx-auto p-3 md:p-6 max-w-full">
        <header className="mb-6">
          <h1 className="text-4xl font-bold text-slate-900">
            Romaneio de Expedição: {romaneio.numero_romaneio}
          </h1>
        </header>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Coluna Esquerda: KPIs Compactos - Largura reduzida e altura diminuída */}
          <aside className="w-full md:w-32 flex-shrink-0">
            <div className="space-y-1.5">
              <div className="bg-white p-1.5 rounded-lg shadow-sm flex items-center">
                <div className="bg-sky-100 text-sky-600 rounded-lg p-1 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Qtd. Total</p>
                  <p className="text-sm font-bold">{totalItens}</p>
                </div>
              </div>
              
              <div className="bg-white p-1.5 rounded-lg shadow-sm flex items-center">
                <div className="bg-sky-100 text-sky-600 rounded-lg p-1 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l-3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Peso Total</p>
                  <p className="text-sm font-bold">{pesoTotalGeral.toFixed(2)} Kg</p>
                </div>
              </div>
              
              <div className="bg-white p-1.5 rounded-lg shadow-sm flex items-center">
                <div className="bg-sky-100 text-sky-600 rounded-lg p-1 mr-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <p className="text-sm font-bold">{romaneio.status}</p>
                </div>
              </div>
            </div>
          </aside>

          {/* Conteúdo Principal - Expandido para ocupar melhor a largura */}
          <main className="flex-grow space-y-6 -ml-6">
            {/* Seção de Detalhes e Observações - Expandida para ocupar mais largura */}
            <section className="bg-white p-6 rounded-lg shadow-sm">
              <div className="columns-1 md:columns-2 lg:columns-3 gap-x-8 text-base">
                <div className="mb-6 break-inside-avoid-column">
                  <h3 className="font-semibold text-slate-800 mb-3 border-b pb-2 text-lg">Detalhes da Expedição</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-base">Data Criação:</span>
                      <span className="font-medium text-slate-600 text-base">{formatDate(romaneio.data_criacao)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base">Data Romaneio:</span>
                      <span className="font-medium text-slate-600 text-base">{formatDate(romaneio.data_romaneio)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base">Data Entrega:</span>
                      <span className="font-medium text-slate-600 text-base">{formatDate(romaneio.data_prevista_entrega || '')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-base">Prioridade:</span>
                      <span className={`font-medium px-3 py-1 rounded-full text-base ${
                        romaneio.prioridade === 'Urgente' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {romaneio.prioridade}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="break-inside-avoid-column">
                  <h3 className="font-semibold text-slate-800 mb-3 border-b pb-2 text-lg">Observações</h3>
                  <p className="mb-3 text-base">
                    <strong>Gerais:</strong> {romaneio.observacoes || 'N/A'}
                  </p>
                  <p className="mb-4 text-base">
                    <strong>Revisão:</strong> {romaneio.motivo_revisao || 'N/A'}
                  </p>
                  
                  {/* Dados de transporte movidos para cá */}
                  <div className="mt-4 pt-3 border-t border-slate-200">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-base">Revisão:</span>
                        <span className="font-medium text-slate-600 text-base">{romaneio.revisao}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-base">Motorista:</span>
                        <span className="font-medium text-slate-600 text-base">{romaneio.nome_motorista || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-base">Transporte:</span>
                        <span className="font-medium text-slate-600 text-base">{formatTransporte(romaneio.tipo_transporte || '')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-base">Frete:</span>
                        <span className="font-medium text-slate-600 text-base">{formatFrete(romaneio.frete_tipo || '')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-base">Maior Dimensão:</span>
                        <span className="font-medium text-slate-600 text-base">{romaneio.maior_dimensao || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {discrepancia > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-md mt-4">
                      <p className="text-red-800 text-base">
                        <strong className="font-medium">Nota:</strong> Peso total ({pesoTotalGeral.toFixed(2)} Kg) superior à previsão ({previsaoKg.toFixed(2)} Kg).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Seção Lista de Peças - Expandida totalmente para ocupar largura */}
            <section className="bg-white rounded-lg shadow-sm overflow-hidden -ml-8">
              <h2 className="text-2xl font-semibold p-6">Lista de Peças</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-base text-left text-slate-500">
                  <thead className="text-sm text-slate-700 uppercase bg-slate-100">
                    <tr>
                      <th scope="col" className="px-6 py-4">Marca</th>
                      <th scope="col" className="px-6 py-4">Fase</th>
                      <th scope="col" className="px-6 py-4">Descrição</th>
                      <th scope="col" className="px-6 py-4 text-right">Qtd.</th>
                      <th scope="col" className="px-6 py-4 text-right">Peso Unit. (Kg)</th>
                      <th scope="col" className="px-6 py-4 text-right">Peso Total (Kg)</th>
                      <th scope="col" className="px-4 py-4 text-center">Conf.Exp.</th>
                      <th scope="col" className="px-4 py-4 text-center">Conf.Obra</th>
                    </tr>
                  </thead>
                  <tbody>
                    {romaneio.itens_pecas && romaneio.itens_pecas.length > 0 ? (
                      romaneio.itens_pecas.map((item, index) => (
                        <tr key={index} className="bg-white border-b hover:bg-slate-50">
                          <td className="px-6 py-3 font-medium text-slate-900 whitespace-nowrap text-base">{item.marca}</td>
                          <td className="px-6 py-3 text-base">{item.fase || 'N/A'}</td>
                          <td className="px-6 py-3 text-base">{item.descricao || 'N/A'}</td>
                          <td className="px-6 py-3 text-right text-base">{item.quantidade_expedida}</td>
                          <td className="px-6 py-3 text-right text-base">{item.peso_unitario.toFixed(2)}</td>
                          <td className="px-6 py-3 text-right font-medium text-slate-800 text-base">{item.peso_total.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center">
                            <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-sky-600" />
                          </td>
                          <td className="px-4 py-3 text-center">
                            <input type="checkbox" className="h-5 w-5 rounded border-gray-300 text-sky-600" />
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="text-center py-8 text-slate-500 text-base">Nenhuma peça nesta lista.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="p-5 bg-slate-50 text-right font-bold">
                <span className="text-slate-700 text-lg">Total Peças: <span>{pesoTotalPecas.toFixed(2)} Kg</span></span>
              </div>
            </section>

            {/* Seção Lista de Insumos - Expandida totalmente para ocupar largura */}
            <section className="bg-white rounded-lg shadow-sm overflow-hidden -ml-8">
              <h2 className="text-2xl font-semibold p-6">Lista de Insumos</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-base text-left text-slate-500">
                  <thead className="text-sm text-slate-700 uppercase bg-slate-100">
                    <tr>
                      <th scope="col" className="px-6 py-4">Tipo</th>
                      <th scope="col" className="px-6 py-4">Descrição</th>
                      <th scope="col" className="px-6 py-4 text-right">Quantidade</th>
                      <th scope="col" className="px-6 py-4">Unidade</th>
                      <th scope="col" className="px-6 py-4 text-right">Peso Unit. (Kg)</th>
                      <th scope="col" className="px-6 py-4 text-right">Peso Total (Kg)</th>
                      <th scope="col" className="px-6 py-4">Observações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {romaneio.itens_insumos && romaneio.itens_insumos.length > 0 ? (
                      romaneio.itens_insumos.map((item, index) => (
                        <tr key={index} className="bg-white border-b hover:bg-slate-50">
                          <td className="px-6 py-3 font-medium text-slate-900 text-base">{item.tipo_insumo}</td>
                          <td className="px-6 py-3 text-base">{item.descricao}</td>
                          <td className="px-6 py-3 text-right text-base">{item.quantidade_expedida}</td>
                          <td className="px-6 py-3 text-base">{item.unidade}</td>
                          <td className="px-6 py-3 text-right text-base">{(item.peso_unitario || 0).toFixed(2)}</td>
                          <td className="px-6 py-3 text-right font-medium text-slate-800 text-base">{(item.peso_total || 0).toFixed(2)}</td>
                          <td className="px-6 py-3 text-base">{item.observacoes || 'N/A'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-slate-500 text-base">Nenhum insumo nesta lista.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Seção de Assinaturas */}
            <section className="mt-16 pt-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-16 text-slate-700 font-medium">
                <p className="border-t-2 border-slate-300 pt-3 text-lg">Preparado por:</p>
                <p className="border-t-2 border-slate-300 pt-3 text-lg">Recebido por:</p>
                <p className="border-t-2 border-slate-300 pt-3 text-lg">Conferido por:</p>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
};
