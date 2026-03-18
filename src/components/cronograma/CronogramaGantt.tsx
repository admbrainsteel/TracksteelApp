
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, Calendar, FileDown } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CronogramaOf } from '@/types/cronograma';

interface CronogramaGanttProps {
  cronograma: CronogramaOf;
  onClose: () => void;
  onExportPDF?: () => void;
}

export const CronogramaGantt: React.FC<CronogramaGanttProps> = ({ cronograma, onClose, onExportPDF }) => {
  const cores = [
    'bg-blue-500 dark:bg-blue-600',
    'bg-green-500 dark:bg-green-600',
    'bg-yellow-500 dark:bg-yellow-600',
    'bg-purple-500 dark:bg-purple-600',
    'bg-red-500 dark:bg-red-600',
    'bg-indigo-500 dark:bg-indigo-600',
    'bg-pink-500 dark:bg-pink-600',
    'bg-gray-500 dark:bg-gray-600'
  ];

  // Calcular o período total do cronograma
  const todasAsDatas = cronograma.processos.flatMap(p => [p.data_inicio, p.data_fim]);
  const dataInicioTotal = new Date(Math.min(...todasAsDatas.map(d => new Date(d).getTime())));
  const dataFimTotal = new Date(Math.max(...todasAsDatas.map(d => new Date(d).getTime())));
  const duracaoTotal = differenceInDays(dataFimTotal, dataInicioTotal) + 1;

  const calcularPosicaoELargura = (dataInicio: string, dataFim: string) => {
    const inicio = parseISO(dataInicio);
    const fim = parseISO(dataFim);
    
    const diasDoInicio = differenceInDays(inicio, dataInicioTotal);
    const duracaoProcesso = differenceInDays(fim, inicio) + 1;
    
    const left = (diasDoInicio / duracaoTotal) * 100;
    const width = (duracaoProcesso / duracaoTotal) * 100;
    
    return { left: `${left}%`, width: `${width}%` };
  };

  const calcularDiasCorridos = (dataInicio: string, dataFim: string) => {
    return differenceInDays(parseISO(dataFim), parseISO(dataInicio)) + 1;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <Calendar className="w-5 h-5" />
            Cronograma da OF: {cronograma.ordem_fabricacao?.num_of} - Rev. {cronograma.revisao}
          </CardTitle>
          <div className="flex items-center gap-2">
            {onExportPDF && (
              <Button onClick={onExportPDF} variant="outline" size="sm" className="border-gray-200 dark:border-gray-600">
                <FileDown className="w-4 h-4 mr-2" />
                Exportar PDF
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-gray-100 dark:hover:bg-gray-700">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <strong>Gestor Responsável:</strong> {cronograma.gestor_profile?.full_name}
          </div>

          {/* Tabela de Prazos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Prazos de Produção da OF</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 dark:border-gray-600">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100">Processo</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100">Data de Início</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100">Data de Fim</th>
                    <th className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-left text-gray-900 dark:text-gray-100">Dias Corridos</th>
                  </tr>
                </thead>
                <tbody>
                  {cronograma.processos
                    .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                    .map((processo, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 font-medium text-gray-900 dark:text-gray-100">
                        {processo.nome_processo}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">
                        {format(parseISO(processo.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-gray-900 dark:text-gray-100">
                        {format(parseISO(processo.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                      </td>
                      <td className="border border-gray-300 dark:border-gray-600 px-4 py-2 text-center text-gray-900 dark:text-gray-100">
                        {calcularDiasCorridos(processo.data_inicio, processo.data_fim)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gráfico de Gantt */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Linha do Tempo dos Processos</h3>
            
            {/* Cabeçalho com datas */}
            <div className="relative bg-gray-100 dark:bg-gray-700 h-8 rounded border border-gray-200 dark:border-gray-600">
              <div className="absolute left-0 top-1 text-xs font-medium px-2 text-gray-700 dark:text-gray-300">
                {format(dataInicioTotal, 'dd/MM/yyyy', { locale: ptBR })}
              </div>
              <div className="absolute right-0 top-1 text-xs font-medium px-2 text-gray-700 dark:text-gray-300">
                {format(dataFimTotal, 'dd/MM/yyyy', { locale: ptBR })}
              </div>
              <div className="absolute left-1/2 top-1 text-xs font-medium transform -translate-x-1/2 text-gray-700 dark:text-gray-300">
                {duracaoTotal} dias totais
              </div>
            </div>

            {/* Barras dos processos */}
            <div className="space-y-3">
              {cronograma.processos
                .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
                .map((processo, index) => {
                const posicao = calcularPosicaoELargura(processo.data_inicio, processo.data_fim);
                const cor = cores[index % cores.length];
                const diasCorridos = calcularDiasCorridos(processo.data_inicio, processo.data_fim);
                const dataInicioFormatada = format(parseISO(processo.data_inicio), 'dd/MM', { locale: ptBR });
                const dataFimFormatada = format(parseISO(processo.data_fim), 'dd/MM', { locale: ptBR });
                
                return (
                  <div key={index} className="relative">
                    <div className="flex items-center mb-1">
                      <div className="w-32 text-sm font-medium truncate text-gray-900 dark:text-gray-100" title={processo.nome_processo}>
                        {processo.nome_processo}
                      </div>
                      <div className="flex-1 relative h-8 bg-gray-200 dark:bg-gray-600 rounded ml-4">
                        <div
                          className={`absolute top-0 h-full ${cor} rounded flex items-center justify-between px-2 text-white text-xs font-medium`}
                          style={posicao}
                          title={`${processo.nome_processo}: ${dataInicioFormatada} - ${dataFimFormatada} (${diasCorridos} dias)`}
                        >
                          <span className="text-xs">{dataInicioFormatada}</span>
                          <span className="text-xs font-bold">{diasCorridos}d</span>
                          <span className="text-xs">{dataFimFormatada}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Legenda:</div>
            {cronograma.processos
              .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
              .map((processo, index) => {
              const cor = cores[index % cores.length];
              return (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className={`w-4 h-4 ${cor} rounded`}></div>
                  <span className="text-gray-900 dark:text-gray-100">{processo.nome_processo}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
