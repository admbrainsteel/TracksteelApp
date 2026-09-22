import React from 'react';
import { UsuarioMatriz, TemplateAcesso, TEMPLATES_ACESSO } from '@/hooks/useMatrizAcessos';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Factory,
  Layers,
  Truck,
  HardHat,
  Crown,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';

interface MatrizTemplatesModalProps {
  user: UsuarioMatriz | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (userId: string, templateId: string) => void;
}

export const MatrizTemplatesModal: React.FC<MatrizTemplatesModalProps> = ({
  user,
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  if (!user) return null;

  const getIcone = (icone: string) => {
    switch (icone) {
      case 'Factory':
        return Factory;
      case 'Layers':
        return Layers;
      case 'Truck':
        return Truck;
      case 'HardHat':
        return HardHat;
      case 'Crown':
        return Crown;
      default:
        return Sparkles;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[620px] rounded-2xl">
        <DialogHeader className="pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base md:text-lg">
                Templates de Acesso em 1 Clique
              </DialogTitle>
              <DialogDescription className="text-xs">
                Selecione um perfil pronto para aplicar instantaneamente a{' '}
                <strong className="text-foreground">{user.fullName}</strong>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {TEMPLATES_ACESSO.map((template) => {
            const Icon = getIcone(template.icone);

            return (
              <div
                key={template.id}
                onClick={() => {
                  onSelectTemplate(user.id, template.id);
                  onClose();
                }}
                className="group relative rounded-xl border border-border/80 bg-card hover:border-primary/50 hover:bg-accent/40 p-3.5 transition-all cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-colors text-muted-foreground mt-0.5">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs md:text-sm text-foreground group-hover:text-primary transition-colors">
                        {template.nome}
                      </h4>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-border">
                        {template.badge}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {template.descricao}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 h-8 text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all"
                >
                  Aplicar
                </Button>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};
