
import React from 'react';
import { FichaTecnicaData } from '@/hooks/useFichaTecnica';
import { useBrandSettings } from '@/hooks/useBrandSettings';

interface FichaTecnicaPDFTemplateProps {
  data: FichaTecnicaData;
}

export const FichaTecnicaPDFTemplate: React.FC<FichaTecnicaPDFTemplateProps> = ({ data }) => {
  const { brandSettings } = useBrandSettings();

  const infoItems = [
    { key: 'info_calculo_estrutural', label: 'CÁLCULO ESTRUTURAL' },
    { key: 'info_projeto_basico', label: 'PROJETO BÁSICO' },
    { key: 'info_detalhamento', label: 'DETALHAMENTO' },
    { key: 'info_materia_prima', label: 'MATÉRIA-PRIMA' },
    { key: 'info_fabricacao', label: 'FABRICAÇÃO' },
    { key: 'info_grades_piso', label: 'GRADES DE PISO' },
    { key: 'info_jateamento', label: 'JATEAMENTO' },
    { key: 'info_pintura_base', label: 'PINTURA BASE/FUNDO' },
    { key: 'info_pintura_inter', label: 'PINTURA INTERMEDIÁRIA' },
    { key: 'info_pintura_acabamento', label: 'PINTURA DE ACABAMENTO' },
    { key: 'info_galvanizacao', label: 'GALVANIZAÇÃO' },
    { key: 'info_embalagem', label: 'EMBALAGEM ESPECIAL' },
    { key: 'info_transporte', label: 'TRANSPORTE' },
    { key: 'info_inspecao', label: 'INSPEÇÃO QUALIFICADA' },
    { key: 'info_ensaios_lab', label: 'ENSAIOS DE LABORATÓRIO' },
    { key: 'info_databook', label: 'DATABOOK' },
    { key: 'info_pre_montagem', label: 'PRÉ-MONTAGEM' },
    { key: 'info_placa_engenetal', label: 'PLACA "ENGEMETAL" NA OBRA' },
    { key: 'info_parafusos', label: 'PARAFUSOS/PORCAS/ARR' },
    { key: 'info_chumbadores', label: 'CHUMBADORES' },
    { key: 'info_stud_bolt', label: 'STUD BOLT' },
    { key: 'info_fornec_telhas', label: 'FORNECIMENTO DE TELHAS' },
    { key: 'info_montagem_telhas', label: 'MONTAGEM DE TELHAS' },
    { key: 'info_forn_calhas', label: 'FORN. CALHAS E RUFOS' },
    { key: 'info_mont_calhas', label: 'MONTAG. CALHAS E RUFOS' },
    { key: 'info_steel_deck', label: 'STEEL DECK E ACESSOR.' },
    { key: 'info_fornec_wall', label: 'FORNECIMENTO WALL' },
    { key: 'info_mont_wall', label: 'MONTAGEM WALL' },
    { key: 'info_outros_materiais', label: 'OUTROS MATERIAIS OU SERV. ADICIONAIS' }
  ];

  const getInfoValue = (field: keyof FichaTecnicaData, type: 'e' | 'c' | 'na' | 'info') => {
    const info = data[field] as any;
    return info?.[type] || (type === 'info' ? '' : false);
  };

  const pdfStyles = {
    container: {
      fontFamily: 'Arial, sans-serif',
      fontSize: '9px',
      lineHeight: '1.2',
      color: '#000',
      width: '210mm',
      minHeight: '297mm',
      margin: '0 auto',
      background: '#fff',
      padding: '8mm',
      boxSizing: 'border-box' as const
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      border: '2px solid #000',
      padding: '6px 10px',
      marginBottom: '8px',
      background: '#e8e8e8'
    },
    logo: {
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#333'
    },
    title: {
      fontSize: '12px',
      fontWeight: 'bold',
      textAlign: 'center' as const,
      flex: 1,
      margin: '0 15px'
    },
    section: {
      marginBottom: '6px',
      border: '1px solid #000'
    },
    sectionHeader: {
      background: '#d0d0d0',
      padding: '3px 6px',
      borderBottom: '1px solid #000',
      fontWeight: 'bold',
      fontSize: '8px',
      textAlign: 'center' as const
    },
    sectionContent: {
      padding: '4px 6px'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(5, 1fr)',
      gap: '4px',
      margin: '2px 0'
    },
    field: {
      display: 'flex',
      flexDirection: 'column' as const
    },
    fieldLabel: {
      fontWeight: 'bold',
      fontSize: '7px',
      marginBottom: '1px',
      color: '#444'
    },
    fieldValue: {
      borderBottom: '1px solid #666',
      minHeight: '12px',
      padding: '1px 2px',
      fontSize: '8px',
      background: '#f8f8f8'
    },
    checkbox: {
      display: 'inline-flex',
      alignItems: 'center',
      marginRight: '8px',
      marginBottom: '2px'
    },
    checkboxBox: {
      width: '8px',
      height: '8px',
      border: '1px solid #000',
      marginRight: '3px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '6px',
      background: '#fff'
    },
    contactSection: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '6px',
      margin: '4px 0'
    },
    contactGroup: {
      border: '1px solid #666',
      padding: '3px'
    },
    contactTitle: {
      fontWeight: 'bold',
      textAlign: 'center' as const,
      marginBottom: '3px',
      background: '#e0e0e0',
      padding: '2px',
      margin: '-3px -3px 3px -3px',
      fontSize: '7px'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      fontSize: '7px'
    },
    tableHeader: {
      background: '#d0d0d0',
      padding: '3px 2px',
      textAlign: 'center' as const,
      fontWeight: 'bold',
      border: '1px solid #000',
      fontSize: '7px'
    },
    tableCell: {
      padding: '2px 3px',
      verticalAlign: 'middle' as const,
      border: '1px solid #666'
    },
    infoItem: {
      fontWeight: 'bold',
      background: '#f0f0f0',
      fontSize: '7px'
    },
    infoCheckbox: {
      textAlign: 'center' as const,
      width: '15px'
    },
    infoText: {
      minWidth: '120px',
      fontSize: '7px'
    },
    compactGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: '3px',
      margin: '2px 0'
    },
    twoColumnGrid: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr 1fr',
      gap: '4px',
      margin: '2px 0'
    },
    fullWidth: {
      gridColumn: 'span 4'
    }
  };

  return (
    <div id="pdf-template" style={pdfStyles.container}>
      {/* Cabeçalho */}
      <div style={pdfStyles.header}>
        <div style={pdfStyles.logo}>
          {brandSettings.logo_url ? (
            <img src={brandSettings.logo_url} alt="Logo" style={{ height: '24px' }} />
          ) : (
            brandSettings.company_name || 'EMPRESA'
          )}
        </div>
        <div style={pdfStyles.title}>FICHA TÉCNICA DE CONTRATO</div>
        <div style={{ width: '60px' }}></div>
      </div>

      {/* Informações da OF */}
      <div style={pdfStyles.section}>
        <div style={pdfStyles.sectionHeader}>INFORMAÇÕES GERAIS</div>
        <div style={pdfStyles.sectionContent}>
          <div style={pdfStyles.grid}>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>OF Nº:</div>
              <div style={pdfStyles.fieldValue}>{data.of_number || ''}</div>
            </div>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>GESTOR:</div>
              <div style={pdfStyles.fieldValue}>{data.gestor || ''}</div>
            </div>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>REVISÃO:</div>
              <div style={pdfStyles.fieldValue}>{data.revisao || ''}</div>
            </div>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>QTD (t):</div>
              <div style={pdfStyles.fieldValue}>{data.quantidade || ''}</div>
            </div>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>DATA:</div>
              <div style={pdfStyles.fieldValue}>{data.data_criacao || ''}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Dados do Cliente */}
      <div style={pdfStyles.section}>
        <div style={pdfStyles.sectionHeader}>DADOS DO CLIENTE</div>
        <div style={pdfStyles.sectionContent}>
          <div style={pdfStyles.twoColumnGrid}>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>CLIENTE:</div>
              <div style={pdfStyles.fieldValue}>{data.cliente || ''}</div>
            </div>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>CNPJ:</div>
              <div style={pdfStyles.fieldValue}>{data.cnpj || ''}</div>
            </div>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>IE:</div>
              <div style={pdfStyles.fieldValue}>{data.ie || ''}</div>
            </div>
          </div>
          <div style={pdfStyles.twoColumnGrid}>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>ENDEREÇO:</div>
              <div style={pdfStyles.fieldValue}>{data.endereco || ''}</div>
            </div>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>CIDADE:</div>
              <div style={pdfStyles.fieldValue}>{data.cidade || ''}</div>
            </div>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>ESTADO:</div>
              <div style={pdfStyles.fieldValue}>{data.estado || ''}</div>
            </div>
          </div>

          {/* Contatos compactos */}
          <div style={pdfStyles.contactSection}>
            <div style={pdfStyles.contactGroup}>
              <div style={pdfStyles.contactTitle}>CONTRATO</div>
              <div style={{ fontSize: '7px' }}>
                <div>{data.contato_contrato || ''}</div>
                <div>{data.fone_contrato || ''} | {data.cel_contrato || ''}</div>
                <div>{data.email_contrato || ''}</div>
              </div>
            </div>
            <div style={pdfStyles.contactGroup}>
              <div style={pdfStyles.contactTitle}>OBRA</div>
              <div style={{ fontSize: '7px' }}>
                <div>{data.contato_obra || ''}</div>
                <div>{data.fone_obra || ''} | {data.cel_obra || ''}</div>
                <div>{data.email_obra || ''}</div>
              </div>
            </div>
            <div style={pdfStyles.contactGroup}>
              <div style={pdfStyles.contactTitle}>QUALIDADE</div>
              <div style={{ fontSize: '7px' }}>
                <div>{data.contato_qualid || ''}</div>
                <div>{data.fone_qualid || ''} | {data.cel_qualid || ''}</div>
                <div>{data.email_qualid || ''}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dados do Projeto */}
      <div style={pdfStyles.section}>
        <div style={pdfStyles.sectionHeader}>DADOS DO PROJETO</div>
        <div style={pdfStyles.sectionContent}>
          <div style={{ ...pdfStyles.field, marginBottom: '4px' }}>
            <div style={pdfStyles.fieldLabel}>DESCRIÇÃO:</div>
            <div style={{ ...pdfStyles.fieldValue, minHeight: '20px' }}>{data.descricao_resumida || ''}</div>
          </div>
          <div style={pdfStyles.twoColumnGrid}>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>ENDEREÇO:</div>
              <div style={pdfStyles.fieldValue}>{data.endereco_projeto || ''}</div>
            </div>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>CIDADE:</div>
              <div style={pdfStyles.fieldValue}>{data.cidade_projeto || ''}</div>
            </div>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>ESTADO:</div>
              <div style={pdfStyles.fieldValue}>{data.estado_projeto || ''}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tipo de Projeto */}
      <div style={pdfStyles.section}>
        <div style={pdfStyles.sectionHeader}>TIPO DE PROJETO</div>
        <div style={pdfStyles.sectionContent}>
          <div style={pdfStyles.compactGrid}>
            {[
              { key: 'tipo_estrutural', label: 'ESTRUTURAL' },
              { key: 'tipo_residencial', label: 'RESIDENCIAL' },
              { key: 'tipo_espacial', label: 'ESPACIAL' },
              { key: 'tipo_comercial', label: 'COMERCIAL' },
              { key: 'tipo_grades', label: 'GRADES' },
              { key: 'tipo_industrial', label: 'INDUSTRIAL' },
              { key: 'tipo_cobertura', label: 'COBERTURA' },
              { key: 'tipo_com_montagem', label: 'COM MONTAGEM' }
            ].map(({ key, label }) => (
              <div key={key} style={pdfStyles.checkbox}>
                <div style={pdfStyles.checkboxBox}>
                  {data[key as keyof FichaTecnicaData] ? '✓' : ''}
                </div>
                <span style={{ fontSize: '7px' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Documentos Fornecidos */}
      <div style={pdfStyles.section}>
        <div style={pdfStyles.sectionHeader}>DOCUMENTOS FORNECIDOS</div>
        <div style={pdfStyles.sectionContent}>
          <div style={pdfStyles.compactGrid}>
            {[
              { key: 'doc_calculo', label: 'CÁLCULO' },
              { key: 'doc_projeto', label: 'PROJETO' },
              { key: 'doc_detalhamento', label: 'DETALHAMENTO' },
              { key: 'doc_cronograma', label: 'CRONOGRAMA' },
              { key: 'doc_normas', label: 'NORMAS' },
              { key: 'doc_especif_tecnicas', label: 'ESPECIF. TÉC.' },
              { key: 'doc_catalogo', label: 'CATÁLOGO' },
              { key: 'doc_fotos', label: 'FOTOS' }
            ].map(({ key, label }) => (
              <div key={key} style={pdfStyles.checkbox}>
                <div style={pdfStyles.checkboxBox}>
                  {data[key as keyof FichaTecnicaData] ? '✓' : ''}
                </div>
                <span style={{ fontSize: '7px' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Informações do Projeto - Tabela compacta */}
      <div style={pdfStyles.section}>
        <div style={pdfStyles.sectionHeader}>INFORMAÇÕES DO PROJETO</div>
        <div style={{ padding: '0' }}>
          <table style={pdfStyles.table}>
            <thead>
              <tr>
                <th style={{ ...pdfStyles.tableHeader, width: '45%' }}>ITEM</th>
                <th style={{ ...pdfStyles.tableHeader, width: '8%' }}>E</th>
                <th style={{ ...pdfStyles.tableHeader, width: '8%' }}>C</th>
                <th style={{ ...pdfStyles.tableHeader, width: '8%' }}>NA</th>
                <th style={{ ...pdfStyles.tableHeader, width: '31%' }}>INFO</th>
              </tr>
            </thead>
            <tbody>
              {infoItems.slice(0, 15).map(({ key, label }) => (
                <tr key={key}>
                  <td style={{ ...pdfStyles.tableCell, ...pdfStyles.infoItem }}>{label}</td>
                  <td style={{ ...pdfStyles.tableCell, ...pdfStyles.infoCheckbox }}>
                    {getInfoValue(key as keyof FichaTecnicaData, 'e') ? '✓' : ''}
                  </td>
                  <td style={{ ...pdfStyles.tableCell, ...pdfStyles.infoCheckbox }}>
                    {getInfoValue(key as keyof FichaTecnicaData, 'c') ? '✓' : ''}
                  </td>
                  <td style={{ ...pdfStyles.tableCell, ...pdfStyles.infoCheckbox }}>
                    {getInfoValue(key as keyof FichaTecnicaData, 'na') ? '✓' : ''}
                  </td>
                  <td style={{ ...pdfStyles.tableCell, ...pdfStyles.infoText }}>
                    {getInfoValue(key as keyof FichaTecnicaData, 'info')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Validação */}
      <div style={pdfStyles.section}>
        <div style={pdfStyles.sectionHeader}>VALIDAÇÃO</div>
        <div style={pdfStyles.sectionContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '7px' }}>
            <span>NECESSITA VALIDAÇÃO PÓS DETALHAMENTO?</span>
            <div style={pdfStyles.checkbox}>
              <div style={pdfStyles.checkboxBox}>
                {data.necessita_validacao_pos_detalh ? '✓' : ''}
              </div>
              <span>SIM</span>
            </div>
            <div style={pdfStyles.checkbox}>
              <div style={pdfStyles.checkboxBox}>
                {!data.necessita_validacao_pos_detalh ? '✓' : ''}
              </div>
              <span>NÃO</span>
            </div>
          </div>
        </div>
      </div>

      {/* Assinaturas compactas */}
      <div style={pdfStyles.section}>
        <div style={pdfStyles.sectionHeader}>VISTOS E APROVAÇÕES</div>
        <div style={pdfStyles.sectionContent}>
          <div style={pdfStyles.twoColumnGrid}>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>GESTOR:</div>
              <div style={{ ...pdfStyles.fieldValue, minHeight: '15px' }}>{data.visto_gestor || ''}</div>
            </div>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>PCP:</div>
              <div style={{ ...pdfStyles.fieldValue, minHeight: '15px' }}>{data.visto_pcp || ''}</div>
            </div>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>ENG:</div>
              <div style={{ ...pdfStyles.fieldValue, minHeight: '15px' }}>{data.visto_eng || ''}</div>
            </div>
          </div>
          <div style={pdfStyles.twoColumnGrid}>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>FABRICAÇÃO:</div>
              <div style={{ ...pdfStyles.fieldValue, minHeight: '15px' }}>{data.visto_fab || ''}</div>
            </div>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>EXPEDIÇÃO:</div>
              <div style={{ ...pdfStyles.fieldValue, minHeight: '15px' }}>{data.visto_exp || ''}</div>
            </div>
            <div style={pdfStyles.field}>
              <div style={pdfStyles.fieldLabel}>QUALIDADE:</div>
              <div style={{ ...pdfStyles.fieldValue, minHeight: '15px' }}>{data.visto_qual || ''}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
