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
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  SlidersHorizontal,
  Search,
  CheckCircle2,
  Save,
  RotateCcw,
  Shield,
  Factory,
  Eye,
  Edit3,
  Trash2,
  Mail,
  Phone,
  MessageSquare,
  AlertTriangle,
  FileText,
  Layers,
  Flame,
  Zap,
  Box,
  ExternalLink,
  Truck,
  Wrench,
  FileSpreadsheet,
  Info,
  Sparkles,
  Lock,
  Plus,
  BookmarkPlus,
  X,
} from 'lucide-react';
import { useSmartPermissions } from '@/hooks/useSmartPermissions';
import { SMART_SUBMODULES, SmartCustomTemplate } from '@/types/smartPermissions';
import { CriarSmartTemplateModal } from './CriarSmartTemplateModal';

interface MatrizSmartAvancadoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MatrizSmartAvancadoModal: React.FC<MatrizSmartAvancadoModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    loading,
    saving,
    users,
    templates,
    selectedUserId,
    setSelectedUserId,
    selectedUser,
    togglePermission,
    updateNotificationConfig,
    salvarConfiguracaoUsuario,
    aplicarTemplate,
    criarNovoTemplate,
    removerTemplateCustom,
    recarregar,
  } = useSmartPermissions();

  const [busca, setBusca] = useState('');
  const [modalCriarTemplateOpen, setModalCriarTemplateOpen] = useState(false);

  const usersFiltrados = users.filter((u) => {
    const termo = busca.toLowerCase();
    return (
      u.fullName.toLowerCase().includes(termo) ||
      u.email.toLowerCase().includes(termo) ||
      u.functionName.toLowerCase().includes(termo)
    );
  });

  const getIconComponent = (icone: string) => {
    switch (icone) {
      case 'FileText':
        return <FileText className="h-4 w-4 text-sky-500 dark:text-sky-400" />;
      case 'Layers':
        return <Layers className="h-4 w-4 text-indigo-500 dark:text-indigo-400" />;
      case 'Flame':
        return <Flame className="h-4 w-4 text-orange-500 dark:text-orange-400" />;
      case 'CheckCircle2':
        return <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case 'Zap':
        return <Zap className="h-4 w-4 text-amber-500 dark:text-amber-400" />;
      case 'Box':
        return <Box className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />;
      case 'ExternalLink':
        return <ExternalLink className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case 'Truck':
        return <Truck className="h-4 w-4 text-amber-600 dark:text-amber-500" />;
      case 'Wrench':
        return <Wrench className="h-4 w-4 text-teal-600 dark:text-teal-400" />;
      case 'FileSpreadsheet':
        return <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />;
      case 'Shield':
        return <Shield className="h-3.5 w-3.5 text-rose-500 dark:text-rose-400" />;
      case 'Factory':
        return <Factory className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'Eye':
        return <Eye className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />;
      default:
        return <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[94vh] h-[900px] p-0 flex flex-col bg-card border-border shadow-2xl rounded-2xl overflow-hidden">
        {/* CABEÇALHO DO MODAL */}
        <div className="px-6 py-4 border-b border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-foreground">
                Gestão Avançada de Privilégios & Notificações
                <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/40 text-[10px] uppercase tracking-wider font-bold">
                  Modo Smart
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Controle granular de acesso por submódulo e canais de notificação (E-mail e WhatsApp via única).
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* CORPO PRINCIPAL COM SIDEBAR DE USUÁRIOS E ÁREA DE CONFIGURAÇÃO */}
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
                  return (
                    <button
                      key={user.userId}
                      onClick={() => setSelectedUserId(user.userId)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center gap-2.5 ${
                        isSelected
                          ? 'bg-emerald-500/15 border border-emerald-500/40 text-foreground shadow-sm'
                          : 'hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Avatar className="h-8 w-8 rounded-lg border border-border">
                        <AvatarImage src={user.profileImageUrl || ''} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xs font-bold">
                          {user.fullName.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-700 dark:text-emerald-400 font-extrabold' : 'text-slate-800 dark:text-foreground'}`}>
                          {user.fullName}
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-muted-foreground truncate">
                          {user.functionName}
                        </p>
                      </div>
                      {user.whatsappNumber && (
                        <div className="p-1 rounded-md bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" title={`WhatsApp: ${user.whatsappNumber}`}>
                          <MessageSquare className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* ÁREA DE CONFIGURAÇÃO DO USUÁRIO SELECIONADO */}
          <div className="flex-1 flex flex-col bg-card overflow-y-auto">
            {selectedUser ? (
              <div className="p-5 sm:p-6 space-y-6">
                {/* CABEÇALHO DO USUÁRIO + PERFIL */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 rounded-xl border border-border shadow-sm">
                      <AvatarImage src={selectedUser.profileImageUrl || ''} />
                      <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-sm font-bold">
                        {selectedUser.fullName.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-foreground">
                        {selectedUser.fullName}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <span className="text-slate-600 dark:text-slate-400">{selectedUser.email}</span>
                        <span>•</span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">{selectedUser.functionName}</span>
                      </p>
                    </div>
                  </div>

                  {/* BOTÃO PRINCIPAL DE SALVAR ALTERAÇÕES */}
                  <Button
                    size="sm"
                    onClick={() => salvarConfiguracaoUsuario(selectedUser.userId)}
                    disabled={saving}
                    className="text-xs h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm flex items-center gap-1.5 transition-transform active:scale-95"
                  >
                    <Save className={`h-4 w-4 ${saving ? 'animate-spin' : ''}`} />
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>

                {/* BARRA DE TEMPLATES RÁPIDOS & CRIAR NOVO TEMPLATE */}
                <div className="p-3.5 rounded-2xl border border-border bg-background/50 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      Templates de Acesso em 1 Clique
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setModalCriarTemplateOpen(true)}
                      className="text-xs h-7 px-2.5 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Criar Novo Template
                    </Button>
                  </div>

                  {/* CHIPS DE TEMPLATES */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                    {templates.map((tpl) => (
                      <div
                        key={tpl.id}
                        className="group relative shrink-0 flex items-center"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => aplicarTemplate(selectedUser.userId, tpl)}
                          className="text-xs h-8 pl-2.5 pr-2.5 rounded-xl border-slate-300 dark:border-border hover:bg-muted/80 flex items-center gap-1.5 shadow-xs font-medium"
                          title={tpl.descricao}
                        >
                          {getIconComponent(tpl.icone)}
                          <span className="font-semibold text-slate-800 dark:text-slate-200">
                            {tpl.nome}
                          </span>
                          {tpl.badge && (
                            <Badge
                              variant="secondary"
                              className="ml-1 text-[9px] px-1 py-0 h-4 bg-muted text-muted-foreground"
                            >
                              {tpl.badge}
                            </Badge>
                          )}
                        </Button>

                        {/* Botão para deletar template customizado */}
                        {tpl.isCustom && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              removerTemplateCustom(tpl.id);
                            }}
                            className="ml-1 p-1 text-muted-foreground hover:text-rose-500 rounded-md transition-colors"
                            title="Remover este template"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* SEÇÃO 1: MATRIZ DE ACESSO AOS SUBMÓDULOS */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Lock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      1. Permissões Granulares nos Submódulos (Modo Smart)
                    </h4>
                    <span className="text-[11px] text-slate-500 dark:text-muted-foreground font-medium">
                      Controle de Visualização, Edição/Apontamento e Exclusão
                    </span>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/50 overflow-hidden shadow-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border/80 bg-muted/40 text-[11px] text-slate-600 dark:text-muted-foreground font-bold">
                          <th className="p-3">Submódulo / Recurso</th>
                          <th className="p-3 text-center w-[110px]">
                            <span className="inline-flex items-center gap-1 text-sky-600 dark:text-sky-400 font-bold">
                              <Eye className="h-3.5 w-3.5" />
                              Visualizar
                            </span>
                          </th>
                          <th className="p-3 text-center w-[130px]">
                            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                              <Edit3 className="h-3.5 w-3.5" />
                              Apontar / Editar
                            </span>
                          </th>
                          <th className="p-3 text-center w-[110px]">
                            <span className="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400 font-bold">
                              <Trash2 className="h-3.5 w-3.5" />
                              Excluir
                            </span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40 text-xs">
                        {SMART_SUBMODULES.map((sub) => {
                          const perm = selectedUser.permissions[sub.key] || {
                            can_view: false,
                            can_edit: false,
                            can_delete: false,
                          };

                          return (
                            <tr
                              key={sub.key}
                              className="hover:bg-muted/30 transition-colors"
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="p-1.5 rounded-lg bg-card border border-border/60 shadow-xs">
                                    {getIconComponent(sub.icone)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-slate-900 dark:text-foreground text-xs">
                                      {sub.nome}
                                    </p>
                                    <p className="text-[10px] text-slate-500 dark:text-muted-foreground font-medium">
                                      {sub.descricao}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              {/* VISUALIZAR */}
                              <td className="p-3 text-center">
                                <div className="flex justify-center">
                                  <Switch
                                    checked={perm.can_view}
                                    onCheckedChange={() =>
                                      togglePermission(selectedUser.userId, sub.key, 'can_view')
                                    }
                                  />
                                </div>
                              </td>

                              {/* EDITAR / APONTAR */}
                              <td className="p-3 text-center">
                                <div className="flex justify-center">
                                  <Switch
                                    checked={perm.can_edit}
                                    onCheckedChange={() =>
                                      togglePermission(selectedUser.userId, sub.key, 'can_edit')
                                    }
                                  />
                                </div>
                              </td>

                              {/* EXCLUIR */}
                              <td className="p-3 text-center">
                                <div className="flex justify-center">
                                  <Switch
                                    checked={perm.can_delete}
                                    onCheckedChange={() =>
                                      togglePermission(selectedUser.userId, sub.key, 'can_delete')
                                    }
                                  />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* SEÇÃO 2: NOTIFICAÇÕES & CANAL WHATSAPP VIA ÚNICA */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    2. Notificações do Usuário (E-mail & WhatsApp BrainSteel)
                  </h4>

                  {/* BANNER INFORMATIVO: ALTO CONTRASTE NO MODO CLARO E ESCURO */}
                  <div className="p-4 rounded-2xl border border-amber-400/80 dark:border-amber-500/30 bg-amber-100/80 dark:bg-amber-500/10 text-amber-950 dark:text-amber-200 flex items-start gap-3 shadow-xs">
                    <AlertTriangle className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <p className="font-extrabold text-amber-900 dark:text-amber-300 text-xs">
                        Comunicação Estritamente Unidirecional (Via Única) no WhatsApp
                      </p>
                      <p className="text-amber-950 dark:text-amber-200/90 leading-relaxed text-[11px] font-medium">
                        O número oficial da BrainSteel é configurado para <strong>somente enviar</strong> alertas, relatórios e métricas de produção. Mensagens de resposta enviadas pelo colaborador não serão recebidas nem respondidas pelo sistema.
                      </p>
                    </div>
                  </div>

                  {/* GRID DE CONFIGURAÇÕES DE CANAL */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CANAL WHATSAPP */}
                    <div className="p-4 rounded-2xl border border-border bg-background/50 space-y-4 shadow-xs">
                      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-xs">
                        <Phone className="h-4 w-4" />
                        Canal WhatsApp do Colaborador
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          Número de WhatsApp com DDD
                        </Label>
                        <Input
                          placeholder="Ex: 5511999998888 ou (11) 99999-8888"
                          value={selectedUser.whatsappNumber}
                          onChange={(e) =>
                            updateNotificationConfig(
                              selectedUser.userId,
                              'whatsappNumber',
                              e.target.value
                            )
                          }
                          className="h-8 text-xs bg-background dark:bg-card border-slate-300 dark:border-border text-foreground font-medium placeholder:text-slate-500 dark:placeholder:text-muted-foreground/80"
                        />
                        <span className="text-[10px] text-slate-500 dark:text-muted-foreground font-medium block">
                          Informe o número com DDD para receber avisos automáticos.
                        </span>
                      </div>

                      <div className="pt-2 border-t border-border/40 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-semibold text-slate-800 dark:text-foreground">
                              Alertas de Apontamentos
                            </Label>
                            <p className="text-[10px] text-slate-500 dark:text-muted-foreground font-medium">
                              Notificar sobre novos apontamentos ou avanços forçados
                            </p>
                          </div>
                          <Switch
                            checked={selectedUser.notifWhatsappApontamentos}
                            onCheckedChange={(val) =>
                              updateNotificationConfig(
                                selectedUser.userId,
                                'notifWhatsappApontamentos',
                                val
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-semibold text-slate-800 dark:text-foreground">
                              Resumo Diário de Métricas
                            </Label>
                            <p className="text-[10px] text-slate-500 dark:text-muted-foreground font-medium">
                              Receber fechamento diário de produção (peso e peças)
                            </p>
                          </div>
                          <Switch
                            checked={selectedUser.notifWhatsappMetricas}
                            onCheckedChange={(val) =>
                              updateNotificationConfig(
                                selectedUser.userId,
                                'notifWhatsappMetricas',
                                val
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>

                    {/* CANAL E-MAIL */}
                    <div className="p-4 rounded-2xl border border-border bg-background/50 space-y-4 shadow-xs">
                      <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-bold text-xs">
                        <Mail className="h-4 w-4" />
                        Canal de E-mail ({selectedUser.email})
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-semibold text-slate-800 dark:text-foreground">
                              Alertas de Apontamentos por E-mail
                            </Label>
                            <p className="text-[10px] text-slate-500 dark:text-muted-foreground font-medium">
                              Receber e-mail informativo a cada lote apontado
                            </p>
                          </div>
                          <Switch
                            checked={selectedUser.notifEmailApontamentos}
                            onCheckedChange={(val) =>
                              updateNotificationConfig(
                                selectedUser.userId,
                                'notifEmailApontamentos',
                                val
                              )
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <Label className="text-xs font-semibold text-slate-800 dark:text-foreground">
                              Relatórios e Métricas por E-mail
                            </Label>
                            <p className="text-[10px] text-slate-500 dark:text-muted-foreground font-medium">
                              Receber resumos periódicos e PDFs automáticos
                            </p>
                          </div>
                          <Switch
                            checked={selectedUser.notifEmailMetricas}
                            onCheckedChange={(val) =>
                              updateNotificationConfig(
                                selectedUser.userId,
                                'notifEmailMetricas',
                                val
                              )
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
                Selecione um colaborador na barra lateral para configurar.
              </div>
            )}
          </div>
        </div>

        {/* RODAPÉ DO MODAL */}
        <div className="px-6 py-3 border-t border-border bg-muted/40 flex items-center justify-between text-xs">
          <span className="text-muted-foreground text-[11px]">
            As alterações passam a valer imediatamente no Modo Smart após salvar.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 font-medium"
          >
            Fechar
          </Button>
        </div>
      </DialogContent>

      {/* MODAL PARA SALVAR NOVO TEMPLATE PERSONALIZADO */}
      {selectedUser && (
        <CriarSmartTemplateModal
          isOpen={modalCriarTemplateOpen}
          onClose={() => setModalCriarTemplateOpen(false)}
          currentPermissions={selectedUser.permissions}
          onSalvarTemplate={criarNovoTemplate}
        />
      )}
    </Dialog>
  );
};
