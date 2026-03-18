
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
      const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
      
      const faseText = selectedFase === 'todas' ? '' : ` - Fase ${selectedFase}`;
      
      // Título
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('Relatório de Status', 20, 20);
      
      // Subtítulo
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text(`Ordem de Fabricação: ${selectedOF}${faseText}`, 20, 30);
      
      // Data/hora
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 40);
      
      // Resumo por Processo
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumo por Processo', 20, 55);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      let yPos = 65;
      doc.text(`Total de Peças: ${estatisticas.totalPecas}`, 20, yPos);
      doc.text(`Peso Corte: ${estatisticas.pesoTotalCorte.toFixed(2)} kg`, 80, yPos);
      doc.text(`Peso Solda: ${estatisticas.pesoTotalSolda.toFixed(2)} kg`, 140, yPos);
      doc.text(`Peso Pintura: ${estatisticas.pesoTotalPintura.toFixed(2)} kg`, 200, yPos);
      doc.text(`Peso Expedição: ${estatisticas.pesoTotalExpedicao.toFixed(2)} kg`, 260, yPos);
      
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
        startY: yPos + 15,
        styles: {
          fontSize: 9,
          cellPadding: 2,
          lineColor: [204, 204, 204],
          lineWidth: 0.5,
        },
        headStyles: {
          fillColor: [233, 236, 239],
          textColor: 0,
          fontStyle: 'bold',
          lineColor: [204, 204, 204],
          lineWidth: 0.5,
        },
        alternateRowStyles: {
          fillColor: [248, 249, 250],
        },
        columnStyles: {
          0: { cellWidth: 25, halign: 'center' }, // OF
          1: { cellWidth: 20, halign: 'center' }, // Fase
          2: { cellWidth: 25, halign: 'center' }, // Marca
          3: { cellWidth: 15, halign: 'center' }, // Qtd
          4: { cellWidth: 25, halign: 'right' }, // Peso Unit
          5: { cellWidth: 25, halign: 'right' }, // Peso Total
          6: { cellWidth: 20, halign: 'center' }, // Corte
          7: { cellWidth: 20, halign: 'center' }, // Solda
          8: { cellWidth: 25, halign: 'center' }, // Pint/Galv
          9: { cellWidth: 25, halign: 'center' }, // Expedição
        },
        margin: { left: 20, right: 20 },
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
