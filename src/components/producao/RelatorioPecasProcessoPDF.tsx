
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { PecaComStatus } from '@/hooks/useRelatorioPecasProcesso';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface RelatorioPecasProcessoPDFProps {
  pecasComStatus: PecaComStatus[];
  estatisticas: {
    totalPecas: number;
    pesoTotalCorte: number;
    pesoTotalSolda: number;
    pesoTotalPintura: number;
    pesoTotalExpedicao: number;
  };
  selectedOF: string;
  selectedFase: string;
}

export const RelatorioPecasProcessoPDF: React.FC<RelatorioPecasProcessoPDFProps> = ({
  pecasComStatus,
  estatisticas,
  selectedOF,
  selectedFase
}) => {
  const generatePDF = () => {
    if (pecasComStatus.length === 0) {
      toast.error('Nenhuma peça disponível para gerar PDF.');
      return;
    }

    try {
      const doc = new jsPDF('p', 'mm', 'a4'); // Portrait orientation para otimizar espaço
      
      const faseText = selectedFase === 'todas' ? '' : ` - Fase ${selectedFase}`;
      
      // Título
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Status de Produção', 14, 16);
      
      // Subtítulo e Data
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`OF: ${selectedOF}${faseText}   |   Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 23);
      
      // Resumo por Processo em linha mais compacta
      let yPos = 32;
      doc.setFontSize(9);
      
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Peças:`, 14, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${estatisticas.totalPecas}`, 36, yPos);

      doc.setFont('helvetica', 'bold');
      doc.text(`Corte:`, 50, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${estatisticas.pesoTotalCorte.toFixed(0)} kg`, 62, yPos);

      doc.setFont('helvetica', 'bold');
      doc.text(`Solda:`, 90, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${estatisticas.pesoTotalSolda.toFixed(0)} kg`, 102, yPos);

      doc.setFont('helvetica', 'bold');
      doc.text(`Pintura:`, 130, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${estatisticas.pesoTotalPintura.toFixed(0)} kg`, 145, yPos);

      doc.setFont('helvetica', 'bold');
      doc.text(`Expedição:`, 175, yPos);
      doc.setFont('helvetica', 'normal');
      doc.text(`${estatisticas.pesoTotalExpedicao.toFixed(0)} kg`, 192, yPos);
      
      yPos = 38; // Ajusta yPos para o início da tabela
      
      // Preparar dados para a tabela
      const tableData = pecasComStatus.map(peca => [
        peca.of_number,
        peca.etapa_fase,
        peca.marca,
        peca.quantidade.toString(),
        `${peca.peso_unitario.toFixed(2)} kg`,
        `${peca.peso_total.toFixed(2)} kg`,
        peca.processos.corte ? 'OK' : '',
        !peca.tem_componentes ? 'S/M' : (peca.processos.solda ? 'OK' : ''),
        peca.processos.pintura ? 'OK' : '',
        peca.processos.expedicao ? 'OK' : ''
      ]);
      
      // Cabeçalhos da tabela
      const headers = [
        ['OF', 'Fase', 'Marca', 'Qtd', 'Peso Unit.', 'Peso Total', 'Corte', 'Solda', 'Pint/Galv', 'Expedição']
      ];
      
      // Configurar a tabela
      autoTable(doc, {
        head: headers,
        body: tableData,
        startY: yPos,
        styles: {
          fontSize: 8,
          cellPadding: 1.5,
          lineColor: [210, 210, 210],
          lineWidth: 0.1,
        },
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [40, 40, 40],
          fontStyle: 'bold',
          lineWidth: 0.1,
        },
        alternateRowStyles: {
          fillColor: [250, 250, 250],
        },
        columnStyles: {
          0: { cellWidth: 18, halign: 'center' }, // OF
          1: { cellWidth: 12, halign: 'center' }, // Fase
          2: { cellWidth: 20, halign: 'center' }, // Marca
          3: { cellWidth: 10, halign: 'center' }, // Qtd
          4: { cellWidth: 22, halign: 'right' }, // Peso Unit
          5: { cellWidth: 22, halign: 'right' }, // Peso Total
          6: { cellWidth: 16, halign: 'center' }, // Corte
          7: { cellWidth: 16, halign: 'center' }, // Solda
          8: { cellWidth: 22, halign: 'center' }, // Pint/Galv
          9: { cellWidth: 22, halign: 'center' }, // Expedição
        },
        margin: { left: 14, right: 14, top: 20, bottom: 20 },
        tableWidth: 'auto',
      });
      
      // Rodapé
      const finalY = (doc as any).lastAutoTable.finalY || yPos + 50;
      doc.setFontSize(8);
      doc.setTextColor(153, 153, 153);
      doc.text('Relatório gerado pelo sistema', 20, finalY + 20);
      
      // Salvar o PDF
      const filename = selectedFase === 'todas' 
        ? `relatorio-status-pecas-${selectedOF}-${new Date().toISOString().split('T')[0]}.pdf`
        : `relatorio-status-pecas-${selectedOF}-fase-${selectedFase}-${new Date().toISOString().split('T')[0]}.pdf`;
      
      doc.save(filename);
      
      toast.success(`PDF gerado com sucesso! ${pecasComStatus.length} peças exportadas.`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={pecasComStatus.length === 0}
      className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
    >
      <FileText className="h-4 w-4" />
      Gerar PDF
    </Button>
  );
};
