
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardProcesso } from '@/hooks/useDashboardProducaoOtimizado';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GraficoProgressoProcessoProps {
  processo: DashboardProcesso;
}

export const GraficoProgressoProcesso: React.FC<GraficoProgressoProcessoProps> = ({ processo }) => {
  const formatTooltipValue = (value: number, name: string) => [
    `${(value / 1000).toFixed(2)} t`,
    name === 'planejado' ? 'Planejado' : 'Realizado'
  ];

  const formatAxisValue = (value: number) => `${(value / 1000).toFixed(1)}t`;

  const formatDateLabel = (tickItem: string) => {
    try {
      return format(new Date(tickItem), 'dd/MM', { locale: ptBR });
    } catch {
      return tickItem;
    }
  };

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={processo.dadosGrafico}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis 
            dataKey="data" 
            tickFormatter={formatDateLabel}
            className="text-xs"
          />
          <YAxis 
            tickFormatter={formatAxisValue}
            className="text-xs"
          />
          <Tooltip 
            formatter={formatTooltipValue}
            labelFormatter={(label) => `Data: ${formatDateLabel(label)}`}
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px'
            }}
          />
          <Legend />
          <defs>
            <linearGradient id="colorPlanejado" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorRealizado" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="planejado"
            stroke="#8884d8"
            fillOpacity={1}
            fill="url(#colorPlanejado)"
            name="planejado"
          />
          <Area
            type="monotone"
            dataKey="realizado"
            stroke="#82ca9d"
            fillOpacity={1}
            fill="url(#colorRealizado)"
            name="realizado"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
