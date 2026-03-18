
import React from 'react';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { PecaComStatus } from '@/hooks/useRelatorioPecasProcesso';
import { toast } from 'sonner';

interface RelatorioPecasProcessoPrintProps {
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

export const RelatorioPecasProcessoPrint: React.FC<RelatorioPecasProcessoPrintProps> = ({
  pecasComStatus,
  estatisticas,
  selectedOF,
  selectedFase
}) => {
  const generatePrintDocument = () => {
    if (pecasComStatus.length === 0) {
      toast.error('Nenhuma peça disponível para impressão.');
      return;
    }

    try {
      // Criar template HTML para impressão
      const printTemplate = document.createElement('div');
      printTemplate.style.fontFamily = 'Inter, sans-serif';
      
      const faseText = selectedFase === 'todas' ? '' : ` - Fase ${selectedFase}`;
      const currentDate = new Date().toLocaleString('pt-BR');

      printTemplate.innerHTML = `
        <style>
          @media print {
            body {
              margin: 0;
              font-family: 'Inter', sans-serif;
              background: white;
            }
            .a4-page {
              width: 100%;
              margin: 0;
              padding: 1.5cm;
              background: white;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              page-break-inside: auto;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 4px 8px;
              font-size: 9pt;
              text-align: center;
            }
            th {
              background-color: #e9ecef;
              font-weight: 600;
            }
            .text-left { text-align: left; }
            .text-right { text-align: right; }
            .header-info, .summary-info { font-size: 10pt; }
            tr { page-break-inside: avoid; }
            thead { display: table-header-group; }
          }
          
          body {
            font-family: 'Inter', sans-serif;
            background-color: #e0e0e0;
          }
          .a4-page {
            width: 21cm;
            min-height: 29.7cm;
            padding: 1.5cm;
            margin: 1cm auto;
            background: white;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 4px 8px;
            font-size: 9pt;
            text-align: center;
          }
          th {
            background-color: #e9ecef;
            font-weight: 600;
          }
          .text-left { text-align: left; }
          .text-right { text-align: right; }
          .header-info, .summary-info { font-size: 10pt; }
        </style>
        
        <div class="a4-page">
          <!-- Cabeçalho -->
          <header style="margin-bottom: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid #ccc; padding-bottom: 8px;">
              <div>
                <h1 style="font-size: 20px; font-weight: bold; color: #1f2937; margin: 0 0 4px 0;">Relatório de Status</h1>
                <p style="font-size: 14px; color: #6b7280; margin: 0;" class="header-info">Ordem de Fabricação: <span style="font-weight: 600;">${selectedOF}${faseText}</span></p>
              </div>
              <div style="text-align: right;">
                <p style="font-size: 14px; color: #6b7280; margin: 0;" class="header-info">Gerado em:</p>
                <p style="font-size: 14px; color: #9ca3af; margin: 0;" class="header-info">${currentDate}</p>
              </div>
            </div>
          </header>

          <!-- Resumo -->
          <section style="margin-bottom: 16px;">
            <h2 style="font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #374151;">Resumo por Processo</h2>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; font-size: 12px; color: #6b7280; padding: 8px; border: 1px solid #e5e7eb; border-radius: 8px; background-color: #f9fafb;" class="summary-info">
              <div><strong>Total de Peças:</strong> <span style="font-family: monospace;">${estatisticas.totalPecas}</span></div>
              <div><strong>Peso Corte:</strong> <span style="font-family: monospace;">${estatisticas.pesoTotalCorte.toFixed(2)} kg</span></div>
              <div><strong>Peso Solda:</strong> <span style="font-family: monospace;">${estatisticas.pesoTotalSolda.toFixed(2)} kg</span></div>
              <div><strong>Peso Pintura:</strong> <span style="font-family: monospace;">${estatisticas.pesoTotalPintura.toFixed(2)} kg</span></div>
              <div><strong>Peso Expedição:</strong> <span style="font-family: monospace;">${estatisticas.pesoTotalExpedicao.toFixed(2)} kg</span></div>
            </div>
          </section>

          <!-- Tabela -->
          <main>
            <table>
              <thead>
                <tr>
                  <th>OF</th>
                  <th>Fase</th>
                  <th>Marca</th>
                  <th>Qtd</th>
                  <th>Peso Unit.</th>
                  <th>Peso Total</th>
                  <th>Corte</th>
                  <th>Solda</th>
                  <th>Pint/Galv</th>
                  <th>Expedição</th>
                </tr>
              </thead>
              <tbody>
                ${pecasComStatus.map(peca => `
                  <tr>
                    <td>${peca.of_number}</td>
                    <td>${peca.etapa_fase}</td>
                    <td>${peca.marca}</td>
                    <td>${peca.quantidade}</td>
                    <td class="text-right">${peca.peso_unitario.toFixed(2)} kg</td>
                    <td class="text-right">${peca.peso_total.toFixed(2)} kg</td>
                    <td>${peca.processos.corte ? 'OK' : ''}</td>
                    <td>${!peca.tem_componentes ? 'S/M' : (peca.processos.solda ? 'OK' : '')}</td>
                    <td>${peca.processos.pintura ? 'OK' : ''}</td>
                    <td>${peca.processos.expedicao ? 'OK' : ''}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </main>

          <!-- Rodapé -->
          <footer style="text-align: center; font-size: 10px; color: #9ca3af; margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
            <p>Relatório gerado pelo sistema</p>
          </footer>
        </div>
      `;

      // Criar nova janela para impressão
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está desabilitado.');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Relatório de Status - OF ${selectedOF}${faseText}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
        </head>
        <body>
          ${printTemplate.innerHTML}
        </body>
        </html>
      `);

      printWindow.document.close();
      
      // Aguardar carregamento da fonte antes de imprimir
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);

      toast.success('Impressão iniciada com sucesso!');
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast.error('Erro ao imprimir relatório');
    }
  };

  return (
    <Button
      onClick={generatePrintDocument}
      disabled={pecasComStatus.length === 0}
      variant="outline"
      className="flex items-center gap-2"
    >
      <Printer className="h-4 w-4" />
      Imprimir
    </Button>
  );
};
