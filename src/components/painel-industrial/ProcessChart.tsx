
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

interface ProcessChartProps {
  processName: string;
  data: {
    name: string;
    weight: number;
  }[];
  color: string;
}

export const ProcessChart: React.FC<ProcessChartProps> = ({ processName, data, color }) => {
  const formatTooltip = (value: number, name: string) => {
    return [`${value.toFixed(3)}t`, name];
  };

  // Se não há dados ou todos os valores são zero
  if (!data || data.length === 0 || data.every(item => item.weight === 0)) {
    return (
      <div className="h-full flex flex-col">
        <h4 className="text-[9px] font-semibold text-foreground mb-1 text-center">
          {processName}
        </h4>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-[8px] text-muted-foreground">Sem dados</span>
        </div>
      </div>
    );
  }

  console.log(`Renderizando gráfico ${processName} com dados:`, data);

  return (
    <div className="h-full w-full flex flex-col">
      <h4 className="text-[9px] font-semibold text-foreground mb-1 text-center truncate">
        {processName}
      </h4>
      <div className="flex-1 w-full" style={{ minHeight: '60px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 5, right: 5, left: 5, bottom: 20 }}
            barCategoryGap="10%"
          >
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 6, fill: 'hsl(var(--foreground))' }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={15}
              axisLine={false}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 6, fill: 'hsl(var(--foreground))' }}
              tickFormatter={(value) => `${value}t`}
              width={20}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              formatter={formatTooltip}
              labelStyle={{ color: 'black', fontSize: '8px' }}
              contentStyle={{ 
                backgroundColor: 'rgba(0,0,0,0.8)', 
                border: 'none',
                borderRadius: '4px',
                fontSize: '8px',
                padding: '4px 8px'
              }}
            />
            <Bar 
              dataKey="weight" 
              fill={color}
              radius={[2, 2, 0, 0]}
              maxBarSize={25}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
