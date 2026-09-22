import React, { useMemo } from 'react';
import { OfPcpCard } from '@/hooks/usePcpAnalysis';
import { Badge } from '@/components/ui/badge';
import { Calendar, Flag, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface PcpMultiGanttProps {
  ofs: OfPcpCard[];
}

export const PcpMultiGantt: React.FC<PcpMultiGanttProps> = ({ ofs }) => {
  // Encontrar o menor início e maior término entre as OFs
  const { minDate, maxDate, totalDias } = useMemo(() => {
    if (ofs.length === 0) {
      const hoje = new Date();
      return { minDate: hoje, maxDate: new Date(hoje.getTime() + 30 * 86400000), totalDias: 30 };
    }

    let min = Infinity;
    let max = -Infinity;

    ofs.forEach((of) => {
      of.processos.forEach((p) => {
        const dIni = new Date(p.dataInicio).getTime();
        const dFim = new Date(p.dataFim).getTime();
        if (dIni < min) min = dIni;
        if (dFim > max) max = dFim;
      });
      if (of.dataEntregaObra) {
        const dObra = new Date(of.dataEntregaObra).getTime();
        if (dObra > max) max = dObra;
      }
    });

    if (min === Infinity || max === -Infinity) {
      const hoje = new Date();
      return { minDate: hoje, maxDate: new Date(hoje.getTime() + 30 * 86400000), totalDias: 30 };
    }

    // Adicionar margem de 3 dias antes e depois
    const dMin = new Date(min - 3 * 86400000);
    const dMax = new Date(max + 4 * 86400000);
    const diff = Math.max(1, Math.ceil((dMax.getTime() - dMin.getTime()) / 86400000));

    return { minDate: dMin, maxDate: dMax, totalDias: diff };
  }, [ofs]);

  // Função auxiliar para calcular percentual horizontal
  const getPercentualPosicao = (dateStr: string) => {
    if (!dateStr) return 0;
    const t = new Date(dateStr).getTime();
    const diff = t - minDate.getTime();
    const perc = (diff / (totalDias * 86400000)) * 100;
    return Math.max(0, Math.min(100, perc));
  };

  // Cores por tipo de processo industrial
  const coresProcesso: Record<string, string> = {
    'Corte': 'bg-blue-500/80 border-blue-400',
    'Furação': 'bg-indigo-500/80 border-indigo-400',
    'Montagem': 'bg-amber-500/80 border-amber-400',
    'Solda': 'bg-rose-500/80 border-rose-400',
    'Jateamento': 'bg-purple-500/80 border-purple-400',
    'Pintura': 'bg-teal-500/80 border-teal-400',
    'Expedição': 'bg-emerald-500/80 border-emerald-400',
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base md:text-lg text-foreground">
              Gantt Integrado Multi-OF & Prazos de Obra
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Visualização comparada do ciclo produtivo e marcos de atendimento na montagem da obra.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded bg-blue-500" /> Corte
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded bg-amber-500" /> Montagem
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded bg-rose-500" /> Solda
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded bg-teal-500" /> Pintura
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded bg-emerald-500" /> Expedição
          </span>
        </div>
      </div>

      {ofs.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground">
          Nenhuma OF na mesa de análise para exibir cronograma integrado.
        </div>
      ) : (
        <div className="space-y-6 overflow-x-auto">
          {/* Régua de Datas */}
          <div className="relative h-6 border-b border-border/60 text-[10px] text-muted-foreground flex justify-between min-w-[600px]">
            <span>{minDate.toLocaleDateString('pt-BR')}</span>
            <span>{new Date(minDate.getTime() + (totalDias / 2) * 86400000).toLocaleDateString('pt-BR')}</span>
            <span>{maxDate.toLocaleDateString('pt-BR')}</span>
          </div>

          {/* Raias por OF */}
          <div className="space-y-5 min-w-[600px]">
            {ofs.map((of) => {
              const marcoObraPerc = getPercentualPosicao(of.dataEntregaObra);

              return (
                <div key={of.id} className="space-y-2 border-b border-border/30 pb-4 last:border-0">
                  {/* Cabeçalho da Raia */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground">OF {of.num_of}</span>
                      <span className="text-muted-foreground text-[11px] truncate max-w-[200px]" title={of.descritivo}>
                        {of.descritivo}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-border">
                        {(of.pesoTotalKg / 1000).toFixed(1)} t
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 text-[11px]">
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Flag className="h-3 w-3 text-sky-400" />
                        Obra: {of.dataEntregaObra ? new Date(of.dataEntregaObra).toLocaleDateString('pt-BR') : 'N/D'}
                      </span>
                      <span
                        className={`font-semibold ${
                          of.folgaDiasObra < 0
                            ? 'text-rose-400'
                            : of.folgaDiasObra <= 5
                            ? 'text-amber-400'
                            : 'text-emerald-400'
                        }`}
                      >
                        {of.folgaDiasObra < 0
                          ? `Atraso: ${Math.abs(of.folgaDiasObra)} dias`
                          : `Folga: ${of.folgaDiasObra} dias`}
                      </span>
                    </div>
                  </div>

                  {/* Linha do Tempo / Barras dos Processos */}
                  <div className="relative h-9 bg-muted/30 rounded-xl border border-border/40 p-1 flex items-center overflow-hidden">
                    {/* Barras de cada processo */}
                    {of.processos.map((proc) => {
                      const left = getPercentualPosicao(proc.dataInicio);
                      const right = getPercentualPosicao(proc.dataFim);
                      const width = Math.max(2, right - left);
                      const corClass = coresProcesso[proc.nome] || 'bg-slate-500/80 border-slate-400';

                      return (
                        <div
                          key={proc.nome}
                          style={{
                            left: `${left}%`,
                            width: `${width}%`,
                          }}
                          title={`${proc.nome}: ${new Date(proc.dataInicio).toLocaleDateString('pt-BR')} até ${new Date(proc.dataFim).toLocaleDateString('pt-BR')} (${(proc.pesoKg / 1000).toFixed(1)} t)`}
                          className={`absolute h-6 rounded-md border text-[9px] font-semibold text-white flex items-center justify-center truncate px-1 shadow-sm transition-all hover:brightness-110 hover:z-10 ${corClass}`}
                        >
                          <span className="truncate">{proc.nome}</span>
                        </div>
                      );
                    })}

                    {/* Marcador de Entrega em Obra */}
                    {of.dataEntregaObra && (
                      <div
                        style={{ left: `${marcoObraPerc}%` }}
                        className="absolute top-0 bottom-0 w-0.5 bg-rose-500 z-20 flex flex-col items-center"
                        title={`Entrega Obra: ${new Date(of.dataEntregaObra).toLocaleDateString('pt-BR')}`}
                      >
                        <div className="w-2.5 h-2.5 bg-rose-500 rounded-full -mt-1 shadow" />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
