
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, FileText } from 'lucide-react';
import { RomaneioExpedicao } from '@/hooks/useRomaneios';
import { formatBrazilianDateFromString } from '@/utils/dateTimeUtils';
import { generateProfessionalPDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';

interface RomaneioReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  romaneio: RomaneioExpedicao;
}

interface PecaAgrupada {
  marca: string;
  descricao: string;
  quantidade: number;
  peso_unitario: number;
  peso_total: number;
}

export const RomaneioReportModal: React.FC<RomaneioReportModalProps> = ({
  isOpen,
  onClose,
  romaneio
}) => {
  const handleGeneratePDF = async () => {
    try {
      const filename = `romaneio-${romaneio.numero_romaneio}.pdf`;
      await generateProfessionalPDF('romaneio-report-content', filename);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF. Tente novamente.');
    }
  };

  // Função para formatar o tipo de transporte
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

  // Função para formatar o tipo de frete
  const formatFrete = (tipo: string) => {
    return tipo === 'proprio' ? 'Próprio' : 'Terceiros';
  };

  // Agrupar peças por fase e ordenar por marca
  const pecasPorFase = React.useMemo(() => {
    if (!romaneio.itens_pecas) return {};
    
    const agrupadas: Record<string, PecaAgrupada[]> = {};
    
    romaneio.itens_pecas.forEach(item => {
      const fase = item.fase || 'Sem Fase';
      if (!agrupadas[fase]) {
        agrupadas[fase] = [];
      }
      
      agrupadas[fase].push({
        marca: item.marca,
        descricao: item.descricao || '',
        quantidade: item.quantidade_expedida,
        peso_unitario: item.peso_unitario,
        peso_total: item.peso_total
      });
    });
    
    // Ordenar peças por marca (numericamente se for número)
    Object.keys(agrupadas).forEach(fase => {
      agrupadas[fase].sort((a, b) => {
        const marcaA = isNaN(Number(a.marca)) ? a.marca : Number(a.marca);
        const marcaB = isNaN(Number(b.marca)) ? b.marca : Number(b.marca);
        
        if (typeof marcaA === 'number' && typeof marcaB === 'number') {
          return marcaA - marcaB;
        }
        return String(marcaA).localeCompare(String(marcaB), undefined, { numeric: true, sensitivity: 'base' });
      });
    });
    
    return agrupadas;
  }, [romaneio.itens_pecas]);

  // Calcular totais
  const totalPecas = romaneio.itens_pecas?.reduce((sum, item) => sum + item.quantidade_expedida, 0) || 0;
  const pesoTotal = romaneio.peso_total_romaneio || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Relatório de Romaneio - {romaneio.numero_romaneio}</DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>

        <div className="bg-gray-100 p-6">
          <div id="romaneio-report-content" className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg p-8">
            
            {/* Cabeçalho */}
            <header className="pb-6 border-b border-gray-200">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Romaneio de peças - OF {romaneio.of_number}</h1>
                  <p className="text-sm text-gray-500">{romaneio.numero_romaneio} - Revisão: {romaneio.revisao}</p>
                </div>
                <div className="text-right">
                  <Button 
                    onClick={handleGeneratePDF} 
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Gerar PDF
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-6 items-start">
                {/* Coluna Esquerda: Dados do Romaneio */}
                <div className="col-span-2 grid grid-cols-3 gap-x-6 gap-y-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Data do Romaneio</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {formatBrazilianDateFromString(romaneio.data_romaneio)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Data Prev. Entrega</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {romaneio.data_prevista_entrega ? formatBrazilianDateFromString(romaneio.data_prevista_entrega) : 'N/A'}
                    </p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 text-center">
                    <p className="text-xs font-medium text-yellow-800">Maior Dimensão</p>
                    <p className="text-sm font-semibold text-lg text-yellow-900">
                      {romaneio.maior_dimensao || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Tipo de Transporte</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {formatTransporte(romaneio.tipo_transporte || '')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Tipo de Frete</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {formatFrete(romaneio.frete_tipo || '')}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Nome do Motorista</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {romaneio.nome_motorista || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Coluna Direita: Resumo Total - Reduzido em 30% */}
                <div className="col-span-1 space-y-3 scale-75">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <p className="text-xs font-medium text-blue-700">Quantidade Total de Peças</p>
                    <p className="text-xl font-bold text-blue-900">{totalPecas}</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                    <p className="text-xs font-medium text-green-700">Peso Total</p>
                    <p className="text-xl font-bold text-green-900">{pesoTotal.toFixed(2)} kg</p>
                  </div>
                </div>
              </div>
            </header>

            {/* Itens do Romaneio Agrupados por Fase */}
            <div className="space-y-6 mt-6">
              {Object.entries(pecasPorFase)
                .sort(([a], [b]) => {
                  // Ordenar fases numericamente se possível
                  const faseA = a.toLowerCase().replace('fase', '').trim();
                  const faseB = b.toLowerCase().replace('fase', '').trim();
                  
                  if (!isNaN(Number(faseA)) && !isNaN(Number(faseB))) {
                    return Number(faseA) - Number(faseB);
                  }
                  return a.localeCompare(b);
                })
                .map(([fase, pecas]) => (
                  <div key={fase}>
                    <h2 className="text-xl font-semibold text-gray-700 pb-2 border-b-2 border-gray-300 mb-4">
                      {fase === 'Sem Fase' ? 'Sem Fase' : `Fase: ${fase}`}
                    </h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full bg-white">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="py-1 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Marca</th>
                            <th className="py-1 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                            <th className="py-1 px-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qtd</th>
                            <th className="py-1 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Peso Unit.</th>
                            <th className="py-1 px-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Peso Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {pecas.map((peca, index) => (
                            <tr key={index}>
                              <td className="py-1 px-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {peca.marca}
                              </td>
                              <td className="py-1 px-4 whitespace-nowrap text-sm text-gray-600">
                                {peca.descricao || 'N/A'}
                              </td>
                              <td className="py-1 px-4 whitespace-nowrap text-sm text-gray-600 text-center">
                                {peca.quantidade}
                              </td>
                              <td className="py-1 px-4 whitespace-nowrap text-sm text-gray-600 text-right">
                                {peca.peso_unitario.toFixed(0)} kg
                              </td>
                              <td className="py-1 px-4 whitespace-nowrap text-sm font-semibold text-gray-800 text-right">
                                {peca.peso_total.toFixed(0)} kg
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
