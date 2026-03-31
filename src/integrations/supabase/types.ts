export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  TS_ERP: {
    Tables: {
      api_keys: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          key: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          key: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          key?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      apontamentos_diario_recursos: {
        Row: {
          created_at: string
          diario_id: string
          id: string
          of_number: string
          qtd_fim: number | null
          qtd_inicio: number | null
          qtd_meio: number | null
          qtd_segundo_turno: number | null
          recurso_id: string
        }
        Insert: {
          created_at?: string
          diario_id: string
          id?: string
          of_number: string
          qtd_fim?: number | null
          qtd_inicio?: number | null
          qtd_meio?: number | null
          qtd_segundo_turno?: number | null
          recurso_id: string
        }
        Update: {
          created_at?: string
          diario_id?: string
          id?: string
          of_number?: string
          qtd_fim?: number | null
          qtd_inicio?: number | null
          qtd_meio?: number | null
          qtd_segundo_turno?: number | null
          recurso_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apontamentos_diario_recursos_diario_id_fkey"
            columns: ["diario_id"]
            isOneToOne: false
            referencedRelation: "diarios_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_diario_recursos_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "recursos_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      apontamentos_improdutivos: {
        Row: {
          created_at: string | null
          descricao: string | null
          duracao_total: unknown | null
          hora_fim: string
          hora_inicio: string
          id: string
          motivo_id: string
          rdo_id: string
        }
        Insert: {
          created_at?: string | null
          descricao?: string | null
          duracao_total?: unknown | null
          hora_fim: string
          hora_inicio: string
          id?: string
          motivo_id: string
          rdo_id: string
        }
        Update: {
          created_at?: string | null
          descricao?: string | null
          duracao_total?: unknown | null
          hora_fim?: string
          hora_inicio?: string
          id?: string
          motivo_id?: string
          rdo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apontamentos_improdutivos_motivo_id_fkey"
            columns: ["motivo_id"]
            isOneToOne: false
            referencedRelation: "motivos_improdutivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_improdutivos_rdo_id_fkey"
            columns: ["rdo_id"]
            isOneToOne: false
            referencedRelation: "diario_obra_rdo"
            referencedColumns: ["id"]
          },
        ]
      }
      apontamentos_peca_obra: {
        Row: {
          created_at: string | null
          id: string
          marca_peca: string
          periodo: string | null
          quantidade: number | null
          rdo_id: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          marca_peca: string
          periodo?: string | null
          quantidade?: number | null
          rdo_id: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          marca_peca?: string
          periodo?: string | null
          quantidade?: number | null
          rdo_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "apontamentos_peca_obra_rdo_id_fkey"
            columns: ["rdo_id"]
            isOneToOne: false
            referencedRelation: "diario_obra_rdo"
            referencedColumns: ["id"]
          },
        ]
      }
      apontamentos_producao: {
        Row: {
          componente_id: string | null
          created_at: string
          created_by: string | null
          data_apontamento: string
          id: string
          observacoes: string | null
          of_number: string
          peca_id: string | null
          processo_id: string
          quantidade_produzida: number
          tipo_apontamento: string | null
          updated_at: string
        }
        Insert: {
          componente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_apontamento?: string
          id?: string
          observacoes?: string | null
          of_number: string
          peca_id?: string | null
          processo_id: string
          quantidade_produzida?: number
          tipo_apontamento?: string | null
          updated_at?: string
        }
        Update: {
          componente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_apontamento?: string
          id?: string
          observacoes?: string | null
          of_number?: string
          peca_id?: string | null
          processo_id?: string
          quantidade_produzida?: number
          tipo_apontamento?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "apontamentos_producao_componente_id_fkey"
            columns: ["componente_id"]
            isOneToOne: false
            referencedRelation: "componentes_peca"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_producao_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_producao_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_fabricacao"
            referencedColumns: ["id"]
          },
        ]
      }
      apontamentos_recursos_obra: {
        Row: {
          created_at: string | null
          horas_trabalhadas: number
          id: string
          rdo_id: string
          recurso_id: string
        }
        Insert: {
          created_at?: string | null
          horas_trabalhadas: number
          id?: string
          rdo_id: string
          recurso_id: string
        }
        Update: {
          created_at?: string | null
          horas_trabalhadas?: number
          id?: string
          rdo_id?: string
          recurso_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "apontamentos_recursos_obra_rdo_id_fkey"
            columns: ["rdo_id"]
            isOneToOne: false
            referencedRelation: "diario_obra_rdo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "apontamentos_recursos_obra_recurso_id_fkey"
            columns: ["recurso_id"]
            isOneToOne: false
            referencedRelation: "recursos_obra"
            referencedColumns: ["id"]
          },
        ]
      }
      atribuicoes: {
        Row: {
          attribution: string
          client: Database["TS_ERP"]["Enums"]["client_type"]
          created_at: string
          created_by: string
          duration: Database["TS_ERP"]["Enums"]["duration_type"]
          frequency: Database["TS_ERP"]["Enums"]["frequency_type"]
          id: string
          importance: Database["TS_ERP"]["Enums"]["importance_type"]
          method: Database["TS_ERP"]["Enums"]["method_type"]
          updated_at: string
          user_abbrev: string
          user_id: string
        }
        Insert: {
          attribution: string
          client: Database["TS_ERP"]["Enums"]["client_type"]
          created_at?: string
          created_by: string
          duration: Database["TS_ERP"]["Enums"]["duration_type"]
          frequency: Database["TS_ERP"]["Enums"]["frequency_type"]
          id?: string
          importance: Database["TS_ERP"]["Enums"]["importance_type"]
          method: Database["TS_ERP"]["Enums"]["method_type"]
          updated_at?: string
          user_abbrev?: string
          user_id: string
        }
        Update: {
          attribution?: string
          client?: Database["TS_ERP"]["Enums"]["client_type"]
          created_at?: string
          created_by?: string
          duration?: Database["TS_ERP"]["Enums"]["duration_type"]
          frequency?: Database["TS_ERP"]["Enums"]["frequency_type"]
          id?: string
          importance?: Database["TS_ERP"]["Enums"]["importance_type"]
          method?: Database["TS_ERP"]["Enums"]["method_type"]
          updated_at?: string
          user_abbrev?: string
          user_id?: string
        }
        Relationships: []
      }
      backup_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          error_message: string | null
          file_name: string
          file_size: number | null
          id: string
          operation_type: string
          records_count: number | null
          started_at: string
          status: string
          tables_count: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          error_message?: string | null
          file_name: string
          file_size?: number | null
          id?: string
          operation_type: string
          records_count?: number | null
          started_at?: string
          status?: string
          tables_count?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          error_message?: string | null
          file_name?: string
          file_size?: number | null
          id?: string
          operation_type?: string
          records_count?: number | null
          started_at?: string
          status?: string
          tables_count?: number | null
        }
        Relationships: []
      }
      brand_settings: {
        Row: {
          company_name: string
          created_at: string
          font_family: string
          id: number
          logo_url: string | null
          updated_at: string
        }
        Insert: {
          company_name?: string
          created_at?: string
          font_family?: string
          id?: number
          logo_url?: string | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string
          font_family?: string
          id?: number
          logo_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      catalogos: {
        Row: {
          arquivo_urls: string[] | null
          categoria: string
          conteudo: string
          created_at: string | null
          created_by: string | null
          disciplina: string
          id: string
          numero_paginas: number | null
          palavras_chave: string[] | null
          titulo: string
          updated_at: string | null
        }
        Insert: {
          arquivo_urls?: string[] | null
          categoria: string
          conteudo: string
          created_at?: string | null
          created_by?: string | null
          disciplina: string
          id?: string
          numero_paginas?: number | null
          palavras_chave?: string[] | null
          titulo: string
          updated_at?: string | null
        }
        Update: {
          arquivo_urls?: string[] | null
          categoria?: string
          conteudo?: string
          created_at?: string | null
          created_by?: string | null
          disciplina?: string
          id?: string
          numero_paginas?: number | null
          palavras_chave?: string[] | null
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      componentes_peca: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          marca_componente: string
          peca_id: string
          perfil: string | null
          peso_unitario: number | null
          quantidade_por_peca: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          marca_componente: string
          peca_id: string
          perfil?: string | null
          peso_unitario?: number | null
          quantidade_por_peca?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          marca_componente?: string
          peca_id?: string
          perfil?: string | null
          peso_unitario?: number | null
          quantidade_por_peca?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "componentes_peca_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
        ]
      }
      condicoes_climaticas: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          icone: string | null
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          icone?: string | null
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          icone?: string | null
          id?: string
          nome?: string
        }
        Relationships: []
      }
      contratos_obra: {
        Row: {
          cliente: string | null
          created_at: string | null
          created_by: string | null
          data_inicio_contratual: string | null
          data_termino_prevista: string | null
          id: string
          nome_obra: string | null
          of_number: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          cliente?: string | null
          created_at?: string | null
          created_by?: string | null
          data_inicio_contratual?: string | null
          data_termino_prevista?: string | null
          id?: string
          nome_obra?: string | null
          of_number: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          cliente?: string | null
          created_at?: string | null
          created_by?: string | null
          data_inicio_contratual?: string | null
          data_termino_prevista?: string | null
          id?: string
          nome_obra?: string | null
          of_number?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      cronogramas_of: {
        Row: {
          created_at: string
          created_by: string | null
          gestor_id: string | null
          id: string
          of_id: string | null
          revisao: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          gestor_id?: string | null
          id?: string
          of_id?: string | null
          revisao?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          gestor_id?: string | null
          id?: string
          of_id?: string | null
          revisao?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cronogramas_of_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronogramas_of_gestor_id_fkey"
            columns: ["gestor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cronogramas_of_of_id_fkey"
            columns: ["of_id"]
            isOneToOne: true
            referencedRelation: "ordens_fabricacao"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_obra_rdo: {
        Row: {
          condicao_climatica_id: string | null
          created_at: string | null
          data: string
          finalizado: boolean | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          numero_rdo: string | null
          observacoes_gerais: string | null
          of_number: string
          sincronizado: boolean | null
          temperatura_aproximada: number | null
          total_horas_trabalhadas: number | null
          updated_at: string | null
          usuario_nome: string | null
          usuario_rdo: string | null
        }
        Insert: {
          condicao_climatica_id?: string | null
          created_at?: string | null
          data?: string
          finalizado?: boolean | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          numero_rdo?: string | null
          observacoes_gerais?: string | null
          of_number: string
          sincronizado?: boolean | null
          temperatura_aproximada?: number | null
          total_horas_trabalhadas?: number | null
          updated_at?: string | null
          usuario_nome?: string | null
          usuario_rdo?: string | null
        }
        Update: {
          condicao_climatica_id?: string | null
          created_at?: string | null
          data?: string
          finalizado?: boolean | null
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          numero_rdo?: string | null
          observacoes_gerais?: string | null
          of_number?: string
          sincronizado?: boolean | null
          temperatura_aproximada?: number | null
          total_horas_trabalhadas?: number | null
          updated_at?: string | null
          usuario_nome?: string | null
          usuario_rdo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diario_obra_rdo_condicao_climatica_id_fkey"
            columns: ["condicao_climatica_id"]
            isOneToOne: false
            referencedRelation: "condicoes_climaticas"
            referencedColumns: ["id"]
          },
        ]
      }
      diario_ocorrencias: {
        Row: {
          created_at: string
          diario_id: string
          id: string
          ocorrencia_id: string
        }
        Insert: {
          created_at?: string
          diario_id: string
          id?: string
          ocorrencia_id: string
        }
        Update: {
          created_at?: string
          diario_id?: string
          id?: string
          ocorrencia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "diario_ocorrencias_diario_id_fkey"
            columns: ["diario_id"]
            isOneToOne: false
            referencedRelation: "diarios_producao"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "diario_ocorrencias_ocorrencia_id_fkey"
            columns: ["ocorrencia_id"]
            isOneToOne: false
            referencedRelation: "ocorrencias_improdutividade"
            referencedColumns: ["id"]
          },
        ]
      }
      diarios_producao: {
        Row: {
          created_at: string
          created_by: string | null
          data: string
          finalizado: boolean | null
          fotos_urls: string[] | null
          id: string
          observacoes_gerais: string | null
          tecnico_responsavel: string
          turno: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: string
          finalizado?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          observacoes_gerais?: string | null
          tecnico_responsavel: string
          turno: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: string
          finalizado?: boolean | null
          fotos_urls?: string[] | null
          id?: string
          observacoes_gerais?: string | null
          tecnico_responsavel?: string
          turno?: string
          updated_at?: string
        }
        Relationships: []
      }
      empenhos_material: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_empenho: string | null
          id: string
          lote: string | null
          material_id: string
          movimentacao_empenho_id: string | null
          observacoes: string | null
          of_number: string
          quantidade_empenhada: number
          quantidade_utilizada: number | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_empenho?: string | null
          id?: string
          lote?: string | null
          material_id: string
          movimentacao_empenho_id?: string | null
          observacoes?: string | null
          of_number: string
          quantidade_empenhada?: number
          quantidade_utilizada?: number | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_empenho?: string | null
          id?: string
          lote?: string | null
          material_id?: string
          movimentacao_empenho_id?: string | null
          observacoes?: string | null
          of_number?: string
          quantidade_empenhada?: number
          quantidade_utilizada?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "empenhos_material_movimentacao_empenho_id_fkey"
            columns: ["movimentacao_empenho_id"]
            isOneToOne: false
            referencedRelation: "movimentacoes_estoque"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_empenhos_material_estoque"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "estoque_materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      equipamentos: {
        Row: {
          capacidade: string | null
          certificado_calibracao: string | null
          codigo: string
          created_at: string
          created_by: string | null
          data_retorno: string | null
          data_saida: string | null
          descricao: string
          destino_outro: string | null
          devolvido_por: string | null
          id: string
          local_estoque: string
          observacoes: string | null
          of_number: string | null
          periodicidade_calibracao: number | null
          propriedade: string
          quantidade: number
          retirado_por: string | null
          updated_at: string
          validade_calibracao: string | null
        }
        Insert: {
          capacidade?: string | null
          certificado_calibracao?: string | null
          codigo: string
          created_at?: string
          created_by?: string | null
          data_retorno?: string | null
          data_saida?: string | null
          descricao: string
          destino_outro?: string | null
          devolvido_por?: string | null
          id?: string
          local_estoque: string
          observacoes?: string | null
          of_number?: string | null
          periodicidade_calibracao?: number | null
          propriedade?: string
          quantidade?: number
          retirado_por?: string | null
          updated_at?: string
          validade_calibracao?: string | null
        }
        Update: {
          capacidade?: string | null
          certificado_calibracao?: string | null
          codigo?: string
          created_at?: string
          created_by?: string | null
          data_retorno?: string | null
          data_saida?: string | null
          descricao?: string
          destino_outro?: string | null
          devolvido_por?: string | null
          id?: string
          local_estoque?: string
          observacoes?: string | null
          of_number?: string | null
          periodicidade_calibracao?: number | null
          propriedade?: string
          quantidade?: number
          retirado_por?: string | null
          updated_at?: string
          validade_calibracao?: string | null
        }
        Relationships: []
      }
      estoque_materiais: {
        Row: {
          certificado: string | null
          codigo: string
          comprimento: number | null
          created_at: string | null
          created_by: string | null
          descricao: string
          espessura: number | null
          fornecedor: string | null
          id: string
          kg_por_metro: number | null
          largura: number | null
          localizacao: string | null
          lote_atual: string | null
          observacoes: string | null
          peso_unitario: number | null
          qualidade_aco: string | null
          quantidade_disponivel: number | null
          quantidade_empenhada: number | null
          quantidade_maxima: number | null
          quantidade_minima: number | null
          quantidade_total: number | null
          status: string | null
          tipo_material_id: string | null
          unidade: string
          updated_at: string | null
          valor_unitario: number | null
        }
        Insert: {
          certificado?: string | null
          codigo: string
          comprimento?: number | null
          created_at?: string | null
          created_by?: string | null
          descricao: string
          espessura?: number | null
          fornecedor?: string | null
          id?: string
          kg_por_metro?: number | null
          largura?: number | null
          localizacao?: string | null
          lote_atual?: string | null
          observacoes?: string | null
          peso_unitario?: number | null
          qualidade_aco?: string | null
          quantidade_disponivel?: number | null
          quantidade_empenhada?: number | null
          quantidade_maxima?: number | null
          quantidade_minima?: number | null
          quantidade_total?: number | null
          status?: string | null
          tipo_material_id?: string | null
          unidade?: string
          updated_at?: string | null
          valor_unitario?: number | null
        }
        Update: {
          certificado?: string | null
          codigo?: string
          comprimento?: number | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string
          espessura?: number | null
          fornecedor?: string | null
          id?: string
          kg_por_metro?: number | null
          largura?: number | null
          localizacao?: string | null
          lote_atual?: string | null
          observacoes?: string | null
          peso_unitario?: number | null
          qualidade_aco?: string | null
          quantidade_disponivel?: number | null
          quantidade_empenhada?: number | null
          quantidade_maxima?: number | null
          quantidade_minima?: number | null
          quantidade_total?: number | null
          status?: string | null
          tipo_material_id?: string | null
          unidade?: string
          updated_at?: string | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "estoque_materiais_tipo_material_id_fkey"
            columns: ["tipo_material_id"]
            isOneToOne: false
            referencedRelation: "tipos_materia_prima"
            referencedColumns: ["id"]
          },
        ]
      }
      ficha_tecnica_contratos: {
        Row: {
          alteracao_cronograma: string | null
          alteracao_custo: number | null
          alteracao_descritivo: string | null
          alteracao_detalh_projeto: string | null
          alteracao_impacto: string | null
          alteracao_motivo: string | null
          alteracao_pecas_prontas: string | null
          bairro_obra: string | null
          bairro_projeto: string | null
          cel_contrato: string | null
          cel_obra: string | null
          cel_qualid: string | null
          cep: string | null
          cep_obra: string | null
          cep_projeto: string | null
          cidade: string | null
          cidade_obra: string | null
          cidade_projeto: string | null
          cliente: string | null
          cnpj: string | null
          condicoes_acesso: string | null
          contato_contrato: string | null
          contato_obra: string | null
          contato_qualid: string | null
          created_at: string
          cronograma_semanas: Json | null
          data_criacao: string | null
          data_inicio: string | null
          data_termino_prev: string | null
          descricao_resumida: string | null
          doc_calculo: boolean | null
          doc_catalogo: boolean | null
          doc_cronograma: boolean | null
          doc_detalhamento: boolean | null
          doc_especif_tecnicas: boolean | null
          doc_fotos: boolean | null
          doc_normas: boolean | null
          doc_projeto: boolean | null
          email_contrato: string | null
          email_obra: string | null
          email_obra_responsavel: string | null
          email_qualid: string | null
          endereco: string | null
          endereco_obra: string | null
          endereco_projeto: string | null
          eng_responsavel: string | null
          estado: string | null
          estado_obra: string | null
          estado_projeto: string | null
          fone_contrato: string | null
          fone_obra: string | null
          fone_qualid: string | null
          gestor: string | null
          gestor_id: string | null
          grades_modelo: string | null
          grades_padrao_comercial: boolean | null
          grades_padrao_sa2: boolean | null
          grades_padrao_sa2_meio: boolean | null
          grades_padrao_sa3: boolean | null
          horarios_trabalho: string | null
          id: string
          ie: string | null
          info_calculo_estrutural: Json | null
          info_chumbadores: Json | null
          info_databook: Json | null
          info_detalhamento: Json | null
          info_embalagem: Json | null
          info_ensaios_lab: Json | null
          info_fabricacao: Json | null
          info_forn_calhas: Json | null
          info_fornec_telhas: Json | null
          info_fornec_wall: Json | null
          info_galvanizacao: Json | null
          info_grades_piso: Json | null
          info_inspecao: Json | null
          info_jateamento: Json | null
          info_materia_prima: Json | null
          info_mont_calhas: Json | null
          info_mont_wall: Json | null
          info_montagem_telhas: Json | null
          info_outros_materiais: Json | null
          info_parafusos: Json | null
          info_pintura_acabamento: Json | null
          info_pintura_base: Json | null
          info_pintura_inter: Json | null
          info_placa_engenetal: Json | null
          info_pre_montagem: Json | null
          info_projeto_basico: Json | null
          info_steel_deck: Json | null
          info_stud_bolt: Json | null
          info_transporte: Json | null
          necessita_validacao_pos_detalh: boolean | null
          observacoes_obra: string | null
          of_number: string
          projetista: string | null
          projetista_id: string | null
          quantidade: number | null
          req_ambientais_existem: boolean | null
          req_ambientais_quais: string | null
          req_saude_seguranca_existem: boolean | null
          req_saude_seguranca_quais: string | null
          revisao: string | null
          telefone_obra: string | null
          tipo_cobertura: boolean | null
          tipo_com_montagem: boolean | null
          tipo_comercial: boolean | null
          tipo_espacial: boolean | null
          tipo_estrutural: boolean | null
          tipo_grades: boolean | null
          tipo_industrial: boolean | null
          tipo_residencial: boolean | null
          updated_at: string
          user_id: string | null
          visto_colunas: Json | null
          visto_eng: string | null
          visto_exp: string | null
          visto_fab: string | null
          visto_gestor: string | null
          visto_pcp: string | null
          visto_qual: string | null
        }
        Insert: {
          alteracao_cronograma?: string | null
          alteracao_custo?: number | null
          alteracao_descritivo?: string | null
          alteracao_detalh_projeto?: string | null
          alteracao_impacto?: string | null
          alteracao_motivo?: string | null
          alteracao_pecas_prontas?: string | null
          bairro_obra?: string | null
          bairro_projeto?: string | null
          cel_contrato?: string | null
          cel_obra?: string | null
          cel_qualid?: string | null
          cep?: string | null
          cep_obra?: string | null
          cep_projeto?: string | null
          cidade?: string | null
          cidade_obra?: string | null
          cidade_projeto?: string | null
          cliente?: string | null
          cnpj?: string | null
          condicoes_acesso?: string | null
          contato_contrato?: string | null
          contato_obra?: string | null
          contato_qualid?: string | null
          created_at?: string
          cronograma_semanas?: Json | null
          data_criacao?: string | null
          data_inicio?: string | null
          data_termino_prev?: string | null
          descricao_resumida?: string | null
          doc_calculo?: boolean | null
          doc_catalogo?: boolean | null
          doc_cronograma?: boolean | null
          doc_detalhamento?: boolean | null
          doc_especif_tecnicas?: boolean | null
          doc_fotos?: boolean | null
          doc_normas?: boolean | null
          doc_projeto?: boolean | null
          email_contrato?: string | null
          email_obra?: string | null
          email_obra_responsavel?: string | null
          email_qualid?: string | null
          endereco?: string | null
          endereco_obra?: string | null
          endereco_projeto?: string | null
          eng_responsavel?: string | null
          estado?: string | null
          estado_obra?: string | null
          estado_projeto?: string | null
          fone_contrato?: string | null
          fone_obra?: string | null
          fone_qualid?: string | null
          gestor?: string | null
          gestor_id?: string | null
          grades_modelo?: string | null
          grades_padrao_comercial?: boolean | null
          grades_padrao_sa2?: boolean | null
          grades_padrao_sa2_meio?: boolean | null
          grades_padrao_sa3?: boolean | null
          horarios_trabalho?: string | null
          id?: string
          ie?: string | null
          info_calculo_estrutural?: Json | null
          info_chumbadores?: Json | null
          info_databook?: Json | null
          info_detalhamento?: Json | null
          info_embalagem?: Json | null
          info_ensaios_lab?: Json | null
          info_fabricacao?: Json | null
          info_forn_calhas?: Json | null
          info_fornec_telhas?: Json | null
          info_fornec_wall?: Json | null
          info_galvanizacao?: Json | null
          info_grades_piso?: Json | null
          info_inspecao?: Json | null
          info_jateamento?: Json | null
          info_materia_prima?: Json | null
          info_mont_calhas?: Json | null
          info_mont_wall?: Json | null
          info_montagem_telhas?: Json | null
          info_outros_materiais?: Json | null
          info_parafusos?: Json | null
          info_pintura_acabamento?: Json | null
          info_pintura_base?: Json | null
          info_pintura_inter?: Json | null
          info_placa_engenetal?: Json | null
          info_pre_montagem?: Json | null
          info_projeto_basico?: Json | null
          info_steel_deck?: Json | null
          info_stud_bolt?: Json | null
          info_transporte?: Json | null
          necessita_validacao_pos_detalh?: boolean | null
          observacoes_obra?: string | null
          of_number: string
          projetista?: string | null
          projetista_id?: string | null
          quantidade?: number | null
          req_ambientais_existem?: boolean | null
          req_ambientais_quais?: string | null
          req_saude_seguranca_existem?: boolean | null
          req_saude_seguranca_quais?: string | null
          revisao?: string | null
          telefone_obra?: string | null
          tipo_cobertura?: boolean | null
          tipo_com_montagem?: boolean | null
          tipo_comercial?: boolean | null
          tipo_espacial?: boolean | null
          tipo_estrutural?: boolean | null
          tipo_grades?: boolean | null
          tipo_industrial?: boolean | null
          tipo_residencial?: boolean | null
          updated_at?: string
          user_id?: string | null
          visto_colunas?: Json | null
          visto_eng?: string | null
          visto_exp?: string | null
          visto_fab?: string | null
          visto_gestor?: string | null
          visto_pcp?: string | null
          visto_qual?: string | null
        }
        Update: {
          alteracao_cronograma?: string | null
          alteracao_custo?: number | null
          alteracao_descritivo?: string | null
          alteracao_detalh_projeto?: string | null
          alteracao_impacto?: string | null
          alteracao_motivo?: string | null
          alteracao_pecas_prontas?: string | null
          bairro_obra?: string | null
          bairro_projeto?: string | null
          cel_contrato?: string | null
          cel_obra?: string | null
          cel_qualid?: string | null
          cep?: string | null
          cep_obra?: string | null
          cep_projeto?: string | null
          cidade?: string | null
          cidade_obra?: string | null
          cidade_projeto?: string | null
          cliente?: string | null
          cnpj?: string | null
          condicoes_acesso?: string | null
          contato_contrato?: string | null
          contato_obra?: string | null
          contato_qualid?: string | null
          created_at?: string
          cronograma_semanas?: Json | null
          data_criacao?: string | null
          data_inicio?: string | null
          data_termino_prev?: string | null
          descricao_resumida?: string | null
          doc_calculo?: boolean | null
          doc_catalogo?: boolean | null
          doc_cronograma?: boolean | null
          doc_detalhamento?: boolean | null
          doc_especif_tecnicas?: boolean | null
          doc_fotos?: boolean | null
          doc_normas?: boolean | null
          doc_projeto?: boolean | null
          email_contrato?: string | null
          email_obra?: string | null
          email_obra_responsavel?: string | null
          email_qualid?: string | null
          endereco?: string | null
          endereco_obra?: string | null
          endereco_projeto?: string | null
          eng_responsavel?: string | null
          estado?: string | null
          estado_obra?: string | null
          estado_projeto?: string | null
          fone_contrato?: string | null
          fone_obra?: string | null
          fone_qualid?: string | null
          gestor?: string | null
          gestor_id?: string | null
          grades_modelo?: string | null
          grades_padrao_comercial?: boolean | null
          grades_padrao_sa2?: boolean | null
          grades_padrao_sa2_meio?: boolean | null
          grades_padrao_sa3?: boolean | null
          horarios_trabalho?: string | null
          id?: string
          ie?: string | null
          info_calculo_estrutural?: Json | null
          info_chumbadores?: Json | null
          info_databook?: Json | null
          info_detalhamento?: Json | null
          info_embalagem?: Json | null
          info_ensaios_lab?: Json | null
          info_fabricacao?: Json | null
          info_forn_calhas?: Json | null
          info_fornec_telhas?: Json | null
          info_fornec_wall?: Json | null
          info_galvanizacao?: Json | null
          info_grades_piso?: Json | null
          info_inspecao?: Json | null
          info_jateamento?: Json | null
          info_materia_prima?: Json | null
          info_mont_calhas?: Json | null
          info_mont_wall?: Json | null
          info_montagem_telhas?: Json | null
          info_outros_materiais?: Json | null
          info_parafusos?: Json | null
          info_pintura_acabamento?: Json | null
          info_pintura_base?: Json | null
          info_pintura_inter?: Json | null
          info_placa_engenetal?: Json | null
          info_pre_montagem?: Json | null
          info_projeto_basico?: Json | null
          info_steel_deck?: Json | null
          info_stud_bolt?: Json | null
          info_transporte?: Json | null
          necessita_validacao_pos_detalh?: boolean | null
          observacoes_obra?: string | null
          of_number?: string
          projetista?: string | null
          projetista_id?: string | null
          quantidade?: number | null
          req_ambientais_existem?: boolean | null
          req_ambientais_quais?: string | null
          req_saude_seguranca_existem?: boolean | null
          req_saude_seguranca_quais?: string | null
          revisao?: string | null
          telefone_obra?: string | null
          tipo_cobertura?: boolean | null
          tipo_com_montagem?: boolean | null
          tipo_comercial?: boolean | null
          tipo_espacial?: boolean | null
          tipo_estrutural?: boolean | null
          tipo_grades?: boolean | null
          tipo_industrial?: boolean | null
          tipo_residencial?: boolean | null
          updated_at?: string
          user_id?: string | null
          visto_colunas?: Json | null
          visto_eng?: string | null
          visto_exp?: string | null
          visto_fab?: string | null
          visto_gestor?: string | null
          visto_pcp?: string | null
          visto_qual?: string | null
        }
        Relationships: []
      }
      file_processings: {
        Row: {
          completed_at: string | null
          created_at: string
          download_url: string | null
          file_name: string
          file_type: string
          id: string
          sent_at: string | null
          status: string
          updated_at: string
          webhook_config_id: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          download_url?: string | null
          file_name: string
          file_type: string
          id?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          webhook_config_id?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          download_url?: string | null
          file_name?: string
          file_type?: string
          id?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          webhook_config_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "file_processings_webhook_config_id_fkey"
            columns: ["webhook_config_id"]
            isOneToOne: false
            referencedRelation: "webhook_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      functions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      interface_resources: {
        Row: {
          created_at: string
          group_id: string | null
          icon_name: string | null
          id: string
          is_submenu: boolean | null
          order_index: number | null
          parent_key: string | null
          resource_key: string
          resource_name: string
          route_path: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          icon_name?: string | null
          id?: string
          is_submenu?: boolean | null
          order_index?: number | null
          parent_key?: string | null
          resource_key: string
          resource_name: string
          route_path?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          icon_name?: string | null
          id?: string
          is_submenu?: boolean | null
          order_index?: number | null
          parent_key?: string | null
          resource_key?: string
          resource_name?: string
          route_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interface_resources_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "menu_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_prioridade_fabricacao: {
        Row: {
          created_at: string | null
          id: string
          ordem_fabricacao: number
          peca_id: string | null
          peso_total: number | null
          prioridade_fabricacao_id: string | null
          quantidade_priorizada: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          ordem_fabricacao?: number
          peca_id?: string | null
          peso_total?: number | null
          prioridade_fabricacao_id?: string | null
          quantidade_priorizada?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          ordem_fabricacao?: number
          peca_id?: string | null
          peso_total?: number | null
          prioridade_fabricacao_id?: string | null
          quantidade_priorizada?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "itens_prioridade_fabricacao_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_prioridade_fabricacao_prioridade_fabricacao_id_fkey"
            columns: ["prioridade_fabricacao_id"]
            isOneToOne: false
            referencedRelation: "prioridades_fabricacao"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_romaneio_insumos: {
        Row: {
          created_at: string
          descricao: string
          id: string
          observacoes: string | null
          peso_total: number | null
          peso_unitario: number | null
          quantidade_expedida: number
          romaneio_id: string
          tipo_insumo: string
          unidade: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          observacoes?: string | null
          peso_total?: number | null
          peso_unitario?: number | null
          quantidade_expedida: number
          romaneio_id: string
          tipo_insumo: string
          unidade?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          peso_total?: number | null
          peso_unitario?: number | null
          quantidade_expedida?: number
          romaneio_id?: string
          tipo_insumo?: string
          unidade?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_romaneio_insumos_romaneio_id_fkey"
            columns: ["romaneio_id"]
            isOneToOne: false
            referencedRelation: "romaneios_expedicao"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_romaneio_pecas: {
        Row: {
          comprimento: number | null
          created_at: string
          descricao: string | null
          fase: string | null
          id: string
          marca: string
          peca_id: string
          peso_total: number
          peso_unitario: number
          quantidade_expedida: number
          quantidade_faltante: number
          romaneio_id: string
        }
        Insert: {
          comprimento?: number | null
          created_at?: string
          descricao?: string | null
          fase?: string | null
          id?: string
          marca: string
          peca_id: string
          peso_total: number
          peso_unitario: number
          quantidade_expedida: number
          quantidade_faltante?: number
          romaneio_id: string
        }
        Update: {
          comprimento?: number | null
          created_at?: string
          descricao?: string | null
          fase?: string | null
          id?: string
          marca?: string
          peca_id?: string
          peso_total?: number
          peso_unitario?: number
          quantidade_expedida?: number
          quantidade_faltante?: number
          romaneio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_romaneio_pecas_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_romaneio_pecas_romaneio_id_fkey"
            columns: ["romaneio_id"]
            isOneToOne: false
            referencedRelation: "romaneios_expedicao"
            referencedColumns: ["id"]
          },
        ]
      }
      itens_solicitacao_compra: {
        Row: {
          created_at: string
          id: string
          material_id: string
          prazo_recebimento: string
          quantidade: number
          solicitacao_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          prazo_recebimento: string
          quantidade?: number
          solicitacao_id: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          prazo_recebimento?: string
          quantidade?: number
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_solicitacao_compra_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "estoque_materiais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "itens_solicitacao_compra_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "solicitacoes_compra"
            referencedColumns: ["id"]
          },
        ]
      }
      json_codes: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          json_code: Json
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          json_code: Json
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          json_code?: Json
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      localizacoes_estoque: {
        Row: {
          ativo: boolean | null
          codigo: string | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      logs_apontamentos_automaticos: {
        Row: {
          created_at: string
          data_execucao: string
          detalhes_erro: string | null
          id: string
          numero_romaneio: string
          of_number: string
          romaneio_id: string
          status_operacao: string
          total_pecas_processadas: number
          usuario_executou: string | null
        }
        Insert: {
          created_at?: string
          data_execucao?: string
          detalhes_erro?: string | null
          id?: string
          numero_romaneio: string
          of_number: string
          romaneio_id: string
          status_operacao?: string
          total_pecas_processadas?: number
          usuario_executou?: string | null
        }
        Update: {
          created_at?: string
          data_execucao?: string
          detalhes_erro?: string | null
          id?: string
          numero_romaneio?: string
          of_number?: string
          romaneio_id?: string
          status_operacao?: string
          total_pecas_processadas?: number
          usuario_executou?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_apontamentos_automaticos_romaneio_id_fkey"
            columns: ["romaneio_id"]
            isOneToOne: false
            referencedRelation: "romaneios_expedicao"
            referencedColumns: ["id"]
          },
        ]
      }
      lotes_solda_diario: {
        Row: {
          created_at: string
          diario_id: string
          id: string
          lote_solda: string | null
          of_number: string
        }
        Insert: {
          created_at?: string
          diario_id: string
          id?: string
          lote_solda?: string | null
          of_number: string
        }
        Update: {
          created_at?: string
          diario_id?: string
          id?: string
          lote_solda?: string | null
          of_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotes_solda_diario_diario_id_fkey"
            columns: ["diario_id"]
            isOneToOne: false
            referencedRelation: "diarios_producao"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_groups: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          order_index: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          order_index?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          order_index?: number
          updated_at?: string
        }
        Relationships: []
      }
      motivos_improdutivos: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          created_at: string | null
          descricao: string | null
          id: string
          motivo: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          motivo: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          motivo?: string
        }
        Relationships: []
      }
      movimentacoes_estoque: {
        Row: {
          created_at: string | null
          created_by: string | null
          data_movimentacao: string | null
          fornecedor: string | null
          id: string
          lote: string | null
          material_id: string
          nota_fiscal: string | null
          observacoes: string | null
          of_vinculada: string | null
          quantidade: number
          tipo_movimentacao: string
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data_movimentacao?: string | null
          fornecedor?: string | null
          id?: string
          lote?: string | null
          material_id: string
          nota_fiscal?: string | null
          observacoes?: string | null
          of_vinculada?: string | null
          quantidade?: number
          tipo_movimentacao: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data_movimentacao?: string | null
          fornecedor?: string | null
          id?: string
          lote?: string | null
          material_id?: string
          nota_fiscal?: string | null
          observacoes?: string | null
          of_vinculada?: string | null
          quantidade?: number
          tipo_movimentacao?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_movimentacoes_estoque_material"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "estoque_materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias_improdutividade: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          created_at: string
          descricao: string
          id: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string
          descricao: string
          id?: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          created_at?: string
          descricao?: string
          id?: string
        }
        Relationships: []
      }
      ofs_concluidas: {
        Row: {
          arquivado_por: string | null
          created_at: string
          criterio_qualidade: string | null
          data_abertura: string | null
          data_arquivamento: string | null
          data_prazo: string | null
          descritivo: string | null
          ficha_tecnica_data: Json | null
          id: string
          local_uf: string | null
          num_of: string
          peso_total: number | null
          status_detalhado: string | null
          tratamento_final: string | null
          user_id: string | null
        }
        Insert: {
          arquivado_por?: string | null
          created_at?: string
          criterio_qualidade?: string | null
          data_abertura?: string | null
          data_arquivamento?: string | null
          data_prazo?: string | null
          descritivo?: string | null
          ficha_tecnica_data?: Json | null
          id?: string
          local_uf?: string | null
          num_of: string
          peso_total?: number | null
          status_detalhado?: string | null
          tratamento_final?: string | null
          user_id?: string | null
        }
        Update: {
          arquivado_por?: string | null
          created_at?: string
          criterio_qualidade?: string | null
          data_abertura?: string | null
          data_arquivamento?: string | null
          data_prazo?: string | null
          descritivo?: string | null
          ficha_tecnica_data?: Json | null
          id?: string
          local_uf?: string | null
          num_of?: string
          peso_total?: number | null
          status_detalhado?: string | null
          tratamento_final?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      ordens_fabricacao: {
        Row: {
          created_at: string
          criterio_qualidade: string | null
          data_abertura: string | null
          data_prazo: string | null
          data_termino_prev: string | null
          descritivo: string | null
          ficha_tecnica_id: string | null
          gestor: string | null
          id: string
          local_uf: string | null
          nivel_qualidade: string | null
          num_of: string
          peso_total: number | null
          prioridade: string | null
          status: string | null
          tratamento_final: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          criterio_qualidade?: string | null
          data_abertura?: string | null
          data_prazo?: string | null
          data_termino_prev?: string | null
          descritivo?: string | null
          ficha_tecnica_id?: string | null
          gestor?: string | null
          id?: string
          local_uf?: string | null
          nivel_qualidade?: string | null
          num_of: string
          peso_total?: number | null
          prioridade?: string | null
          status?: string | null
          tratamento_final?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          criterio_qualidade?: string | null
          data_abertura?: string | null
          data_prazo?: string | null
          data_termino_prev?: string | null
          descritivo?: string | null
          ficha_tecnica_id?: string | null
          gestor?: string | null
          id?: string
          local_uf?: string | null
          nivel_qualidade?: string | null
          num_of?: string
          peso_total?: number | null
          prioridade?: string | null
          status?: string | null
          tratamento_final?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ordens_fabricacao_ficha_tecnica_id_fkey"
            columns: ["ficha_tecnica_id"]
            isOneToOne: false
            referencedRelation: "ficha_tecnica_contratos"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          ip_address: string | null
          requested_at: string
          status: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          ip_address?: string | null
          requested_at?: string
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip_address?: string | null
          requested_at?: string
          status?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pecas: {
        Row: {
          created_at: string
          descricao: string | null
          etapa_fase: string | null
          id: string
          marca: string
          material: string | null
          of_number: string
          perfil_principal: string | null
          peso_total: number | null
          peso_unitario: number | null
          prioridade: string | null
          quantidade: number | null
          sem_componentes: boolean | null
          tem_componentes: boolean | null
          tratamento_superficial: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          etapa_fase?: string | null
          id?: string
          marca: string
          material?: string | null
          of_number: string
          perfil_principal?: string | null
          peso_total?: number | null
          peso_unitario?: number | null
          prioridade?: string | null
          quantidade?: number | null
          sem_componentes?: boolean | null
          tem_componentes?: boolean | null
          tratamento_superficial?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          descricao?: string | null
          etapa_fase?: string | null
          id?: string
          marca?: string
          material?: string | null
          of_number?: string
          perfil_principal?: string | null
          peso_total?: number | null
          peso_unitario?: number | null
          prioridade?: string | null
          quantidade?: number | null
          sem_componentes?: boolean | null
          tem_componentes?: boolean | null
          tratamento_superficial?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      prioridades_config: {
        Row: {
          ativo: boolean | null
          codigo: string
          cor: string
          created_at: string | null
          id: string
          nome: string
          ordem: number
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          cor: string
          created_at?: string | null
          id?: string
          nome: string
          ordem?: number
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          cor?: string
          created_at?: string | null
          id?: string
          nome?: string
          ordem?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      prioridades_fabricacao: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          data_ultima_modificacao: string | null
          etapa_fase: string
          id: string
          modificado_por: string | null
          nome_prioridade: string
          of_number: string
          prioridade_id: string | null
          revisao: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          data_ultima_modificacao?: string | null
          etapa_fase: string
          id?: string
          modificado_por?: string | null
          nome_prioridade: string
          of_number: string
          prioridade_id?: string | null
          revisao?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          data_ultima_modificacao?: string | null
          etapa_fase?: string
          id?: string
          modificado_por?: string | null
          nome_prioridade?: string
          of_number?: string
          prioridade_id?: string | null
          revisao?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prioridades_fabricacao_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prioridades_fabricacao_prioridade_id_fkey"
            columns: ["prioridade_id"]
            isOneToOne: false
            referencedRelation: "prioridades_config"
            referencedColumns: ["id"]
          },
        ]
      }
      privilege_interface_resources: {
        Row: {
          created_at: string
          id: string
          privilege_id: string
          resource_key: string
        }
        Insert: {
          created_at?: string
          id?: string
          privilege_id: string
          resource_key: string
        }
        Update: {
          created_at?: string
          id?: string
          privilege_id?: string
          resource_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "privilege_interface_resources_privilege_id_fkey"
            columns: ["privilege_id"]
            isOneToOne: false
            referencedRelation: "privileges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "privilege_interface_resources_resource_key_fkey"
            columns: ["resource_key"]
            isOneToOne: false
            referencedRelation: "interface_resources"
            referencedColumns: ["resource_key"]
          },
        ]
      }
      privileges: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          permissions?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          permissions?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      processos_cronograma: {
        Row: {
          created_at: string
          cronograma_id: string | null
          data_fim: string
          data_inicio: string
          id: string
          nome_processo: string
          ordem: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          cronograma_id?: string | null
          data_fim: string
          data_inicio: string
          id?: string
          nome_processo: string
          ordem?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          cronograma_id?: string | null
          data_fim?: string
          data_inicio?: string
          id?: string
          nome_processo?: string
          ordem?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_cronograma_cronograma_id_fkey"
            columns: ["cronograma_id"]
            isOneToOne: false
            referencedRelation: "cronogramas_of"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_fabricacao: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      processos_pecas_datas: {
        Row: {
          created_at: string
          data_conclusao_real: string | null
          data_inicio_real: string | null
          id: string
          peca_id: string
          processo_id: string
          quantidade_total_planejada: number
          quantidade_total_produzida: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_conclusao_real?: string | null
          data_inicio_real?: string | null
          id?: string
          peca_id: string
          processo_id: string
          quantidade_total_planejada?: number
          quantidade_total_produzida?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_conclusao_real?: string | null
          data_inicio_real?: string | null
          id?: string
          peca_id?: string
          processo_id?: string
          quantidade_total_planejada?: number
          quantidade_total_produzida?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_pecas_datas_peca_id_fkey"
            columns: ["peca_id"]
            isOneToOne: false
            referencedRelation: "pecas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "processos_pecas_datas_processo_id_fkey"
            columns: ["processo_id"]
            isOneToOne: false
            referencedRelation: "processos_fabricacao"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          function_id: string | null
          id: string
          online: boolean | null
          privilege_id: string | null
          profile_image_url: string | null
          requested_at: string | null
          status: Database["TS_ERP"]["Enums"]["user_status"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          function_id?: string | null
          id: string
          online?: boolean | null
          privilege_id?: string | null
          profile_image_url?: string | null
          requested_at?: string | null
          status?: Database["TS_ERP"]["Enums"]["user_status"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          function_id?: string | null
          id?: string
          online?: boolean | null
          privilege_id?: string | null
          profile_image_url?: string | null
          requested_at?: string | null
          status?: Database["TS_ERP"]["Enums"]["user_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_function_id_fkey"
            columns: ["function_id"]
            isOneToOne: false
            referencedRelation: "functions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_privilege_id_fkey"
            columns: ["privilege_id"]
            isOneToOne: false
            referencedRelation: "privileges"
            referencedColumns: ["id"]
          },
        ]
      }
      prompts: {
        Row: {
          content: string
          created_at: string
          created_by: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      qualidades_aco: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          norma: string | null
          propriedades: Json | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          norma?: string | null
          propriedades?: Json | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          norma?: string | null
          propriedades?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rastreabilidade_materiais: {
        Row: {
          certificado: string | null
          corrida: string | null
          created_at: string | null
          created_by: string | null
          data_entrada: string | null
          data_validade: string | null
          fornecedor: string | null
          id: string
          lote: string
          material_id: string
          nota_fiscal: string | null
          quantidade: number
          status: string | null
        }
        Insert: {
          certificado?: string | null
          corrida?: string | null
          created_at?: string | null
          created_by?: string | null
          data_entrada?: string | null
          data_validade?: string | null
          fornecedor?: string | null
          id?: string
          lote: string
          material_id: string
          nota_fiscal?: string | null
          quantidade: number
          status?: string | null
        }
        Update: {
          certificado?: string | null
          corrida?: string | null
          created_at?: string | null
          created_by?: string | null
          data_entrada?: string | null
          data_validade?: string | null
          fornecedor?: string | null
          id?: string
          lote?: string
          material_id?: string
          nota_fiscal?: string | null
          quantidade?: number
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rastreabilidade_materiais_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "estoque_materiais"
            referencedColumns: ["id"]
          },
        ]
      }
      recursos_obra: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome_recurso: string
          tipo_recurso: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome_recurso: string
          tipo_recurso: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome_recurso?: string
          tipo_recurso?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      recursos_producao: {
        Row: {
          ativo: boolean | null
          created_at: string
          id: string
          nome: string
          tipo: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome: string
          tipo: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          id?: string
          nome?: string
          tipo?: string
        }
        Relationships: []
      }
      registros_desvios: {
        Row: {
          created_at: string | null
          descricao_desvio: string
          id: string
          rdo_id: string
          referencia_projeto: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          descricao_desvio: string
          id?: string
          rdo_id: string
          referencia_projeto?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          descricao_desvio?: string
          id?: string
          rdo_id?: string
          referencia_projeto?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registros_desvios_rdo_id_fkey"
            columns: ["rdo_id"]
            isOneToOne: false
            referencedRelation: "diario_obra_rdo"
            referencedColumns: ["id"]
          },
        ]
      }
      registros_fotograficos: {
        Row: {
          arquivo_url: string
          created_at: string | null
          fk_associada: string
          id: string
          legenda: string | null
          timestamp_foto: string | null
          tipo_associacao: string
        }
        Insert: {
          arquivo_url: string
          created_at?: string | null
          fk_associada: string
          id?: string
          legenda?: string | null
          timestamp_foto?: string | null
          tipo_associacao: string
        }
        Update: {
          arquivo_url?: string
          created_at?: string | null
          fk_associada?: string
          id?: string
          legenda?: string | null
          timestamp_foto?: string | null
          tipo_associacao?: string
        }
        Relationships: []
      }
      romaneios_expedicao: {
        Row: {
          created_at: string
          created_by: string | null
          data_criacao: string | null
          data_prevista_entrega: string | null
          data_romaneio: string
          frete_tipo: string | null
          id: string
          maior_dimensao: string | null
          motivo_revisao: string | null
          nome_motorista: string | null
          numero_romaneio: string
          observacoes: string | null
          of_number: string
          peso_total_romaneio: number
          previsao_kg: number | null
          prioridade: string
          revisao: number | null
          status: string
          tipo_transporte: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_criacao?: string | null
          data_prevista_entrega?: string | null
          data_romaneio?: string
          frete_tipo?: string | null
          id?: string
          maior_dimensao?: string | null
          motivo_revisao?: string | null
          nome_motorista?: string | null
          numero_romaneio: string
          observacoes?: string | null
          of_number: string
          peso_total_romaneio?: number
          previsao_kg?: number | null
          prioridade?: string
          revisao?: number | null
          status?: string
          tipo_transporte?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_criacao?: string | null
          data_prevista_entrega?: string | null
          data_romaneio?: string
          frete_tipo?: string | null
          id?: string
          maior_dimensao?: string | null
          motivo_revisao?: string | null
          nome_motorista?: string | null
          numero_romaneio?: string
          observacoes?: string | null
          of_number?: string
          peso_total_romaneio?: number
          previsao_kg?: number | null
          prioridade?: string
          revisao?: number | null
          status?: string
          tipo_transporte?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      solicitacoes_compra: {
        Row: {
          anexos_urls: string[] | null
          created_at: string
          created_by: string | null
          data_previsao_chegada: string | null
          data_solicitacao: string
          id: string
          justificativa: string | null
          numero_sc: string
          objetivo: string | null
          of_number: string | null
          revisao: number
          status: string
          updated_at: string
        }
        Insert: {
          anexos_urls?: string[] | null
          created_at?: string
          created_by?: string | null
          data_previsao_chegada?: string | null
          data_solicitacao?: string
          id?: string
          justificativa?: string | null
          numero_sc: string
          objetivo?: string | null
          of_number?: string | null
          revisao?: number
          status?: string
          updated_at?: string
        }
        Update: {
          anexos_urls?: string[] | null
          created_at?: string
          created_by?: string | null
          data_previsao_chegada?: string | null
          data_solicitacao?: string
          id?: string
          justificativa?: string | null
          numero_sc?: string
          objetivo?: string | null
          of_number?: string | null
          revisao?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sugestao_notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          message: string
          sugestao_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          sugestao_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          sugestao_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sugestao_notifications_sugestao_id_fkey"
            columns: ["sugestao_id"]
            isOneToOne: false
            referencedRelation: "sugestoes"
            referencedColumns: ["id"]
          },
        ]
      }
      sugestoes: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          created_at: string
          developer_notes: string | null
          id: string
          status: string
          sugestao: string
          user_id: string
          user_name: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          developer_notes?: string | null
          id?: string
          status?: string
          sugestao: string
          user_id: string
          user_name: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          created_at?: string
          developer_notes?: string | null
          id?: string
          status?: string
          sugestao?: string
          user_id?: string
          user_name?: string
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          comment: string
          created_at: string | null
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string | null
          id?: string
          task_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string | null
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_subtasks: {
        Row: {
          created_at: string | null
          id: string
          is_completed: boolean | null
          order_index: number | null
          task_id: string
          title: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          order_index?: number | null
          task_id: string
          title: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          order_index?: number | null
          task_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_subtasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          assigned_to: string[] | null
          category: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string | null
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          is_completed: boolean | null
          of_number: string
          priority: Database["TS_ERP"]["Enums"]["task_priority"] | null
          revision: number | null
          status: Database["TS_ERP"]["Enums"]["task_status"] | null
          task_ref: string
          title: string
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string[] | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          of_number: string
          priority?: Database["TS_ERP"]["Enums"]["task_priority"] | null
          revision?: number | null
          status?: Database["TS_ERP"]["Enums"]["task_status"] | null
          task_ref: string
          title: string
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          assigned_to?: string[] | null
          category?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          is_completed?: boolean | null
          of_number?: string
          priority?: Database["TS_ERP"]["Enums"]["task_priority"] | null
          revision?: number | null
          status?: Database["TS_ERP"]["Enums"]["task_status"] | null
          task_ref?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      theme_config: {
        Row: {
          created_at: string
          dark_theme: Json
          id: string
          light_theme: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          dark_theme?: Json
          id?: string
          light_theme?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          dark_theme?: Json
          id?: string
          light_theme?: Json
          updated_at?: string
        }
        Relationships: []
      }
      tipos_materia_prima: {
        Row: {
          ativo: boolean | null
          caracteristicas: Json | null
          categoria: string | null
          controles: Json | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          gestao_estoque_critico: boolean
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          caracteristicas?: Json | null
          categoria?: string | null
          controles?: Json | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          gestao_estoque_critico?: boolean
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          caracteristicas?: Json | null
          categoria?: string | null
          controles?: Json | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          gestao_estoque_critico?: boolean
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      unidades_medida: {
        Row: {
          abreviacao: string
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          abreviacao: string
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          abreviacao?: string
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_interface_permissions: {
        Row: {
          created_at: string
          permission: Database["TS_ERP"]["Enums"]["permission_level"]
          resource_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          permission?: Database["TS_ERP"]["Enums"]["permission_level"]
          resource_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          permission?: Database["TS_ERP"]["Enums"]["permission_level"]
          resource_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_interface_permissions_resource_key_fkey"
            columns: ["resource_key"]
            isOneToOne: false
            referencedRelation: "interface_resources"
            referencedColumns: ["resource_key"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["TS_ERP"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["TS_ERP"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["TS_ERP"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_session_logs: {
        Row: {
          created_at: string
          duration_minutes: number | null
          id: string
          ip_address: unknown | null
          is_active: boolean
          session_end: string | null
          session_start: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          session_end?: string | null
          session_start?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          duration_minutes?: number | null
          id?: string
          ip_address?: unknown | null
          is_active?: boolean
          session_end?: string | null
          session_start?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      webhook_configs: {
        Row: {
          converter_name: string
          created_at: string
          created_by: string | null
          id: string
          link_envio: string
          link_recebimento: string
          updated_at: string
        }
        Insert: {
          converter_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          link_envio: string
          link_recebimento: string
          updated_at?: string
        }
        Update: {
          converter_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          link_envio?: string
          link_recebimento?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_change_user_password: {
        Args: { new_password: string; user_id_param: string }
        Returns: boolean
      }
      admin_create_user: {
        Args: {
          user_email: string
          user_full_name?: string
          user_function_id?: string
          user_privilege_id?: string
        }
        Returns: string
      }
      admin_delete_user: {
        Args: { _user_id: string }
        Returns: boolean
      }
      buscar_pecas_disponiveis_para_prioridade: {
        Args: { p_etapa_fase: string; p_of_number: string }
        Returns: {
          created_at: string
          descricao: string
          etapa_fase: string
          id: string
          marca: string
          of_number: string
          peso_unitario: number
          quantidade: number
          quantidade_disponivel: number
          updated_at: string
          user_id: string
        }[]
      }
      calcular_prioridades_pecas_bulk: {
        Args: Record<PropertyKey, never>
        Returns: {
          peca_id: string
          prioridade_mais_alta: string
        }[]
      }
      can_delete_user: {
        Args: { _user_id: string }
        Returns: boolean
      }
      check_delete_permissions: {
        Args: Record<PropertyKey, never>
        Returns: {
          can_delete: boolean
          error_message: string
        }[]
      }
      cleanup_offline_users: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      concluir_of: {
        Args: { of_id_param: string }
        Returns: undefined
      }
      end_user_session: {
        Args: { session_id: string }
        Returns: undefined
      }
      entregar_of: {
        Args: { of_concluida_id: string }
        Returns: undefined
      }
      generate_rdo_number: {
        Args: { of_number_param: string }
        Returns: string
      }
      generate_rdo_number_sequential: {
        Args: { of_number_param: string }
        Returns: string
      }
      generate_romaneio_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_sc_number: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_task_ref: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generate_user_abbrev: {
        Args: { _user_id: string }
        Returns: string
      }
      get_all_users_for_tasks: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          full_name: string
          id: string
        }[]
      }
      get_apontamentos_stats: {
        Args: {
          p_data_fim?: string
          p_data_inicio?: string
          p_of_number?: string
        }
        Returns: {
          periodo_fim: string
          periodo_inicio: string
          processos_utilizados: number
          quantidade_total_produzida: number
          total_apontamentos: number
          total_componentes: number
          total_pecas: number
        }[]
      }
      get_dashboard_consolidated_data: {
        Args: { of_number_param: string }
        Returns: {
          data_apontamento: string
          peso_acumulado: number
          processo_cor: string
          processo_id: string
          processo_nome: string
        }[]
      }
      get_dashboard_date_range: {
        Args: { of_number_param: string }
        Returns: {
          data_fim_grafico: string
          data_inicio_grafico: string
        }[]
      }
      get_database_info: {
        Args: Record<PropertyKey, never>
        Returns: {
          database_size: string
          table_count: number
        }[]
      }
      get_effective_permission_for_resource: {
        Args: { _resource_key: string; _user_id: string }
        Returns: Database["TS_ERP"]["Enums"]["permission_level"]
      }
      get_effective_permissions_for_user: {
        Args: { _user_id: string }
        Returns: {
          permission: Database["TS_ERP"]["Enums"]["permission_level"]
          resource_key: string
        }[]
      }
      get_index_usage_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          idx_scan: number
          idx_tup_fetch: number
          idx_tup_read: number
          indexrelname: string
          relname: string
          schemaname: string
          usage_ratio: number
        }[]
      }
      get_itens_disponiveis: {
        Args: {
          p_include_componentes?: boolean
          p_limit?: number
          p_of_number?: string
          p_processo_id?: string
        }
        Returns: {
          descricao: string
          etapa_fase: string
          item_id: string
          item_type: string
          marca: string
          peca_pai_id: string
          peca_pai_marca: string
          peso_unitario: number
          processo_atual_id: string
          processo_atual_nome: string
          processo_atual_ordem: number
          proximos_processos: Json
          quantidade_disponivel: number
          quantidade_processada: number
          quantidade_total: number
        }[]
      }
      get_online_users: {
        Args: Record<PropertyKey, never>
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          session_start: string
          user_id: string
        }[]
      }
      get_table_stats: {
        Args: Record<PropertyKey, never>
        Returns: {
          idx_scan: number
          idx_tup_fetch: number
          n_tup_del: number
          n_tup_ins: number
          n_tup_upd: number
          relname: string
          schemaname: string
          seq_scan: number
          seq_tup_read: number
        }[]
      }
      get_user_dependencies: {
        Args: { _user_id: string }
        Returns: {
          count: number
          dependency_type: string
          description: string
          table_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["TS_ERP"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_diretoria: {
        Args: { _user_id: string }
        Returns: boolean
      }
      limpar_dados_inconsistentes_estoque: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      replace_user_with_deleted: {
        Args: { _user_id: string }
        Returns: undefined
      }
      reverter_of_concluida_para_ativa: {
        Args: { of_concluida_id: string }
        Returns: undefined
      }
      reverter_of_entregue_para_concluida: {
        Args: { of_concluida_id: string }
        Returns: undefined
      }
      set_user_offline: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      set_user_online: {
        Args: { user_id_param: string }
        Returns: undefined
      }
      user_can_access_ofs: {
        Args: { _user_id: string }
        Returns: boolean
      }
      user_has_interface_access: {
        Args: { _resource_key: string; _user_id: string }
        Returns: boolean
      }
      validate_sequencia_processos: {
        Args: {
          p_componente_id?: string
          p_of_number: string
          p_peca_id?: string
        }
        Returns: {
          item_id: string
          item_type: string
          marca: string
          motivo_bloqueio: string
          pode_apontar: boolean
          processo_atual_id: string
          processo_atual_nome: string
          processo_atual_ordem: number
          processos_pendentes: Json
        }[]
      }
      verificar_disponibilidade_peca: {
        Args: {
          p_item_id?: string
          p_peca_id: string
          p_quantidade_adicional: number
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      atribuicao_cliente: "interno" | "processo" | "obra" | "contrato" | "geral"
      atribuicao_duracao: "<=1 hora" | "2 horas" | "4 horas" | "8 horas"
      atribuicao_frequencia:
        | "horaria"
        | "2xdia"
        | "diaria"
        | "2xsemanal"
        | "semanal"
        | "quinzenal"
        | "mensal"
      atribuicao_importancia:
        | "essencial"
        | "estrategico"
        | "suporte"
        | "informativo"
      atribuicao_metodo:
        | "impresso"
        | "sistema"
        | "sistema-impresso"
        | "email"
        | "verbal"
      client_type: "interno" | "processo" | "obra" | "contrato" | "geral"
      duration_type: "<=1 hora" | "2 horas" | "4 horas" | "8 horas"
      frequency_type:
        | "horaria"
        | "2xdia"
        | "diaria"
        | "2xsemanal"
        | "semanal"
        | "quinzenal"
        | "mensal"
      importance_type: "essencial" | "estrategico" | "suporte" | "informativo"
      method_type:
        | "impresso"
        | "sistema"
        | "sistema-impresso"
        | "email"
        | "verbal"
      permission_level:
        | "can_admin"
        | "can_create_update_delete"
        | "can_create_only"
        | "can_view_only"
        | "no_access"
      task_priority: "baixa" | "media" | "alta" | "urgente"
      task_status:
        | "a_fazer"
        | "em_andamento"
        | "revisao"
        | "pendente"
        | "bloqueado"
        | "concluido"
      user_status: "pending" | "active" | "inactive" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  TS_ERP: {
    Enums: {
      app_role: ["admin", "user"],
      atribuicao_cliente: ["interno", "processo", "obra", "contrato", "geral"],
      atribuicao_duracao: ["<=1 hora", "2 horas", "4 horas", "8 horas"],
      atribuicao_frequencia: [
        "horaria",
        "2xdia",
        "diaria",
        "2xsemanal",
        "semanal",
        "quinzenal",
        "mensal",
      ],
      atribuicao_importancia: [
        "essencial",
        "estrategico",
        "suporte",
        "informativo",
      ],
      atribuicao_metodo: [
        "impresso",
        "sistema",
        "sistema-impresso",
        "email",
        "verbal",
      ],
      client_type: ["interno", "processo", "obra", "contrato", "geral"],
      duration_type: ["<=1 hora", "2 horas", "4 horas", "8 horas"],
      frequency_type: [
        "horaria",
        "2xdia",
        "diaria",
        "2xsemanal",
        "semanal",
        "quinzenal",
        "mensal",
      ],
      importance_type: ["essencial", "estrategico", "suporte", "informativo"],
      method_type: [
        "impresso",
        "sistema",
        "sistema-impresso",
        "email",
        "verbal",
      ],
      permission_level: [
        "can_admin",
        "can_create_update_delete",
        "can_create_only",
        "can_view_only",
        "no_access",
      ],
      task_priority: ["baixa", "media", "alta", "urgente"],
      task_status: [
        "a_fazer",
        "em_andamento",
        "revisao",
        "pendente",
        "bloqueado",
        "concluido",
      ],
      user_status: ["pending", "active", "inactive", "rejected"],
    },
  },
} as const
