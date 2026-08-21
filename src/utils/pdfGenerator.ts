import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const generateProfessionalPDF = async (elementId: string, filename: string) => {
  let tempContainer: HTMLElement | null = null;

  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Elemento #${elementId} não encontrado para gerar PDF`);
    }

    // Criar um container temporário isolado fora de modais/dialogs para evitar bugs de tamanho 0x0
    tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '0';
    tempContainer.style.top = '0';
    tempContainer.style.width = '850px';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.opacity = '1';
    tempContainer.style.pointerEvents = 'none';
    tempContainer.style.margin = '0';
    tempContainer.style.padding = '20px';
    tempContainer.style.boxSizing = 'border-box';
    tempContainer.style.overflow = 'visible';

    // Clonar o elemento para o container isolado
    const clonedElement = element.cloneNode(true) as HTMLElement;
    clonedElement.style.display = 'block';
    clonedElement.style.visibility = 'visible';
    clonedElement.style.position = 'static';
    clonedElement.style.width = '100%';
    clonedElement.style.maxWidth = '100%';
    clonedElement.style.height = 'auto';
    clonedElement.style.maxHeight = 'none';
    clonedElement.style.overflow = 'visible';
    clonedElement.style.transform = 'none';
    clonedElement.style.backgroundColor = '#ffffff';
    clonedElement.style.color = '#000000';

    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);

    // Aguardar renderização e computação de layout
    await new Promise(resolve => setTimeout(resolve, 300));

    // Elemento a ser renderizado pelo html2canvas
    const targetElement = (clonedElement.offsetHeight > 0 && clonedElement.offsetWidth > 0)
      ? clonedElement
      : element;

    // Configurações otimizadas para html2canvas
    const canvas = await html2canvas(targetElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1024,
      onclone: (clonedDoc) => {
        const found = clonedDoc.getElementById(elementId) || clonedDoc.body;
        if (found) {
          (found as HTMLElement).style.display = 'block';
          (found as HTMLElement).style.visibility = 'visible';
        }
      }
    });

    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Não foi possível capturar o layout visual para o PDF');
    }

    const imgData = canvas.toDataURL('image/png', 1.0);
    if (!imgData || !imgData.startsWith('data:image/png;base64,')) {
      throw new Error('Falha ao processar os dados da imagem para o PDF');
    }

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
    const marginTop = 12;
    const marginBottom = 12;
    const marginLeft = 12;
    const marginRight = 12;
    
    // Área útil para conteúdo
    const contentWidth = pageWidth - marginLeft - marginRight;
    const contentHeight = pageHeight - marginTop - marginBottom;
    
    // Calcular proporções mantendo aspect ratio
    const imgWidth = contentWidth;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    // Sistema de paginação
    let currentY = 0;
    let pageNumber = 1;
    const totalPages = Math.max(1, Math.ceil(imgHeight / contentHeight));

    // Função para adicionar rodapé com numeração
    const addFooter = (pageNum: number, totalPagesCount: number) => {
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      const footerText = `Página ${pageNum} de ${totalPagesCount}`;
      const textWidth = pdf.getTextWidth(footerText);
      const footerX = (pageWidth - textWidth) / 2;
      const footerY = pageHeight - 6;
      pdf.text(footerText, footerX, footerY);
    };

    if (imgHeight <= contentHeight) {
      // Conteúdo cabe em uma página
      pdf.addImage(imgData, 'PNG', marginLeft, marginTop, imgWidth, imgHeight, undefined, 'FAST');
      addFooter(1, 1);
    } else {
      // Conteúdo precisa de múltiplas páginas com corte preciso
      while (currentY < imgHeight) {
        if (pageNumber > 1) {
          pdf.addPage();
        }

        const remainingHeight = imgHeight - currentY;
        const currentPageHeight = Math.min(contentHeight, remainingHeight);
        
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        
        if (tempCtx && currentPageHeight > 0) {
          const sliceHeight = Math.round((currentPageHeight * canvas.width) / imgWidth);
          tempCanvas.width = canvas.width;
          tempCanvas.height = sliceHeight;
          
          tempCtx.fillStyle = '#ffffff';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          
          tempCtx.drawImage(
            canvas,
            0,
            Math.round((currentY * canvas.width) / imgWidth),
            canvas.width,
            sliceHeight,
            0,
            0,
            canvas.width,
            sliceHeight
          );
          
          const tempImgData = tempCanvas.toDataURL('image/png', 1.0);
          if (tempImgData && tempImgData.startsWith('data:image/png;base64,')) {
            pdf.addImage(tempImgData, 'PNG', marginLeft, marginTop, imgWidth, currentPageHeight, undefined, 'FAST');
          }
        }

        addFooter(pageNumber, totalPages);
        currentY += contentHeight;
        pageNumber++;
      }
    }

    // Salvar arquivo PDF
    pdf.save(filename);
    return true;

  } catch (error: any) {
    console.error('Erro detalhado ao gerar PDF:', error);
    throw new Error(`Erro ao gerar PDF: ${error.message || error}`);
  } finally {
    if (tempContainer && tempContainer.parentNode) {
      tempContainer.parentNode.removeChild(tempContainer);
    }
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
