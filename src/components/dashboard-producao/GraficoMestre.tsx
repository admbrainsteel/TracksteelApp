import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardProcesso } from '@/hooks/useDashboardProducaoOtimizado';
import { Button } from '@/components/ui/button';
import { Scale, Percent, FilterX } from 'lucide-react';

interface GraficoMestreProps {
  processos: DashboardProcesso[];
  onProcessoClick?: (processoNome: string) => void;
  processoSelecionado?: string | null;
}

// Ordem sequencial padrão de produção para ordenação linear
const ORDEM_PROCESSOS_LINEAR = [
  'detalhamento',
  'corte',
  'solda',
  'pintura/galv',
  'pintura',
  'galvanizacao',
  'expedicao',
  'expedição',
  'montagem',
  'aceite/db',
  'aceite',
  'concluido',
  'concluído'
];

// Paleta de cores vibrantes e distintas para cada processo
const CORES_PROCESSOS: Record<string, string> = {
  'detalhamento': '#a855f7', // Roxo / Purple
  'corte': '#3b82f6',        // Azul Royal
  'solda': '#f97316',        // Laranja Vibrante
  'pintura/galv': '#ec4899', // Rosa / Magenta
  'pintura': '#ec4899',      // Rosa
  'galvanizacao': '#ec4899', // Rosa
  'expedicao': '#06b6d4',    // Ciano
  'expedição': '#06b6d4',    // Ciano
  'montagem': '#14b8a6',     // Verde Água / Teal
  'aceite/db': '#6366f1',    // Índigo
  'aceite': '#6366f1',       // Índigo
  'concluido': '#10b981',    // Verde Esmeralda
  'concluído': '#10b981'     // Verde Esmeralda
};

// Paleta de fallback se houver processo fora do padrão
const CORES_FALLBACK = [
  '#a855f7', '#3b82f6', '#f97316', '#ec4899', 
  '#06b6d4', '#14b8a6', '#6366f1', '#10b981', '#eab308'
];

export const GraficoMestre: React.FC<GraficoMestreProps> = ({ 
  processos, 
  onProcessoClick, 
  processoSelecionado: processoSelecionadoProp 
}) => {
  const [modoExibicao, setModoExibicao] = useState<'kg' | 'percent'>('kg');
  const [selectedProcessoInternal, setSelectedProcessoInternal] = useState<string | null>(null);

  const selectedProcesso = processoSelecionadoProp !== undefined ? processoSelecionadoProp : selectedProcessoInternal;

  const handleSelectProcesso = (nome: string) => {
    const nextSelected = selectedProcesso === nome ? null : nome;
    setSelectedProcessoInternal(nextSelected);
    if (onProcessoClick) {
      onProcessoClick(nextSelected || '');
    }
  };

  // 1. Ordenar processos na sequência linear real da produção
  const processosOrdenados = useMemo(() => {
    if (!processos) return [];

    return [...processos].sort((a, b) => {
      const nomeA = a.nome.toLowerCase().trim();
      const nomeB = b.nome.toLowerCase().trim();

      const indexA = ORDEM_PROCESSOS_LINEAR.findIndex(p => nomeA.includes(p));
      const indexB = ORDEM_PROCESSOS_LINEAR.findIndex(p => nomeB.includes(p));

      const posA = indexA !== -1 ? indexA : 99;
      const posB = indexB !== -1 ? indexB : 99;

      return posA - posB;
    });
  }, [processos]);

  // Função utilitária para pegar a cor de um processo
  const getCorProcesso = (nomeProcesso: string, index: number) => {
    const nomeLower = nomeProcesso.toLowerCase().trim();
    for (const [key, color] of Object.entries(CORES_PROCESSOS)) {
      if (nomeLower.includes(key)) return color;
    }
    return CORES_FALLBACK[index % CORES_FALLBACK.length];
  };

  // 2. Processar dados agregados por data
  const dadosGrafico = useMemo(() => {
    if (!processosOrdenados || processosOrdenados.length === 0) return [];

    const todasAsDatas = new Set<string>();
    processosOrdenados.forEach(processo => {
      processo.dadosGrafico.forEach(ponto => {
        todasAsDatas.add(ponto.data);
      });
    });

    const datasOrdenadas = Array.from(todasAsDatas).sort();

    return datasOrdenadas.map(data => {
      const dataFormatada = format(parseISO(data), 'dd/MM', { locale: ptBR });
      const pontoGrafico: any = {
        data: dataFormatada,
        dataCompleta: data
      };

      processosOrdenados.forEach(processo => {
        const pontoProcesso = processo.dadosGrafico.find(p => p.data === data);
        const valorKg = pontoProcesso ? pontoProcesso.realizado : 0;
        
        if (modoExibicao === 'percent') {
          const pesoTotal = processo.pesoTotal > 0 ? processo.pesoTotal : 1;
          const percentual = Math.min(100, (valorKg / pesoTotal) * 100);
          pontoGrafico[processo.nome] = Math.round(percentual * 10) / 10;
        } else {
          pontoGrafico[processo.nome] = Math.round(valorKg * 10) / 10;
        }
      });

      return pontoGrafico;
    });
  }, [processosOrdenados, modoExibicao]);

  // Formatação customizada para o Tooltip estilo Glassmorphism
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border shadow-2xl rounded-xl p-3 text-popover-foreground min-w-[200px] z-50">
        <div className="flex items-center justify-between border-b border-border/50 pb-2 mb-2">
          <span className="text-xs font-semibold text-muted-foreground">Data</span>
          <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-md">{label}</span>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => {
            const isHighlight = !selectedProcesso || selectedProcesso === entry.name;
            return (
              <div 
                key={`item-${index}`} 
                className={`flex items-center justify-between text-xs transition-opacity ${
                  isHighlight ? 'opacity-100 font-medium' : 'opacity-40'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="truncate max-w-[130px]">{entry.name}</span>
                </div>
                <span className="font-mono font-semibold ml-2">
                  {modoExibicao === 'kg' 
                    ? `${entry.value.toLocaleString('pt-BR')} kg`
                    : `${entry.value.toFixed(1)}%`
                  }
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 w-full">
      {/* Barra Superior de Controles */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-muted/40 p-2.5 rounded-lg border border-border/50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Métrica:</span>
          <div className="flex items-center bg-background border border-border rounded-md p-0.5">
            <Button
              type="button"
              variant={modoExibicao === 'kg' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setModoExibicao('kg')}
              className="h-7 text-xs px-2.5 gap-1.5"
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Quilogramas (kg)</span>
            </Button>
            <Button
              type="button"
              variant={modoExibicao === 'percent' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setModoExibicao('percent')}
              className="h-7 text-xs px-2.5 gap-1.5"
            >
              <Percent className="h-3.5 w-3.5" />
              <span>Porcentagem (%)</span>
            </Button>
          </div>
        </div>

        {selectedProcesso && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleSelectProcesso(selectedProcesso)}
            className="h-7 text-xs gap-1 border-dashed"
          >
            <FilterX className="h-3.5 w-3.5" />
            <span>Limpar seleção ({selectedProcesso})</span>
          </Button>
        )}
      </div>

      {/* Legenda Customizada em Ordem Linear Sequencial */}
      <div className="flex flex-wrap items-center justify-center gap-2 py-1">
        {processosOrdenados.map((processo, idx) => {
          const color = getCorProcesso(processo.nome, idx);
          const isSelected = selectedProcesso === processo.nome;
          const isDimmed = selectedProcesso && !isSelected;

          return (
            <button
              key={processo.id}
              type="button"
              onClick={() => handleSelectProcesso(processo.nome)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary text-primary-foreground border-primary font-semibold shadow-md scale-105'
                  : isDimmed
                  ? 'bg-muted/30 text-muted-foreground border-transparent opacity-40 hover:opacity-70'
                  : 'bg-muted/60 hover:bg-muted text-foreground border-border/60 hover:border-border'
              }`}
            >
              <span 
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" 
                style={{ backgroundColor: color }}
              />
              <span>{processo.nome}</span>
              <span className="text-[10px] opacity-75 font-mono">
                ({modoExibicao === 'kg' ? `${Math.round(processo.pesoFabricado)}kg` : `${processo.progressoReal.toFixed(0)}%`})
              </span>
            </button>
          );
        })}
      </div>

      {/* Container de Altura Fixa com minWidth=0 para EVITAR Avisos no Console */}
      <div className="w-full h-[380px] min-h-[380px] relative">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
          <LineChart
            data={dadosGrafico}
            margin={{ top: 15, right: 25, left: 10, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" />
            <XAxis 
              dataKey="data"
              stroke="currentColor"
              fontSize={11}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
            />
            <YAxis 
              stroke="currentColor"
              fontSize={11}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
              unit={modoExibicao === 'kg' ? ' kg' : '%'}
              tickFormatter={(val) => modoExibicao === 'kg' && val >= 1000 ? `${(val / 1000).toFixed(1)}k` : `${val}`}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {processosOrdenados.map((processo, idx) => {
              const color = getCorProcesso(processo.nome, idx);
              const isSelected = selectedProcesso === processo.nome;
              const isDimmed = selectedProcesso && !isSelected;

              return (
                <Line
                  key={processo.id}
                  type="monotone"
                  dataKey={processo.nome}
                  name={processo.nome}
                  stroke={color}
                  strokeWidth={isSelected ? 3.5 : isDimmed ? 1 : 2.5}
                  strokeOpacity={isDimmed ? 0.2 : 1}
                  dot={isSelected ? { fill: color, r: 4.5, strokeWidth: 2, stroke: '#fff' } : false}
                  activeDot={{ r: 6, fill: color, stroke: '#fff', strokeWidth: 2 }}
                  connectNulls
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
