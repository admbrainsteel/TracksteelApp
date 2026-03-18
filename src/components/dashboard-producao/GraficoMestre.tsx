
import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardProcesso } from '@/hooks/useDashboardProducaoOtimizado';

interface GraficoMestreProps {
  processos: DashboardProcesso[];
  onProcessoClick?: (processoNome: string) => void;
  processoSelecionado?: string | null;
}

export const GraficoMestre: React.FC<GraficoMestreProps> = ({ 
  processos, 
  onProcessoClick, 
  processoSelecionado 
}) => {
  // Processar dados dos gráficos individuais para criar um gráfico sobreposto
  const dadosGraficoSobreposto = useMemo(() => {
    if (!processos || processos.length === 0) return [];

    // Coletar todas as datas dos gráficos individuais
    const todasAsDatas = new Set<string>();
    processos.forEach(processo => {
      processo.dadosGrafico.forEach(ponto => {
        todasAsDatas.add(ponto.data);
      });
    });

    // Ordenar as datas
    const datasOrdenadas = Array.from(todasAsDatas).sort();

    // Construir dados do gráfico sobreposto
    return datasOrdenadas.map(data => {
      const pontoGrafico: any = {
        data: format(parseISO(data), 'dd/MM', { locale: ptBR }),
        dataCompleta: data
      };

      // Para cada processo, buscar o valor realizado na data
      processos.forEach(processo => {
        const pontoProcesso = processo.dadosGrafico.find(ponto => ponto.data === data);
        // Converter para toneladas (dividir por 1000)
        pontoGrafico[processo.nome] = pontoProcesso ? Math.round(pontoProcesso.realizado / 1000 * 100) / 100 : 0;
      });

      return pontoGrafico;
    });
  }, [processos]);

  // Obter cores dos processos baseado no status
  const obterCorProcesso = (status: string) => {
    switch (status) {
      case 'verde':
        return '#10b981';
      case 'amarelo':
        return '#f59e0b';
      case 'vermelho':
        return '#ef4444';
      case 'azul':
        return '#3b82f6';
      default:
        return '#8884d8';
    }
  };

  const handleProcessoClick = (processoNome: string) => {
    if (onProcessoClick) {
      onProcessoClick(processoNome);
    }
  };

  const formatTooltipValue = (value: number, name: string) => [
    `${value.toFixed(2)} t`,
    name
  ];

  return (
    <div className="w-full h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={dadosGraficoSobreposto}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="data"
            stroke="#9ca3af"
            fontSize={12}
            tick={{ fill: '#9ca3af' }}
          />
          <YAxis 
            stroke="#9ca3af"
            fontSize={12}
            tick={{ fill: '#9ca3af' }}
            label={{ 
              value: 'Peso Acumulado (t)', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fill: '#9ca3af' }
            }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '6px',
              color: '#f3f4f6'
            }}
            formatter={formatTooltipValue}
            labelFormatter={(label) => `Data: ${label}`}
          />
          <Legend 
            wrapperStyle={{ color: '#9ca3af' }}
            onClick={(e) => handleProcessoClick(e.value)}
          />
          
          {processos.map((processo) => (
            <Line
              key={processo.nome}
              type="monotone"
              dataKey={processo.nome}
              stroke={obterCorProcesso(processo.status)}
              strokeWidth={2}
              dot={{ fill: obterCorProcesso(processo.status), strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, fill: obterCorProcesso(processo.status) }}
              opacity={processoSelecionado ? (processoSelecionado === processo.nome ? 1 : 0.3) : 1}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
