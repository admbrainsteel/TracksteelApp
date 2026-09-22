import React from 'react';
import { UsuarioMatriz, GrupoRecurso } from '@/hooks/useMatrizAcessos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Shield, Sparkles, User, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MatrizGridProps {
  usuarios: UsuarioMatriz[];
  grupos: GrupoRecurso[];
  onTogglePermissao: (userId: string, resourceKey: string) => void;
  onOpenTemplates: (user: UsuarioMatriz) => void;
}

export const MatrizGrid: React.FC<MatrizGridProps> = ({
  usuarios,
  grupos,
  onTogglePermissao,
  onOpenTemplates,
}) => {
  // Cores de fundo e borda para os grupos
  const corGrupoHeader: Record<string, string> = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    teal: 'bg-teal-500/10 text-teal-400 border-teal-500/30',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-left border-collapse min-w-[900px]">
          {/* CABEÇALHO DE GRUPOS DE MÓDULOS */}
          <thead>
            <tr className="border-b border-border/80 bg-muted/40">
              <th className="p-3 w-[260px] sticky left-0 bg-card z-20 border-r border-border/60">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Usuário / Colaborador
                </span>
              </th>

              {grupos.map((grupo) => (
                <th
                  key={grupo.key}
                  colSpan={grupo.recursos.length}
                  className={`p-2.5 text-center border-r border-border/40 text-xs font-bold ${corGrupoHeader[grupo.cor]}`}
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>{grupo.titulo}</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-80 block truncate">
                    {grupo.descricao}
                  </span>
                </th>
              ))}
            </tr>

            {/* SUB-CABEÇALHO: CADA TELA/RECURSO ESPECÍFICO */}
            <tr className="border-b border-border bg-muted/20 text-[11px] text-muted-foreground">
              <th className="p-2.5 sticky left-0 bg-card z-20 border-r border-border/60 font-semibold">
                Perfil & Templates
              </th>

              {grupos.map((grupo) =>
                grupo.recursos.map((rec) => (
                  <th
                    key={rec.key}
                    className="p-2 text-center border-r border-border/30 font-medium whitespace-nowrap min-w-[110px]"
                    title={rec.nome}
                  >
                    <span className="truncate block max-w-[120px] mx-auto">
                      {rec.nome}
                    </span>
                  </th>
                ))
              )}
            </tr>
          </thead>

          {/* LINHAS: UM USUÁRIO POR LINHA */}
          <tbody className="divide-y divide-border/40 text-xs">
            {usuarios.length === 0 ? (
              <tr>
                <td colSpan={25} className="py-12 text-center text-muted-foreground text-xs">
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              usuarios.map((user) => (
                <tr
                  key={user.id}
                  className="hover:bg-muted/30 transition-colors group"
                >
                  {/* Coluna Fixa do Usuário */}
                  <td className="p-3 sticky left-0 bg-card z-10 border-r border-border/60 group-hover:bg-accent/40 transition-colors">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-8 w-8 rounded-lg border border-border">
                          <AvatarImage src={user.profileImageUrl || ''} />
                          <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-bold">
                            {user.fullName.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate text-xs" title={user.fullName}>
                            {user.fullName}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate" title={user.email}>
                            {user.functionName}
                          </p>
                        </div>
                      </div>

                      {/* Botão de Template em 1 Clique */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onOpenTemplates(user)}
                        className="h-7 px-2 text-[10px] font-semibold text-primary hover:bg-primary/10"
                        title="Aplicar template pré-configurado"
                      >
                        <Sparkles className="h-3 w-3 mr-1 text-primary" />
                        Template
                      </Button>
                    </div>
                  </td>

                  {/* Células Clicáveis da Matriz */}
                  {grupos.map((grupo) =>
                    grupo.recursos.map((rec) => {
                      const temAcesso = user.recursosPermitidos.has(rec.key);

                      return (
                        <td
                          key={`${user.id}_${rec.key}`}
                          className="p-1.5 text-center border-r border-border/30"
                        >
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => onTogglePermissao(user.id, rec.key)}
                                  className={`w-full py-1.5 rounded-lg font-medium text-xs flex items-center justify-center transition-all ${
                                    temAcesso
                                      ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                                      : 'bg-muted/40 text-muted-foreground/40 hover:bg-muted/70 hover:text-muted-foreground border border-transparent'
                                  }`}
                                >
                                  {temAcesso ? (
                                    <Check className="h-4 w-4 stroke-[2.5]" />
                                  ) : (
                                    <X className="h-3.5 w-3.5 opacity-40" />
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p className="font-bold">{rec.nome}</p>
                                <p className="text-muted-foreground">
                                  {temAcesso ? 'Clique para Bloquear' : 'Clique para Liberar'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </td>
                      );
                    })
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
