
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download, X } from 'lucide-react';
import { generateProfessionalPDF, printProfessionalPDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  reportId: string;
  filters?: any;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  reportId,
  filters
}) => {
  const handleDownloadPDF = async () => {
    try {
      await generateProfessionalPDF(reportId, `${title.toLowerCase().replace(/\s+/g, '_')}.pdf`);
      toast.success('PDF baixado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const handlePrint = async () => {
    try {
      await printProfessionalPDF(reportId);
      toast.success('Enviado para impressão!');
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast.error('Erro ao imprimir');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle>{title}</DialogTitle>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              Imprimir
            </Button>
            <Button onClick={handleDownloadPDF} variant="outline" className="flex items-center gap-2">
              <Download className="w-4 h-4" />
              Download PDF
            </Button>
            <Button onClick={onClose} variant="ghost" size="sm">
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        <div className="overflow-auto max-h-[70vh]">
          <div id={reportId} className="bg-white p-6 text-black">
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
