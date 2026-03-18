
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { FichaTecnicaData } from '@/hooks/useFichaTecnica';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface FichaTecnicaPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  data: FichaTecnicaData;
}

export function FichaTecnicaPreview({ isOpen, onClose, data }: FichaTecnicaPreviewProps) {
  const handlePrint = () => {
    const printContent = document.getElementById('ficha-preview-content');
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Ficha Técnica de Contrato - ${data.of_number}</title>
          <style>
            @page {
              size: A4;
              margin: 6mm;
            }
            
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              font-size: 10px;
              line-height: 1.3;
              color: black;
              background: white;
            }
            
            .print-container {
              width: 100%;
              max-width: 198mm;
              margin: 0 auto;
            }
            
            .section {
              border: 1px solid black;
              margin-bottom: 3mm;
              page-break-inside: avoid;
            }
            
            .section-header {
              background-color: #e5e7eb;
              padding: 2mm;
              text-align: center;
              font-weight: bold;
              font-size: 11px;
              border-bottom: 1px solid black;
            }
            
            .info-table {
              width: 100%;
              border-collapse: collapse;
            }
            
            .info-table td {
              border: 1px solid black;
              padding: 2mm;
              vertical-align: top;
              font-size: 10px;
            }
            
            .info-table .label-cell {
              background-color: #f9f9f9;
              font-weight: bold;
              width: 15%;
            }
            
            .tech-table {
              width: 100%;
              border-collapse: collapse;
            }
            
            .tech-table th,
            .tech-table td {
              border: 1px solid black;
              padding: 1.5mm;
              text-align: center;
              font-size: 9px;
            }
            
            .tech-table th {
              background-color: #e5e7eb;
              font-weight: bold;
            }
            
            .tech-table td:first-child {
              text-align: left;
              font-weight: bold;
            }
            
            .tech-table td:last-child {
              text-align: left;
            }
            
            .checkbox-section {
              padding: 2mm;
            }
            
            .checkbox-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 2mm;
            }
            
            .checkbox-item {
              display: flex;
              align-items: center;
              font-size: 9px;
            }
            
            .checkbox-item input {
              width: 12px;
              height: 12px;
              margin-right: 3px;
            }
            
            @media print {
              body { margin: 0; }
              .print-container { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div class="print-container">
            ${printContent.innerHTML}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handlePDF = async () => {
    const element = document.getElementById('ficha-preview-content');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`ficha-tecnica-${data.of_number}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  const renderTechnicalInfo = (label: string, info: any) => {
    if (!info) return null;
    
    const hasChecks = info.e || info.c || info.na;
    const hasInfo = info.info && info.info.trim();
    
    if (!hasChecks && !hasInfo) return null;

    return (
      <tr key={label}>
        <td style={{ padding: '1.5mm', fontSize: '9px', fontWeight: 'bold' }}>{label}</td>
        <td style={{ padding: '1.5mm', textAlign: 'center' }}>{info.e ? '✓' : ''}</td>
        <td style={{ padding: '1.5mm', textAlign: 'center' }}>{info.c ? '✓' : ''}</td>
        <td style={{ padding: '1.5mm', textAlign: 'center' }}>{info.na ? '✓' : ''}</td>
        <td style={{ padding: '1.5mm', fontSize: '9px', textAlign: 'left' }}>{info.info || ''}</td>
      </tr>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Ficha Técnica de Contrato - Preview</span>
            <div className="flex gap-2">
              <Button onClick={handlePrint} size="sm" variant="outline">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={handlePDF} size="sm" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div id="ficha-preview-content" className="bg-white text-black p-4" style={{ fontSize: '12px', lineHeight: '1.4' }}>
          {/* Header */}
          <div className="text-center border-2 border-black p-4 mb-4 bg-gray-100">
            <h1 className="text-xl font-bold">FICHA TÉCNICA DE CONTRATO</h1>
          </div>
          
          {/* Informações Gerais */}
          <div className="section">
            <div className="section-header">INFORMAÇÕES GERAIS</div>
            <table className="info-table">
              <tbody>
                <tr>
                  <td className="label-cell">OF Nº:</td>
                  <td>{data.of_number}</td>
                  <td className="label-cell">GESTOR:</td>
                  <td>{data.gestor || ''}</td>
                  <td className="label-cell">REVISÃO:</td>
                  <td>{data.revisao || '0'}</td>
                </tr>
                <tr>
                  <td className="label-cell">QTD (t):</td>
                  <td>{data.quantidade || ''}</td>
                  <td className="label-cell">PROJETISTA:</td>
                  <td>{data.projetista || ''}</td>
                  <td className="label-cell">DATA:</td>
                  <td>{data.data_criacao || new Date().toLocaleDateString('pt-BR')}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Dados do Cliente */}
          <div className="section">
            <div className="section-header">DADOS DO CLIENTE</div>
            <table className="info-table">
              <tbody>
                <tr>
                  <td className="label-cell">CLIENTE:</td>
                  <td colSpan={3}>{data.cliente || ''}</td>
                  <td className="label-cell">CNPJ:</td>
                  <td>{data.cnpj || ''}</td>
                </tr>
                <tr>
                  <td className="label-cell">IE:</td>
                  <td>{data.ie || ''}</td>
                  <td className="label-cell">CEP:</td>
                  <td>{data.cep || ''}</td>
                  <td className="label-cell">ESTADO:</td>
                  <td>{data.estado || ''}</td>
                </tr>
                <tr>
                  <td className="label-cell">ENDEREÇO:</td>
                  <td colSpan={3}>{data.endereco || ''}</td>
                  <td className="label-cell">CIDADE:</td>
                  <td>{data.cidade || ''}</td>
                </tr>
                <tr>
                  <td className="label-cell">CONTRATO</td>
                  <td>
                    <div>{data.contato_contrato || ''}</div>
                    <div>{data.fone_contrato || ''}</div>
                    <div>{data.email_contrato || ''}</div>
                  </td>
                  <td className="label-cell">OBRA</td>
                  <td>
                    <div>{data.contato_obra || ''}</div>
                    <div>{data.fone_obra || ''}</div>
                    <div>{data.email_obra || ''}</div>
                  </td>
                  <td className="label-cell">QUALIDADE</td>
                  <td>
                    <div>{data.contato_qualid || ''}</div>
                    <div>{data.fone_qualid || ''}</div>
                    <div>{data.email_qualid || ''}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Dados da Obra */}
          <div className="section">
            <div className="section-header">DADOS DA OBRA</div>
            <table className="info-table">
              <tbody>
                <tr>
                  <td className="label-cell">ENG. RESPONSÁVEL:</td>
                  <td>{data.eng_responsavel || ''}</td>
                  <td className="label-cell">TELEFONE:</td>
                  <td>{data.telefone_obra || ''}</td>
                  <td className="label-cell">E-MAIL:</td>
                  <td>{data.email_obra_responsavel || ''}</td>
                </tr>
                <tr>
                  <td className="label-cell">ENDEREÇO OBRA:</td>
                  <td colSpan={2}>{data.endereco_obra || ''}</td>
                  <td className="label-cell">CEP:</td>
                  <td>{data.cep_obra || ''}</td>
                  <td className="label-cell">BAIRRO:</td>
                  <td>{data.bairro_obra || ''}</td>
                </tr>
                <tr>
                  <td className="label-cell">CIDADE:</td>
                  <td>{data.cidade_obra || ''}</td>
                  <td className="label-cell">UF:</td>
                  <td>{data.estado_obra || ''}</td>
                  <td className="label-cell">OBSERVAÇÕES:</td>
                  <td colSpan={2}>{data.observacoes_obra || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Dados do Projeto */}
          <div className="section">
            <div className="section-header">DADOS DO PROJETO</div>
            <table className="info-table">
              <tbody>
                <tr>
                  <td className="label-cell">DESCRIÇÃO:</td>
                  <td colSpan={5}>{data.descricao_resumida || ''}</td>
                </tr>
                <tr>
                  <td className="label-cell">ENDEREÇO:</td>
                  <td colSpan={2}>{data.endereco_projeto || ''}</td>
                  <td className="label-cell">CIDADE:</td>
                  <td>{data.cidade_projeto || ''}</td>
                  <td className="label-cell">UF:</td>
                  <td>{data.estado_projeto || ''}</td>
                </tr>
                <tr>
                  <td className="label-cell">BAIRRO:</td>
                  <td>{data.bairro_projeto || ''}</td>
                  <td className="label-cell">CEP:</td>
                  <td>{data.cep_projeto || ''}</td>
                  <td className="label-cell">HORÁRIOS:</td>
                  <td colSpan={2}>{data.horarios_trabalho || ''}</td>
                </tr>
                <tr>
                  <td className="label-cell">CONDIÇÕES ACESSO:</td>
                  <td colSpan={5}>{data.condicoes_acesso || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Tipo de Projeto */}
          <div className="section">
            <div className="section-header">TIPO DE PROJETO</div>
            <div className="checkbox-section">
              <div className="checkbox-grid">
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.tipo_estrutural || false} readOnly />
                  <span>ESTRUTURAL</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.tipo_residencial || false} readOnly />
                  <span>RESIDENCIAL</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.tipo_espacial || false} readOnly />
                  <span>ESPACIAL</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.tipo_comercial || false} readOnly />
                  <span>COMERCIAL</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.tipo_grades || false} readOnly />
                  <span>GRADES</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.tipo_industrial || false} readOnly />
                  <span>INDUSTRIAL</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.tipo_cobertura || false} readOnly />
                  <span>COBERTURA</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.tipo_com_montagem || false} readOnly />
                  <span>COM MONTAGEM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Documentos Fornecidos */}
          <div className="section">
            <div className="section-header">DOCUMENTOS FORNECIDOS</div>
            <div className="checkbox-section">
              <div className="checkbox-grid">
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.doc_calculo || false} readOnly />
                  <span>CÁLCULO</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.doc_projeto || false} readOnly />
                  <span>PROJETO</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.doc_detalhamento || false} readOnly />
                  <span>DETALHAMENTO</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.doc_cronograma || false} readOnly />
                  <span>CRONOGRAMA</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.doc_normas || false} readOnly />
                  <span>NORMAS</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.doc_especif_tecnicas || false} readOnly />
                  <span>ESPECIF. TÉC.</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.doc_catalogo || false} readOnly />
                  <span>CATÁLOGO</span>
                </div>
                <div className="checkbox-item">
                  <input type="checkbox" checked={data.doc_fotos || false} readOnly />
                  <span>FOTOS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Informações do Projeto */}
          <div className="section">
            <div className="section-header">INFORMAÇÕES DO PROJETO</div>
            <table className="tech-table">
              <thead>
                <tr>
                  <th style={{ width: '40%' }}>ITEM</th>
                  <th style={{ width: '10%' }}>E</th>
                  <th style={{ width: '10%' }}>C</th>
                  <th style={{ width: '10%' }}>NA</th>
                  <th style={{ width: '30%' }}>INFO</th>
                </tr>
              </thead>
              <tbody>
                {renderTechnicalInfo('CÁLCULO ESTRUTURAL', data.info_calculo_estrutural)}
                {renderTechnicalInfo('PROJETO BÁSICO', data.info_projeto_basico)}
                {renderTechnicalInfo('DETALHAMENTO', data.info_detalhamento)}
                {renderTechnicalInfo('MATÉRIA-PRIMA', data.info_materia_prima)}
                {renderTechnicalInfo('FABRICAÇÃO', data.info_fabricacao)}
                {renderTechnicalInfo('GRADES DE PISO', data.info_grades_piso)}
                {renderTechnicalInfo('JATEAMENTO', data.info_jateamento)}
                {renderTechnicalInfo('PINTURA BASE/FUNDO', data.info_pintura_base)}
                {renderTechnicalInfo('PINTURA INTERMEDIÁRIA', data.info_pintura_inter)}
                {renderTechnicalInfo('PINTURA DE ACABAMENTO', data.info_pintura_acabamento)}
                {renderTechnicalInfo('GALVANIZAÇÃO', data.info_galvanizacao)}
                {renderTechnicalInfo('EMBALAGEM ESPECIAL', data.info_embalagem)}
                {renderTechnicalInfo('TRANSPORTE', data.info_transporte)}
                {renderTechnicalInfo('INSPEÇÃO QUALIFICADA', data.info_inspecao)}
                {renderTechnicalInfo('ENSAIOS DE LABORATÓRIO', data.info_ensaios_lab)}
                {renderTechnicalInfo('DATABOOK', data.info_databook)}
                {renderTechnicalInfo('PRÉ-MONTAGEM', data.info_pre_montagem)}
                {renderTechnicalInfo('PLACA ENGENETAL', data.info_placa_engenetal)}
                {renderTechnicalInfo('PARAFUSOS', data.info_parafusos)}
                {renderTechnicalInfo('CHUMBADORES', data.info_chumbadores)}
                {renderTechnicalInfo('STUD BOLT', data.info_stud_bolt)}
                {renderTechnicalInfo('FORNECIMENTO TELHAS', data.info_fornec_telhas)}
                {renderTechnicalInfo('MONTAGEM TELHAS', data.info_montagem_telhas)}
                {renderTechnicalInfo('FORNECIMENTO CALHAS', data.info_forn_calhas)}
                {renderTechnicalInfo('MONTAGEM CALHAS', data.info_mont_calhas)}
                {renderTechnicalInfo('STEEL DECK', data.info_steel_deck)}
                {renderTechnicalInfo('FORNECIMENTO WALL', data.info_fornec_wall)}
                {renderTechnicalInfo('MONTAGEM WALL', data.info_mont_wall)}
                {renderTechnicalInfo('OUTROS MATERIAIS', data.info_outros_materiais)}
              </tbody>
            </table>
          </div>

          {/* Vistos e Aprovações */}
          <div className="section">
            <div className="section-header">VISTOS E APROVAÇÕES</div>
            <table className="info-table">
              <tbody>
                <tr>
                  <td className="label-cell">GESTOR:</td>
                  <td>{data.visto_gestor || ''}</td>
                  <td className="label-cell">PCP:</td>
                  <td>{data.visto_pcp || ''}</td>
                  <td className="label-cell">ENG:</td>
                  <td>{data.visto_eng || ''}</td>
                </tr>
                <tr>
                  <td className="label-cell">FABRICAÇÃO:</td>
                  <td>{data.visto_fab || ''}</td>
                  <td className="label-cell">EXPEDIÇÃO:</td>
                  <td>{data.visto_exp || ''}</td>
                  <td className="label-cell">QUALIDADE:</td>
                  <td>{data.visto_qual || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
