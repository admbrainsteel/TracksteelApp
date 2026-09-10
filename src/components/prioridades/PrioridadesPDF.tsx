
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PrioridadesPDFTemplate } from './PrioridadesPDFTemplate';
import { ItemPrioridade } from '@/hooks/useItensPrioridadeFabricacao';
import { Download, Loader2, Printer } from 'lucide-react';
import { generateProfessionalPDF, printProfessionalPDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';

interface PrioridadesPDFProps {
  isOpen: boolean;
  onClose: () => void;
  itensPorPrioridade: { [key: string]: ItemPrioridade[] };
  ofSelecionada?: string | null;
  faseSelecionada?: string | null;
  versaoAtual?: {
    revisao: number;
    dataModificacao: string;
    modificadoPor?: string;
  } | null;
  onIncrementarRevisao?: () => Promise<boolean>;
}

export const PrioridadesPDF: React.FC<PrioridadesPDFProps> = ({
  isOpen,
  onClose,
  itensPorPrioridade,
  ofSelecionada,
  faseSelecionada,
  versaoAtual,
  onIncrementarRevisao
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const getNomeArquivo = () => {
    let nomeArquivo = 'checklist-producao';
    const todosItens = Object.values(itensPorPrioridade).flat();
    const primeiroItem = todosItens[0];
    const of = ofSelecionada || primeiroItem?.peca?.of_number || primeiroItem?.prioridade_fabricacao?.of_number;
    const fase = faseSelecionada || primeiroItem?.peca?.etapa_fase || primeiroItem?.prioridade_fabricacao?.etapa_fase;

    if (of && fase) {
      nomeArquivo = `checklist-producao-${of}-${fase}`;
      if (versaoAtual) {
        nomeArquivo += `-rev${versaoAtual.revisao}`;
      }
    }
    return nomeArquivo;
  };

  const handleGerarPDF = async () => {
    const elemento = document.getElementById('prioridades-pdf-content');
    
    if (!elemento) {
      toast.error('Elemento do relatório não encontrado');
      return;
    }

    try {
      setIsGenerating(true);
      const nomeArquivo = getNomeArquivo();
      await generateProfessionalPDF('prioridades-pdf-content', `${nomeArquivo}.pdf`);
      toast.success('PDF baixado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar PDF:', error);
      toast.error(error.message || 'Erro ao gerar PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleImprimir = async () => {
    const elemento = document.getElementById('prioridades-pdf-content');
    if (!elemento) {
      toast.error('Elemento do relatório não encontrado');
      return;
    }

    if (onIncrementarRevisao) {
      const querSubir = window.confirm(
        `Deseja incrementar a revisão para Rev. ${(versaoAtual?.revisao || 0) + 1} para esta impressão?\n\n- Clique em OK para subir a revisão para Rev. ${(versaoAtual?.revisao || 0) + 1}\n- Clique em Cancelar para manter a revisão atual (Rev. ${versaoAtual?.revisao || 0})`
      );
      if (querSubir) {
        await onIncrementarRevisao();
      }
    }

    try {
      setIsPrinting(true);
      await printProfessionalPDF('prioridades-pdf-content');
      toast.success('Relatório enviado para impressão');
    } catch (error: any) {
      console.error('Erro ao imprimir:', error);
      toast.error('Erro ao imprimir relatório');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex flex-wrap items-center justify-between gap-2">
            <span>Visualizar Checklist de Produção</span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                size="sm"
                onClick={handleImprimir}
                disabled={isPrinting || isGenerating}
              >
                {isPrinting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Imprimindo...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir
                  </>
                )}
              </Button>
              <Button 
                size="sm"
                onClick={handleGerarPDF} 
                disabled={isGenerating || isPrinting}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar PDF
                  </>
                )}
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <PrioridadesPDFTemplate 
            itensPorPrioridade={itensPorPrioridade} 
            ofSelecionada={ofSelecionada}
            faseSelecionada={faseSelecionada}
            versaoAtual={versaoAtual}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
