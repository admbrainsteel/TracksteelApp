import React from 'react';
import { RecomendacaoPcp } from '@/hooks/usePcpAnalysis';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Lightbulb,
  ArrowRightLeft,
  Users,
  Clock,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface PcpRecomendacoesPainelProps {
  recomendacoes: RecomendacaoPcp[];
  onAplicarSimulacao: (rec: RecomendacaoPcp) => void;
}

export const PcpRecomendacoesPainel: React.FC<PcpRecomendacoesPainelProps> = ({
  recomendacoes,
  onAplicarSimulacao,
}) => {
  const getIcone = (tipo: RecomendacaoPcp['tipo']) => {
    switch (tipo) {
      case 'nivelamento_prazo':
        return ArrowRightLeft;
      case 'rebalanceamento_equipe':
        return Users;
      case 'hora_extra':
        return Clock;
      case 'terceirizacao':
        return ExternalLink;
      default:
        return Lightbulb;
    }
  };

  const getNivelBadge = (nivel: RecomendacaoPcp['nivel']) => {
    switch (nivel) {
      case 'critico':
        return (
          <Badge variant="outline" className="border-rose-500/40 bg-rose-500/10 text-rose-400 text-[10px] font-semibold">
            Ação Prioritária
          </Badge>
        );
      case 'alerta':
        return (
          <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-400 text-[10px] font-semibold">
            Recomendação
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-400 text-[10px] font-semibold">
            Otimização
          </Badge>
        );
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-base md:text-lg text-foreground">
              Plano de Ação & Recomendações do PCP
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sugestões geradas pelo cruzamento de capacidade real, ritmo de apontamentos e datas de entrega em obra.
            </p>
          </div>
        </div>

        <Badge variant="secondary" className="font-bold text-xs">
          {recomendacoes.length} {recomendacoes.length === 1 ? 'Ação Sugerida' : 'Ações Sugeridas'}
        </Badge>
      </div>

      {recomendacoes.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-400 mb-2 opacity-80" />
          <p className="text-sm font-semibold text-foreground">
            Fluxo Perfeitamente Balanceado
          </p>
          <p className="text-xs text-muted-foreground max-w-md mt-1">
            As OFs selecionadas estão com demanda compatível com a capacidade instalada da fábrica e com datas confortáveis para a obra.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {recomendacoes.map((rec) => {
            const Icon = getIcone(rec.tipo);
            return (
              <div
                key={rec.id}
                className="group relative rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 p-4 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="font-bold text-xs md:text-sm text-foreground">
                        {rec.titulo}
                      </span>
                    </div>
                    {getNivelBadge(rec.nivel)}
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                    {rec.descricao}
                  </p>
                </div>

                <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2 mt-auto">
                  <span className="text-[11px] font-medium text-emerald-400/90 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    {rec.impactoEstimado}
                  </span>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAplicarSimulacao(rec)}
                    className="h-7 text-xs px-2.5 font-medium border-primary/30 text-primary hover:bg-primary/10"
                  >
                    Simular Impacto
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
