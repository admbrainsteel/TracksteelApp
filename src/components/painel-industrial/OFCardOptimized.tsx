import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useDashboardProducaoOtimizado } from '@/hooks/useDashboardProducaoOtimizado';
import { useProcessChartData } from '@/hooks/useProcessChartData';
import { ProcessChartOptimized } from './ProcessChartOptimized';

interface OFData {
  num_of: string;
  descritivo?: string;
  peso_total?: number;
  data_prazo?: string;
}

interface OFCardOptimizedProps {
  ofData: OFData;
}

export const OFCardOptimized: React.FC<OFCardOptimizedProps> = ({ ofData }) => {
  const { dashboardData, loading } = useDashboardProducaoOtimizado(ofData.num_of);
  const { chartData, loading: chartLoading } = useProcessChartData(ofData.num_of);

  if (loading) {
    return (
      <Card className="h-auto min-h-[700px] border-2">
        <CardContent className="p-6 flex items-center justify-center h-full">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Carregando dados...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!dashboardData) {
    return (
      <Card className="h-auto min-h-[700px] border-2">
        <CardContent className="p-6 flex items-center justify-center h-full">
          <p className="text-muted-foreground">Dados não disponíveis</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusInfo = () => {
    const progressoReal = dashboardData.progressoGeral;
    
    let diasRestantes = null;
    if (ofData.data_prazo) {
      const hoje = new Date();
      const prazo = new Date(ofData.data_prazo);
      const diffTime = prazo.getTime() - hoje.getTime();
      diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

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
        return '#10b981';
      case 'amarelo':
        return '#f59e0b';
      case 'vermelho':
        return '#ef4444';
      case 'azul':
        return '#3b82f6';
      default:
        return '#6b7280';
    }
  };

  // Função para abreviar nomes de processos
  const abreviarNomeProcesso = (nome: string) => {
    return nome
      .replace(/Detalhamento/gi, 'Detalham')
      .replace(/Pintura\/Galv/gi, 'Pint/Galv');
  };

  const statusInfo = getStatusInfo();
  const progressoReal = dashboardData.progressoGeral;
  const pesoFabricado = (dashboardData.pesoTotalFabricado).toFixed(0);
  const pesoTotal = (dashboardData.tonelagem).toFixed(0);
  const cardBorderColor = getCardBorderColor();

  // Pegar os principais processos para mostrar
  const processosVisiveis = dashboardData.processos
    .filter(p => !p.nome.toLowerCase().includes('aceite') && 
                 !p.nome.toLowerCase().includes('db') && 
                 !p.nome.toLowerCase().includes('concluído') &&
                 !p.nome.toLowerCase().includes('concluido'))
    .slice(0, 6);

  return (
    <Card className={`h-auto min-h-[720px] border-2 ${cardBorderColor} transition-all hover:shadow-lg bg-card text-card-foreground shadow-lg ${cardBorderColor.replace('border-', 'shadow-')}/10`}>
      <CardContent className="p-4 sm:p-6 h-full flex flex-col gap-3 sm:gap-4">
        {/* Header do Card - Responsivo */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0">
          <div className="w-full sm:w-auto">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground" style={{ fontSize: 'clamp(2rem, 4vw, 3rem)' }}>
              {ofData.num_of}
            </h2>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              {pesoFabricado} Kg de {pesoTotal} Kg fabricado
            </p>
          </div>
          <Badge variant={statusInfo.variant} className="text-xs px-3 py-1 self-start sm:self-auto">
            {statusInfo.status}
          </Badge>
        </div>

        {/* Barra de Progresso - Espaçamento reduzido */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-sm sm:text-base font-medium text-foreground" style={{ fontSize: 'clamp(0.875rem, 2vw, 1rem)' }}>
              Progresso
            </span>
            <span className="text-sm font-medium text-foreground">{progressoReal.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${statusInfo.color} transition-all duration-300`}
              style={{ width: `${Math.min(progressoReal, 100)}%` }}
            />
          </div>
        </div>

        {/* Resumo Comparativo dos Processos - Layout Responsivo com espaçamento reduzido */}
        <div className="space-y-2">
          <div className="flex items-center justify-between border-b border-border pb-1">
            <h3 className="text-base sm:text-lg font-semibold text-foreground" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)' }}>
              Resumo Comparativo dos Processos
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground" title="Legenda: Azul = Adiantado | Verde = No Prazo/Concluído | Amarelo = Atenção | Vermelho = Atrasado">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
          </div>
          {/* Grid responsivo: 1 coluna em mobile, 2 colunas em telas maiores */}
          <div className="
            grid grid-cols-1 
            sm:grid-cols-2 
            gap-x-4 sm:gap-x-6 
            gap-y-2 sm:gap-y-3 
            text-sm
          ">
            {processosVisiveis.map((processo) => (
              <div key={processo.id} className="w-full">
                <div className="flex justify-between items-center mb-1">
                  <span 
                    className="text-muted-foreground text-xs sm:text-sm break-words" 
                    style={{ 
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word',
                      fontSize: 'clamp(0.75rem, 1.8vw, 0.875rem)'
                    }}
                  >
                    {abreviarNomeProcesso(processo.nome)}
                  </span>
                  <span 
                    className={`font-bold ml-2 ${
                      processo.status === 'verde' ? 'text-green-400' :
                      processo.status === 'amarelo' ? 'text-yellow-400' :
                      processo.status === 'vermelho' ? 'text-red-400' :
                      processo.status === 'azul' ? 'text-blue-400' : 'text-gray-400'
                    }`}
                    style={{ fontSize: 'clamp(0.55rem, 1.2vw, 0.65rem)' }}
                  >
                    {processo.progressoReal.toFixed(0)}% ({(processo.pesoFabricado).toFixed(0)} Kg)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 mt-1">
                  <div 
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(processo.progressoReal, 100)}%`,
                      backgroundColor: getProcessStatusColor(processo.status)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico de Evolução - Responsivo com espaçamento reduzido */}
        <div className="flex-1 min-h-0">
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-1" style={{ fontSize: 'clamp(1rem, 2.5vw, 1.125rem)' }}>
            Evolução/Metas da Quinzena (Kg)
          </h3>
          <div className="h-full min-h-[200px] sm:min-h-[250px] border border-border rounded-lg bg-background/50 mb-1">
            {chartLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="text-muted-foreground text-sm">Carregando gráfico...</span>
              </div>
            ) : (
              <ProcessChartOptimized 
                corteData={chartData.corte || []}
                soldaData={chartData.solda || []}
                montagemData={chartData.montagem || []}
              />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
