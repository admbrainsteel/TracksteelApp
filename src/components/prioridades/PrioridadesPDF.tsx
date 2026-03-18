
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PrioridadesPDFTemplate } from './PrioridadesPDFTemplate';
import { ItemPrioridade } from '@/hooks/useItensPrioridadeFabricacao';
import { Download } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface PrioridadesPDFProps {
  isOpen: boolean;
  onClose: () => void;
  itensPorPrioridade: { [key: string]: ItemPrioridade[] };
  versaoAtual?: {
    revisao: number;
    dataModificacao: string;
    modificadoPor?: string;
  } | null;
}

export const PrioridadesPDF: React.FC<PrioridadesPDFProps> = ({
  isOpen,
  onClose,
  itensPorPrioridade,
  versaoAtual
}) => {
  const handleGerarPDF = async () => {
    const elemento = document.getElementById('prioridades-pdf-content');
    
    if (!elemento) {
      console.error('Elemento não encontrado');
      return;
    }

    try {
      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Extrair OF e Fase para o nome do arquivo
      const todosItens = Object.values(itensPorPrioridade).flat();
      let nomeArquivo = 'checklist-producao';
      
      if (todosItens.length > 0) {
        const primeiroItem = todosItens[0];
        const of = primeiroItem?.peca?.of_number || primeiroItem?.prioridade_fabricacao?.of_number;
        const fase = primeiroItem?.peca?.etapa_fase || primeiroItem?.prioridade_fabricacao?.etapa_fase;
        
        if (of && fase) {
          nomeArquivo = `checklist-producao-${of}-${fase}`;
          if (versaoAtual) {
            nomeArquivo += `-rev${versaoAtual.revisao}`;
          }
        }
      }
      
      pdf.save(`${nomeArquivo}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Visualizar Checklist de Produção
            <Button onClick={handleGerarPDF} className="ml-4">
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <PrioridadesPDFTemplate 
            itensPorPrioridade={itensPorPrioridade} 
            versaoAtual={versaoAtual}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
