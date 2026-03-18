import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generateProfessionalPDF = async (elementId: string, filename: string) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Elemento não encontrado para gerar PDF');
    }

    // Aguardar um pouco para garantir que o elemento esteja completamente renderizado
    await new Promise(resolve => setTimeout(resolve, 200));

    // Garantir que o elemento esteja visível e com dimensões corretas
    const originalDisplay = element.style.display;
    const originalVisibility = element.style.visibility;
    const originalPosition = element.style.position;
    
    element.style.display = 'block';
    element.style.visibility = 'visible';
    element.style.position = 'relative';
    
    // Forçar um reflow
    element.offsetHeight;
    
    // Aguardar mais um pouco após forçar o reflow
    await new Promise(resolve => setTimeout(resolve, 300));

    console.log('Gerando PDF para elemento:', elementId);
    console.log('Dimensões do elemento:', {
      width: element.offsetWidth,
      height: element.offsetHeight,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight
    });

    // Se o elemento não tem dimensões, isso pode causar PDF em branco
    if (element.offsetWidth === 0 || element.offsetHeight === 0) {
      throw new Error('Elemento tem dimensões zero - não é possível gerar PDF');
    }

    // Configurações otimizadas para html2canvas
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      scrollX: 0,
      scrollY: 0,
      windowWidth: Math.max(element.scrollWidth, 1200),
      windowHeight: Math.max(element.scrollHeight, 800),
      foreignObjectRendering: false,
      removeContainer: false,
      imageTimeout: 10000,
      logging: false
    });

    console.log('Canvas criado com sucesso:', {
      width: canvas.width,
      height: canvas.height
    });

    // Verificar se o canvas foi criado corretamente
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas criado com dimensões zero');
    }

    // Restaurar estilos originais
    element.style.display = originalDisplay;
    element.style.visibility = originalVisibility;
    element.style.position = originalPosition;

    // Criar PDF com configurações otimizadas
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true
    });

    // Dimensões A4 em mm
    const pageWidth = 210;
    const pageHeight = 297;
    
    // Margens adequadas
    const marginTop = 15;
    const marginBottom = 15;
    const marginLeft = 15;
    const marginRight = 15;
    
    // Área útil para conteúdo
    const contentWidth = pageWidth - marginLeft - marginRight;
    const contentHeight = pageHeight - marginTop - marginBottom;
    
    // Calcular proporções mantendo aspect ratio
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    // Converter canvas para imagem
    const imgData = canvas.toDataURL('image/png', 1.0);
    
    console.log('Adicionando imagem ao PDF:', {
      imgWidth,
      imgHeight,
      contentHeight,
      totalPages: Math.ceil(imgHeight / contentHeight)
    });

    // Verificar se os dados da imagem foram gerados
    if (!imgData || imgData === 'data:,') {
      throw new Error('Falha ao gerar dados da imagem do canvas');
    }

    // Sistema de paginação
    let currentY = 0;
    let pageNumber = 1;
    const totalPages = Math.ceil(imgHeight / contentHeight);

    // Função para adicionar rodapé com numeração
    const addFooter = (pageNum: number, totalPages: number) => {
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      const footerText = `Página ${pageNum} de ${totalPages}`;
      const textWidth = pdf.getTextWidth(footerText);
      const footerX = (pageWidth - textWidth) / 2;
      const footerY = pageHeight - 8;
      pdf.text(footerText, footerX, footerY);
    };

    // Primeira página
    if (imgHeight <= contentHeight) {
      // Conteúdo cabe em uma página
      pdf.addImage(imgData, 'PNG', marginLeft, marginTop, imgWidth, imgHeight);
      addFooter(1, 1);
    } else {
      // Conteúdo precisa de múltiplas páginas
      while (currentY < imgHeight) {
        if (pageNumber > 1) {
          pdf.addPage();
        }

        // Calcular a altura restante do conteúdo
        const remainingHeight = imgHeight - currentY;
        const currentPageHeight = Math.min(contentHeight, remainingHeight);
        
        // Criar um canvas temporário para a seção atual
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx) {
          tempCanvas.width = canvas.width;
          tempCanvas.height = (currentPageHeight * canvas.width) / imgWidth;
          
          // Desenhar a seção atual do canvas original
          tempCtx.drawImage(
            canvas,
            0,
            (currentY * canvas.width) / imgWidth,
            canvas.width,
            tempCanvas.height,
            0,
            0,
            canvas.width,
            tempCanvas.height
          );
          
          // Converter para dados de imagem
          const tempImgData = tempCanvas.toDataURL('image/png', 1.0);
          
          // Adicionar a seção ao PDF
          pdf.addImage(tempImgData, 'PNG', marginLeft, marginTop, imgWidth, currentPageHeight);
        }

        // Adicionar rodapé
        addFooter(pageNumber, totalPages);

        // Preparar para próxima página
        currentY += contentHeight;
        pageNumber++;
      }
    }

    // Forçar o download do PDF
    console.log('Iniciando download do PDF:', filename);
    pdf.save(filename);
    
    // Aguardar um momento para garantir que o download seja iniciado
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log('PDF salvo com sucesso:', filename);
    return true;

  } catch (error) {
    console.error('Erro detalhado ao gerar PDF:', error);
    throw new Error(`Erro ao gerar PDF: ${error.message}`);
  }
};

export const printProfessionalPDF = async (elementId: string) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error('Elemento não encontrado');
    }

    // Criar nova janela para impressão
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Não foi possível abrir janela de impressão');
    }

    // Obter estilos do documento atual
    const styleSheets = Array.from(document.styleSheets);
    let allStyles = '';
    
    try {
      styleSheets.forEach(sheet => {
        try {
          if (sheet.cssRules) {
            Array.from(sheet.cssRules).forEach(rule => {
              allStyles += rule.cssText + '\n';
            });
          }
        } catch (e) {
          // Ignorar erros de CORS
        }
      });
    } catch (e) {
      console.warn('Não foi possível obter alguns estilos', e);
    }

    // HTML otimizado para impressão sem áreas vazias
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Relatório de Produção</title>
          <meta charset="UTF-8">
          <style>
            ${allStyles}
            
            /* Reset e configuração básica */
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            @page {
              size: A4;
              margin: 15mm 20mm 15mm 20mm;
              padding: 0;
            }
            
            @media print {
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                margin: 0 !important;
                padding: 0 !important;
                font-size: 10px !important;
                line-height: 1.2 !important;
              }
              
              /* Remover elementos desnecessários */
              .no-print {
                display: none !important;
              }
              
              /* Otimizar espaçamento */
              #${elementId} {
                width: 100% !important;
                max-width: none !important;
                margin: 0 !important;
                padding: 0 !important;
                transform: none !important;
              }
              
              /* Compactar seções */
              .statistics-grid {
                margin-bottom: 8px !important;
                gap: 4px !important;
              }
              
              .process-section {
                margin-bottom: 10px !important;
                page-break-inside: avoid;
              }
              
              .priority-section {
                margin-bottom: 10px !important;
                page-break-inside: avoid;
              }
              
              /* Otimizar tabelas */
              table {
                width: 100% !important;
                border-collapse: collapse !important;
                margin: 0 !important;
                page-break-inside: avoid;
              }
              
              th, td {
                padding: 2px 4px !important;
                font-size: 9px !important;
                line-height: 1.1 !important;
              }
              
              /* Compactar cabeçalhos */
              h1 {
                font-size: 16px !important;
                margin-bottom: 4px !important;
                line-height: 1.1 !important;
              }
              
              h2 {
                font-size: 14px !important;
                margin-bottom: 6px !important;
                margin-top: 8px !important;
                line-height: 1.1 !important;
              }
              
              h3 {
                font-size: 12px !important;
                margin-bottom: 4px !important;
                line-height: 1.1 !important;
              }
              
              /* Reduzir espaçamentos desnecessários */
              header {
                margin-bottom: 8px !important;
                padding-bottom: 8px !important;
              }
              
              section {
                margin-bottom: 8px !important;
              }
              
              /* Otimizar cards de estatísticas */
              .statistics-grid > div {
                padding: 4px !important;
                margin: 0 !important;
              }
              
              /* Evitar quebras desnecessárias */
              .avoid-break {
                page-break-inside: avoid !important;
              }
              
              .process-header {
                page-break-after: avoid !important;
              }
              
              .priority-header {
                page-break-after: avoid !important;
              }
              
              /* Compactar processos menores */
              .process-section h3 {
                padding: 3px 6px !important;
                margin: 0 !important;
              }
              
              .process-section .grid {
                gap: 3px !important;
                padding: 3px !important;
                margin-bottom: 3px !important;
              }
              
              /* Melhorar aproveitamento do espaço */
              .overflow-x-auto {
                overflow: visible !important;
              }
              
              /* Remover espaços extras */
              p {
                margin: 0 !important;
                padding: 0 !important;
              }
              
              /* Compactar divs com display grid */
              div[style*="display: grid"] {
                gap: 3px !important;
              }
              
              /* Reduzir espaçamentos entre elementos */
              div[style*="margin-bottom"] {
                margin-bottom: 6px !important;
              }
              
              /* Otimizar áreas de processo */
              .process-section > div:last-child {
                margin-bottom: 0 !important;
              }
              
              /* Compactar mais os elementos */
              div[style*="padding: 10px"] {
                padding: 4px !important;
              }
              
              div[style*="padding: 8px"] {
                padding: 3px !important;
              }
              
              div[style*="padding: 6px"] {
                padding: 2px !important;
              }
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
          <script>
            window.onload = function() {
              // Aguardar renderização e depois imprimir
              setTimeout(() => {
                window.print();
                window.close();
              }, 800);
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();

    return true;
  } catch (error) {
    console.error('Erro ao imprimir PDF:', error);
    throw error;
  }
};
