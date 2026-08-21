import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, Download } from 'lucide-react';
import { FichaTecnicaData } from '@/hooks/useFichaTecnica';
import { supabase } from '@/integrations/supabase/client';
import { useBrandSettings } from '@/hooks/useBrandSettings';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface FichaTecnicaPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  data: FichaTecnicaData;
}

interface ProcessoCronogramaItem {
  nome: string;
  weeks: boolean[];
}

export function FichaTecnicaPreview({ isOpen, onClose, data }: FichaTecnicaPreviewProps) {
  const { brandSettings } = useBrandSettings();
  const [cronogramaEtapas, setCronogramaEtapas] = useState<ProcessoCronogramaItem[]>([]);
  const [prazosCronograma, setPrazosCronograma] = useState<{
    fabricacaoPintura?: string;
    montagem?: string;
    qualidade?: string;
  }>({});
  const [loadingCronograma, setLoadingCronograma] = useState(false);

  // Processa dados JSON caso venham como string
  const parseInfo = (field: any) => {
    if (!field) return { e: false, c: false, na: false, info: '' };
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return { e: false, c: false, na: false, info: field };
      }
    }
    return field;
  };

  const getFornIndicator = (infoRaw: any) => {
    const parsed = parseInfo(infoRaw);
    if (parsed.e) return '✓';
    if (parsed.c) return '✓';
    if (parsed.na) return 'NA';
    return '';
  };

  const getInfoText = (infoRaw: any) => {
    const parsed = parseInfo(infoRaw);
    return parsed.info && parsed.info.trim() ? parsed.info.trim() : '-';
  };

  const formatDateBR = (dateStr?: string) => {
    if (!dateStr) return '-';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dateStr;
  };

  // Carregar dados reais do menu Cronograma
  useEffect(() => {
    async function loadCronograma() {
      if (!isOpen || !data?.of_number) return;
      setLoadingCronograma(true);

      try {
        // 1. Busca id da OF pelo num_of
        const { data: ofData } = await supabase
          .from('ordens_fabricacao')
          .select('id, num_of, descritivo')
          .ilike('num_of', data.of_number.trim())
          .maybeSingle();

        let processosEncontrados: any[] = [];

        if (ofData?.id) {
          const { data: cronoData } = await supabase
            .from('cronogramas_of')
            .select('id, revisao')
            .eq('of_id', ofData.id)
            .maybeSingle();

          if (cronoData?.id) {
            const { data: processos } = await supabase
              .from('processos_cronograma')
              .select('*')
              .eq('cronograma_id', cronoData.id)
              .order('ordem', { ascending: true });

            if (processos && processos.length > 0) {
              processosEncontrados = processos;
            }
          }
        }

        if (processosEncontrados.length > 0) {
          // Filtrar processos com datas válidas
          const validDates = processosEncontrados
            .flatMap(p => [p.data_inicio, p.data_fim])
            .filter(Boolean)
            .map(d => new Date(d + 'T00:00:00').getTime())
            .filter(t => !isNaN(t));

          const hasValidDates = validDates.length > 0;
          const minTime = hasValidDates ? Math.min(...validDates) : 0;
          const msPerWeek = 7 * 24 * 60 * 60 * 1000;

          const etapas = processosEncontrados.map((p, index) => {
            const pStart = p.data_inicio ? new Date(p.data_inicio + 'T00:00:00').getTime() : null;
            const pEnd = p.data_fim ? new Date(p.data_fim + 'T23:59:59').getTime() : null;
            const weeksActive = [false, false, false, false, false, false, false, false];

            if (hasValidDates && pStart && pEnd) {
              for (let k = 0; k < 8; k++) {
                const wStart = minTime + k * msPerWeek;
                const wEnd = minTime + (k + 1) * msPerWeek;
                if (pStart <= wEnd && pEnd >= wStart) {
                  weeksActive[k] = true;
                }
              }
            }

            return {
              nome: `${index + 1}. ${p.nome_processo}`,
              weeks: weeksActive
            };
          });

          setCronogramaEtapas(etapas);

          // Extrai prazos
          const procFab = processosEncontrados.find(p => /fabri|pint|produ/i.test(p.nome_processo));
          const procMont = processosEncontrados.find(p => /monta|insta/i.test(p.nome_processo));
          const procQual = processosEncontrados.find(p => /qualid|inspe|aceite/i.test(p.nome_processo));

          setPrazosCronograma({
            fabricacaoPintura: procFab && procFab.data_inicio && procFab.data_fim 
              ? `${formatDateBR(procFab.data_inicio)} a ${formatDateBR(procFab.data_fim)}` 
              : undefined,
            montagem: procMont && procMont.data_inicio && procMont.data_fim 
              ? `${formatDateBR(procMont.data_inicio)} a ${formatDateBR(procMont.data_fim)}` 
              : undefined,
            qualidade: procQual && procQual.data_inicio && procQual.data_fim 
              ? `${formatDateBR(procQual.data_inicio)} a ${formatDateBR(procQual.data_fim)}` 
              : undefined,
          });
        } else {
          // Caso não tenha dados no menu cronograma preenchidos, etapas vêm em branco
          const defaultEtapas = [
            { nome: '1. Detalhamento', weeks: [false, false, false, false, false, false, false, false] },
            { nome: '2. Suprimentos/MP', weeks: [false, false, false, false, false, false, false, false] },
            { nome: '3. Fabricação', weeks: [false, false, false, false, false, false, false, false] },
            { nome: '4. Tratamento/Pintura', weeks: [false, false, false, false, false, false, false, false] },
            { nome: '5. Expedição/Entrega', weeks: [false, false, false, false, false, false, false, false] },
            { nome: '6. Montagem Obra', weeks: [false, false, false, false, false, false, false, false] },
          ];
          setCronogramaEtapas(defaultEtapas);
          setPrazosCronograma({});
        }
      } catch (e) {
        console.error('Erro ao buscar cronograma:', e);
      } finally {
        setLoadingCronograma(false);
      }
    }

    loadCronograma();
  }, [isOpen, data?.of_number]);

  const itemsEscopo = [
    { label: 'CÁLCULO ESTRUTURAL', field: data.info_calculo_estrutural },
    { label: 'PROJETO BÁSICO', field: data.info_projeto_basico },
    { label: 'DETALHAMENTO', field: data.info_detalhamento },
    { label: 'MATÉRIA-PRIMA', field: data.info_materia_prima },
    { label: 'FABRICAÇÃO', field: data.info_fabricacao },
    { label: 'GRADES DE PISO / DEGRAUS', field: data.info_grades_piso },
    { label: 'JATEAMENTO', field: data.info_jateamento },
    { label: 'PINTURA BASE / FUNDO', field: data.info_pintura_base },
    { label: 'PINTURA INTERMEDIÁRIA', field: data.info_pintura_inter },
    { label: 'PINTURA DE ACABAMENTO', field: data.info_pintura_acabamento },
    { label: 'GALVANIZAÇÃO', field: data.info_galvanizacao },
    { label: 'EMBALAGEM ESPECIAL', field: data.info_embalagem },
    { label: 'TRANSPORTE', field: data.info_transporte },
    { label: 'INSPEÇÃO QUALIFICADA', field: data.info_inspecao },
    { label: 'ENSAIOS DE LABORATÓRIO', field: data.info_ensaios_lab },
    { label: 'DATABOOK', field: data.info_databook },
    { label: 'PRÉ-MONTAGEM', field: data.info_pre_montagem },
    { label: 'PLACA DE OBRA', field: data.info_placa_engenetal },
    { label: 'PARAFUSOS / PORCAS / ARRUELAS', field: data.info_parafusos },
    { label: 'CHUMBADORES / QUÍMICO', field: data.info_chumbadores },
    { label: 'STUD BOLT', field: data.info_stud_bolt },
    { label: 'FORNECIMENTO DE TELHAS', field: data.info_fornec_telhas },
    { label: 'MONTAGEM DE TELHAS', field: data.info_montagem_telhas },
    { label: 'FORN. / MONTAGEM CALHAS E RUFOS', field: data.info_forn_calhas || data.info_mont_calhas },
    { label: 'STEEL DECK E ACESSÓRIOS', field: data.info_steel_deck },
    { label: 'FORNECIMENTO / MONTAGEM WALL', field: data.info_fornec_wall || data.info_mont_wall },
    { label: 'OUTROS MATERIAIS / SERVIÇOS', field: data.info_outros_materiais },
  ];

  // Monta endereço da obra
  const enderecoObraCompleto = [
    data.endereco_obra || '',
    data.bairro_obra ? `Bairro: ${data.bairro_obra}` : '',
    (data.cidade_obra || data.estado_obra) ? `Cidade: ${data.cidade_obra || ''}${data.cidade_obra && data.estado_obra ? ' / ' : ''}${data.estado_obra || ''}` : '',
    data.cep_obra ? `CEP: ${data.cep_obra}` : ''
  ].filter(Boolean).join(' - ') || '-';

  // Monta responsáveis
  const contatosResumo = [
    data.eng_responsavel ? `${data.eng_responsavel} (Eng. Responsável)` : '',
    data.telefone_obra ? `Tel: ${data.telefone_obra}` : '',
    data.email_obra_responsavel || '',
    data.projetista ? `Projetista: ${data.projetista}` : ''
  ].filter(Boolean).join(' | ') || (data.projetista ? `Projetista: ${data.projetista}` : '-');

  // Prazos calculados
  const prazoFabPintura = prazosCronograma.fabricacaoPintura || 
    ((data.data_inicio || data.data_termino_prev) 
      ? `${formatDateBR(data.data_inicio)} a ${formatDateBR(data.data_termino_prev)}` 
      : 'A Definir / PCP');

  const prazoMontagem = prazosCronograma.montagem || 
    (data.horarios_trabalho || data.condicoes_acesso 
      ? `${data.condicoes_acesso || ''} ${data.horarios_trabalho ? `(${data.horarios_trabalho})` : ''}`.trim() 
      : 'Conforme Liberação de Obra');

  const prazoQualidade = prazosCronograma.qualidade || 
    (data.info_inspecao?.info ? data.info_inspecao.info : 'Inspeção Dimensional e Solda');

  // HTML e Estilos Completos para Impressão
  const getFullPrintHTML = () => {
    const content = document.getElementById('ficha-tecnica-printable-area');
    if (!content) return '';

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Ficha Técnica de Contrato - ${data.of_number || ''}</title>
<style>
  @page {
    size: A4 portrait;
    margin: 6mm 8mm 6mm 8mm;
  }
  *, *::before, *::after {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 7.5pt;
    line-height: 1.15;
    color: #000;
    margin: 0;
    padding: 0;
    background-color: #fff;
  }

  .header-title {
    font-size: 11pt;
    font-weight: bold;
    text-align: center;
    letter-spacing: 0.5px;
  }
  
  .logo-text {
    font-size: 13pt;
    font-weight: 900;
    font-style: italic;
    color: #0b3b60;
    text-align: center;
    font-family: 'Arial Black', Arial, sans-serif;
  }

  .section-header {
    background-color: #d9d9d9;
    font-weight: bold;
    font-size: 7.2pt;
    padding: 2px 4px;
    text-align: left;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    text-transform: uppercase;
  }

  .field-label {
    font-weight: bold;
    font-size: 7pt;
  }
  
  .field-val {
    font-weight: normal;
    font-size: 7.5pt;
  }

  /* CHECKBOXES MINIMALISTAS E COMPACTAS */
  .check-box-mini {
    display: inline-block;
    width: 8px;
    height: 8px;
    border: 0.8px solid #000;
    text-align: center;
    line-height: 7.5px;
    font-size: 6.5pt;
    font-weight: bold;
    margin-right: 3px;
    vertical-align: middle;
  }

  table.grid-table {
    width: 100%;
    border-collapse: collapse;
  }
  table.grid-table td, table.grid-table th {
    border: 1px solid #000;
    padding: 1.2px 3px;
    font-size: 6.8pt;
  }

  .cron-table {
    border-collapse: collapse;
    width: 100%;
  }
  .cron-table td, .cron-table th {
    border: 1px solid #777;
    font-size: 5pt;
    text-align: center;
    padding: 0;
    height: 8.5px;
  }

  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .bold { font-weight: bold; }
  .bg-gray { background-color: #eaeaea; }
</style>
</head>
<body>
  ${content.innerHTML}
</body>
</html>`;
  };

  const handlePrint = () => {
    const fullHtml = getFullPrintHTML();
    if (!fullHtml) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(fullHtml);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handlePDF = async () => {
    const element = document.getElementById('ficha-tecnica-printable-area');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 0;
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', margin, 0, imgWidth, Math.min(imgHeight, pdfHeight));
      pdf.save(`Ficha_Tecnica_OF_${data.of_number || 'Sem_Numero'}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      // Fallback para impressão direta
      handlePrint();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[950px] max-h-[95vh] overflow-y-auto p-4 sm:p-6 bg-slate-900/95 text-slate-100 border-slate-700">
        <DialogHeader className="pb-3 border-b border-slate-700">
          <DialogTitle className="flex items-center justify-between text-slate-100">
            <span className="text-lg font-bold">Ficha Técnica de Contrato - Visualização & Impressão</span>
            <div className="flex gap-2">
              <Button onClick={handlePrint} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
                <Printer className="w-4 h-4 mr-2" />
                Imprimir
              </Button>
              <Button onClick={handlePDF} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                <Download className="w-4 h-4 mr-2" />
                PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Visualizador de Folha A4 */}
        <div className="flex justify-center p-2 sm:p-4 bg-slate-950/70 rounded-lg overflow-x-auto">
          <div 
            id="ficha-tecnica-printable-area" 
            className="bg-white text-black p-[6mm] shadow-2xl rounded-sm"
            style={{
              width: '198mm',
              minHeight: '280mm',
              fontFamily: 'Arial, Helvetica, sans-serif',
              fontSize: '7.5pt',
              lineHeight: '1.15',
              boxSizing: 'border-box'
            }}
          >
            {/* TABELA PRINCIPAL INTEGRADA */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000' }}>
              {/* 1. HEADER */}
              <tbody>
                <tr>
                  <td style={{ width: '22%', border: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'middle', backgroundColor: '#ffffff' }}>
                    {brandSettings.logo_url ? (
                      <img 
                        src={brandSettings.logo_url} 
                        alt={brandSettings.company_name || 'Logo'} 
                        style={{ 
                          maxHeight: '36px', 
                          maxWidth: '100%', 
                          objectFit: 'contain', 
                          display: 'block', 
                          margin: '0 auto', 
                          backgroundColor: '#ffffff' 
                        }} 
                      />
                    ) : (
                      <>
                        <div style={{ fontSize: '13pt', fontWeight: 900, fontStyle: 'italic', color: '#0b3b60', fontFamily: "'Arial Black', Arial, sans-serif" }}>
                          {brandSettings.company_name || 'TrackSteel'}
                        </div>
                        <div style={{ fontSize: '5pt', color: '#555', letterSpacing: '1px' }}>
                          ESTRUTURAS METÁLICAS
                        </div>
                      </>
                    )}
                  </td>
                  <td style={{ width: '50%', border: '1px solid #000', padding: '4px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <div style={{ fontSize: '11pt', fontWeight: 'bold', letterSpacing: '0.5px' }}>
                      FICHA TÉCNICA DE CONTRATO
                    </div>
                  </td>
                  <td style={{ width: '28%', border: '1px solid #000', padding: '2px 5px', verticalAlign: 'middle' }}>
                    <table style={{ width: '100%', fontSize: '7pt', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          <td style={{ fontWeight: 'bold', width: '40%' }}>OF:</td>
                          <td><b>{data.of_number || '-'}</b></td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>GESTOR:</td>
                          <td>{data.gestor || '-'}</td>
                        </tr>
                        <tr>
                          <td style={{ fontWeight: 'bold' }}>REVISÃO:</td>
                          <td>{data.revisao !== undefined ? data.revisao : '0'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* 2. DADOS GERAIS E CLIENTE */}
                <tr>
                  <td colSpan={2} style={{ border: '1px solid #000', padding: 0, verticalAlign: 'top' }}>
                    <div style={{ backgroundColor: '#d9d9d9', fontWeight: 'bold', fontSize: '7.2pt', padding: '2px 4px', textAlign: 'left', borderTop: '1px solid #000', borderBottom: '1px solid #000', textTransform: 'uppercase' }}>
                      DADOS DO CLIENTE
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', padding: '3px', fontSize: '7.2pt' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '2px 4px', width: '65%' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '7pt' }}>CLIENTE:</span> <span style={{ fontWeight: 'normal' }}>{data.cliente || '-'}</span>
                          </td>
                          <td style={{ padding: '2px 4px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '7pt' }}>CNPJ:</span> <span style={{ fontWeight: 'normal' }}>{data.cnpj || '-'}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '2px 4px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '7pt' }}>ENDEREÇO:</span> <span style={{ fontWeight: 'normal' }}>{data.endereco || '-'}</span>
                          </td>
                          <td style={{ padding: '2px 4px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '7pt' }}>I.E.:</span> <span style={{ fontWeight: 'normal' }}>{data.ie || '-'}</span>
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '2px 4px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '7pt' }}>CIDADE:</span> <span style={{ fontWeight: 'normal' }}>{data.cidade || '-'}</span>
                          </td>
                          <td style={{ padding: '2px 4px' }}>
                            <span style={{ fontWeight: 'bold', fontSize: '7pt' }}>ESTADO:</span> <span style={{ fontWeight: 'normal' }}>{data.estado || '-'}</span> &nbsp;&nbsp;&nbsp;&nbsp; <span style={{ fontWeight: 'bold', fontSize: '7pt' }}>CEP:</span> <span style={{ fontWeight: 'normal' }}>{data.cep || '-'}</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                  <td style={{ border: '1px solid #000', padding: 0, verticalAlign: 'top' }}>
                    <div style={{ backgroundColor: '#d9d9d9', fontWeight: 'bold', fontSize: '7.2pt', padding: '2px 4px', textAlign: 'center', borderTop: '1px solid #000', borderBottom: '1px solid #000', textTransform: 'uppercase' }}>
                      QUANTIDADE / DATA
                    </div>
                    <div style={{ padding: '5px', fontSize: '7.5pt' }}>
                      <div style={{ marginBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '7pt' }}>QUANTIDADE (t):</span> <b style={{ fontSize: '8.5pt' }}>{data.quantidade != null ? data.quantidade : '-'}</b>
                      </div>
                      <div>
                        <span style={{ fontWeight: 'bold', fontSize: '7pt' }}>DATA:</span> {formatDateBR(data.data_criacao) !== '-' ? formatDateBR(data.data_criacao) : new Date().toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </td>
                </tr>

                {/* 3. DADOS DO PROJETO / OBRA */}
                <tr>
                  <td colSpan={3} style={{ border: '1px solid #000', padding: 0 }}>
                    <div style={{ backgroundColor: '#d9d9d9', fontWeight: 'bold', fontSize: '7.2pt', padding: '2px 4px', textAlign: 'left', borderTop: '1px solid #000', borderBottom: '1px solid #000', textTransform: 'uppercase' }}>
                      DADOS DO PROJETO / OBRA
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7.2pt' }}>
                      <tbody>
                        <tr>
                          <td style={{ width: '25%', padding: '2px 4px', fontWeight: 'bold', backgroundColor: '#f5f5f5', borderRight: '1px solid #000', borderBottom: '1px solid #ccc' }}>
                            DESCRIÇÃO RESUMIDA DA OBRA/PRODUTO:
                          </td>
                          <td style={{ padding: '2px 6px', fontWeight: 'bold', borderBottom: '1px solid #ccc' }} colSpan={3}>
                            {data.descricao_resumida || '-'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '2px 4px', fontWeight: 'bold', backgroundColor: '#f5f5f5', borderRight: '1px solid #000', borderBottom: '1px solid #ccc' }}>
                            ENDEREÇO DA OBRA:
                          </td>
                          <td style={{ padding: '2px 6px', borderBottom: '1px solid #ccc' }} colSpan={3}>
                            {enderecoObraCompleto}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '2px 4px', fontWeight: 'bold', backgroundColor: '#f5f5f5', borderRight: '1px solid #000' }}>
                            RESPONSÁVEIS / CONTATOS:
                          </td>
                          <td style={{ padding: '2px 6px' }} colSpan={3}>
                            {contatosResumo}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* 4. TIPO DE PROJETO & DOCUMENTOS FORNECIDOS */}
                <tr>
                  <td colSpan={3} style={{ border: '1px solid #000', padding: 0 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          {/* TIPO DE PROJETO */}
                          <td style={{ width: '50%', borderRight: '1px solid #000', verticalAlign: 'top', padding: 0 }}>
                            <div style={{ backgroundColor: '#d9d9d9', fontWeight: 'bold', fontSize: '6.8pt', padding: '1.5px 4px', borderBottom: '1px solid #000', textTransform: 'uppercase' }}>
                              TIPO DE PROJETO
                            </div>
                            <div style={{ padding: '3px 5px' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '6.5pt', lineHeight: 1.2 }}>
                                <tbody>
                                  <tr>
                                    <td style={{ padding: '1.5px 0', width: '33%' }}>
                                      <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '0.8px solid #000', textAlign: 'center', lineHeight: '7.5px', fontSize: '6.5pt', fontWeight: 'bold', marginRight: '3px', verticalAlign: 'middle' }}>
                                        {data.tipo_estrutural ? '✓' : ''}
                                      </span> ESTRUTURAL
                                    </td>
                                    <td style={{ padding: '1.5px 0', width: '33%' }}>
                                      <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '0.8px solid #000', textAlign: 'center', lineHeight: '7.5px', fontSize: '6.5pt', fontWeight: 'bold', marginRight: '3px', verticalAlign: 'middle' }}>
                                        {data.tipo_espacial ? '✓' : ''}
                                      </span> ESPACIAL
                                    </td>
                                    <td style={{ padding: '1.5px 0', width: '34%' }}>
                                      <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '0.8px solid #000', textAlign: 'center', lineHeight: '7.5px', fontSize: '6.5pt', fontWeight: 'bold', marginRight: '3px', verticalAlign: 'middle' }}>
                                        {data.tipo_grades ? '✓' : ''}
                                      </span> GRADES / ESCADAS
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: '1.5px 0' }}>
                                      <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '0.8px solid #000', textAlign: 'center', lineHeight: '7.5px', fontSize: '6.5pt', fontWeight: 'bold', marginRight: '3px', verticalAlign: 'middle' }}>
                                        {data.tipo_residencial ? '✓' : ''}
                                      </span> RESIDENCIAL
                                    </td>
                                    <td style={{ padding: '1.5px 0' }}>
                                      <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '0.8px solid #000', textAlign: 'center', lineHeight: '7.5px', fontSize: '6.5pt', fontWeight: 'bold', marginRight: '3px', verticalAlign: 'middle' }}>
                                        {data.tipo_comercial ? '✓' : ''}
                                      </span> COMERCIAL
                                    </td>
                                    <td style={{ padding: '1.5px 0' }}>
                                      <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '0.8px solid #000', textAlign: 'center', lineHeight: '7.5px', fontSize: '6.5pt', fontWeight: 'bold', marginRight: '3px', verticalAlign: 'middle' }}>
                                        {data.tipo_industrial ? '✓' : ''}
                                      </span> INDUSTRIAL
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: '1.5px 0' }}>
                                      <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '0.8px solid #000', textAlign: 'center', lineHeight: '7.5px', fontSize: '6.5pt', fontWeight: 'bold', marginRight: '3px', verticalAlign: 'middle' }}>
                                        {data.tipo_cobertura ? '✓' : ''}
                                      </span> COBERTURA
                                    </td>
                                    <td style={{ padding: '1.5px 0' }} colSpan={2}>
                                      <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '0.8px solid #000', textAlign: 'center', lineHeight: '7.5px', fontSize: '6.5pt', fontWeight: 'bold', marginRight: '3px', verticalAlign: 'middle' }}>
                                        {data.tipo_com_montagem ? '✓' : ''}
                                      </span> COM MONTAGEM
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>

                          {/* DOCUMENTOS FORNECIDOS */}
                          <td style={{ width: '50%', verticalAlign: 'top', padding: 0 }}>
                            <div style={{ backgroundColor: '#d9d9d9', fontWeight: 'bold', fontSize: '6.8pt', padding: '1.5px 4px', borderBottom: '1px solid #000', textTransform: 'uppercase' }}>
                              DOCUMENTOS FORNECIDOS PELO CLIENTE
                            </div>
                            <div style={{ padding: '3px 5px' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '6.5pt', lineHeight: 1.2 }}>
                                <tbody>
                                  <tr>
                                    <td style={{ padding: '1.5px 0', width: '33%' }}>
                                      <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '0.8px solid #000', textAlign: 'center', lineHeight: '7.5px', fontSize: '6.5pt', fontWeight: 'bold', marginRight: '3px', verticalAlign: 'middle' }}>
                                        {data.doc_calculo ? '✓' : ''}
                                      </span> CÁLCULO
                                    </td>
                                    <td style={{ padding: '1.5px 0', width: '33%' }}>
                                      <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '0.8px solid #000', textAlign: 'center', lineHeight: '7.5px', fontSize: '6.5pt', fontWeight: 'bold', marginRight: '3px', verticalAlign: 'middle' }}>
                                        {data.doc_projeto ? '✓' : ''}
                                      </span> PROJETO
                                    </td>
                                    <td style={{ padding: '1.5px 0', width: '34%' }}>
                                      <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '0.8px solid #000', textAlign: 'center', lineHeight: '7.5px', fontSize: '6.5pt', fontWeight: 'bold', marginRight: '3px', verticalAlign: 'middle' }}>
                                        {data.doc_detalhamento ? '✓' : ''}
                                      </span> DETALHAMENTO
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: '1.5px 0' }}>
                                      <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '0.8px solid #000', textAlign: 'center', lineHeight: '7.5px', fontSize: '6.5pt', fontWeight: 'bold', marginRight: '3px', verticalAlign: 'middle' }}>
                                        {data.doc_normas ? '✓' : ''}
                                      </span> NORMAS
                                    </td>
                                    <td style={{ padding: '1.5px 0' }}>
                                      <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '0.8px solid #000', textAlign: 'center', lineHeight: '7.5px', fontSize: '6.5pt', fontWeight: 'bold', marginRight: '3px', verticalAlign: 'middle' }}>
                                        {data.doc_especif_tecnicas ? '✓' : ''}
                                      </span> ESPECIF. TÉC.
                                    </td>
                                    <td style={{ padding: '1.5px 0' }}>
                                      <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '0.8px solid #000', textAlign: 'center', lineHeight: '7.5px', fontSize: '6.5pt', fontWeight: 'bold', marginRight: '3px', verticalAlign: 'middle' }}>
                                        {data.doc_catalogo || data.doc_fotos ? '✓' : ''}
                                      </span> CATÁLOGO / FOTOS
                                    </td>
                                  </tr>
                                  <tr>
                                    <td style={{ padding: '1.5px 0' }} colSpan={3}>
                                      <span style={{ display: 'inline-block', width: '8px', height: '8px', border: '0.8px solid #000', textAlign: 'center', lineHeight: '7.5px', fontSize: '6.5pt', fontWeight: 'bold', marginRight: '3px', verticalAlign: 'middle' }}>
                                        {data.doc_cronograma ? '✓' : ''}
                                      </span> CRONOGRAMA
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* 5. CORPO PRINCIPAL: ESCOPO (ESQUERDA) + CRONOGRAMA/CONTROLE (DIREITA) */}
                <tr>
                  <td colSpan={3} style={{ padding: 0, border: '1px solid #000' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr>
                          {/* TABELA DE ESCOPO / MATERIAIS (LADO ESQUERDO 60%) */}
                          <td style={{ width: '60%', verticalAlign: 'top', borderRight: '1px solid #000', padding: 0 }}>
                            <div style={{ backgroundColor: '#d9d9d9', fontWeight: 'bold', fontSize: '7.2pt', padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid #000', textTransform: 'uppercase' }}>
                              INFORMAÇÕES DO PROJETO / ESCOPO DE FORNECIMENTO
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr style={{ backgroundColor: '#f0f0f0' }}>
                                  <th style={{ width: '48%', textAlign: 'left', border: '1px solid #000', padding: '1.2px 3px', fontSize: '6.8pt' }}>ITEM / DESCRIÇÃO</th>
                                  <th style={{ width: '8%', textAlign: 'center', border: '1px solid #000', padding: '1.2px 3px', fontSize: '6.8pt' }}>FORN.</th>
                                  <th style={{ width: '44%', textAlign: 'left', border: '1px solid #000', padding: '1.2px 3px', fontSize: '6.8pt' }}>ESPECIFICAÇÃO / OBSERVAÇÕES</th>
                                </tr>
                              </thead>
                              <tbody>
                                {itemsEscopo.map((item, idx) => (
                                  <tr key={idx} style={{ backgroundColor: idx === itemsEscopo.length - 1 ? '#fafafa' : '#fff' }}>
                                    <td style={{ border: '1px solid #000', padding: '1.2px 3px', fontSize: '6.8pt', fontWeight: idx === itemsEscopo.length - 1 ? 'bold' : 'normal' }}>
                                      {item.label}
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '1.2px 3px', fontSize: '6.8pt', textAlign: 'center', fontWeight: 'bold' }}>
                                      {getFornIndicator(item.field)}
                                    </td>
                                    <td style={{ border: '1px solid #000', padding: '1.2px 3px', fontSize: '6.8pt' }}>
                                      {getInfoText(item.field)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>

                          {/* CRONOGRAMA & CONTROLE OPERACIONAL (LADO DIREITO 40%) */}
                          <td style={{ width: '40%', verticalAlign: 'top', padding: 0 }}>
                            <div style={{ backgroundColor: '#d9d9d9', fontWeight: 'bold', fontSize: '7.2pt', padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid #000', textTransform: 'uppercase' }}>
                              CRONOGRAMA & CONTROLE OPERACIONAL
                            </div>
                            
                            {/* PRAZOS E REQUISITOS */}
                            <div style={{ padding: '3px 4px', borderBottom: '1px solid #000' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '6.8pt', marginBottom: '2px' }}>REQUISITOS / PRAZOS DE EXECUÇÃO:</div>
                              <table style={{ width: '100%', fontSize: '6.5pt', borderCollapse: 'collapse' }}>
                                <tbody>
                                  <tr>
                                    <td style={{ border: '1px solid #ccc', padding: '2px', width: '40%' }}><b>FABRICAÇÃO E PINTURA:</b></td>
                                    <td style={{ border: '1px solid #ccc', padding: '2px' }}>{prazoFabPintura}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ border: '1px solid #ccc', padding: '2px' }}><b>MONTAGEM:</b></td>
                                    <td style={{ border: '1px solid #ccc', padding: '2px' }}>{prazoMontagem}</td>
                                  </tr>
                                  <tr>
                                    <td style={{ border: '1px solid #ccc', padding: '2px' }}><b>QUALIDADE / INSPEÇÃO:</b></td>
                                    <td style={{ border: '1px solid #ccc', padding: '2px' }}>{prazoQualidade}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                            {/* TABELA SEMANAL SIMPLIFICADA (ESTILO B.116) */}
                            <div style={{ padding: '3px 4px', borderBottom: '1px solid #000' }}>
                              <div style={{ fontSize: '5.8pt', fontWeight: 'bold', textAlign: 'center', marginBottom: '2px' }}>
                                PLANEJAMENTO DE ETAPAS (SEMANAS)
                              </div>
                              <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#f0f0f0' }}>
                                    <th style={{ width: '32%', textAlign: 'left', fontWeight: 'bold', paddingLeft: '2px', border: '1px solid #777', fontSize: '5pt', height: '8.5px' }}>EVENTO</th>
                                    <th style={{ width: '8.5%', border: '1px solid #777', fontSize: '5pt', textAlign: 'center', padding: 0, height: '8.5px' }}>S1</th>
                                    <th style={{ width: '8.5%', border: '1px solid #777', fontSize: '5pt', textAlign: 'center', padding: 0, height: '8.5px' }}>S2</th>
                                    <th style={{ width: '8.5%', border: '1px solid #777', fontSize: '5pt', textAlign: 'center', padding: 0, height: '8.5px' }}>S3</th>
                                    <th style={{ width: '8.5%', border: '1px solid #777', fontSize: '5pt', textAlign: 'center', padding: 0, height: '8.5px' }}>S4</th>
                                    <th style={{ width: '8.5%', border: '1px solid #777', fontSize: '5pt', textAlign: 'center', padding: 0, height: '8.5px' }}>S5</th>
                                    <th style={{ width: '8.5%', border: '1px solid #777', fontSize: '5pt', textAlign: 'center', padding: 0, height: '8.5px' }}>S6</th>
                                    <th style={{ width: '8.5%', border: '1px solid #777', fontSize: '5pt', textAlign: 'center', padding: 0, height: '8.5px' }}>S7</th>
                                    <th style={{ width: '8.5%', border: '1px solid #777', fontSize: '5pt', textAlign: 'center', padding: 0, height: '8.5px' }}>S8</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {cronogramaEtapas.map((etapa, eIdx) => (
                                    <tr key={eIdx}>
                                      <td style={{ textAlign: 'left', paddingLeft: '2px', fontWeight: 'bold', border: '1px solid #777', fontSize: '5pt', height: '8.5px' }}>
                                        {etapa.nome}
                                      </td>
                                      {etapa.weeks.map((isActive, wIdx) => (
                                        <td 
                                          key={wIdx} 
                                          style={{
                                            border: '1px solid #777',
                                            fontSize: '5pt',
                                            textAlign: 'center',
                                            padding: 0,
                                            height: '8.5px',
                                            backgroundColor: isActive ? '#eaeaea' : '#fff'
                                          }}
                                        />
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>

                            {/* ALTERAÇÕES DE CONTRATO */}
                            <div style={{ padding: '3px 4px', fontSize: '6.2pt', borderBottom: '1px solid #000' }}>
                              <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>
                                ALTERAÇÃO NO CONTRATO / PROJETO (Rev. {data.revisao !== undefined ? data.revisao : '0'})
                              </div>
                              <div style={{ marginTop: '2px', color: '#333' }}>
                                <i>
                                  {data.alteracao_descritivo || (data.revisao && data.revisao !== '0' ? (data.alteracao_motivo || `Revisão ${data.revisao}`) : 'Emissão Inicial - Nenhuma alteração registrada.')}
                                </i>
                              </div>
                              <div style={{ marginTop: '4px' }}>
                                <b>Impacto Custo:</b> ({data.alteracao_custo && Number(data.alteracao_custo) > 0 ? 'X' : ' '}) Sim ({!data.alteracao_custo || Number(data.alteracao_custo) === 0 ? 'X' : ' '}) Não &nbsp;&nbsp;&nbsp;
                                <b>Impacto Prazo:</b> ({data.alteracao_cronograma ? 'X' : ' '}) Sim ({!data.alteracao_cronograma ? 'X' : ' '}) Não
                              </div>
                            </div>

                            {/* CONTROLE DE QUALIDADE / LIBERAÇÃO */}
                            <div style={{ padding: '3px 4px', fontSize: '6.2pt' }}>
                              <div style={{ fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>CONTROLE DE QUALIDADE & EXPEDIÇÃO</div>
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '6pt' }}>
                                <tbody>
                                  <tr>
                                    <td style={{ border: '1px solid #ccc', padding: '2px' }}><b>PEÇAS PRONTAS:</b> [ {data.alteracao_pecas_prontas ? '✓' : ' '} ] OK</td>
                                    <td style={{ border: '1px solid #ccc', padding: '2px' }}><b>PINTURA:</b> [ {data.info_pintura_base?.e || data.info_pintura_acabamento?.e ? '✓' : ' '} ] OK</td>
                                  </tr>
                                  <tr>
                                    <td style={{ border: '1px solid #ccc', padding: '2px' }}><b>EMBALAGEM:</b> [ {data.info_embalagem?.e ? '✓' : ' '} ] OK</td>
                                    <td style={{ border: '1px solid #ccc', padding: '2px' }}><b>LIB. EXPEDIÇÃO:</b> [ {data.visto_exp ? '✓' : ' '} ] OK</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>

                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>

                {/* 6. VISTOS E APROVAÇÕES (RODAPÉ) */}
                <tr>
                  <td colSpan={3} style={{ padding: 0, border: '1px solid #000' }}>
                    <div style={{ backgroundColor: '#d9d9d9', fontWeight: 'bold', fontSize: '7pt', letterSpacing: '0.5px', padding: '2px 4px', textAlign: 'center', borderBottom: '1px solid #000', textTransform: 'uppercase' }}>
                      VISTOS E APROVAÇÕES DOS RESPONSÁVEIS
                    </div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '6.5pt' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#f9f9f9' }}>
                          <th style={{ borderRight: '1px solid #000', padding: '2px', width: '16.6%', fontWeight: 'bold' }}>GESTOR</th>
                          <th style={{ borderRight: '1px solid #000', padding: '2px', width: '16.6%', fontWeight: 'bold' }}>PCP</th>
                          <th style={{ borderRight: '1px solid #000', padding: '2px', width: '16.6%', fontWeight: 'bold' }}>ENG / PROJETO</th>
                          <th style={{ borderRight: '1px solid #000', padding: '2px', width: '16.6%', fontWeight: 'bold' }}>FABRICAÇÃO</th>
                          <th style={{ borderRight: '1px solid #000', padding: '2px', width: '16.6%', fontWeight: 'bold' }}>EXPEDIÇÃO</th>
                          <th style={{ padding: '2px', width: '17%', fontWeight: 'bold' }}>QUALIDADE</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ height: '26px' }}>
                          <td style={{ borderRight: '1px solid #000', borderTop: '1px solid #ccc', verticalAlign: 'bottom', padding: '2px' }}>
                            <span style={{ fontSize: '7.2pt', fontWeight: 'bold', color: '#1a5276' }}>
                              {data.visto_gestor ? `✓ ${data.visto_gestor}` : (data.gestor ? `✓ ${data.gestor}` : '')}
                            </span>
                          </td>
                          <td style={{ borderRight: '1px solid #000', borderTop: '1px solid #ccc', verticalAlign: 'bottom', padding: '2px' }}>
                            <span style={{ fontSize: '7.2pt', fontWeight: 'bold', color: '#1a5276' }}>
                              {data.visto_pcp ? `✓ ${data.visto_pcp}` : ''}
                            </span>
                          </td>
                          <td style={{ borderRight: '1px solid #000', borderTop: '1px solid #ccc', verticalAlign: 'bottom', padding: '2px' }}>
                            <span style={{ fontSize: '7.2pt', fontWeight: 'bold', color: '#1a5276' }}>
                              {data.visto_eng ? `✓ ${data.visto_eng}` : ''}
                            </span>
                          </td>
                          <td style={{ borderRight: '1px solid #000', borderTop: '1px solid #ccc', verticalAlign: 'bottom', padding: '2px' }}>
                            <span style={{ fontSize: '7.2pt', fontWeight: 'bold', color: '#1a5276' }}>
                              {data.visto_fab ? `✓ ${data.visto_fab}` : ''}
                            </span>
                          </td>
                          <td style={{ borderRight: '1px solid #000', borderTop: '1px solid #ccc', verticalAlign: 'bottom', padding: '2px' }}>
                            <span style={{ fontSize: '7.2pt', fontWeight: 'bold', color: '#1a5276' }}>
                              {data.visto_exp ? `✓ ${data.visto_exp}` : ''}
                            </span>
                          </td>
                          <td style={{ borderTop: '1px solid #ccc', verticalAlign: 'bottom', padding: '2px' }}>
                            <span style={{ fontSize: '7.2pt', fontWeight: 'bold', color: '#1a5276' }}>
                              {data.visto_qual ? `✓ ${data.visto_qual}` : ''}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* NOTA DE RODAPÉ */}
            <div style={{ fontSize: '5pt', color: '#888', textAlign: 'right', marginTop: '2px' }}>
              SGI-FM-05 REV.4 - FICHA TÉCNICA DE CONTRATO INTEGRADA
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
