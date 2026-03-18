
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDown, FileSpreadsheet, Package } from 'lucide-react';
import { useRomaneios } from '@/hooks/useRomaneios';
import { generateProfessionalPDF } from '@/utils/pdfGenerator';
import { generateCSV, downloadCSV } from '@/utils/csvUtils';
import { toast } from 'sonner';

interface RelatorioGeralModalProps {
  isOpen: boolean;
  onClose: () => void;
  ofNumber: string;
}

export const RelatorioGeralModal: React.FC<RelatorioGeralModalProps> = ({
  isOpen,
  onClose,
  ofNumber
}) => {
  const { data: romaneios } = useRomaneios();
  
  const romaneiosDaOF = romaneios?.filter(r => r.of_number === ofNumber) || [];
  
  const totalRomaneios = romaneiosDaOF.length;
  const pesoTotalPecas = romaneiosDaOF.reduce((sum, r) => {
    return sum + (r.itens_pecas?.reduce((s, item) => s + (item.peso_total || 0), 0) || 0);
  }, 0);
  const pesoTotalInsumos = romaneiosDaOF.reduce((sum, r) => {
    return sum + (r.itens_insumos?.reduce((s, item) => s + (item.peso_total || 0), 0) || 0);
  }, 0);
  const pesoTotalGeral = pesoTotalPecas + pesoTotalInsumos;

  // Consolidar peças por marca e fase
  const pecasConsolidadas = romaneiosDaOF.reduce((acc, romaneio) => {
    romaneio.itens_pecas?.forEach(item => {
      const key = `${item.marca}-${item.fase || 'N/A'}`;
      if (acc[key]) {
        acc[key].quantidade += item.quantidade_expedida;
        acc[key].peso_total += item.peso_total || 0;
      } else {
        acc[key] = {
          marca: item.marca,
          fase: item.fase || 'N/A',
          quantidade: item.quantidade_expedida,
          peso_total: item.peso_total || 0
        };
      }
    });
    return acc;
  }, {} as Record<string, any>);

  // Consolidar insumos por tipo
  const insumosConsolidados = romaneiosDaOF.reduce((acc, romaneio) => {
    romaneio.itens_insumos?.forEach(item => {
      const key = item.tipo_insumo;
      if (acc[key]) {
        acc[key].quantidade_total += item.quantidade_expedida;
        acc[key].itens.push(item);
      } else {
        acc[key] = {
          tipo: item.tipo_insumo,
          quantidade_total: item.quantidade_expedida,
          unidade: item.unidade,
          itens: [item]
        };
      }
    });
    return acc;
  }, {} as Record<string, any>);

  const handleExportPDF = async () => {
    try {
      const filename = `relatorio_geral_romaneios_${ofNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
      await generateProfessionalPDF('relatorio-geral-preview', filename);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = [
        'Número Romaneio',
        'OF',
        'Data Criação',
        'Status',
        'Peso Total (kg)',
        'Tipo Transporte',
        'Observações'
      ];
      
      const csvData = romaneiosDaOF.map(r => ({
        'Número Romaneio': r.numero_romaneio,
        'OF': r.of_number,
        'Data Criação': new Date(r.data_criacao).toLocaleDateString('pt-BR'),
        'Status': r.status,
        'Peso Total (kg)': r.peso_total_romaneio || 0,
        'Tipo Transporte': r.tipo_transporte || 'N/A',
        'Observações': r.observacoes || 'N/A'
      }));

      const csvContent = generateCSV(csvData, headers);
      const filename = `relatorio_geral_romaneios_${ofNumber}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csvContent, filename);
      toast.success('Planilha exportada com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar planilha');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Relatório Geral de Romaneios - OF {ofNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview do Relatório */}
            <div id="relatorio-geral-preview" className="bg-white p-8 rounded-lg border" style={{ fontFamily: 'Inter, sans-serif' }}>
              {/* Cabeçalho do Relatório */}
              <div className="flex justify-between items-start border-b-2 border-gray-300 pb-4 mb-6">
                <div>
                  <h1 className="text-2xl font-semibold text-gray-800">Relatório Geral de Romaneios por OF</h1>
                  <p className="text-lg text-gray-700">Contrato: <span className="font-bold">{ofNumber}</span></p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Data de Emissão: <span>{new Date().toLocaleDateString('pt-BR')}</span></p>
                </div>
              </div>

              {/* Resumo Quantitativo */}
              <h2 className="text-xl font-semibold mb-3">Resumo Quantitativo</h2>
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-800">{totalRomaneios}</div>
                  <div className="text-sm text-gray-600">Total de Romaneios</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-800">{pesoTotalPecas.toFixed(0)} kg</div>
                  <div className="text-sm text-gray-600">Peso Total (Peças)</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-800">{pesoTotalInsumos.toFixed(0)} kg</div>
                  <div className="text-sm text-gray-600">Peso Total (Insumos)</div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-800">{pesoTotalGeral.toFixed(0)} kg</div>
                  <div className="text-sm text-gray-600">Peso Total Geral</div>
                </div>
              </div>

              {/* Lista de Romaneios Emitidos */}
              <h2 className="text-xl font-semibold mb-3">Romaneios Emitidos</h2>
              <div className="mb-6">
                <table className="w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium">Número</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium">Data</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium">Status</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium">Peso Peças</th>
                      <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium">Transporte</th>
                    </tr>
                  </thead>
                  <tbody>
                    {romaneiosDaOF.map((romaneio) => {
                      const pesoPecas = romaneio.itens_pecas?.reduce((sum, item) => sum + (item.peso_total || 0), 0) || 0;
                      return (
                        <tr key={romaneio.id}>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs">{romaneio.numero_romaneio}</td>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs">
                            {new Date(romaneio.data_criacao).toLocaleDateString('pt-BR')}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs">{romaneio.status}</td>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs">{pesoPecas.toFixed(0)} kg</td>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs">{romaneio.tipo_transporte || 'N/A'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Seção de Peças e Insumos em Colunas */}
              <div className="grid grid-cols-2 gap-6 mt-10">
                {/* Coluna de Peças */}
                <div>
                  <h2 className="text-xl font-semibold mb-3">Resumo de Peças Expedidas</h2>
                  <h3 className="text-lg font-medium mb-2">Total por Marca e Fase</h3>
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium">Marca</th>
                        <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium">Fase</th>
                        <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium">Qtd.</th>
                        <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium">Peso Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(pecasConsolidadas).map((peca: any, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs">{peca.marca}</td>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs">{peca.fase}</td>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs">{peca.quantidade}</td>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs">{peca.peso_total.toFixed(0)} kg</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 px-2 py-1.5 text-xs font-bold">TOTAL</td>
                        <td className="border border-gray-300 px-2 py-1.5 text-xs"></td>
                        <td className="border border-gray-300 px-2 py-1.5 text-xs font-bold">
                          {Object.values(pecasConsolidadas).reduce((sum: number, peca: any) => sum + peca.quantidade, 0)}
                        </td>
                        <td className="border border-gray-300 px-2 py-1.5 text-xs font-bold">
                          {Object.values(pecasConsolidadas).reduce((sum: number, peca: any) => sum + peca.peso_total, 0).toFixed(0)} kg
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Coluna de Insumos */}
                <div>
                  <h2 className="text-xl font-semibold mb-3">Resumo de Insumos Expedidos</h2>
                  <h3 className="text-lg font-medium mb-2">Total por Tipo</h3>
                  <table className="w-full border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium">Tipo</th>
                        <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium">Descrição</th>
                        <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium">Qtd. Total</th>
                        <th className="border border-gray-300 px-2 py-1.5 text-left text-sm font-medium">Unidade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(insumosConsolidados).map((insumo: any, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs">{insumo.tipo}</td>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs">
                            {insumo.itens.map((item: any) => item.descricao).join(', ')}
                          </td>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs">{insumo.quantidade_total}</td>
                          <td className="border border-gray-300 px-2 py-1.5 text-xs">{insumo.unidade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Botões de Exportação */}
            <div className="flex gap-4 justify-center">
              <Button onClick={handleExportPDF} className="flex items-center gap-2">
                <FileDown className="w-4 h-4" />
                Exportar PDF
              </Button>
              <Button onClick={handleExportCSV} variant="outline" className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4" />
                Exportar Planilha
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
