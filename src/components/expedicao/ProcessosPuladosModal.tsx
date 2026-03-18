
import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Calendar } from 'lucide-react';

interface ProcessoPulado {
  nome: string;
  ordem: number;
  dataRetroativa: string;
}

interface PecaComProcessosPulados {
  peca_id: string;
  marca: string;
  processos_pulados: ProcessoPulado[];
  processo_atual: string;
}

interface ProcessosPuladosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  pecasComProcessosPulados: PecaComProcessosPulados[];
  loading?: boolean;
}

export const ProcessosPuladosModal: React.FC<ProcessosPuladosModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  pecasComProcessosPulados,
  loading = false
}) => {
  const totalPecas = pecasComProcessosPulados.length;
  const totalProcessosPulados = pecasComProcessosPulados.reduce(
    (sum, peca) => sum + peca.processos_pulados.length, 
    0
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Processos Anteriores Não Executados
          </DialogTitle>
          <DialogDescription>
            Foram encontradas {totalPecas} peça(s) que não passaram por todos os processos anteriores.
            O sistema pode criar apontamentos retroativos automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="font-medium text-amber-800 mb-2">
              ⚠️ Ação Automática Proposta:
            </h4>
            <p className="text-sm text-amber-700">
              • Total de processos que serão preenchidos automaticamente: <strong>{totalProcessosPulados}</strong>
            </p>
            <p className="text-sm text-amber-700">
              • Datas retroativas serão aplicadas (2 dias por processo anterior)
            </p>
          </div>

          <div className="space-y-3">
            {pecasComProcessosPulados.map((peca, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="font-mono">
                    {peca.marca}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Processo atual: {peca.processo_atual}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Processos que serão preenchidos automaticamente:</p>
                  {peca.processos_pulados.map((processo, pIndex) => (
                    <div key={pIndex} className="flex items-center gap-2 text-sm bg-gray-50 rounded p-2">
                      <Calendar className="w-4 h-4 text-blue-500" />
                      <span className="font-medium">{processo.nome}</span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">
                        Data: {new Date(processo.dataRetroativa).toLocaleDateString('pt-BR')}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        Ordem {processo.ordem}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar Apontamento
          </Button>
          <Button 
            onClick={onConfirm}
            disabled={loading}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {loading ? 'Processando...' : 'Confirmar e Criar Apontamentos'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
