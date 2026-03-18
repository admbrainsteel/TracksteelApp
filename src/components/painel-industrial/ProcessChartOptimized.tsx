
import React from 'react';

interface ChartData {
  name: string;
  weight: number;
}

interface ProcessChartOptimizedProps {
  corteData: ChartData[];
  soldaData: ChartData[];
  montagemData: ChartData[];
}

export const ProcessChartOptimized: React.FC<ProcessChartOptimizedProps> = ({
  corteData,
  soldaData,
  montagemData
}) => {
  const formatValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return value.toString();
  };

  const getMaxValue = () => {
    const allValues = [
      ...corteData.map(d => d.weight),
      ...soldaData.map(d => d.weight),
      ...montagemData.map(d => d.weight)
    ];
    return Math.max(...allValues, 1);
  };

  const maxValue = getMaxValue();

  const calculateHeight = (value: number) => {
    return Math.max((value / maxValue) * 100, 5);
  };

  // Garantir que todos os processos tenham 3 barras
  const normalizeData = (data: ChartData[]) => {
    const labels = ['7-15d', 'ult.7d', 'prev.7d'];
    return labels.map((label, index) => ({
      name: label,
      weight: data[index]?.weight || 0
    }));
  };

  const normalizedCorteData = normalizeData(corteData);
  const normalizedSoldaData = normalizeData(soldaData);
  const normalizedMontagemData = normalizeData(montagemData);

  return (
    <div style={{ fontFamily: 'Inter, sans-serif' }} className="h-full">
      <div 
        className="flex justify-evenly items-end h-full p-4 pt-6 pb-6 rounded-lg"
        style={{ height: '200px' }}
      >
        {/* Grupo Corte */}
        <div className="flex flex-col justify-end items-center h-full flex-1">
          <div 
            className="flex items-end justify-center w-full gap-1"
            style={{ height: '120px' }}
          >
            {normalizedCorteData.map((data, index) => {
              const colors = ['#f97316', '#10b981', '#ec4899']; // orange, green, pink
              const labels = ['7-15d', 'ult.7d', 'prev.7d'];
              return (
                <div
                  key={index}
                  className="relative transition-all duration-500"
                  style={{
                    width: '20px',
                    height: `${calculateHeight(data.weight)}%`,
                    backgroundColor: colors[index],
                    borderRadius: '4px 4px 0 0'
                  }}
                >
                  <div 
                    className="absolute w-full text-center text-xs font-semibold text-foreground"
                    style={{ 
                      top: '-20px',
                      fontSize: '10px',
                      lineHeight: '1.2'
                    }}
                  >
                    {formatValue(data.weight)}
                  </div>
                  <div 
                    className="absolute w-full text-center text-foreground whitespace-nowrap"
                    style={{ 
                      bottom: '-18px',
                      fontSize: '9px'
                    }}
                  >
                    {labels[index]}
                  </div>
                </div>
              );
            })}
          </div>
          <div 
            className="mt-4 text-muted-foreground font-medium"
            style={{ fontSize: '11px' }}
          >
            Corte
          </div>
        </div>

        {/* Grupo Solda */}
        <div className="flex flex-col justify-end items-center h-full flex-1">
          <div 
            className="flex items-end justify-center w-full gap-1"
            style={{ height: '120px' }}
          >
            {normalizedSoldaData.map((data, index) => {
              const colors = ['#f97316', '#10b981', '#ec4899']; // orange, green, pink
              const labels = ['7-15d', 'ult.7d', 'prev.7d'];
              return (
                <div
                  key={index}
                  className="relative transition-all duration-500"
                  style={{
                    width: '20px',
                    height: `${calculateHeight(data.weight)}%`,
                    backgroundColor: colors[index],
                    borderRadius: '4px 4px 0 0'
                  }}
                >
                  <div 
                    className="absolute w-full text-center text-xs font-semibold text-foreground"
                    style={{ 
                      top: '-20px',
                      fontSize: '10px',
                      lineHeight: '1.2'
                    }}
                  >
                    {formatValue(data.weight)}
                  </div>
                  <div 
                    className="absolute w-full text-center text-foreground whitespace-nowrap"
                    style={{ 
                      bottom: '-18px',
                      fontSize: '9px'
                    }}
                  >
                    {labels[index]}
                  </div>
                </div>
              );
            })}
          </div>
          <div 
            className="mt-4 text-muted-foreground font-medium"
            style={{ fontSize: '11px' }}
          >
            Solda
          </div>
        </div>

        {/* Grupo Montagem */}
        <div className="flex flex-col justify-end items-center h-full flex-1">
          <div 
            className="flex items-end justify-center w-full gap-1"
            style={{ height: '120px' }}
          >
            {normalizedMontagemData.map((data, index) => {
              const colors = ['#f97316', '#10b981', '#ec4899']; // orange, green, pink
              const labels = ['7-15d', 'ult.7d', 'prev.7d'];
              return (
                <div
                  key={index}
                  className="relative transition-all duration-500"
                  style={{
                    width: '20px',
                    height: `${calculateHeight(data.weight)}%`,
                    backgroundColor: colors[index],
                    borderRadius: '4px 4px 0 0'
                  }}
                >
                  <div 
                    className="absolute w-full text-center text-xs font-semibold text-foreground"
                    style={{ 
                      top: '-20px',
                      fontSize: '10px',
                      lineHeight: '1.2'
                    }}
                  >
                    {formatValue(data.weight)}
                  </div>
                  <div 
                    className="absolute w-full text-center text-foreground whitespace-nowrap"
                    style={{ 
                      bottom: '-18px',
                      fontSize: '9px'
                    }}
                  >
                    {labels[index]}
                  </div>
                </div>
              );
            })}
          </div>
          <div 
            className="mt-4 text-muted-foreground font-medium"
            style={{ fontSize: '11px' }}
          >
            Mont. Obra
          </div>
        </div>
      </div>
    </div>
  );
};
