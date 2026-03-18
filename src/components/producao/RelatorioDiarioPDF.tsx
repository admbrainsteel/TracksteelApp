import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Printer } from 'lucide-react';
import { formatBrazilianDate } from '@/utils/dateTimeUtils';
import { generateProfessionalPDF, printProfessionalPDF } from '@/utils/pdfGenerator';
import { toast } from 'sonner';

interface ApontamentoDiario {
  id: string;
  of_number: string;
  etapa_fase: string;
  marca: string;
  descricao: string;
  processo: string;
  quantidade: number;
  peso_unitario: number;
  peso_total: number;
  data_apontamento: string;
  created_at: string;
}

interface ResumoProcesso {
  processo: string;
  quantidade: number;
  apontamentos: number;
  peso_total: number;
}

interface EstatisticasRelatorio {
  totalApontamentos: number;
  totalQuantidade: number;
  totalPeso: number;
  processosUnicos: number;
  ofsUnicas: number;
}

interface RelatorioDiarioPDFProps {
  apontamentos: ApontamentoDiario[];
  resumoProcessos: ResumoProcesso[];
  estatisticas: EstatisticasRelatorio;
  selectedDate: string;
}

export const RelatorioDiarioPDF: React.FC<RelatorioDiarioPDFProps> = ({
  apontamentos,
  resumoProcessos,
  estatisticas,
  selectedDate
}) => {
  const getProcessColor = (processo: string) => {
    const processName = processo.toLowerCase();
    if (processName.includes('montagem')) return 'blue';
    if (processName.includes('expedição') || processName.includes('expedicao')) return 'green';
    if (processName.includes('corte')) return 'purple';
    if (processName.includes('pintura') || processName.includes('galv')) return 'yellow';
    if (processName.includes('solda')) return 'orange';
    return 'gray';
  };

  const createPDFTemplate = () => {
    const template = document.createElement('div');
    template.id = 'relatorio-diario-pdf-template';
    template.style.fontFamily = 'Inter, sans-serif';
    template.style.backgroundColor = 'white';
    template.style.padding = '0';
    template.style.margin = '0';
    template.style.width = '170mm';
    template.style.minHeight = '100vh';
    template.style.boxSizing = 'border-box';

    // Agrupar apontamentos por processo
    const apontamentosPorProcesso = apontamentos.reduce((acc, apontamento) => {
      if (!acc[apontamento.processo]) {
        acc[apontamento.processo] = [];
      }
      acc[apontamento.processo].push(apontamento);
      return acc;
    }, {} as Record<string, ApontamentoDiario[]>);

    // Processos principais (coluna completa)
    const processosCompletos = Object.entries(apontamentosPorProcesso).filter(([processo, apontamentosDoProcesso]) => {
      return apontamentosDoProcesso.length > 5;
    });

    // Processos menores (duas colunas)
    const processosMenores = Object.entries(apontamentosPorProcesso).filter(([processo, apontamentosDoProcesso]) => {
      return apontamentosDoProcesso.length <= 5;
    });

    template.innerHTML = `
      <style>
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4;
            margin: 15mm 20mm 15mm 20mm;
          }
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
        
        .page-break {
          page-break-before: always;
        }
        
        .avoid-break {
          page-break-inside: avoid;
        }
        
        .no-break {
          page-break-inside: avoid;
        }
        
        table {
          page-break-inside: avoid;
          width: 100%;
        }
        
        .process-section {
          page-break-inside: avoid;
          margin-bottom: 12px;
        }
        
        .process-header {
          page-break-after: avoid;
        }
        
        .statistics-grid {
          page-break-inside: avoid;
          margin-bottom: 12px;
        }
        
        /* Compactar para impressão */
        h1 { margin-bottom: 4px; }
        h2 { margin-bottom: 6px; margin-top: 8px; }
        h3 { margin-bottom: 4px; }
        section { margin-bottom: 8px; }
        header { margin-bottom: 8px; padding-bottom: 8px; }
      </style>
      
      <!-- Container principal -->
      <div style="width: 100%; margin: 0 auto; padding: 0; box-sizing: border-box;">
        
        <!-- Cabeçalho compacto -->
        <header style="display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; border-bottom: 2px solid #e5e7eb; margin-bottom: 8px;" class="avoid-break">
          <div style="flex: 1;">
            <h1 style="font-size: 18px; font-weight: 700; color: #1f2937; margin: 0 0 4px 0;">Relatório Diário de Produção</h1>
            <p style="font-size: 11px; color: #6b7280; margin: 0;">Relatório consolidado de apontamentos de produção</p>
          </div>
          <div style="text-align: right; flex-shrink: 0;">
            <p style="font-size: 12px; font-weight: 600; color: #374151; margin: 0;">Data: ${formatBrazilianDate(selectedDate)}</p>
          </div>
        </header>

        <!-- Estatísticas Gerais compactas -->
        <section style="margin-bottom: 10px;" class="avoid-break">
          <h2 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 6px;">Estatísticas Gerais</h2>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; text-align: center;" class="statistics-grid">
            <div style="background-color: #f9fafb; padding: 6px; border-radius: 4px; border: 1px solid #e5e7eb;">
              <p style="font-size: 9px; font-weight: 500; color: #6b7280; margin: 0 0 2px 0;">Total de Peças</p>
              <p style="font-size: 14px; font-weight: 700; color: #1f2937; margin: 0;">${estatisticas.totalQuantidade}</p>
            </div>
            <div style="background-color: #f9fafb; padding: 6px; border-radius: 4px; border: 1px solid #e5e7eb;">
              <p style="font-size: 9px; font-weight: 500; color: #6b7280; margin: 0 0 2px 0;">Peso Total</p>
              <p style="font-size: 14px; font-weight: 700; color: #1f2937; margin: 0;">${estatisticas.totalPeso.toFixed(0)} kg</p>
            </div>
            <div style="background-color: #f9fafb; padding: 6px; border-radius: 4px; border: 1px solid #e5e7eb;">
              <p style="font-size: 9px; font-weight: 500; color: #6b7280; margin: 0 0 2px 0;">Nº de Apontamentos</p>
              <p style="font-size: 14px; font-weight: 700; color: #1f2937; margin: 0;">${estatisticas.totalApontamentos}</p>
            </div>
            <div style="background-color: #f9fafb; padding: 6px; border-radius: 4px; border: 1px solid #e5e7eb;">
              <p style="font-size: 9px; font-weight: 500; color: #6b7280; margin: 0 0 2px 0;">Nº de Processos</p>
              <p style="font-size: 14px; font-weight: 700; color: #1f2937; margin: 0;">${estatisticas.processosUnicos}</p>
            </div>
            <div style="background-color: #f9fafb; padding: 6px; border-radius: 4px; border: 1px solid #e5e7eb;">
              <p style="font-size: 9px; font-weight: 500; color: #6b7280; margin: 0 0 2px 0;">Nº de OFs</p>
              <p style="font-size: 14px; font-weight: 700; color: #1f2937; margin: 0;">${estatisticas.ofsUnicas}</p>
            </div>
          </div>
        </section>

        <!-- Detalhamento por Processo compacto -->
        <section>
          <h2 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px; border-top: 2px solid #e5e7eb; padding-top: 8px;" class="process-header">Detalhamento por Processo</h2>
          
          <!-- Processos Completos -->
          <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;">
            ${processosCompletos.map(([processo, apontamentosDoProcesso]) => {
              const color = getProcessColor(processo);
              const resumoProcesso = resumoProcessos.find(r => r.processo === processo);
              const totalPecas = resumoProcesso?.quantidade || 0;
              const pesoTotal = resumoProcesso?.peso_total || 0;

              const colorMap = {
                blue: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', bgLight: '#eff6ff' },
                green: { bg: '#dcfce7', border: '#10b981', text: '#047857', bgLight: '#f0fdf4' },
                purple: { bg: '#e9d5ff', border: '#8b5cf6', text: '#6b21a8', bgLight: '#f3e8ff' },
                yellow: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', bgLight: '#fffbeb' },
                orange: { bg: '#fed7aa', border: '#f97316', text: '#c2410c', bgLight: '#fff7ed' },
                gray: { bg: '#f3f4f6', border: '#6b7280', text: '#374151', bgLight: '#f9fafb' }
              };

              const colors = colorMap[color as keyof typeof colorMap];

              return `
                <div class="process-section avoid-break">
                  <h3 style="font-size: 12px; font-weight: 700; color: ${colors.text}; background-color: ${colors.bg}; padding: 4px 8px; border-radius: 3px 3px 0 0; margin: 0;" class="process-header">Processo: ${processo}</h3>
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; background-color: ${colors.bgLight}; padding: 4px; border-left: 2px solid ${colors.border}; border-right: 2px solid ${colors.border}; border-bottom: 2px solid ${colors.border}; border-radius: 0 0 3px 3px; margin-bottom: 4px;">
                    <div style="text-align: center;">
                      <p style="font-size: 9px; font-weight: 500; color: ${colors.text}; margin: 0 0 2px 0;">Total de Peças no Processo</p>
                      <p style="font-size: 12px; font-weight: 700; color: ${colors.text}; margin: 0;">${totalPecas}</p>
                    </div>
                    <div style="text-align: center;">
                      <p style="font-size: 9px; font-weight: 500; color: ${colors.text}; margin: 0 0 2px 0;">Peso Total no Processo</p>
                      <p style="font-size: 12px; font-weight: 700; color: ${colors.text}; margin: 0;">${pesoTotal.toFixed(0)} kg</p>
                    </div>
                  </div>
                  <div style="overflow-x: auto; width: 100%;" class="no-break">
                    <table style="width: 100%; background-color: white; border-collapse: collapse; border: 1px solid #e5e7eb;">
                      <thead style="background-color: #f9fafb;">
                        <tr>
                          <th style="padding: 3px 4px; text-align: left; font-size: 8px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; width: 10%;">OF</th>
                          <th style="padding: 3px 4px; text-align: left; font-size: 8px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; width: 10%;">Fase</th>
                          <th style="padding: 3px 4px; text-align: left; font-size: 8px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; width: 15%;">Marca</th>
                          <th style="padding: 3px 4px; text-align: left; font-size: 8px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; width: 45%;">Descrição</th>
                          <th style="padding: 3px 4px; text-align: right; font-size: 8px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; width: 10%;">Qtd</th>
                          <th style="padding: 3px 4px; text-align: right; font-size: 8px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; width: 10%;">Peso</th>
                        </tr>
                      </thead>
                      <tbody>
                        ${apontamentosDoProcesso.map(apontamento => `
                          <tr style="border-bottom: 1px solid #e5e7eb;">
                            <td style="padding: 2px 4px; font-size: 8px; border-right: 1px solid #e5e7eb;">${apontamento.of_number}</td>
                            <td style="padding: 2px 4px; font-size: 8px; border-right: 1px solid #e5e7eb;">${apontamento.etapa_fase}</td>
                            <td style="padding: 2px 4px; font-size: 8px; border-right: 1px solid #e5e7eb;">${apontamento.marca}</td>
                            <td style="padding: 2px 4px; font-size: 8px; border-right: 1px solid #e5e7eb;">${apontamento.descricao}</td>
                            <td style="padding: 2px 4px; text-align: right; font-size: 8px; border-right: 1px solid #e5e7eb;">${apontamento.quantidade}</td>
                            <td style="padding: 2px 4px; text-align: right; font-size: 8px; font-weight: 600;">${apontamento.peso_total.toFixed(0)} kg</td>
                          </tr>
                        `).join('')}
                      </tbody>
                    </table>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <!-- Processos Menores (duas colunas) compactos -->
          ${processosMenores.length > 0 ? `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
              ${processosMenores.map(([processo, apontamentosDoProcesso]) => {
                const color = getProcessColor(processo);
                const resumoProcesso = resumoProcessos.find(r => r.processo === processo);
                const totalPecas = resumoProcesso?.quantidade || 0;
                const pesoTotal = resumoProcesso?.peso_total || 0;

                const colorMap = {
                  blue: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', bgLight: '#eff6ff' },
                  green: { bg: '#dcfce7', border: '#10b981', text: '#047857', bgLight: '#f0fdf4' },
                  purple: { bg: '#e9d5ff', border: '#8b5cf6', text: '#6b21a8', bgLight: '#f3e8ff' },
                  yellow: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', bgLight: '#fffbeb' },
                  orange: { bg: '#fed7aa', border: '#f97316', text: '#c2410c', bgLight: '#fff7ed' },
                  gray: { bg: '#f3f4f6', border: '#6b7280', text: '#374151', bgLight: '#f9fafb' }
                };

                const colors = colorMap[color as keyof typeof colorMap];

                return `
                  <div class="process-section avoid-break">
                    <h3 style="font-size: 10px; font-weight: 700; color: ${colors.text}; background-color: ${colors.bg}; padding: 3px 6px; border-radius: 2px 2px 0 0; margin: 0;" class="process-header">Processo: ${processo}</h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 3px; background-color: ${colors.bgLight}; padding: 3px; border-left: 2px solid ${colors.border}; border-right: 2px solid ${colors.border}; border-bottom: 2px solid ${colors.border}; border-radius: 0 0 2px 2px; margin-bottom: 3px;">
                      <div style="text-align: center;">
                        <p style="font-size: 7px; font-weight: 500; color: ${colors.text}; margin: 0 0 1px 0;">Total Peças</p>
                        <p style="font-size: 10px; font-weight: 700; color: ${colors.text}; margin: 0;">${totalPecas}</p>
                      </div>
                      <div style="text-align: center;">
                        <p style="font-size: 7px; font-weight: 500; color: ${colors.text}; margin: 0 0 1px 0;">Peso Total</p>
                        <p style="font-size: 10px; font-weight: 700; color: ${colors.text}; margin: 0;">${pesoTotal.toFixed(0)} kg</p>
                      </div>
                    </div>
                    <div style="overflow-x: auto; width: 100%;" class="no-break">
                      <table style="width: 100%; background-color: white; border-collapse: collapse; border: 1px solid #e5e7eb;">
                        <thead style="background-color: #f9fafb;">
                          <tr>
                            <th style="padding: 2px 3px; text-align: left; font-size: 7px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">Marca</th>
                            <th style="padding: 2px 3px; text-align: right; font-size: 7px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">Qtd</th>
                            <th style="padding: 2px 3px; text-align: right; font-size: 7px; font-weight: 600; color: #6b7280; border-bottom: 1px solid #e5e7eb;">Peso</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${apontamentosDoProcesso.map(apontamento => `
                            <tr style="border-bottom: 1px solid #e5e7eb;">
                              <td style="padding: 2px 3px; font-size: 7px; border-right: 1px solid #e5e7eb;">${apontamento.marca}</td>
                              <td style="padding: 2px 3px; text-align: right; font-size: 7px; border-right: 1px solid #e5e7eb;">${apontamento.quantidade}</td>
                              <td style="padding: 2px 3px; text-align: right; font-size: 7px; font-weight: 600;">${apontamento.peso_total.toFixed(0)} kg</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          ` : ''}
        </section>
      </div>
    `;

    return template;
  };

  const gerarPDF = async () => {
    try {
      const template = createPDFTemplate();
      
      // Adicionar template ao DOM temporariamente
      document.body.appendChild(template);
      
      // Gerar PDF
      const filename = `relatorio-diario-producao-${selectedDate}.pdf`;
      await generateProfessionalPDF('relatorio-diario-pdf-template', filename);
      
      // Remover template do DOM
      document.body.removeChild(template);
      
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const imprimirRelatorio = async () => {
    try {
      const template = createPDFTemplate();
      
      // Adicionar template ao DOM temporariamente
      document.body.appendChild(template);
      
      // Imprimir
      await printProfessionalPDF('relatorio-diario-pdf-template');
      
      // Remover template do DOM
      document.body.removeChild(template);
      
      toast.success('Impressão iniciada com sucesso!');
    } catch (error) {
      console.error('Erro ao imprimir:', error);
      toast.error('Erro ao imprimir relatório');
    }
  };

  return (
    <div className="flex gap-2">
      <Button
        onClick={gerarPDF}
        disabled={apontamentos.length === 0}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
      >
        <FileText className="h-4 w-4" />
        GERAR PDF
      </Button>
      <Button
        onClick={imprimirRelatorio}
        disabled={apontamentos.length === 0}
        variant="outline"
        className="flex items-center gap-2"
      >
        <Printer className="h-4 w-4" />
        IMPRIMIR
      </Button>
    </div>
  );
};
