import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Save, CheckCircle2 } from 'lucide-react';
import { SMART_SUBMODULES } from '@/types/smartPermissions';

interface CriarSmartTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPermissions: Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean }>;
  onSalvarTemplate: (
    nome: string,
    descricao: string,
    permissions: Record<string, { can_view: boolean; can_edit: boolean; can_delete: boolean }>
  ) => boolean;
}

export const CriarSmartTemplateModal: React.FC<CriarSmartTemplateModalProps> = ({
  isOpen,
  onClose,
  currentPermissions,
  onSalvarTemplate,
}) => {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');

  const handleSalvar = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = onSalvarTemplate(nome, descricao, currentPermissions);
    if (ok) {
      setNome('');
      setDescricao('');
      onClose();
    }
  };

  // Contagem de permissões ativas
  const totalVisualizar = Object.values(currentPermissions).filter((p) => p.can_view).length;
  const totalEditar = Object.values(currentPermissions).filter((p) => p.can_edit).length;
  const totalExcluir = Object.values(currentPermissions).filter((p) => p.can_delete).length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-card border-border shadow-2xl rounded-2xl p-6">
        <DialogHeader className="space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-500">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <DialogTitle className="text-base font-bold text-foreground">
              Criar Novo Template do Modo Smart
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Salve a configuração atual de permissões como um template reutilizável para aplicar em outros operadores com 1 clique.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSalvar} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Nome do Template <span className="text-rose-500">*</span>
            </Label>
            <Input
              placeholder="Ex: Soldador Nível 2, Inspetor de Pintura, Montador..."
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="h-9 text-xs bg-background border-slate-300 dark:border-border text-foreground font-medium"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Descrição Curta (Opcional)
            </Label>
            <Input
              placeholder="Ex: Permissões recomendadas para operadores da bancada de solda"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className="h-9 text-xs bg-background border-slate-300 dark:border-border text-foreground font-medium"
            />
          </div>

          {/* RESUMO DAS PERMISSÕES CAPTURADAS */}
          <div className="p-3 rounded-xl border border-border bg-muted/40 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
              Permissões capturadas da tela:
            </span>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 text-[10px]">
                {totalVisualizar} Visualizar
              </Badge>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px]">
                {totalEditar} Apontar/Editar
              </Badge>
              <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 text-[10px]">
                {totalExcluir} Excluir
              </Badge>
            </div>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-8"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              className="text-xs h-8 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-sm"
            >
              <Save className="h-3.5 w-3.5" />
              Salvar Template
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
