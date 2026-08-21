import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface FichaTecnicaData {
  id?: string;
  of_number: string;
  gestor?: string;
  projetista?: string;
  revisao?: string;
  quantidade?: number;
  data_criacao?: string;
  data_inicio?: string;
  data_termino_prev?: string;
  
  // Dados do Cliente
  cliente?: string;
  cnpj?: string;
  ie?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  contato_contrato?: string;
  fone_contrato?: string;
  cel_contrato?: string;
  email_contrato?: string;
  contato_obra?: string;
  fone_obra?: string;
  cel_obra?: string;
  email_obra?: string;
  contato_qualid?: string;
  fone_qualid?: string;
  cel_qualid?: string;
  email_qualid?: string;
  
  // Dados da Obra
  eng_responsavel?: string;
  telefone_obra?: string;
  email_obra_responsavel?: string;
  endereco_obra?: string;
  cep_obra?: string;
  bairro_obra?: string;
  cidade_obra?: string;
  estado_obra?: string;
  observacoes_obra?: string;
  
  // Dados do Projeto
  descricao_resumida?: string;
  endereco_projeto?: string;
  bairro_projeto?: string;
  cep_projeto?: string;
  cidade_projeto?: string;
  estado_projeto?: string;
  horarios_trabalho?: string;
  condicoes_acesso?: string;
  
  // Tipo de Projeto
  tipo_estrutural?: boolean;
  tipo_residencial?: boolean;
  tipo_espacial?: boolean;
  tipo_comercial?: boolean;
  tipo_grades?: boolean;
  tipo_industrial?: boolean;
  tipo_cobertura?: boolean;
  tipo_com_montagem?: boolean;
  
  // Documentos fornecidos
  doc_calculo?: boolean;
  doc_projeto?: boolean;
  doc_detalhamento?: boolean;
  doc_cronograma?: boolean;
  doc_normas?: boolean;
  doc_especif_tecnicas?: boolean;
  doc_catalogo?: boolean;
  doc_fotos?: boolean;
  
  /* eslint-disable @typescript-eslint/no-explicit-any */
  // Informações do projeto
  info_calculo_estrutural?: any;
  info_projeto_basico?: any;
  info_detalhamento?: any;
  info_materia_prima?: any;
  info_fabricacao?: any;
  info_grades_piso?: any;
  info_jateamento?: any;
  info_pintura_base?: any;
  info_pintura_inter?: any;
  info_pintura_acabamento?: any;
  info_galvanizacao?: any;
  info_embalagem?: any;
  info_transporte?: any;
  info_inspecao?: any;
  info_ensaios_lab?: any;
  info_databook?: any;
  info_pre_montagem?: any;
  info_placa_engenetal?: any;
  info_parafusos?: any;
  info_chumbadores?: any;
  info_stud_bolt?: any;
  info_fornec_telhas?: any;
  info_montagem_telhas?: any;
  info_forn_calhas?: any;
  info_mont_calhas?: any;
  info_steel_deck?: any;
  info_fornec_wall?: any;
  info_mont_wall?: any;
  info_outros_materiais?: any;
  
  // Validação
  necessita_validacao_pos_detalh?: boolean;
  
  // Grades de piso
  grades_modelo?: string;
  grades_padrao_comercial?: boolean;
  grades_padrao_sa2?: boolean;
  grades_padrao_sa2_meio?: boolean;
  grades_padrao_sa3?: boolean;
  
  // Requisitos
  req_ambientais_existem?: boolean;
  req_ambientais_quais?: string;
  req_saude_seguranca_existem?: boolean;
  req_saude_seguranca_quais?: string;
  
  // Alterações
  alteracao_descritivo?: string;
  alteracao_motivo?: string;
  alteracao_impacto?: string;
  alteracao_custo?: number;
  alteracao_cronograma?: string;
  alteracao_pecas_prontas?: string;
  alteracao_detalh_projeto?: string;
  
  // Cronograma
  cronograma_semanas?: any;
  
  // Vistos
  visto_gestor?: string;
  visto_pcp?: string;
  visto_eng?: string;
  visto_fab?: string;
  visto_exp?: string;
  visto_qual?: string;
  visto_colunas?: any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
}

export function useFichaTecnica() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fichaTecnica, setFichaTecnica] = useState<FichaTecnicaData | null>(null);

  // Query to fetch all fichas técnicas for the user
  const { data: fichasTecnicas, isLoading: isLoadingFichas } = useQuery({
    queryKey: ['fichas-tecnicas', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('ficha_tecnica_contratos')
        .select('*')
        .order('of_number', { ascending: true });

      if (error) {
        console.error('Erro ao buscar fichas técnicas:', error);
        throw error;
      }

      return data as FichaTecnicaData[];
    },
    enabled: !!user
  });

  const buscarFichaTecnica = useCallback(async (ofNumber: string) => {
    if (!user || !ofNumber.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('ficha_tecnica_contratos')
        .select('*')
        .eq('of_number', ofNumber.trim())
        .maybeSingle();

      if (error) {
        console.error('Erro ao buscar ficha técnica:', error);
        toast.error('Erro ao buscar ficha técnica');
        return null;
      }

      console.log('Ficha técnica encontrada:', data);
      setFichaTecnica(data);
      return data;
    } catch (error) {
      console.error('Erro ao buscar ficha técnica:', error);
      toast.error('Erro ao buscar ficha técnica');
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const salvarFichaTecnica = useCallback(async (data: FichaTecnicaData) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    if (!data.of_number?.trim()) {
      toast.error('Número da OF é obrigatório');
      return false;
    }

    setLoading(true);
    try {
      console.log('Salvando ficha técnica com datas:', {
        data_inicio: data.data_inicio,
        data_termino_prev: data.data_termino_prev
      });

      // Criar objeto com APENAS os campos que existem no banco de dados
      const dataToSave = {
        // Campos básicos obrigatórios
        of_number: data.of_number.trim(),
        user_id: user.id,
        updated_at: new Date().toISOString(),

        // Informações básicas
        gestor: data.gestor || null,
        projetista: data.projetista || null,
        revisao: data.revisao || '0',
        quantidade: data.quantidade || null,
        data_criacao: data.data_criacao || new Date().toISOString().split('T')[0],
        data_inicio: data.data_inicio || null,
        data_termino_prev: data.data_termino_prev || null,
        
        // Dados do Cliente
        cliente: data.cliente || null,
        cnpj: data.cnpj || null,
        ie: data.ie || null,
        endereco: data.endereco || null,
        cidade: data.cidade || null,
        estado: data.estado || null,
        cep: data.cep || null,
        contato_contrato: data.contato_contrato || null,
        fone_contrato: data.fone_contrato || null,
        cel_contrato: data.cel_contrato || null,
        email_contrato: data.email_contrato || null,
        contato_obra: data.contato_obra || null,
        fone_obra: data.fone_obra || null,
        cel_obra: data.cel_obra || null,
        email_obra: data.email_obra || null,
        contato_qualid: data.contato_qualid || null,
        fone_qualid: data.fone_qualid || null,
        cel_qualid: data.cel_qualid || null,
        email_qualid: data.email_qualid || null,
        
        // Dados da Obra
        eng_responsavel: data.eng_responsavel || null,
        telefone_obra: data.telefone_obra || null,
        email_obra_responsavel: data.email_obra_responsavel || null,
        endereco_obra: data.endereco_obra || null,
        cep_obra: data.cep_obra || null,
        bairro_obra: data.bairro_obra || null,
        cidade_obra: data.cidade_obra || null,
        estado_obra: data.estado_obra || null,
        observacoes_obra: data.observacoes_obra || null,
        
        // Dados do Projeto
        descricao_resumida: data.descricao_resumida || null,
        endereco_projeto: data.endereco_projeto || null,
        bairro_projeto: data.bairro_projeto || null,
        cep_projeto: data.cep_projeto || null,
        cidade_projeto: data.cidade_projeto || null,
        estado_projeto: data.estado_projeto || null,
        horarios_trabalho: data.horarios_trabalho || null,
        condicoes_acesso: data.condicoes_acesso || null,
        
        // Tipos de Projeto
        tipo_estrutural: Boolean(data.tipo_estrutural),
        tipo_residencial: Boolean(data.tipo_residencial),
        tipo_espacial: Boolean(data.tipo_espacial),
        tipo_comercial: Boolean(data.tipo_comercial),
        tipo_grades: Boolean(data.tipo_grades),
        tipo_industrial: Boolean(data.tipo_industrial),
        tipo_cobertura: Boolean(data.tipo_cobertura),
        tipo_com_montagem: Boolean(data.tipo_com_montagem),
        
        // Documentos fornecidos
        doc_calculo: Boolean(data.doc_calculo),
        doc_projeto: Boolean(data.doc_projeto),
        doc_detalhamento: Boolean(data.doc_detalhamento),
        doc_cronograma: Boolean(data.doc_cronograma),
        doc_normas: Boolean(data.doc_normas),
        doc_especif_tecnicas: Boolean(data.doc_especif_tecnicas),
        doc_catalogo: Boolean(data.doc_catalogo),
        doc_fotos: Boolean(data.doc_fotos),
        
        // Informações técnicas (JSONB)
        info_calculo_estrutural: data.info_calculo_estrutural || { e: false, c: false, na: false, info: '' },
        info_projeto_basico: data.info_projeto_basico || { e: false, c: false, na: false, info: '' },
        info_detalhamento: data.info_detalhamento || { e: false, c: false, na: false, info: '' },
        info_materia_prima: data.info_materia_prima || { e: false, c: false, na: false, info: '' },
        info_fabricacao: data.info_fabricacao || { e: false, c: false, na: false, info: '' },
        info_grades_piso: data.info_grades_piso || { e: false, c: false, na: false, info: '' },
        info_jateamento: data.info_jateamento || { e: false, c: false, na: false, info: '' },
        info_pintura_base: data.info_pintura_base || { e: false, c: false, na: false, info: '' },
        info_pintura_inter: data.info_pintura_inter || { e: false, c: false, na: false, info: '' },
        info_pintura_acabamento: data.info_pintura_acabamento || { e: false, c: false, na: false, info: '' },
        info_galvanizacao: data.info_galvanizacao || { e: false, c: false, na: false, info: '' },
        info_embalagem: data.info_embalagem || { e: false, c: false, na: false, info: '' },
        info_transporte: data.info_transporte || { e: false, c: false, na: false, info: '' },
        info_inspecao: data.info_inspecao || { e: false, c: false, na: false, info: '' },
        info_ensaios_lab: data.info_ensaios_lab || { e: false, c: false, na: false, info: '' },
        info_databook: data.info_databook || { e: false, c: false, na: false, info: '' },
        info_pre_montagem: data.info_pre_montagem || { e: false, c: false, na: false, info: '' },
        info_placa_engenetal: data.info_placa_engenetal || { e: false, c: false, na: false, info: '' },
        info_parafusos: data.info_parafusos || { e: false, c: false, na: false, info: '' },
        info_chumbadores: data.info_chumbadores || { e: false, c: false, na: false, info: '' },
        info_stud_bolt: data.info_stud_bolt || { e: false, c: false, na: false, info: '' },
        info_fornec_telhas: data.info_fornec_telhas || { e: false, c: false, na: false, info: '' },
        info_montagem_telhas: data.info_montagem_telhas || { e: false, c: false, na: false, info: '' },
        info_forn_calhas: data.info_forn_calhas || { e: false, c: false, na: false, info: '' },
        info_mont_calhas: data.info_mont_calhas || { e: false, c: false, na: false, info: '' },
        info_steel_deck: data.info_steel_deck || { e: false, c: false, na: false, info: '' },
        info_fornec_wall: data.info_fornec_wall || { e: false, c: false, na: false, info: '' },
        info_mont_wall: data.info_mont_wall || { e: false, c: false, na: false, info: '' },
        info_outros_materiais: data.info_outros_materiais || { e: false, c: false, na: false, info: '' },
        
        // Validação
        necessita_validacao_pos_detalh: Boolean(data.necessita_validacao_pos_detalh),
        
        // Grades
        grades_modelo: data.grades_modelo || null,
        grades_padrao_comercial: Boolean(data.grades_padrao_comercial),
        grades_padrao_sa2: Boolean(data.grades_padrao_sa2),
        grades_padrao_sa2_meio: Boolean(data.grades_padrao_sa2_meio),
        grades_padrao_sa3: Boolean(data.grades_padrao_sa3),
        
        // Requisitos
        req_ambientais_existem: Boolean(data.req_ambientais_existem),
        req_ambientais_quais: data.req_ambientais_quais || null,
        req_saude_seguranca_existem: Boolean(data.req_saude_seguranca_existem),
        req_saude_seguranca_quais: data.req_saude_seguranca_quais || null,
        
        // Alterações
        alteracao_descritivo: data.alteracao_descritivo || null,
        alteracao_motivo: data.alteracao_motivo || null,
        alteracao_impacto: data.alteracao_impacto || null,
        alteracao_custo: data.alteracao_custo || null,
        alteracao_cronograma: data.alteracao_cronograma || null,
        alteracao_pecas_prontas: data.alteracao_pecas_prontas || null,
        alteracao_detalh_projeto: data.alteracao_detalh_projeto || null,
        
        // Cronograma e Vistos (JSONB)
        cronograma_semanas: data.cronograma_semanas || {},
        
        // Vistos
        visto_gestor: data.visto_gestor || null,
        visto_pcp: data.visto_pcp || null,
        visto_eng: data.visto_eng || null,
        visto_fab: data.visto_fab || null,
        visto_exp: data.visto_exp || null,
        visto_qual: data.visto_qual || null,
        visto_colunas: data.visto_colunas || { '1': false, '2': false, '3': false, '4': false }
      };

      if (data.id) {
        // Atualizar registro existente
        const { error } = await supabase
          .from('ficha_tecnica_contratos')
          .update(dataToSave)
          .eq('id', data.id);

        if (error) {
          console.error('Erro ao atualizar ficha técnica:', error);
          toast.error(`Erro ao atualizar ficha técnica: ${error.message}`);
          return false;
        }

        toast.success('Ficha técnica atualizada com sucesso!');
      } else {
        // Verificar se já existe uma ficha para esta OF
        const { data: existingFicha } = await supabase
          .from('ficha_tecnica_contratos')
          .select('id')
          .eq('of_number', data.of_number.trim())
          .maybeSingle();

        if (existingFicha) {
          // Atualizar a ficha existente
          const { error } = await supabase
            .from('ficha_tecnica_contratos')
            .update(dataToSave)
            .eq('id', existingFicha.id);

          if (error) {
            console.error('Erro ao atualizar ficha técnica existente:', error);
            toast.error(`Erro ao atualizar ficha técnica: ${error.message}`);
            return false;
          }

          toast.success('Ficha técnica atualizada com sucesso!');
        } else {
          // Criar nova ficha
          const { data: newData, error } = await supabase
            .from('ficha_tecnica_contratos')
            .insert([dataToSave])
            .select()
            .single();

          if (error) {
            console.error('Erro ao criar ficha técnica:', error);
            toast.error(`Erro ao criar ficha técnica: ${error.message}`);
            return false;
          }

          setFichaTecnica(newData);
          toast.success('Ficha técnica criada com sucesso!');
        }
      }

      return true;
    } catch (error) {
      console.error('Erro inesperado ao salvar ficha técnica:', error);
      toast.error('Erro inesperado ao salvar ficha técnica');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const limparFichaTecnica = useCallback(() => {
    setFichaTecnica(null);
  }, []);

  return {
    fichaTecnica,
    fichasTecnicas,
    loading,
    isLoadingFichas,
    buscarFichaTecnica,
    salvarFichaTecnica,
    limparFichaTecnica,
    setFichaTecnica
  };
}
