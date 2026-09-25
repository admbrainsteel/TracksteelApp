import React from 'react';
import { UsuarioMatriz, GrupoRecurso, NivelAcesso } from '@/hooks/useMatrizAcessos';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, Eye, Edit3, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface MatrizGridProps {
  usuarios: UsuarioMatriz[];
  grupos: GrupoRecurso[];
  onToggleNivel: (userId: string, resourceKey: string, tipo: 'V' | 'C') => void;
  onOpenTemplates: (user: UsuarioMatriz) => void;
  onOpenSmartAvancado?: () => void;
}

export const MatrizGrid: React.FC<MatrizGridProps> = ({
  usuarios,
  grupos,
  onToggleNivel,
  onOpenTemplates,
  onOpenSmartAvancado,
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
        <table className="w-full text-left border-collapse min-w-[950px]">
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
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    <span>{grupo.titulo}</span>
                    {grupo.key === 'smart' && onOpenSmartAvancado && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={onOpenSmartAvancado}
                        className="h-6 px-2 py-0 text-[10px] bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-md font-semibold flex items-center gap-1 shadow-sm transition-transform active:scale-95"
                        title="Abrir Gestão Avançada de Privilégios e Notificações do Modo Smart"
                      >
                        <SlidersHorizontal className="h-3 w-3" />
                        Avançado
                      </Button>
                    )}
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
                    className="p-2 text-center border-r border-border/30 font-medium whitespace-nowrap min-w-[120px]"
                    title={rec.nome}
                  >
                    <span className="truncate block max-w-[125px] mx-auto">
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

                  {/* Células da Matriz com o Balão Duplo [ V ] [ C ] */}
                  {grupos.map((grupo) =>
                    grupo.recursos.map((rec) => {
                      const nivel: NivelAcesso = user.permissoesMap[rec.key] || 'nenhum';
                      const isVAtivo = nivel === 'visualizar' || nivel === 'criar';
                      const isCAtivo = nivel === 'criar';

                      return (
                        <td
                          key={`${user.id}_${rec.key}`}
                          className="p-1.5 text-center border-r border-border/30"
                        >
                          <TooltipProvider delayDuration={150}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                {/* O Balão Principal com 2 metades internas */}
                                <div
                                  className={`inline-flex items-center p-0.5 rounded-lg border transition-all ${
                                    isCAtivo
                                      ? 'border-emerald-500/40 bg-emerald-500/10 shadow-sm shadow-emerald-500/10'
                                      : isVAtivo
                                      ? 'border-sky-500/40 bg-sky-500/10 shadow-sm shadow-sky-500/10'
                                      : 'border-border/60 bg-muted/30 opacity-70'
                                  }`}
                                >
                                  {/* Botão Interno V (Visualizar) */}
                                  <button
                                    onClick={() => onToggleNivel(user.id, rec.key, 'V')}
                                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                                      isVAtivo
                                        ? isCAtivo
                                          ? 'bg-emerald-500 text-white shadow-xs'
                                          : 'bg-sky-500 text-white shadow-xs'
                                        : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted'
                                    }`}
                                    title="V: Apenas Visualizar"
                                  >
                                    V
                                  </button>

                                  {/* Separador sutil */}
                                  <div className="w-[1px] h-3.5 bg-border/60 mx-0.5" />

                                  {/* Botão Interno C (Criar/Editar) */}
                                  <button
                                    onClick={() => onToggleNivel(user.id, rec.key, 'C')}
                                    className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                                      isCAtivo
                                        ? 'bg-emerald-500 text-white shadow-xs'
                                        : 'text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted'
                                    }`}
                                    title="C: Criar e Editar (ativa ambos)"
                                  >
                                    C
                                  </button>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p className="font-bold">{rec.nome}</p>
                                <p className="text-muted-foreground mt-0.5">
                                  {nivel === 'criar'
                                    ? '🟢 Permissão Total: Criação, Edição e Apontamento (V + C)'
                                    : nivel === 'visualizar'
                                    ? '🔵 Apenas Leitura / Consulta (V)'
                                    : '⚪ Bloqueado / Oculto'}
                                </p>
                                <p className="text-[10px] text-muted-foreground/80 mt-1 italic">
                                  * Clique em V para apenas ver | Clique em C para liberar tudo
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

      {/* Legenda Explicativa do Balão no Rodapé */}
      <div className="p-3 bg-muted/20 border-t border-border/50 flex flex-wrap items-center justify-between text-xs text-muted-foreground gap-3">
        <div className="flex items-center gap-4">
          <span className="font-semibold text-foreground">Legenda dos Balões:</span>
          
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center p-0.5 rounded border border-border/60 bg-muted/40">
              <span className="px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground/50">V</span>
              <span className="w-[1px] h-3 bg-border/60 mx-0.5" />
              <span className="px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground/50">C</span>
            </span>
            <span>Bloqueado (Nem visualiza)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center p-0.5 rounded border border-sky-500/40 bg-sky-500/10">
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-sky-500 text-white rounded">V</span>
              <span className="w-[1px] h-3 bg-border/60 mx-0.5" />
              <span className="px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground/50">C</span>
            </span>
            <span>Apenas Visualização (Leitura)</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center p-0.5 rounded border border-emerald-500/40 bg-emerald-500/10">
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded">V</span>
              <span className="w-[1px] h-3 bg-border/60 mx-0.5" />
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-emerald-500 text-white rounded">C</span>
            </span>
            <span>Criação / Edição Total</span>
          </div>
        </div>

        <div className="text-[11px] italic">
          * Clicar em C ativa ambos em verde | Clicar em V desativa o C.
        </div>
      </div>
    </div>
  );
};
