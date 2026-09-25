import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  SlidersHorizontal,
  Search,
  CheckCircle2,
  Save,
  RotateCcw,
  Shield,
  Factory,
  Box,
  Truck,
  HardHat,
  Sparkles,
  Lock,
  ArrowUpDown,
  Layers,
  AlertTriangle,
  Download,
  Network,
  UploadCloud,
  Compass,
  Barcode,
  PackageCheck,
  CheckSquare,
  Activity,
  Settings,
  Crown,
  Wrench,
  Calendar,
  Trash2,
  FileSpreadsheet,
  PlusCircle,
  PlusSquare,
  Edit3,
  FileText,
  Printer,
  FileInput,
  ShoppingCart,
  CheckCheck,
  AlertCircle,
  Settings2,
  Users,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import { useGrupoAvancadoPermissions } from '@/hooks/useGrupoAvancadoPermissions';

interface MatrizGrupoAvancadoModalProps {
  grupoKey: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const MatrizGrupoAvancadoModal: React.FC<MatrizGrupoAvancadoModalProps> = ({
  grupoKey,
  isOpen,
  onClose,
}) => {
  const {
    config,
    loading,
    saving,
    users,
    selectedUserId,
    setSelectedUserId,
    selectedUser,
    toggleRegra,
    aplicarTemplate,
    salvarConfiguracaoUsuario,
    recarregar,
  } = useGrupoAvancadoPermissions(isOpen ? grupoKey : null);

  const [busca, setBusca] = useState('');

  if (!config) return null;

  const usersFiltrados = users.filter((u) => {
    const termo = busca.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(termo) ||
      u.email.toLowerCase().includes(termo) ||
      u.functionName.toLowerCase().includes(termo)
    );
  });

  const corBadge: Record<string, string> = {
    sky: 'bg-sky-500/15 text-sky-400 border-sky-500/40',
    indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/40',
    teal: 'bg-teal-500/15 text-teal-400 border-teal-500/40',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
  };

  const corFundoIcone: Record<string, string> = {
    sky: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
    indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    teal: 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  };

  const getIconComponent = (icone: string) => {
    switch (icone) {
      case 'Calendar':
        return <Calendar className="h-4 w-4 text-sky-400" />;
      case 'Lock':
        return <Lock className="h-4 w-4 text-rose-400" />;
      case 'ArrowUpDown':
        return <ArrowUpDown className="h-4 w-4 text-amber-400" />;
      case 'Layers':
        return <Layers className="h-4 w-4 text-indigo-400" />;
      case 'Trash2':
        return <Trash2 className="h-4 w-4 text-rose-400" />;
      case 'FileSpreadsheet':
        return <FileSpreadsheet className="h-4 w-4 text-emerald-400" />;
      case 'PlusCircle':
        return <PlusCircle className="h-4 w-4 text-emerald-400" />;
      case 'PlusSquare':
        return <PlusSquare className="h-4 w-4 text-amber-400" />;
      case 'Edit3':
        return <Edit3 className="h-4 w-4 text-sky-400" />;
      case 'UploadCloud':
        return <UploadCloud className="h-4 w-4 text-teal-400" />;
      case 'Network':
        return <Network className="h-4 w-4 text-indigo-400" />;
      case 'Download':
        return <Download className="h-4 w-4 text-sky-400" />;
      case 'FileText':
        return <FileText className="h-4 w-4 text-slate-300" />;
      case 'PackageCheck':
        return <PackageCheck className="h-4 w-4 text-teal-400" />;
      case 'CheckSquare':
        return <CheckSquare className="h-4 w-4 text-emerald-400" />;
      case 'RotateCcw':
        return <RotateCcw className="h-4 w-4 text-amber-400" />;
      case 'Printer':
        return <Printer className="h-4 w-4 text-indigo-400" />;
      case 'SlidersHorizontal':
        return <SlidersHorizontal className="h-4 w-4 text-cyan-400" />;
      case 'FileInput':
        return <FileInput className="h-4 w-4 text-emerald-400" />;
      case 'ShoppingCart':
        return <ShoppingCart className="h-4 w-4 text-orange-400" />;
      case 'CheckCheck':
        return <CheckCheck className="h-4 w-4 text-teal-400" />;
      case 'AlertCircle':
        return <AlertCircle className="h-4 w-4 text-amber-400" />;
      case 'Settings2':
        return <Settings2 className="h-4 w-4 text-indigo-400" />;
      case 'Users':
        return <Users className="h-4 w-4 text-sky-400" />;
      case 'ShieldCheck':
        return <ShieldCheck className="h-4 w-4 text-emerald-400" />;
      case 'KeyRound':
        return <KeyRound className="h-4 w-4 text-amber-400" />;
      case 'Activity':
        return <Activity className="h-4 w-4 text-rose-400" />;
      case 'Settings':
        return <Settings className="h-4 w-4 text-slate-400" />;
      case 'Crown':
        return <Crown className="h-3.5 w-3.5 text-amber-400" />;
      case 'Shield':
        return <Shield className="h-3.5 w-3.5 text-sky-400" />;
      case 'Wrench':
        return <Wrench className="h-3.5 w-3.5 text-emerald-400" />;
      case 'Compass':
        return <Compass className="h-3.5 w-3.5 text-cyan-400" />;
      case 'Barcode':
        return <Barcode className="h-3.5 w-3.5 text-amber-400" />;
      case 'Box':
        return <Box className="h-3.5 w-3.5 text-indigo-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-amber-400" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[92vh] h-[850px] p-0 flex flex-col bg-card border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* CABEÇALHO DO MODAL */}
        <div className="px-6 py-4 border-b border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${corFundoIcone[config.cor]}`}>
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                Regras & Governança Avançada
                <Badge variant="outline" className={`text-[10px] uppercase tracking-wider font-bold ${corBadge[config.cor]}`}>
                  {config.titulo}
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {config.descricao}
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* CORPO PRINCIPAL: SIDEBAR DE USUÁRIOS + ÁREA DE REGRAS */}
        <div className="flex-1 flex overflow-hidden">
          {/* SIDEBAR DE USUÁRIOS */}
          <div className="w-[280px] sm:w-[310px] border-r border-border bg-background/60 flex flex-col shrink-0">
            <div className="p-3 border-b border-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Buscar colaborador..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-8 text-xs h-8 bg-card border-slate-300 dark:border-border text-foreground font-medium"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-border/40 p-1.5 space-y-0.5">
              {loading ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Carregando colaboradores...
                </div>
              ) : usersFiltrados.length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  Nenhum colaborador encontrado.
                </div>
              ) : (
                usersFiltrados.map((user) => {
                  const isSelected = user.userId === selectedUserId;
                  const totalAtivas = Object.values(user.regras).filter(Boolean).length;

                  return (
                    <button
                      key={user.userId}
                      onClick={() => setSelectedUserId(user.userId)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                        isSelected
                          ? `${corBadge[config.cor]} border shadow-sm`
                          : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Avatar className="h-8 w-8 rounded-lg border border-border shrink-0">
                        <AvatarImage src={user.profileImageUrl || ''} />
                        <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                          {user.fullName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-semibold text-foreground truncate">
                            {user.fullName}
                          </span>
                          <span className="text-[10px] font-bold text-muted-foreground shrink-0">
                            {totalAtivas}/{config.regras.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                          <span className="truncate max-w-[120px]">{user.functionName}</span>
                          <span>•</span>
                          <span className="truncate">{user.privilegeName}</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ÁREA DE CONFIGURAÇÃO DO USUÁRIO */}
          <div className="flex-1 flex flex-col bg-card overflow-hidden">
            {selectedUser ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* CABEÇALHO DO USUÁRIO SELECIONADO */}
                <div className="p-4 border-b border-border/60 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 rounded-xl border border-border">
                      <AvatarImage src={selectedUser.profileImageUrl || ''} />
                      <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                        {selectedUser.fullName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {selectedUser.fullName}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span>{selectedUser.email}</span>
                        <span>•</span>
                        <Badge variant="secondary" className="text-[10px] py-0 h-4">
                          {selectedUser.functionName}
                        </Badge>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={salvarConfiguracaoUsuario}
                      disabled={saving}
                      className="h-8 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1.5 shadow-sm"
                    >
                      <Save className="h-3.5 w-3.5" />
                      {saving ? 'Gravando...' : 'Salvar Regras'}
                    </Button>
                  </div>
                </div>

                {/* TEMPLATES RÁPIDOS */}
                <div className="px-6 py-3 border-b border-border/40 bg-muted/10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      Presets Rápidos:
                    </span>
                    {config.templates.map((tpl) => (
                      <Button
                        key={tpl.id}
                        size="sm"
                        variant="outline"
                        onClick={() => aplicarTemplate(tpl.id)}
                        className="h-7 text-[11px] px-2.5 py-0 rounded-lg hover:border-primary/50 flex items-center gap-1.5 bg-background/80"
                        title={tpl.descricao}
                      >
                        {getIconComponent(tpl.icone)}
                        {tpl.nome}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* LISTAGEM DE REGRAS GRANULARES */}
                <div className="flex-1 overflow-y-auto p-6 space-y-3">
                  <div className="grid grid-cols-1 gap-3">
                    {config.regras.map((regra) => {
                      const ativo = Boolean(selectedUser.regras[regra.key]);

                      return (
                        <div
                          key={regra.key}
                          onClick={() => toggleRegra(regra.key)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                            ativo
                              ? 'bg-muted/40 border-primary/40 shadow-sm'
                              : 'bg-background border-border/50 opacity-70 hover:opacity-100 hover:border-border'
                          }`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div
                              className={`p-2 rounded-lg border shrink-0 ${
                                ativo
                                  ? `${corBadge[config.cor]} border`
                                  : 'bg-muted text-muted-foreground border-border'
                              }`}
                            >
                              {getIconComponent(regra.icone)}
                            </div>
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground">
                                  {regra.nome}
                                </span>
                                {ativo && (
                                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] h-4 py-0">
                                    LIBERADO
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground leading-snug">
                                {regra.descricao}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <Switch
                              checked={ativo}
                              onCheckedChange={() => toggleRegra(regra.key)}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
                Selecione um colaborador ao lado para configurar as regras avançadas.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
