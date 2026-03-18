import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileDown, FileSpreadsheet, Package2 } from 'lucide-react';
import { useApontamentosExpedicao } from '@/hooks/useApontamentosExpedicao';
import { generateProfessionalPDF } from '@/utils/pdfGenerator';
import { generateCSV, downloadCSV } from '@/utils/csvUtils';
import { toast } from 'sonner';

interface RelatorioPecasModalProps {
  isOpen: boolean;
  onClose: () => void;
  ofNumber: string;
}

export const RelatorioPecasModal: React.FC<RelatorioPecasModalProps> = ({
  isOpen,
  onClose,
  ofNumber
}) => {
  const { apontamentosExpedicao, pecasCompletas, loading } = useApontamentosExpedicao(ofNumber);
  
  // Combinar dados das peças cadastradas com as expedidas
  const relatorioPecas = pecasCompletas.map(peca => {
    // Buscar apontamento correspondente pela combinação OF + Fase + Marca
    const apontamentoExpedicao = apontamentosExpedicao.find(apt => 
      apt.of_number === peca.of_number &&
      apt.etapa_fase === (peca.etapa_fase || '') &&
      apt.marca === peca.marca
    );
    
    const quantidadeExpedida = apontamentoExpedicao?.quantidade_expedida || 0;
    const pesoTotalExpedido = apontamentoExpedicao?.peso_total_expedido || 0;
    const quantidadePendente = peca.quantidade_total - quantidadeExpedida;
    const pesoTotalPendente = quantidadePendente * peca.peso_unitario;
    
    return {
      of_number: peca.of_number,
      etapa_fase: peca.etapa_fase || '',
      marca: peca.marca,
      descricao: peca.descricao || 'N/A',
      quantidade_total: peca.quantidade_total,
      quantidade_expedida: quantidadeExpedida,
      peso_total_expedido: pesoTotalExpedido,
      quantidade_pendente: quantidadePendente,
      peso_total_pendente: pesoTotalPendente,
      status: quantidadeExpedida === 0 ? 'Pendente' : 
              quantidadeExpedida >= peca.quantidade_total ? 'Concluído' : 'Parcial'
    };
  });

  // Calcular totais
  const totalPecasExpedidas = relatorioPecas.reduce((sum, peca) => sum + peca.quantidade_expedida, 0);
  const pesoTotalExpedido = relatorioPecas.reduce((sum, peca) => sum + peca.peso_total_expedido, 0);
  const totalPecasPendentes = relatorioPecas.reduce((sum, peca) => sum + peca.quantidade_pendente, 0);
  const pesoTotalPendente = relatorioPecas.reduce((sum, peca) => sum + peca.peso_total_pendente, 0);
  
  const handleExportPDF = async () => {
    try {
      const element = document.getElementById('relatorio-pecas-expedicao-preview');
      if (!element) {
        toast.error('Erro: Elemento do relatório não encontrado');
        return;
      }

      // Aguardar um momento para garantir que o elemento esteja renderizado
      await new Promise(resolve => setTimeout(resolve, 100));

      const filename = `relatorio_pecas_expedicao_${ofNumber}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Usar a função de geração de PDF profissional
      await generateProfessionalPDF('relatorio-pecas-expedicao-preview', filename);
      
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    }
  };

  const handleExportCSV = () => {
    try {
      const headers = [
        'OF',
        'Fase',
        'Marca',
        'Descrição',
        'Qtd. Total',
        'Qtd. Expedida',
        'Peso Total Expedido (kg)',
        'Qtd. Pendente',
        'Peso Total Pendente (kg)',
        'Status'
      ];
      
      const csvData = relatorioPecas.map(peca => ({
        'OF': peca.of_number,
        'Fase': peca.etapa_fase,
        'Marca': peca.marca,
        'Descrição': peca.descricao,
        'Qtd. Total': peca.quantidade_total,
        'Qtd. Expedida': peca.quantidade_expedida,
        'Peso Total Expedido (kg)': peca.peso_total_expedido.toFixed(2),
        'Qtd. Pendente': peca.quantidade_pendente,
        'Peso Total Pendente (kg)': peca.peso_total_pendente.toFixed(2),
        'Status': peca.status
      }));

      const csvContent = generateCSV(csvData, headers);
      const filename = `relatorio_pecas_expedicao_${ofNumber}_${new Date().toISOString().split('T')[0]}.csv`;
      downloadCSV(csvContent, filename);
      toast.success('Planilha exportada com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
      toast.error('Erro ao exportar planilha');
    }
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package2 className="w-5 h-5" />
              Relatório de Expedição de Peças - OF {ofNumber}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando dados...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package2 className="w-5 h-5" />
            Relatório de Expedição de Peças - OF {ofNumber}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preview do Relatório */}
          <div id="relatorio-pecas-expedicao-preview" className="bg-white p-6 rounded-lg border" style={{ fontFamily: 'Inter, sans-serif' }}>
            {/* Cabeçalho do Relatório */}
            <div className="flex justify-between items-start border-b-2 border-gray-300 pb-4 mb-4">
              <div>
                <h1 className="text-2xl font-semibold text-gray-800">Relatório de Expedição de Peças</h1>
                <p className="text-lg text-gray-700">Contrato/OF: <span className="font-bold">{ofNumber}</span></p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Data de Emissão: <span className="font-medium">{new Date().toLocaleDateString('pt-BR')}</span></p>
              </div>
            </div>

            {/* Resumo Geral de Peças */}
            <h2 className="text-xl font-semibold mb-3 text-gray-800">Resumo Geral de Peças</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{totalPecasExpedidas}</div>
                <div className="text-sm text-gray-600">Total de Peças Expedidas</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{pesoTotalExpedido.toFixed(0)} kg</div>
                <div className="text-sm text-gray-600">Peso Total Expedido</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{totalPecasPendentes}</div>
                <div className="text-sm text-gray-600">Total de Peças Pendentes</div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-gray-900">{pesoTotalPendente.toFixed(0)} kg</div>
                <div className="text-sm text-gray-600">Peso Total Pendente</div>
              </div>
            </div>

            {/* Tabela de Peças */}
            <div className="overflow-x-auto mt-6">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700">OF</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700">Fase</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700">Marca</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700">Descrição</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700">Qtd. Total</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700">Qtd. Expedida</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700">Peso Total Exp.</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700">Qtd. Pendente</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700">Peso Total Pend.</th>
                    <th className="border border-gray-300 p-2 text-left text-sm font-medium text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioPecas.map((peca, index) => (
                    <tr key={`${peca.of_number}-${peca.etapa_fase}-${peca.marca}-${index}`} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 text-sm">{peca.of_number}</td>
                      <td className="border border-gray-300 p-2 text-sm">{peca.etapa_fase}</td>
                      <td className="border border-gray-300 p-2 text-sm">{peca.marca}</td>
                      <td className="border border-gray-300 p-2 text-sm">{peca.descricao}</td>
                      <td className="border border-gray-300 p-2 text-sm">{peca.quantidade_total}</td>
                      <td className="border border-gray-300 p-2 text-sm">{peca.quantidade_expedida}</td>
                      <td className="border border-gray-300 p-2 text-sm">{peca.peso_total_expedido.toFixed(0)} kg</td>
                      <td className="border border-gray-300 p-2 text-sm">{peca.quantidade_pendente}</td>
                      <td className="border border-gray-300 p-2 text-sm">{peca.peso_total_pendente.toFixed(0)} kg</td>
                      <td className="border border-gray-300 p-2 text-sm">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          peca.status === 'Concluído' 
                            ? 'bg-green-100 text-green-800' 
                            : peca.status === 'Parcial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {peca.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Linha de Total */}
                  <tr className="bg-gray-50 font-bold">
                    <td className="border border-gray-300 p-2 text-sm" colSpan={5}>TOTAIS</td>
                    <td className="border border-gray-300 p-2 text-sm">{totalPecasExpedidas}</td>
                    <td className="border border-gray-300 p-2 text-sm">{pesoTotalExpedido.toFixed(0)} kg</td>
                    <td className="border border-gray-300 p-2 text-sm">{totalPecasPendentes}</td>
                    <td className="border border-gray-300 p-2 text-sm">{pesoTotalPendente.toFixed(0)} kg</td>
                    <td className="border border-gray-300 p-2 text-sm"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Botões de Exportação */}
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={handleExportPDF} 
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
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
  );
};
