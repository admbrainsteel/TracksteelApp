
import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, FileText, Download } from 'lucide-react';
import { formatBrazilianDateFromString, formatBrazilianDateTime } from '@/utils/dateTimeUtils';
import { RelatorioDiarioPDF } from './RelatorioDiarioPDF';

interface ApontamentoDiario {
  id: string;
  of_number: string;
  etapa_fase: string;
  marca: string;
  descricao: string;
  processo: string;
  quantidade: number;
  peso_unitario: number;
  peso_total: number;
  data_apontamento: string;
  created_at: string;
}

interface ResumoProcesso {
  processo: string;
  quantidade: number;
  apontamentos: number;
  peso_total: number;
}

interface RelatorioDiarioModalProps {
  isOpen: boolean;
  onClose: () => void;
  apontamentos: ApontamentoDiario[];
  resumoProcessos: ResumoProcesso[];
  loading: boolean;
  selectedDate: string;
}

export const RelatorioDiarioModal: React.FC<RelatorioDiarioModalProps> = ({
  isOpen,
  onClose,
  apontamentos,
  resumoProcessos,
  loading,
  selectedDate
}) => {
  const estatisticas = useMemo(() => {
    const totalApontamentos = apontamentos.length;
    const totalQuantidade = apontamentos.reduce((sum, apt) => sum + apt.quantidade, 0);
    const totalPeso = apontamentos.reduce((sum, apt) => sum + apt.peso_total, 0);
    const processosUnicos = new Set(apontamentos.map(apt => apt.processo)).size;
    const ofsUnicas = new Set(apontamentos.map(apt => apt.of_number)).size;
    
    return {
      totalApontamentos,
      totalQuantidade,
      totalPeso,
      processosUnicos,
      ofsUnicas
    };
  }, [apontamentos]);

  const exportarCSV = () => {
    if (apontamentos.length === 0) return;
    
    const headers = ['OF', 'Etapa/Fase', 'Marca', 'Descrição', 'Processo', 'Quantidade', 'Peso Unit.', 'Peso Total', 'Data', 'Horário'];
    
    const csvData = apontamentos.map(apt => [
      apt.of_number,
      apt.etapa_fase,
      apt.marca,
      apt.descricao,
      apt.processo,
      apt.quantidade.toString(),
      apt.peso_unitario.toFixed(3),
      apt.peso_total.toFixed(3),
      formatBrazilianDateFromString(apt.data_apontamento),
      formatBrazilianDateTime(apt.created_at).split(' ')[1]
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `relatorio-diario-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Usar a função correta para formatação de strings de data
  const displayDate = selectedDate ? formatBrazilianDateFromString(selectedDate) : 'Não definido';
  
  console.log('RelatorioDiarioModal - selectedDate:', selectedDate);
  console.log('RelatorioDiarioModal - displayDate formatado:', displayDate);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatório Diário de Produção
            </DialogTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Cabeçalho com informações da data */}
          <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
            <h2 className="text-lg font-semibold text-primary">
              Registros do dia {displayDate}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Relatório consolidado de apontamentos de produção
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando dados...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Estatísticas gerais */}
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg text-center">
                  <h3 className="text-base font-semibold text-blue-800">Total de Peças</h3>
                  <p className="text-3xl font-bold text-blue-900">{estatisticas.totalQuantidade}</p>
                </div>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg text-center">
                  <h3 className="text-base font-semibold text-green-800">Nº de Apontamentos</h3>
                  <p className="text-3xl font-bold text-green-900">{estatisticas.totalApontamentos}</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg text-center">
                  <h3 className="text-base font-semibold text-orange-800">Peso Total</h3>
                  <p className="text-2xl font-bold text-orange-900">{estatisticas.totalPeso.toFixed(0)} Kg</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg text-center">
                  <h3 className="text-base font-semibold text-gray-800">Nº de Processos</h3>
                  <p className="text-3xl font-bold text-gray-900">{estatisticas.processosUnicos}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg text-center">
                  <h3 className="text-base font-semibold text-purple-800">Nº de OFs</h3>
                  <p className="text-3xl font-bold text-purple-900">{estatisticas.ofsUnicas}</p>
                </div>
              </div>

              {/* Resumo por processo - 50% menor */}
              {resumoProcessos.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <h3 className="text-lg font-semibold mb-3">Resumo por Processo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {resumoProcessos.map((item) => (
                      <div key={item.processo} className="bg-gray-50 p-2 rounded-lg">
                        <h4 className="font-medium text-gray-800 text-sm">{item.processo}</h4>
                        <div className="text-xs text-gray-600 mt-1">
                          <p>{item.quantidade} peças ({item.apontamentos} apontamentos)</p>
                          <p className="font-semibold text-gray-800">{item.peso_total.toFixed(2)} kg</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ações do relatório */}
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">
                  {apontamentos.length} registros encontrados
                </p>
                <div className="flex gap-2">
                  <RelatorioDiarioPDF
                    apontamentos={apontamentos}
                    resumoProcessos={resumoProcessos}
                    estatisticas={estatisticas}
                    selectedDate={selectedDate}
                  />
                  <Button
                    onClick={exportarCSV}
                    disabled={apontamentos.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>
              </div>

              {/* Tabela de apontamentos */}
              {apontamentos.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left font-semibold">OF</th>
                        <th className="border border-gray-200 px-4 py-2 text-left font-semibold">Etapa/Fase</th>
                        <th className="border border-gray-200 px-4 py-2 text-left font-semibold">Marca</th>
                        <th className="border border-gray-200 px-4 py-2 text-left font-semibold">Descrição</th>
                        <th className="border border-gray-200 px-4 py-2 text-left font-semibold">Processo</th>
                        <th className="border border-gray-200 px-4 py-2 text-center font-semibold">Qtd</th>
                        <th className="border border-gray-200 px-4 py-2 text-center font-semibold">Peso Unit.</th>
                        <th className="border border-gray-200 px-4 py-2 text-center font-semibold">Peso Total</th>
                        <th className="border border-gray-200 px-4 py-2 text-center font-semibold">Data</th>
                        <th className="border border-gray-200 px-4 py-2 text-center font-semibold">Horário</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apontamentos.map((apt) => (
                        <tr key={apt.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2 font-medium">{apt.of_number}</td>
                          <td className="border border-gray-200 px-4 py-2">{apt.etapa_fase}</td>
                          <td className="border border-gray-200 px-4 py-2">{apt.marca}</td>
                          <td className="border border-gray-200 px-4 py-2">{apt.descricao}</td>
                          <td className="border border-gray-200 px-4 py-2">{apt.processo}</td>
                          <td className="border border-gray-200 px-4 py-2 text-center">{apt.quantidade}</td>
                          <td className="border border-gray-200 px-4 py-2 text-center">{apt.peso_unitario.toFixed(3)} kg</td>
                          <td className="border border-gray-200 px-4 py-2 text-center font-semibold">{apt.peso_total.toFixed(3)} kg</td>
                          <td className="border border-gray-200 px-4 py-2 text-center">
                            {formatBrazilianDateFromString(apt.data_apontamento)}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-center">
                            {formatBrazilianDateTime(apt.created_at).split(' ')[1]}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum apontamento encontrado para esta data</p>
                  <p className="text-sm mt-2">
                    Verifique se existem apontamentos de produção registrados
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
