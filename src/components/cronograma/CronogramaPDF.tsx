
import React, { useEffect } from 'react';
import { CronogramaOf } from '@/hooks/useCronogramas';
import { useBrandSettings } from '@/hooks/useBrandSettings';
import jsPDF from 'jspdf';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CronogramaPDFProps {
  cronograma: CronogramaOf;
  onComplete?: () => void;
}

export const CronogramaPDF: React.FC<CronogramaPDFProps> = ({ cronograma, onComplete }) => {
  const { brandSettings } = useBrandSettings();

  const calcularDiasCorridos = (dataInicio: string, dataFim: string) => {
    return differenceInDays(parseISO(dataFim), parseISO(dataInicio)) + 1;
  };

  const gerarPDF = async () => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    
    // Configurações de cores (tons profissionais em cinza)
    const corCinzaClaro = [200, 200, 200]; // Cinza claro para cabeçalho
    const corCinzaMedio = [150, 150, 150]; // Cinza médio
    const corCinzaEscuro = [80, 80, 80]; // Cinza escuro para texto
    const corBranco = [255, 255, 255]; // Branco
    
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;
    const usableWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // CABEÇALHO COMPACTO
    // Fundo do cabeçalho - altura reduzida para 25px
    doc.setFillColor(corCinzaClaro[0], corCinzaClaro[1], corCinzaClaro[2]);
    doc.rect(0, 0, pageWidth, 25, 'F');

    // Logo da empresa (tamanho reduzido)
    if (brandSettings.logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = brandSettings.logo_url!;
        });
        
        // Logo menor - 20x15
        const logoWidth = 20;
        const logoHeight = 15;
        doc.addImage(img, 'PNG', margin, 5, logoWidth, logoHeight);
      } catch (error) {
        console.log('Erro ao carregar logo:', error);
      }
    }

    // Nome da empresa e título
    doc.setTextColor(corCinzaEscuro[0], corCinzaEscuro[1], corCinzaEscuro[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(brandSettings.company_name, brandSettings.logo_url ? margin + 25 : margin, 12);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('CRONOGRAMA DE PRODUÇÃO', brandSettings.logo_url ? margin + 25 : margin, 18);

    yPosition = 35;

    // TÍTULO DO CRONOGRAMA
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPosition - 3, usableWidth, 12, 'F');
    
    doc.setTextColor(corCinzaEscuro[0], corCinzaEscuro[1], corCinzaEscuro[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    const titulo = `OF: ${cronograma.ordem_fabricacao?.num_of} - Revisão: ${cronograma.revisao}`;
    doc.text(titulo, margin + 3, yPosition + 3);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gestor: ${cronograma.gestor_profile?.full_name || 'N/A'}`, margin + 3, yPosition + 8);
    
    yPosition += 18;

    // RESUMO EXECUTIVO COMPACTO
    const todasAsDatas = cronograma.processos.flatMap(p => [p.data_inicio, p.data_fim]);
    const dataInicioTotal = new Date(Math.min(...todasAsDatas.map(d => new Date(d).getTime())));
    const dataFimTotal = new Date(Math.max(...todasAsDatas.map(d => new Date(d).getTime())));
    const duracaoTotal = differenceInDays(dataFimTotal, dataInicioTotal) + 1;

    // Boxes do resumo em linha
    const boxWidth = (usableWidth) / 3;
    
    doc.setFillColor(corBranco[0], corBranco[1], corBranco[2]);
    doc.setDrawColor(corCinzaMedio[0], corCinzaMedio[1], corCinzaMedio[2]);
    
    // Box 1
    doc.rect(margin, yPosition, boxWidth - 2, 15, 'FD');
    doc.setTextColor(corCinzaEscuro[0], corCinzaEscuro[1], corCinzaEscuro[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${cronograma.processos.length} Processos`, margin + 3, yPosition + 6);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Total', margin + 3, yPosition + 11);

    // Box 2
    doc.rect(margin + boxWidth, yPosition, boxWidth - 2, 15, 'FD');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${duracaoTotal} dias`, margin + boxWidth + 3, yPosition + 6);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Duração', margin + boxWidth + 3, yPosition + 11);

    // Box 3
    doc.rect(margin + boxWidth * 2, yPosition, boxWidth - 2, 15, 'FD');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`${format(dataInicioTotal, 'dd/MM', { locale: ptBR })} - ${format(dataFimTotal, 'dd/MM', { locale: ptBR })}`, margin + boxWidth * 2 + 3, yPosition + 6);
    doc.setFont('helvetica', 'normal');
    doc.text('Período', margin + boxWidth * 2 + 3, yPosition + 11);

    yPosition += 22;

    // TABELA COMPACTA
    doc.setFillColor(corCinzaClaro[0], corCinzaClaro[1], corCinzaClaro[2]);
    doc.rect(margin, yPosition, usableWidth, 8, 'F');
    
    doc.setTextColor(corCinzaEscuro[0], corCinzaEscuro[1], corCinzaEscuro[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CRONOGRAMA DETALHADO', margin + 3, yPosition + 5);
    
    yPosition += 10;

    // Cabeçalho da tabela - altura reduzida
    const colWidths = [usableWidth * 0.4, usableWidth * 0.2, usableWidth * 0.2, usableWidth * 0.2];
    const headers = ['Processo', 'Início', 'Fim', 'Duração'];
    
    doc.setFillColor(245, 245, 245);
    doc.rect(margin, yPosition, usableWidth, 7, 'F');
    
    doc.setTextColor(corCinzaEscuro[0], corCinzaEscuro[1], corCinzaEscuro[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    
    let xPosition = margin;
    headers.forEach((header, index) => {
      doc.text(header, xPosition + 2, yPosition + 5);
      xPosition += colWidths[index];
    });
    
    yPosition += 7;

    // Linhas da tabela - altura reduzida em 40% (de 12 para 7.2)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    cronograma.processos
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
      .forEach((processo, index) => {
        // Alternância de cores
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250);
          doc.rect(margin, yPosition, usableWidth, 7, 'F');
        }

        xPosition = margin;
        const rowData = [
          processo.nome_processo.length > 25 ? processo.nome_processo.substring(0, 25) + '...' : processo.nome_processo,
          format(parseISO(processo.data_inicio), 'dd/MM', { locale: ptBR }),
          format(parseISO(processo.data_fim), 'dd/MM', { locale: ptBR }),
          `${calcularDiasCorridos(processo.data_inicio, processo.data_fim)}d`
        ];

        doc.setTextColor(corCinzaEscuro[0], corCinzaEscuro[1], corCinzaEscuro[2]);
        rowData.forEach((data, colIndex) => {
          doc.text(data, xPosition + 2, yPosition + 5);
          xPosition += colWidths[colIndex];
        });

        yPosition += 7;
      });

    yPosition += 10;

    // GRÁFICO DE GANTT VISUAL MELHORADO
    doc.setFillColor(corCinzaClaro[0], corCinzaClaro[1], corCinzaClaro[2]);
    doc.rect(margin, yPosition, usableWidth, 8, 'F');
    
    doc.setTextColor(corCinzaEscuro[0], corCinzaEscuro[1], corCinzaEscuro[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('LINHA DO TEMPO VISUAL', margin + 3, yPosition + 5);
    
    yPosition += 12;

    // Escala de tempo
    doc.setTextColor(corCinzaMedio[0], corCinzaMedio[1], corCinzaMedio[2]);
    doc.setFontSize(8);
    doc.text(format(dataInicioTotal, 'dd/MM/yy', { locale: ptBR }), margin, yPosition - 2);
    doc.text(format(dataFimTotal, 'dd/MM/yy', { locale: ptBR }), margin + usableWidth - 20, yPosition - 2);
    doc.text(`${duracaoTotal} dias`, margin + usableWidth/2 - 10, yPosition - 2);

    // Linha de base
    doc.setDrawColor(corCinzaMedio[0], corCinzaMedio[1], corCinzaMedio[2]);
    doc.line(margin, yPosition, margin + usableWidth, yPosition);

    yPosition += 3;

    // Barras dos processos - área reservada para nomes maior
    const cores = [
      [52, 152, 219],   // Azul
      [46, 204, 113],   // Verde
      [241, 196, 15],   // Amarelo
      [155, 89, 182],   // Roxo
      [231, 76, 60],    // Vermelho
      [230, 126, 34],   // Laranja
      [26, 188, 156],   // Turquesa
      [127, 140, 141]   // Cinza
    ];

    const nomeAreaWidth = 60; // Área reservada para nomes dos processos
    const graficoWidth = usableWidth - nomeAreaWidth - 5;

    cronograma.processos
      .sort((a, b) => (a.ordem || 0) - (b.ordem || 0))
      .forEach((processo, index) => {
        const diasDoInicio = differenceInDays(parseISO(processo.data_inicio), dataInicioTotal);
        const duracaoProcesso = calcularDiasCorridos(processo.data_inicio, processo.data_fim);
        
        const barraInicio = margin + nomeAreaWidth + (diasDoInicio / duracaoTotal) * graficoWidth;
        const barraLargura = Math.max(2, (duracaoProcesso / duracaoTotal) * graficoWidth);
        
        // Nome do processo na área reservada
        doc.setTextColor(corCinzaEscuro[0], corCinzaEscuro[1], corCinzaEscuro[2]);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        const nomeProcesso = processo.nome_processo.length > 20 ? 
          processo.nome_processo.substring(0, 20) + '...' : 
          processo.nome_processo;
        doc.text(nomeProcesso, margin, yPosition + 2);
        
        // Barra colorida
        const cor = cores[index % cores.length];
        doc.setFillColor(cor[0], cor[1], cor[2]);
        doc.rect(barraInicio, yPosition - 1, barraLargura, 6, 'F');
        
        // Duração na barra (se houver espaço)
        if (barraLargura > 8) {
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(6);
          doc.setFont('helvetica', 'bold');
          doc.text(`${duracaoProcesso}d`, barraInicio + barraLargura/2 - 2, yPosition + 2);
        }
        
        yPosition += 8;
      });

    // RODAPÉ COMPACTO
    doc.setFillColor(corCinzaClaro[0], corCinzaClaro[1], corCinzaClaro[2]);
    doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
    
    doc.setTextColor(corCinzaEscuro[0], corCinzaEscuro[1], corCinzaEscuro[2]);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text(`${brandSettings.company_name} - Sistema de Gestão`, margin, pageHeight - 8);
    doc.text(`${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 35, pageHeight - 8);

    // Download do PDF
    const nomeArquivo = `cronograma_${cronograma.ordem_fabricacao?.num_of}_rev${cronograma.revisao}_${format(new Date(), 'ddMMyyyy')}.pdf`;
    doc.save(nomeArquivo);
    
    if (onComplete) {
      onComplete();
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      gerarPDF();
    }, 100);

    return () => clearTimeout(timer);
  }, [cronograma, onComplete, brandSettings]);

  return null;
};
