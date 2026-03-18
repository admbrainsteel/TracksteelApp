import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = 'https://lwjppiicofojfcdfjsto.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3anBwaWljb2ZvamZjZGZqc3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ2MzA1MywiZXhwIjoyMDY2MDM5MDUzfQ.t9vlXHQH4ou2S-CKSeDYSnAeMDYpmkklqlwyGDvpocI';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ApontamentoRecord {
  id: string;
  of_number: string;
  data_apontamento: string;
  quantidade_produzida: number;
  processo_nome: string;
  processo_ordem: number;
  created_at: string;
}

interface UpdateResult {
  success: boolean;
  message: string;
  affectedRecords?: number;
  records?: ApontamentoRecord[];
  error?: string;
}

/**
 * Script para atualizar registros na tabela apontamentos_producao
 * Altera a data dos apontamentos da OF B101 na fase 9 de 08/09/2025 para 10/09/2025
 */
export class ApontamentosUpdateScript {
  private readonly OF_TARGET = 'B101';
  private readonly FASE_TARGET = 9;
  private readonly DATA_ORIGEM = '2025-09-08';
  private readonly DATA_DESTINO = '2025-09-10';

  /**
   * Busca os registros que serão afetados pela atualização
   */
  async previewRecords(): Promise<UpdateResult> {
    try {
      console.log('🔍 Buscando registros para preview...');
      
      const { data, error } = await supabase
        .from('apontamentos_producao')
        .select(`
          id,
          of_number,
          data_apontamento,
          quantidade_produzida,
          created_at,
          processos_fabricacao!inner(
            nome,
            ordem
          )
        `)
        .eq('of_number', this.OF_TARGET)
        .eq('data_apontamento', this.DATA_ORIGEM)
        .eq('processos_fabricacao.ordem', this.FASE_TARGET);

      if (error) {
        console.error('❌ Erro ao buscar registros:', error);
        return {
          success: false,
          message: 'Erro ao buscar registros para preview',
          error: error.message
        };
      }

      const records: ApontamentoRecord[] = data?.map((record: any) => ({
        id: record.id,
        of_number: record.of_number,
        data_apontamento: record.data_apontamento,
        quantidade_produzida: record.quantidade_produzida,
        processo_nome: record.processos_fabricacao?.nome || 'N/A',
        processo_ordem: record.processos_fabricacao?.ordem || 0,
        created_at: record.created_at
      })) || [];

      return {
        success: true,
        message: `Encontrados ${records.length} registros para atualização`,
        records
      };
    } catch (error: any) {
      console.error('❌ Erro inesperado no preview:', error);
      return {
        success: false,
        message: 'Erro inesperado ao buscar registros',
        error: error.message
      };
    }
  }

  /**
   * Executa a atualização dos registros
   */
  async executeUpdate(): Promise<UpdateResult> {
    try {
      console.log('🚀 Executando atualização...');
      
      const { data, error } = await supabase
        .from('apontamentos_producao')
        .update({ data_apontamento: this.DATA_DESTINO })
        .eq('of_number', this.OF_TARGET)
        .eq('data_apontamento', this.DATA_ORIGEM)
        .select();

      if (error) {
        console.error('❌ Erro na atualização:', error);
        return {
          success: false,
          message: 'Erro ao executar atualização',
          error: error.message
        };
      }

      console.log(`✅ Atualização concluída! ${data?.length || 0} registros afetados.`);
      
      return {
        success: true,
        message: `Atualização concluída com sucesso! ${data?.length || 0} registros atualizados.`,
        affectedRecords: data?.length || 0
      };
    } catch (error: any) {
      console.error('❌ Erro inesperado na atualização:', error);
      return {
        success: false,
        message: 'Erro inesperado na atualização',
        error: error.message
      };
    }
  }
}