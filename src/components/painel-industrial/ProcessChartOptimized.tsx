
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
    <div style={{ fontFamily: 'Inter, sans-serif' }} className="h-full flex flex-col pt-2 pb-3">
      {/* Legenda Global */}
      <div className="flex justify-center gap-4 text-[10px] sm:text-xs text-muted-foreground mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-[#f97316] rounded-sm shadow-sm"></div> 
          <span className="font-medium">7 a 15 dias</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-[#10b981] rounded-sm shadow-sm"></div> 
          <span className="font-medium">Últimos 7 dias</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-[#ec4899] rounded-sm shadow-sm"></div> 
          <span className="font-medium">Meta (Próx. 7d)</span>
        </div>
      </div>

      <div 
        className="flex justify-evenly items-end h-full px-2"
        style={{ minHeight: '130px' }}
      >
        {[
          { title: 'Corte', data: normalizedCorteData },
          { title: 'Solda', data: normalizedSoldaData },
          { title: 'Montagem', data: normalizedMontagemData }
        ].map((group, groupIdx) => (
          <div key={groupIdx} className="flex flex-col justify-end items-center h-full flex-1">
            <div 
              className="flex items-end justify-center w-full gap-1.5 sm:gap-2"
              style={{ height: '100px' }}
            >
              {group.data.map((data, index) => {
                const colors = ['#f97316', '#10b981', '#ec4899']; // orange, green, pink
                return (
                  <div
                    key={index}
                    className="relative transition-all duration-500 shadow-sm"
                    style={{
                      width: '24px',
                      height: `${calculateHeight(data.weight)}%`,
                      backgroundColor: colors[index],
                      borderRadius: '4px 4px 0 0'
                    }}
                  >
                    <div 
                      className="absolute w-full text-center font-bold text-foreground"
                      style={{ 
                        top: '-22px',
                        fontSize: '11px',
                        lineHeight: '1.2'
                      }}
                    >
                      {formatValue(data.weight)}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 text-foreground font-semibold text-xs sm:text-sm border-t border-border pt-2 w-4/5 text-center">
              {group.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
