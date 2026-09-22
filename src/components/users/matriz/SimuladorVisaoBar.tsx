import React from 'react';
import { UsuarioMatriz, GrupoRecurso } from '@/hooks/useMatrizAcessos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, EyeOff, ShieldCheck, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';

interface SimuladorVisaoBarProps {
  usuarios: UsuarioMatriz[];
  grupos: GrupoRecurso[];
  usuarioSimuladoId: string | null;
  onSelectUsuarioSimulado: (id: string | null) => void;
}

export const SimuladorVisaoBar: React.FC<SimuladorVisaoBarProps> = ({
  usuarios,
  grupos,
  usuarioSimuladoId,
  onSelectUsuarioSimulado,
}) => {
  const usuarioSimulado = usuarios.find((u) => u.id === usuarioSimuladoId);

  // Total de módulos disponíveis
  const totalModulos = grupos.reduce((acc, g) => acc + g.recursos.length, 0);
  const totalPermitidos = usuarioSimulado ? usuarioSimulado.recursosPermitidos.size : 0;

  return (
    <div className="rounded-xl border border-border/80 bg-muted/30 p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Eye className="h-4 w-4" />
        </div>
        <div>
          <span className="font-bold text-foreground block">
            Simulador de Visão do Usuário
          </span>
          <span className="text-muted-foreground text-[11px]">
            Selecione um usuário para auditar instantaneamente o que ele enxerga no sistema.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <Select
          value={usuarioSimuladoId || 'nenhum'}
          onValueChange={(val) => onSelectUsuarioSimulado(val === 'nenhum' ? null : val)}
        >
          <SelectTrigger className="w-full sm:w-[220px] h-8 text-xs bg-background">
            <SelectValue placeholder="Selecione um usuário..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nenhum">Nenhum (Visão do Admin)</SelectItem>
            {usuarios.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {u.fullName} ({u.functionName})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {usuarioSimulado && (
          <>
            <Badge
              variant="outline"
              className={`h-7 px-2 border font-semibold flex items-center gap-1 ${
                usuarioSimulado.recursosPermitidos.has('modo-smart') && totalPermitidos <= 4
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-sky-500/40 bg-sky-500/10 text-sky-400'
              }`}
            >
              <CheckCircle2 className="h-3 w-3" />
              {usuarioSimulado.recursosPermitidos.has('modo-smart') && totalPermitidos <= 4
                ? 'Modo Smart Exclusivo'
                : `${totalPermitidos}/${totalModulos} Módulos`}
            </Badge>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => onSelectUsuarioSimulado(null)}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
