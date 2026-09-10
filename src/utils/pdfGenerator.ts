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

    // HTML otimizado para impressão idêntica à visualização
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Checklist de Produção</title>
          <meta charset="UTF-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            ${allStyles}
            
            /* Reset e configuração básica */
            * {
              box-sizing: border-box;
            }
            
            @page {
              size: A4 portrait;
              margin: 8mm 10mm 8mm 10mm;
            }
            
            @media print {
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                color-adjust: exact !important;
                background-color: #ffffff !important;
                font-size: 9.5px !important;
              }
              
              .no-print {
                display: none !important;
              }
              
              #${elementId} {
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                transform: none !important;
              }
              
              .priority-group {
                break-inside: auto !important;
                page-break-inside: auto !important;
              }
              
              h2 {
                break-after: avoid !important;
                page-break-after: avoid !important;
              }
              
              .item-row {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
              
              .item-card {
                break-inside: avoid !important;
                page-break-inside: avoid !important;
              }
            }
          </style>
        </head>
        <body class="bg-white">
          ${element.outerHTML}
          <script>
            window.onload = function() {
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
