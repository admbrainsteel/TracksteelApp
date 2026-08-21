import React, { useEffect, useCallback } from 'react';
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
    try {
      const inc = parseISO(dataInicio);
      const fim = parseISO(dataFim);
      const diff = differenceInDays(fim, inc);
      return diff >= 0 ? diff + 1 : 1;
    } catch {
      return 1;
    }
  };

  const gerarPDF = useCallback(async () => {
    // Formato Paisagem A4 (297mm x 210mm) - Amplo espaço para gráfico Gantt e tabela
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    const pageWidth = doc.internal.pageSize.width;  // 297mm
    const pageHeight = doc.internal.pageSize.height; // 210mm
    const margin = 12;
    const usableWidth = pageWidth - (margin * 2);   // 273mm

    // Palette de Cores Executiva Modern
    const cPrimary = [15, 23, 42];      // Slate 900 (Fundo do cabeçalho)
    const cSecondary = [30, 41, 59];    // Slate 800
    const cAccent = [37, 99, 235];      // Royal Blue (Highlight)
    const cAccentLight = [239, 246, 255];// Light Blue Tint
    const cTextDark = [30, 41, 59];     // Slate 800 (Texto principal)
    const cTextMuted = [100, 116, 139]; // Slate 500 (Subtítulos)
    const cBorder = [226, 232, 240];    // Slate 200 (Bordas)
    const cBgCard = [248, 250, 252];    // Slate 50 (Fundo de cards)
    const cWhite = [255, 255, 255];

    // ----------------------------------------------------
    // 1. CABEÇALHO EXECUTIVO (HEADER SLATE DARK BANNER)
    // ----------------------------------------------------
    const headerHeight = 28;
    doc.setFillColor(cPrimary[0], cPrimary[1], cPrimary[2]);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    // Accent line abaixo do cabeçalho
    doc.setFillColor(cAccent[0], cAccent[1], cAccent[2]);
    doc.rect(0, headerHeight, pageWidth, 1.5, 'F');

    let headerTextX = margin;

    // Logo da Empresa com proporção preservada (Sem distorção)
    if (brandSettings.logo_url) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = brandSettings.logo_url!;
        });
        
        // Calcular aspect ratio para não espremer a imagem
        const maxH = 16;
        const maxW = 45;
        let imgW = maxH * (img.naturalWidth / img.naturalHeight);
        let imgH = maxH;
        if (imgW > maxW) {
          imgW = maxW;
          imgH = maxW * (img.naturalHeight / img.naturalWidth);
        }
        
        const logoY = (headerHeight - imgH) / 2;
        doc.addImage(img, 'PNG', margin, logoY, imgW, imgH);
        headerTextX = margin + imgW + 8;
      } catch (error) {
        console.log('Erro ao carregar logo no PDF:', error);
      }
    }

    // Título da Empresa & Documento
    doc.setTextColor(cWhite[0], cWhite[1], cWhite[2]);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(brandSettings.company_name || 'TrackSteel', headerTextX, 12);

    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO EXECUTIVO DE CRONOGRAMA DE PRODUÇÃO', headerTextX, 19);

    // Badges no canto direito do cabeçalho
    const badgeY = 8;
    const badgeRight = pageWidth - margin;

    // Pill de OF
    const ofNum = cronograma.ordem_fabricacao?.num_of || 'N/A';
    doc.setFillColor(cSecondary[0], cSecondary[1], cSecondary[2]);
    doc.roundedRect(badgeRight - 65, badgeY, 35, 12, 2, 2, 'F');
    doc.setTextColor(cWhite[0], cWhite[1], cWhite[2]);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text(`OF: ${ofNum}`, badgeRight - 47.5, badgeY + 7.5, { align: 'center' });

    // Pill de Revisão
    doc.setFillColor(cAccent[0], cAccent[1], cAccent[2]);
    doc.roundedRect(badgeRight - 27, badgeY, 27, 12, 2, 2, 'F');
    doc.text(`REV: ${cronograma.revisao || 1}`, badgeRight - 13.5, badgeY + 7.5, { align: 'center' });

    let yPos = headerHeight + 8;

    // ----------------------------------------------------
    // 2. CARDS DE RESUMO / KPIS
    // ----------------------------------------------------
    const processos = (cronograma.processos || []).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
    
    // Cálculo das datas gerais
    let dataInicioTotal = new Date();
    let dataFimTotal = new Date();
    let duracaoTotal = 0;

    if (processos.length > 0) {
      const datasInicio = processos.map(p => parseISO(p.data_inicio).getTime()).filter(t => !isNaN(t));
      const datasFim = processos.map(p => parseISO(p.data_fim).getTime()).filter(t => !isNaN(t));

      if (datasInicio.length > 0 && datasFim.length > 0) {
        dataInicioTotal = new Date(Math.min(...datasInicio));
        dataFimTotal = new Date(Math.max(...datasFim));
        duracaoTotal = differenceInDays(dataFimTotal, dataInicioTotal) + 1;
      }
    }

    const cardGap = 5;
    const cardWidth = (usableWidth - (cardGap * 3)) / 4;
    const cardHeight = 18;

    const cardsData = [
      {
        title: 'ESTRUTURA / OF',
        value: `${ofNum} - ${cronograma.ordem_fabricacao?.descritivo || 'Sem descrição'}`
      },
      {
        title: 'GESTOR / RESPONSÁVEL',
        value: cronograma.gestor_profile?.full_name || 'Não atribuído'
      },
      {
        title: 'DURAÇÃO & PROCESSO',
        value: `${duracaoTotal} Dias Corridos (${processos.length} etapas)`
      },
      {
        title: 'PERÍODO PREVISTO',
        value: `${format(dataInicioTotal, 'dd/MM/yyyy')} a ${format(dataFimTotal, 'dd/MM/yyyy')}`
      }
    ];

    cardsData.forEach((card, idx) => {
      const cardX = margin + idx * (cardWidth + cardGap);
      
      // Card Container
      doc.setFillColor(cBgCard[0], cBgCard[1], cBgCard[2]);
      doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
      doc.roundedRect(cardX, yPos, cardWidth, cardHeight, 1.5, 1.5, 'FD');

      // Top Accent Line
      doc.setFillColor(cAccent[0], cAccent[1], cAccent[2]);
      doc.rect(cardX, yPos, cardWidth, 1, 'F');

      // Card Title
      doc.setTextColor(cTextMuted[0], cTextMuted[1], cTextMuted[2]);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text(card.title, cardX + 3, yPos + 5.5);

      // Card Value
      doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      const textTruncated = card.value.length > 32 ? card.value.substring(0, 32) + '...' : card.value;
      doc.text(textTruncated, cardX + 3, yPos + 12.5);
    });

    yPos += cardHeight + 8;

    // ----------------------------------------------------
    // 3. ESTRUTURA PRINCIPAL: TABELA (ESQUERDA) + GANTT (DIREITA)
    // ----------------------------------------------------
    const tableWidth = 110; // Tabela ocupa 110mm
    const ganttWidth = usableWidth - tableWidth - 6; // Gantt ocupa o restante (~157mm)
    const ganttX = margin + tableWidth + 6;

    // TÍTULOS DAS SEÇÕES
    doc.setFillColor(cSecondary[0], cSecondary[1], cSecondary[2]);
    doc.roundedRect(margin, yPos, tableWidth, 7, 1, 1, 'F');
    doc.setTextColor(cWhite[0], cWhite[1], cWhite[2]);
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.text('ETAPAS E CRONOGRAMA DETALHADO', margin + 4, yPos + 4.8);

    doc.setFillColor(cSecondary[0], cSecondary[1], cSecondary[2]);
    doc.roundedRect(ganttX, yPos, ganttWidth, 7, 1, 1, 'F');
    doc.text('VISUALIZAÇÃO DE LINHA DO TEMPO (GANTT)', ganttX + 4, yPos + 4.8);

    yPos += 9;

    // --- TABELA DE PROCESSOS ---
    const colWidths = [10, 48, 20, 20, 12]; // Total: 110mm
    const headers = ['#', 'Processo / Etapa', 'Início', 'Fim', 'Dias'];

    doc.setFillColor(cBgCard[0], cBgCard[1], cBgCard[2]);
    doc.rect(margin, yPos, tableWidth, 6, 'F');
    doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
    doc.line(margin, yPos + 6, margin + tableWidth, yPos + 6);

    doc.setTextColor(cTextMuted[0], cTextMuted[1], cTextMuted[2]);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');

    let colX = margin;
    headers.forEach((h, i) => {
      const align = i >= 2 ? 'center' : 'left';
      const textPosX = align === 'center' ? colX + colWidths[i] / 2 : colX + 2;
      doc.text(h, textPosX, yPos + 4.2, { align });
      colX += colWidths[i];
    });

    let tableY = yPos + 6;
    const rowHeight = 7.5;

    // --- GRÁFICO GANTT (CABEÇALHO DE DATAS) ---
    doc.setFillColor(cBgCard[0], cBgCard[1], cBgCard[2]);
    doc.rect(ganttX, yPos, ganttWidth, 6, 'F');
    doc.line(ganttX, yPos + 6, ganttX + ganttWidth, yPos + 6);

    doc.setTextColor(cTextMuted[0], cTextMuted[1], cTextMuted[2]);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');

    doc.text(format(dataInicioTotal, 'dd/MM'), ganttX + 2, yPos + 4.2);
    doc.text(format(dataFimTotal, 'dd/MM'), ganttX + ganttWidth - 2, yPos + 4.2, { align: 'right' });
    doc.text(`Total: ${duracaoTotal}d`, ganttX + ganttWidth / 2, yPos + 4.2, { align: 'center' });

    // Paleta Elegante para as Barras de Gantt
    const barColors = [
      [37, 99, 235],   // Royal Blue
      [16, 185, 129],  // Emerald Green
      [245, 158, 11],  // Amber
      [139, 92, 246],  // Purple
      [236, 72, 153],  // Pink
      [14, 165, 233],  // Sky Blue
      [20, 184, 166],  // Teal
      [249, 115, 22]   // Orange
    ];

    // RENDERIZAR LINHAS DA TABELA E BARRAS GANTT
    processos.forEach((proc, idx) => {
      // Alternância de cor da linha na tabela
      if (idx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(248, 250, 252);
      }
      doc.rect(margin, tableY, tableWidth, rowHeight, 'F');

      // Borda inferior da linha
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, tableY + rowHeight, margin + tableWidth, tableY + rowHeight);

      // Dados da tabela
      doc.setFontSize(7.5);
      doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);

      let cX = margin;
      
      // Index #
      doc.setFont('helvetica', 'bold');
      doc.text(`${idx + 1}`, cX + colWidths[0] / 2, tableY + 5, { align: 'center' });
      cX += colWidths[0];

      // Nome do Processo
      doc.setFont('helvetica', 'normal');
      const nomeProc = proc.nome_processo.length > 24 ? proc.nome_processo.substring(0, 24) + '...' : proc.nome_processo;
      doc.text(nomeProc, cX + 2, tableY + 5);
      cX += colWidths[1];

      // Data Início
      const dIncStr = format(parseISO(proc.data_inicio), 'dd/MM/yy');
      doc.text(dIncStr, cX + colWidths[2] / 2, tableY + 5, { align: 'center' });
      cX += colWidths[2];

      // Data Fim
      const dFimStr = format(parseISO(proc.data_fim), 'dd/MM/yy');
      doc.text(dFimStr, cX + colWidths[3] / 2, tableY + 5, { align: 'center' });
      cX += colWidths[3];

      // Duração em Dias
      const diasProc = calcularDiasCorridos(proc.data_inicio, proc.data_fim);
      doc.setFont('helvetica', 'bold');
      doc.text(`${diasProc}d`, cX + colWidths[4] / 2, tableY + 5, { align: 'center' });

      // --- LINHA E BARRA DO GANTT ---
      // Fundo e linha de grade do Gantt
      if (idx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(248, 250, 252);
      }
      doc.rect(ganttX, tableY, ganttWidth, rowHeight, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.line(ganttX, tableY + rowHeight, ganttX + ganttWidth, tableY + rowHeight);

      // Calcular posição da barra Gantt proporcional
      const procStart = parseISO(proc.data_inicio).getTime();
      const offsetDays = Math.max(0, differenceInDays(new Date(procStart), dataInicioTotal));
      
      const pxPerDay = ganttWidth / (duracaoTotal || 1);
      const barX = ganttX + (offsetDays * pxPerDay);
      const barW = Math.max(4, diasProc * pxPerDay);

      // Desenhar Barra Arredondada Modern
      const color = barColors[idx % barColors.length];
      doc.setFillColor(color[0], color[1], color[2]);
      doc.roundedRect(barX, tableY + 1.5, barW, rowHeight - 3, 1.2, 1.2, 'F');

      // Texto dentro ou ao lado da barra
      doc.setTextColor(cWhite[0], cWhite[1], cWhite[2]);
      doc.setFontSize(6.5);
      doc.setFont('helvetica', 'bold');

      if (barW >= 15) {
        doc.text(`${diasProc}d`, barX + (barW / 2), tableY + 5, { align: 'center' });
      } else {
        // Se a barra for pequena, desenha a tag fora
        doc.setTextColor(cTextDark[0], cTextDark[1], cTextDark[2]);
        doc.text(`${diasProc}d`, barX + barW + 2, tableY + 5);
      }

      tableY += rowHeight;
    });

    // Borda ao redor das caixas
    doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
    doc.rect(margin, yPos + 6, tableWidth, (processos.length + 1) * rowHeight, 'S');
    doc.rect(ganttX, yPos + 6, ganttWidth, (processos.length + 1) * rowHeight, 'S');

    // ----------------------------------------------------
    // 4. RODAPÉ EXECUTIVO (FOOTER)
    // ----------------------------------------------------
    const footerY = pageHeight - 10;

    doc.setDrawColor(cBorder[0], cBorder[1], cBorder[2]);
    doc.line(margin, footerY - 3, pageWidth - margin, footerY - 3);

    doc.setTextColor(cTextMuted[0], cTextMuted[1], cTextMuted[2]);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    
    doc.text(
      `${brandSettings.company_name || 'TrackSteel'} — Sistema Integrado de Gestão Estrutural`,
      margin,
      footerY + 1
    );

    const nowFormatted = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR });
    doc.text(
      `Documento Gerado em ${nowFormatted} | Página 1 de 1`,
      pageWidth - margin,
      footerY + 1,
      { align: 'right' }
    );

    // Download automático do PDF
    const safeOF = (cronograma.ordem_fabricacao?.num_of || 'OF').replace(/[^a-zA-Z0-9_-]/g, '');
    const nomeArquivo = `cronograma_${safeOF}_rev${cronograma.revisao || 1}_${format(new Date(), 'ddMMyyyy')}.pdf`;
    doc.save(nomeArquivo);
    
    if (onComplete) {
      onComplete();
    }
  }, [cronograma, onComplete, brandSettings]);

  useEffect(() => {
    const timer = setTimeout(() => {
      gerarPDF();
    }, 100);

    return () => clearTimeout(timer);
  }, [gerarPDF]);

  return null;
};
