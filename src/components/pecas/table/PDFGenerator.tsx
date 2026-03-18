
import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText } from 'lucide-react';
import { Peca } from '@/hooks/usePecas';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PDFGeneratorProps {
  selectedPecas: Set<string>;
  allPecas: Peca[];
  ofNumber: string;
}

export function PDFGenerator({ selectedPecas, allPecas, ofNumber }: PDFGeneratorProps) {
  const generatePDF = () => {
    const pecasToExport = allPecas.filter(peca => selectedPecas.has(peca.id));
    
    if (pecasToExport.length === 0) {
      toast.error('Nenhuma peça selecionada para gerar PDF.');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
    
    // Título
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Lista de Peças - OF: ${ofNumber}`, 20, 20);
    
    // Data/hora
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, 30);
    
    // Preparar dados para a tabela
    const tableData = pecasToExport.map(peca => [
      peca.of_number,
      peca.etapa_fase || '-',
      peca.marca,
      peca.descricao || '-',
      peca.prioridade || '-',
      peca.quantidade.toString(),
      `${peca.peso_unitario.toFixed(2)} kg`,
      `${peca.peso_total.toFixed(2)} kg`,
      peca.material || '-',
      peca.perfil_principal || '-'
    ]);
    
    // Cabeçalhos da tabela
    const headers = [
      ['OF', 'Fase', 'Marca', 'Descrição', 'Prioridade', 'Qtd.', 'Peso Unit.', 'Peso Total', 'Material', 'Perfil']
    ];
    
    // Configurar a tabela
    autoTable(doc, {
      head: headers,
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245],
      },
      margin: { left: 10, right: 10 },
      tableWidth: 'auto',
      columnStyles: {
        0: { cellWidth: 25 }, // OF
        1: { cellWidth: 20 }, // Fase
        2: { cellWidth: 25 }, // Marca
        3: { cellWidth: 40 }, // Descrição
        4: { cellWidth: 25 }, // Prioridade
        5: { cellWidth: 15 }, // Qtd
        6: { cellWidth: 25 }, // Peso Unit
        7: { cellWidth: 25 }, // Peso Total
        8: { cellWidth: 30 }, // Material
        9: { cellWidth: 30 }, // Perfil
      }
    });
    
    // Adicionar totais
    const totalPeso = pecasToExport.reduce((total, peca) => total + peca.peso_total, 0);
    const totalQuantidade = pecasToExport.reduce((total, peca) => total + peca.quantidade, 0);
    
    const finalY = (doc as any).lastAutoTable.finalY || 40;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Total de Peças: ${pecasToExport.length}`, 20, finalY + 15);
    doc.text(`Quantidade Total: ${totalQuantidade}`, 20, finalY + 25);
    doc.text(`Peso Total: ${totalPeso.toFixed(2)} kg`, 20, finalY + 35);
    
    // Salvar o PDF
    doc.save(`pecas_${ofNumber}_${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast.success(`PDF gerado com sucesso! ${pecasToExport.length} peças exportadas.`);
  };

  return (
    <Button
      onClick={generatePDF}
      disabled={selectedPecas.size === 0}
      className="bg-green-600 hover:bg-green-700 text-white"
      size="sm"
    >
      <FileText className="h-4 w-4 mr-2" />
      Gerar PDF ({selectedPecas.size})
    </Button>
  );
}
