import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

export interface ItemPendenciaProducao {
  peca_id: string;
  marca: string;
  processo: string;
  ordem: number;
  qtdNecessaria: number;
  qtdApontada: number;
  qtdFaltante: number;
}

interface PendenciasProducaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendencias: ItemPendenciaProducao[];
  numeroRomaneio?: string;
  mensagemSemItens?: string;
}

export const PendenciasProducaoModal: React.FC<PendenciasProducaoModalProps> = ({
  isOpen,
  onClose,
  pendencias,
  numeroRomaneio,
  mensagemSemItens
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideClose className="max-w-2xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-red-700 dark:text-red-400">
                Bloqueio de Expedição: Peças Pendentes
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground mt-1">
                {numeroRomaneio ? `Romaneio ${numeroRomaneio} • ` : ''} 
                Não é permitido definir o status como "Entregue" com pendências de produção.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-3 flex-1 overflow-hidden">
          {mensagemSemItens ? (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 text-red-800 dark:text-red-300 text-sm flex items-start gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600 mt-0.5" />
              <span>{mensagemSemItens}</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md text-xs text-amber-900 dark:text-amber-200">
                As peças abaixo ainda não foram totalmente apontadas nos processos de fabricação anteriores (Corte, Solda, Pintura, etc.). É necessário concluir os apontamentos na produção antes de marcar a entrega.
              </div>

              <ScrollArea className="max-h-[320px] rounded-md border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-muted-foreground font-semibold text-xs uppercase border-b sticky top-0">
                    <tr>
                      <th className="py-2.5 px-3">Marca / Peça</th>
                      <th className="py-2.5 px-3">Processo Pendente</th>
                      <th className="py-2.5 px-3 text-center">No Romaneio</th>
                      <th className="py-2.5 px-3 text-center">Apontado</th>
                      <th className="py-2.5 px-3 text-center text-red-600">Faltam</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {pendencias.map((p, idx) => (
                      <tr key={`${p.peca_id}-${p.processo}-${idx}`} className="hover:bg-muted/40">
                        <td className="py-2.5 px-3 font-semibold text-foreground">
                          {p.marca}
                        </td>
                        <td className="py-2.5 px-3">
                          <Badge variant="outline" className="text-xs bg-muted/60">
                            {p.processo}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-center font-medium">
                          {p.qtdNecessaria}
                        </td>
                        <td className="py-2.5 px-3 text-center text-muted-foreground">
                          {p.qtdApontada}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-red-600 dark:text-red-400">
                          {p.qtdFaltante}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 border-t flex justify-end">
          <Button onClick={onClose} variant="default" className="w-full sm:w-auto">
            Entendido, manter em planejamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
