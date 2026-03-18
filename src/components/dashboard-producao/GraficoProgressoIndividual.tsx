
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DashboardProcesso } from '@/hooks/useDashboardProducaoOtimizado';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GraficoProgressoIndividualProps {
  processos: DashboardProcesso[];
}

export const GraficoProgressoIndividual: React.FC<GraficoProgressoIndividualProps> = ({ processos }) => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verde': return '#10b981'; // emerald-500
      case 'amarelo': return '#f59e0b'; // amber-500
      case 'vermelho': return '#ef4444'; // red-500
      case 'azul': return '#3b82f6'; // blue-500
      default: return '#6b7280'; // gray-500
    }
  };

  if (!processos.length) {
    return (
      <div className="flex items-center justify-center h-96 text-muted-foreground">
        <p>Nenhum processo disponível para exibir gráficos</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {processos.map((processo) => (
        <div key={processo.id} className="bg-card rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-4">
            <div 
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ backgroundColor: getStatusColor(processo.status) }}
            />
            <h3 className="text-lg font-semibold text-card-foreground">
              Progresso - {processo.nome}
            </h3>
            <div className="ml-auto text-sm text-muted-foreground">
              {processo.progressoReal.toFixed(1)}% realizado
            </div>
          </div>
          
          <div className="h-64 w-full">
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
                  <linearGradient id={`colorPlanejado-${processo.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id={`colorRealizado-${processo.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getStatusColor(processo.status)} stopOpacity={0.8}/>
                    <stop offset="95%" stopColor={getStatusColor(processo.status)} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="planejado"
                  stroke="#8884d8"
                  fillOpacity={1}
                  fill={`url(#colorPlanejado-${processo.id})`}
                  name="planejado"
                />
                <Area
                  type="monotone"
                  dataKey="realizado"
                  stroke={getStatusColor(processo.status)}
                  fillOpacity={1}
                  fill={`url(#colorRealizado-${processo.id})`}
                  name="realizado"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ))}
    </div>
  );
};
