
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboardProducaoOtimizado } from '@/hooks/useDashboardProducaoOtimizado';
import { useProcessChartData } from '@/hooks/useProcessChartData';
import { ProcessChart } from './ProcessChart';

interface OFData {
  num_of: string;
  descritivo?: string;
  peso_total?: number;
  data_prazo?: string;
}

interface OFCardProps {
  ofData: OFData;
}

export const OFCard: React.FC<OFCardProps> = ({ ofData }) => {
  const { dashboardData, loading } = useDashboardProducaoOtimizado(ofData.num_of);
  const { chartData, loading: chartLoading } = useProcessChartData(ofData.num_of);

  if (loading) {
    return (
      <Card className="h-[580px] border-2">
        <CardContent className="p-3 flex items-center justify-center h-full">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground text-sm">Carregando dados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dashboardData) {
    return (
      <Card className="h-[580px] border-2">
        <CardContent className="p-3 flex items-center justify-center h-full">
          <p className="text-muted-foreground text-sm">Dados não disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusInfo = () => {
    const progressoReal = dashboardData.progressoGeral;
    
    // Calcular dias restantes se houver data de prazo
    let diasRestantes = null;
    if (ofData.data_prazo) {
      const hoje = new Date();
      const prazo = new Date(ofData.data_prazo);
      const diffTime = prazo.getTime() - hoje.getTime();
      diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    // Determinar status baseado no progresso e prazo
    if (progressoReal >= 95) {
      return { 
        status: 'Concluído', 
        variant: 'default' as const, 
        color: 'bg-green-500',
        borderColor: 'border-green-500'
      };
    } else if (diasRestantes !== null && diasRestantes < 0) {
      return { 
        status: 'Atrasado', 
        variant: 'destructive' as const, 
        color: 'bg-red-500',
        borderColor: 'border-red-500'
      };
    } else if (progressoReal > 80) {
      return { 
        status: 'Adiantado', 
        variant: 'secondary' as const, 
        color: 'bg-blue-500',
        borderColor: 'border-blue-500'
      };
    } else if (diasRestantes !== null && diasRestantes <= 7) {
      return { 
        status: 'Muito Atrasado', 
        variant: 'destructive' as const, 
        color: 'bg-orange-500',
        borderColor: 'border-orange-500'
      };
    } else {
      return { 
        status: 'No Prazo', 
        variant: 'outline' as const, 
        color: 'bg-green-500',
        borderColor: 'border-green-500'
      };
    }
  };

  // Função para obter a cor da borda baseada no status do processo "Concluído"
  const getCardBorderColor = () => {
    const processoConcluido = dashboardData.processos.find(p => 
      p.nome.toLowerCase().includes('concluído') || p.nome.toLowerCase().includes('concluido')
    );
    
    if (!processoConcluido) return 'border-gray-500';
    
    switch (processoConcluido.status) {
      case 'verde':
        return 'border-green-500';
      case 'amarelo':  
        return 'border-yellow-500';
      case 'vermelho':
        return 'border-red-500';
      case 'azul':
        return 'border-blue-500';
      default:
        return 'border-gray-500';
    }
  };

  const getProcessStatusColor = (status: string) => {
    switch (status) {
      case 'verde':
        return '#10b981'; // Verde - Adiantado/No Prazo
      case 'amarelo':
        return '#f59e0b'; // Amarelo - Atenção
      case 'vermelho':
        return '#ef4444'; // Vermelho - Atrasado
      case 'azul':
        return '#3b82f6'; // Azul - No Prazo/Atenção
      default:
        return '#6b7280'; // Cinza - Padrão
    }
  };

  const getProcessBorderColor = (processName: string) => {
    const processo = dashboardData.processos.find(p => 
      p.nome.toLowerCase().includes(processName.toLowerCase())
    );
    
    if (!processo) return 'border-gray-500';
    
    switch (processo.status) {
      case 'verde':
        return 'border-green-500';
      case 'amarelo':
        return 'border-yellow-500';
      case 'vermelho':
        return 'border-red-500';
      case 'azul':
        return 'border-blue-500';
      default:
        return 'border-gray-500';
    }
  };

  const statusInfo = getStatusInfo();
  const progressoReal = dashboardData.progressoGeral;
  const pesoFabricado = (dashboardData.pesoTotalFabricado / 1000).toFixed(1);
  const pesoTotal = (dashboardData.tonelagem / 1000).toFixed(1);
  const cardBorderColor = getCardBorderColor();

  // Pegar os principais processos para mostrar (incluindo Montagem - 6 processos)
  const processosVisiveis = dashboardData.processos
    .filter(p => !p.nome.toLowerCase().includes('aceite') && 
                 !p.nome.toLowerCase().includes('db') && 
                 !p.nome.toLowerCase().includes('concluído') &&
                 !p.nome.toLowerCase().includes('concluido'))
    .slice(0, 6); // Mostrar 6 processos

  console.log('Dados dos gráficos no OFCard:', chartData);
  console.log('Loading dos gráficos:', chartLoading);

  return (
    <Card className={`h-[580px] border-2 ${cardBorderColor} transition-all hover:shadow-lg`}>
      <CardContent className="p-3 h-full flex flex-col">
        {/* Header do Card - Mais compactado */}
        <div className="mb-2">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-lg font-bold text-foreground">{ofData.num_of}</h3>
            <Badge variant={statusInfo.variant} className="text-xs px-2 py-0.5">
              {statusInfo.status}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-foreground">
                {progressoReal.toFixed(1)}%
              </span>
              <span className="text-xs text-muted-foreground">
                {pesoFabricado}t de {pesoTotal}t fabricado
              </span>
            </div>
            
            <div className="w-full bg-secondary rounded-full h-1.5">
              <div 
                className={`h-1.5 rounded-full ${statusInfo.color} transition-all duration-300`}
                style={{ width: `${Math.min(progressoReal, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Resumo dos Processos - Layout Grid 2x3 mais compacto */}
        <div className="mb-2">
          <h4 className="text-xs font-semibold text-foreground mb-1">
            Resumo Comparativo dos Processos
          </h4>
          
          {/* Grid 2x3 para os processos - mais compacto */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-1">
            {processosVisiveis.map((processo) => (
              <div key={processo.id} className="space-y-0.5">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-medium text-foreground truncate pr-1">
                    {processo.nome}
                  </span>
                  <span className="text-[7px] text-muted-foreground whitespace-nowrap">
                    {processo.progressoReal.toFixed(0)}%
                  </span>
                </div>
                
                <div className="space-y-0.5">
                  {/* Barra Planejado */}
                  <div className="flex items-center gap-1">
                    <span className="text-[6px] text-muted-foreground w-5">Plan</span>
                    <div className="flex-1 bg-secondary rounded-full h-0.5">
                      <div 
                        className="h-0.5 rounded-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${Math.min(processo.progressoEsperado, 100)}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Barra Real */}
                  <div className="flex items-center gap-1">
                    <span className="text-[6px] text-muted-foreground w-5">Real</span>
                    <div className="flex-1 bg-secondary rounded-full h-0.5">
                      <div 
                        className="h-0.5 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(processo.progressoReal, 100)}%`,
                          backgroundColor: getProcessStatusColor(processo.status)
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Título dos Gráficos */}
        <div className="mb-2">
          <h4 className="text-xs font-semibold text-foreground text-center">
            Gráfico de evolução/metas da quinzena
          </h4>
        </div>

        {/* Gráficos nos Retângulos com Bordas Coloridas */}
        <div className="flex-1 space-y-2 min-h-0">
          {/* Retângulo Corte - Borda vermelha */}
          <div className={`flex-1 bg-background rounded border-2 ${getProcessBorderColor('corte')} p-2`} 
               style={{ minHeight: '90px', maxHeight: '110px' }}>
            {chartLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-foreground text-xs">Carregando...</span>
              </div>
            ) : (
              <ProcessChart 
                processName="Corte (Kg)" 
                data={chartData.corte || []} 
                color="#dc2626" 
              />
            )}
          </div>

          {/* Retângulo Solda - Borda azul */}
          <div className={`flex-1 bg-background rounded border-2 ${getProcessBorderColor('solda')} p-2`} 
               style={{ minHeight: '90px', maxHeight: '110px' }}>
            {chartLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-foreground text-xs">Carregando...</span>
              </div>
            ) : (
              <ProcessChart 
                processName="Solda (Kg)" 
                data={chartData.solda || []} 
                color="#2563eb" 
              />
            )}
          </div>

          {/* Retângulo Montagem - Borda rosa */}
          <div className={`flex-1 bg-background rounded border-2 ${getProcessBorderColor('montagem')} p-2`} 
               style={{ minHeight: '90px', maxHeight: '110px' }}>
            {chartLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-foreground text-xs">Carregando...</span>
              </div>
            ) : (
              <ProcessChart 
                processName="Mont.Obra (Kg)" 
                data={chartData.montagem || []} 
                color="#db2777" 
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
