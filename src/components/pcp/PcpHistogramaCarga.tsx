import React, { useState, useMemo } from 'react';
import { CargaPeriodoProcesso } from '@/hooks/usePcpAnalysis';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, AlertOctagon, CheckCircle2, TrendingUp } from 'lucide-react';

interface PcpHistogramaCargaProps {
  dadosCarga: CargaPeriodoProcesso[];
}

export const PcpHistogramaCarga: React.FC<PcpHistogramaCargaProps> = ({ dadosCarga }) => {
  const [processoFiltro, setProcessoFiltro] = useState<string>('todos');

  // Obter lista única de processos presentes nos dados
  const listaProcessos = useMemo(() => {
    const set = new Set<string>();
    dadosCarga.forEach((d) => set.add(d.processoNome));
    return Array.from(set);
  }, [dadosCarga]);

  // Consolidar dados para o gráfico
  const dadosGrafico = useMemo(() => {
    if (processoFiltro === 'todos') {
      // Agrupar todas as semanas somando as toneladas
      const mapSemana: Record<string, any> = {};
      dadosCarga.forEach((d) => {
        if (!mapSemana[d.semanaKey]) {
          mapSemana[d.semanaKey] = {
            semana: d.semanaKey,
            cargaTon: 0,
            capacidadeTon: 0,
            ofDetalhes: [] as { num_of: string; kg: number }[],
          };
        }
        mapSemana[d.semanaKey].cargaTon += d.cargaKg / 1000;
        mapSemana[d.semanaKey].capacidadeTon += d.capacidadeRealKg / 1000;
        d.ofDetalhes.forEach((det) => {
          const ex = mapSemana[d.semanaKey].ofDetalhes.find((x: any) => x.num_of === det.num_of);
          if (ex) ex.kg += det.kg;
          else mapSemana[d.semanaKey].ofDetalhes.push({ ...det });
        });
      });

      return Object.values(mapSemana).map((item: any) => {
        const perc = item.capacidadeTon > 0 ? Math.round((item.cargaTon / item.capacidadeTon) * 100) : 0;
        return {
          semana: item.semana,
          cargaTon: Number(item.cargaTon.toFixed(2)),
          capacidadeTon: Number(item.capacidadeTon.toFixed(2)),
          ocupacaoPercent: perc,
          ofDetalhes: item.ofDetalhes,
        };
      });
    } else {
      // Filtrar pelo processo específico
      return dadosCarga
        .filter((d) => d.processoNome === processoFiltro)
        .map((d) => ({
          semana: d.semanaKey,
          cargaTon: Number((d.cargaKg / 1000).toFixed(2)),
          capacidadeTon: Number((d.capacidadeRealKg / 1000).toFixed(2)),
          ocupacaoPercent: d.percentualOcupacao,
          ofDetalhes: d.ofDetalhes,
        }));
    }
  }, [dadosCarga, processoFiltro]);

  // Identificar capacidade média de referência para desenhar linha
  const capacidadeReferenciaTon = dadosGrafico.length > 0 ? dadosGrafico[0].capacidadeTon : 20;

  // Total de semanas em sobrecarga
  const semanasGargalo = dadosGrafico.filter((d) => d.ocupacaoPercent > 100).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-sm">
      {/* Header do Gráfico */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
              <BarChart3 className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-base md:text-lg text-foreground">
              Histograma de Carga Acumulada vs Capacidade Fabril
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Distribuição temporal da demanda (toneladas por semana) somando as OFs em análise contra o teto da fábrica.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {semanasGargalo > 0 ? (
            <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs px-2.5 py-1 flex items-center gap-1.5 font-semibold">
              <AlertOctagon className="h-3.5 w-3.5" />
              {semanasGargalo} {semanasGargalo === 1 ? 'Semana em Sobrecarga' : 'Semanas em Sobrecarga'}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 flex items-center gap-1.5 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Capacidade Equilibrada
            </Badge>
          )}

          <Select value={processoFiltro} onValueChange={setProcessoFiltro}>
            <SelectTrigger className="w-[160px] text-xs h-9">
              <SelectValue placeholder="Filtrar Processo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Processos</SelectItem>
              {listaProcessos.map((proc) => (
                <SelectItem key={proc} value={proc}>
                  {proc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Área do Gráfico */}
      {dadosGrafico.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground text-xs">
          Nenhum dado de carga para as OFs selecionadas. Arraste ordens para a mesa tática.
        </div>
      ) : (
        <div className="h-[280px] md:h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dadosGrafico} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
              <XAxis
                dataKey="semana"
                tick={{ fontSize: 11, fill: '#888888' }}
                axisLine={{ stroke: '#ffffff20' }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#888888' }}
                axisLine={{ stroke: '#ffffff20' }}
                unit=" t"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border border-border rounded-xl p-3 shadow-xl text-xs space-y-1.5 min-w-[200px]">
                        <p className="font-bold text-foreground border-b border-border/60 pb-1">
                          {data.semana}
                        </p>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Demanda Acumulada:</span>
                          <span className="font-bold text-sky-400">{data.cargaTon} ton</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Capacidade Teto:</span>
                          <span className="font-medium text-foreground">{data.capacidadeTon} ton</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-muted-foreground">Taxa de Ocupação:</span>
                          <span
                            className={`font-bold ${
                              data.ocupacaoPercent > 100
                                ? 'text-rose-400'
                                : data.ocupacaoPercent > 80
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {data.ocupacaoPercent}%
                          </span>
                        </div>

                        {data.ofDetalhes && data.ofDetalhes.length > 0 && (
                          <div className="pt-2 border-t border-border/40 mt-1">
                            <span className="text-[10px] text-muted-foreground block mb-1 font-semibold">
                              Composição por OF:
                            </span>
                            {data.ofDetalhes.map((det: any) => (
                              <div key={det.num_of} className="flex justify-between text-[11px]">
                                <span>OF {det.num_of}:</span>
                                <span className="font-medium">{(det.kg / 1000).toFixed(1)} t</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={capacidadeReferenciaTon}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{
                  value: `Capacidade Teto (${capacidadeReferenciaTon} t)`,
                  fill: '#ef4444',
                  fontSize: 10,
                  position: 'top',
                }}
              />
              <Bar dataKey="cargaTon" radius={[6, 6, 0, 0]}>
                {dadosGrafico.map((entry, index) => {
                  let fillColor = '#10b981'; // Verde (normal)
                  if (entry.ocupacaoPercent > 100) {
                    fillColor = '#f43f5e'; // Vermelho (sobrecarga crítica)
                  } else if (entry.ocupacaoPercent >= 85) {
                    fillColor = '#f59e0b'; // Amarelo (atenção)
                  }
                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Legenda do Histograma */}
      <div className="mt-4 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-emerald-500" />
            <span>Capacidade Normal (&lt; 85%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-amber-500" />
            <span>Atenção (85% a 100%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-rose-500" />
            <span>Sobrecarga / Gargalo (&gt; 100%)</span>
          </div>
        </div>

        <div className="text-[11px] italic">
          * Linha tracejada vermelha representa a capacidade instalada da fábrica.
        </div>
      </div>
    </div>
  );
};
