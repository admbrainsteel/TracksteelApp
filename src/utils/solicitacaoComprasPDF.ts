
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { SolicitacaoCompra } from '@/hooks/useSolicitacoesCompra';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export const generateSolicitacaoComprasPDF = (solicitacao: SolicitacaoCompra) => {
  const doc = new jsPDF();
  
  // Cabeçalho
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SOLICITAÇÃO DE COMPRA', 105, 20, { align: 'center' });
  
  // Informações básicas
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  const startY = 40;
  doc.text(`Número SC: ${solicitacao.numero_sc}`, 20, startY);
  doc.text(`Data: ${new Date(solicitacao.data_solicitacao).toLocaleDateString('pt-BR')}`, 120, startY);
  
  doc.text(`Status: ${solicitacao.status}`, 20, startY + 10);
  doc.text(`Revisão: ${solicitacao.revisao}`, 120, startY + 10);
  
  if (solicitacao.of_number) {
    doc.text(`OF: ${solicitacao.of_number}`, 20, startY + 20);
  }
  
  if (solicitacao.objetivo) {
    doc.text(`Objetivo: ${solicitacao.objetivo}`, 20, startY + 30);
  }
  
  if (solicitacao.justificativa) {
    doc.text('Justificativa:', 20, startY + 40);
    const splitJustificativa = doc.splitTextToSize(solicitacao.justificativa, 170);
    doc.text(splitJustificativa, 20, startY + 50);
  }
  
  // Tabela de itens
  if (solicitacao.itens && solicitacao.itens.length > 0) {
    const tableStartY = startY + 80;
    
    const tableColumns = [
      { header: 'Código', dataKey: 'codigo' },
      { header: 'Descrição', dataKey: 'descricao' },
      { header: 'Unidade', dataKey: 'unidade' },
      { header: 'Quantidade', dataKey: 'quantidade' },
      { header: 'Prazo', dataKey: 'prazo' }
    ];
    
    const tableRows = solicitacao.itens.map(item => ({
      codigo: item.material?.id?.substring(0, 8) || 'N/A',
      descricao: item.material?.descricao || 'Material não encontrado',
      unidade: item.material?.unidade || 'UN',
      quantidade: item.quantidade.toString(),
      prazo: new Date(item.prazo_recebimento).toLocaleDateString('pt-BR')
    }));
    
    doc.autoTable({
      head: [tableColumns.map(col => col.header)],
      body: tableRows.map(row => tableColumns.map(col => row[col.dataKey as keyof typeof row])),
      startY: tableStartY,
      styles: {
        fontSize: 10,
        cellPadding: 3
      },
      headStyles: {
        fillColor: [66, 139, 202],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });
  }
  
  // Rodapé
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 20, pageHeight - 20);
  doc.text('TrackSteel - Sistema de Gestão Industrial', 105, pageHeight - 10, { align: 'center' });
  
  // Download do arquivo
  doc.save(`SC-${solicitacao.numero_sc}.pdf`);
};
