import React from 'react';
import { OfPcpCard } from '@/hooks/usePcpAnalysis';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, Scale, Clock, CheckCircle2, AlertTriangle, XCircle, GripVertical } from 'lucide-react';

interface PcpOfThumbnailProps {
  of: OfPcpCard;
  isSelected: boolean;
  onToggle: (numOf: string) => void;
  isCompact?: boolean;
}

export const PcpOfThumbnail: React.FC<PcpOfThumbnailProps> = ({
  of,
  isSelected,
  onToggle,
  isCompact = false,
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', of.num_of);
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const statusConfig = {
    no_prazo: {
      color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
      badge: 'No Prazo',
      icon: CheckCircle2,
    },
    atencao: {
      color: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
      badge: 'Alerta Prazo',
      icon: AlertTriangle,
    },
    critico: {
      color: 'border-rose-500/40 bg-rose-500/10 text-rose-400',
      badge: 'Gargalo/Risco',
      icon: XCircle,
    },
  }[of.status];

  const StatusIcon = statusConfig.icon;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onToggle(of.num_of)}
      className={`group relative rounded-xl border p-3.5 transition-all duration-200 cursor-pointer select-none ${
        isSelected
          ? 'border-primary ring-2 ring-primary/30 bg-primary/5 shadow-md shadow-primary/10'
          : 'border-border/60 bg-card hover:border-border hover:bg-accent/40 hover:shadow-sm'
      }`}
    >
      {/* Topo do Card */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <GripVertical className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors cursor-grab" />
          <span className="font-bold text-sm tracking-wide text-foreground">
            OF {of.num_of}
          </span>
        </div>
        <Badge
          variant="outline"
          className={`text-[10px] px-1.5 py-0.5 border font-medium flex items-center gap-1 ${statusConfig.color}`}
        >
          <StatusIcon className="h-3 w-3" />
          {statusConfig.badge}
        </Badge>
      </div>

      {/* Descritivo / Obra */}
      <p className="text-xs text-muted-foreground line-clamp-1 mb-3 font-normal" title={of.descritivo}>
        {of.descritivo}
      </p>

      {/* Métricas Principais */}
      <div className="grid grid-cols-2 gap-2 text-[11px] mb-3 bg-muted/30 rounded-lg p-2 border border-border/40">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Scale className="h-3.5 w-3.5 text-sky-400" />
          <span className="font-semibold text-foreground">
            {(of.pesoTotalKg / 1000).toFixed(1)} t
          </span>
        </div>
        <div className="flex items-center gap-1 text-muted-foreground justify-end">
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          <span className={of.folgaDiasObra < 0 ? 'text-rose-400 font-bold' : 'text-foreground'}>
            {of.folgaDiasObra < 0 ? `${Math.abs(of.folgaDiasObra)}d atraso` : `${of.folgaDiasObra}d folga`}
          </span>
        </div>
      </div>

      {/* Barra de Progresso Físico */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-[10px] text-muted-foreground">
          <span>Avanço Físico</span>
          <span className="font-semibold text-foreground">{of.progressoPercent}%</span>
        </div>
        <Progress value={of.progressoPercent} className="h-1.5" />
      </div>

      {/* Data Obra no rodapé */}
      {!isCompact && of.dataEntregaObra && (
        <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground/70" />
            Obra:
          </span>
          <span className="font-medium text-foreground">
            {new Date(of.dataEntregaObra).toLocaleDateString('pt-BR')}
          </span>
        </div>
      )}

      {/* Checkbox visual flutuante indicando seleção */}
      <div
        className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-transform ${
          isSelected
            ? 'bg-primary text-primary-foreground scale-100 shadow'
            : 'opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-75 bg-muted text-muted-foreground'
        }`}
      >
        ✓
      </div>
    </div>
  );
};
