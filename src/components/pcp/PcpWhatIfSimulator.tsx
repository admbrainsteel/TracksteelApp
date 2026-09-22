import React from 'react';
import { OfPcpCard, SimuladorConfig } from '@/hooks/usePcpAnalysis';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { RotateCcw, Sliders, Clock, Users, Calendar, ArrowRight } from 'lucide-react';

interface PcpWhatIfSimulatorProps {
  ofs: OfPcpCard[];
  simulador: SimuladorConfig;
  onSetHorasExtras: (processo: string, horas: number) => void;
  onSetEfetivoFator: (processo: string, fator: number) => void;
  onSetDeslocamentoOf: (numOf: string, dias: number) => void;
  onReset: () => void;
}

export const PcpWhatIfSimulator: React.FC<PcpWhatIfSimulatorProps> = ({
  ofs,
  simulador,
  onSetHorasExtras,
  onSetEfetivoFator,
  onSetDeslocamentoOf,
  onReset,
}) => {
  const processosPrincipais = ['Corte', 'Montagem', 'Solda', 'Pintura'];

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 md:p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-primary/20">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-primary/20 text-primary">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base md:text-lg text-foreground">
                Simulador Tático What-If (E se...?)
              </h3>
              <Badge variant="outline" className="text-xs border-primary/40 text-primary font-semibold">
                Simulação Ativa
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Faça testes de estresse, altere horas de turno, amplie equipes ou balanceie prazos de OFs em tempo real.
            </p>
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={onReset}
          className="text-xs h-8 border-border hover:bg-muted text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          Restaurar Padrão
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel 1: Ajuste de Recursos e Horas Extras */}
        <div className="space-y-4 bg-card/60 rounded-xl p-4 border border-border/50">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
            <Clock className="h-4 w-4 text-sky-400" />
            Capacidade de Turno & Horas Extras por Posto
          </h4>

          <div className="space-y-4 pt-1">
            {processosPrincipais.map((proc) => {
              const he = simulador.horasExtrasPorProcesso[proc] || 0;
              return (
                <div key={proc} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground">{proc}</span>
                    <span className="text-muted-foreground font-semibold">
                      {he === 0 ? 'Turno Padrão (8h)' : `+${he}h extras/dia (Total: ${8 + he}h)`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[he]}
                      min={0}
                      max={4}
                      step={1}
                      onValueChange={(val) => onSetHorasExtras(proc, val[0])}
                      className="flex-1"
                    />
                    <Badge variant="secondary" className="w-12 justify-center text-xs font-mono">
                      +{he}h
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Painel 2: Balanceamento e Deslocamento de Prazos entre OFs */}
        <div className="space-y-4 bg-card/60 rounded-xl p-4 border border-border/50">
          <h4 className="text-xs font-bold text-foreground flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
            <Calendar className="h-4 w-4 text-amber-400" />
            Nivelamento Temporal entre OFs (Deslocamento de Dias)
          </h4>

          {ofs.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Adicione OFs à mesa tática para simular reprogramação de prazos.
            </p>
          ) : (
            <div className="space-y-4 pt-1 max-h-[220px] overflow-y-auto pr-1">
              {ofs.map((of) => {
                const desloc = simulador.deslocamentoDiasOf[of.num_of] || 0;
                return (
                  <div key={of.num_of} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-foreground">OF {of.num_of}</span>
                        <span className="text-[10px] text-muted-foreground">
                          ({of.folgaDiasObra}d folga original)
                        </span>
                      </div>
                      <span className={`font-semibold ${desloc > 0 ? 'text-amber-400' : desloc < 0 ? 'text-sky-400' : 'text-muted-foreground'}`}>
                        {desloc === 0 ? 'Data Original' : desloc > 0 ? `+${desloc} dias (Dilatar)` : `${desloc} dias (Antecipar)`}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <Slider
                        value={[desloc]}
                        min={-15}
                        max={20}
                        step={1}
                        onValueChange={(val) => onSetDeslocamentoOf(of.num_of, val[0])}
                        className="flex-1"
                      />
                      <Badge variant="secondary" className="w-14 justify-center text-xs font-mono">
                        {desloc > 0 ? `+${desloc}d` : `${desloc}d`}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
