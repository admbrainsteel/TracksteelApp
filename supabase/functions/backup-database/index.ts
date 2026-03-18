
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { JSZip } from 'https://deno.land/x/jszip@0.11.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verificar se o usuário é admin
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!userRole) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }), 
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Criar timestamp para o nome do arquivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupFileName = `backup_${timestamp}.zip`

    // Criar registro de log inicial
    const { data: logEntry } = await supabaseClient
      .from('backup_logs')
      .insert({
        operation_type: 'backup',
        file_name: backupFileName,
        created_by: user.id
      })
      .select()
      .single()

    if (!logEntry) {
      return new Response(
        JSON.stringify({ error: 'Failed to create backup log' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    try {
      // Lista das principais tabelas para backup
      const tablesToBackup = [
        'profiles',
        'functions',
        'privileges',
        'user_roles',
        'pecas',
        'ordens_fabricacao',
        'processos_fabricacao',
        'apontamentos_producao',
        'componentes_peca',
        'estoque_materiais',
        'movimentacoes_estoque',
        'romaneios_expedicao',
        'itens_romaneio_pecas',
        'itens_romaneio_insumos',
        'cronogramas_of',
        'tasks',
        'contratos_obra',
        'catalogos',
        'api_keys',
        'json_codes',
        'webhook_configs',
        'prompts',
        'session_logs',
        'password_reset_requests',
        'sugestoes',
        'backup_logs',
        'ficha_tecnica_contratos',
        'diarios_producao',
        'empenhos_material'
      ]

      // Criar ZIP
      const zip = new JSZip()
      
      let totalRecords = 0
      let tablesCount = 0
      const backupStartTime = new Date()
      const tablesSchema: any = {}
      const operationLogs: any[] = []

      // Fazer backup de cada tabela
      for (const tableName of tablesToBackup) {
        try {
          operationLogs.push({
            timestamp: new Date().toISOString(),
            operation: 'backup_table_start',
            table: tableName
          })

          const { data: tableData, error } = await supabaseClient
            .from(tableName)
            .select('*')

          if (!error && tableData) {
            // Adicionar dados da tabela na pasta data/
            zip.addFile(`data/${tableName}.json`, JSON.stringify(tableData, null, 2))
            
            // Coletar informações do schema (simplificado)
            if (tableData.length > 0) {
              const sampleRecord = tableData[0]
              tablesSchema[tableName] = {
                columns: Object.keys(sampleRecord).map(key => ({
                  name: key,
                  type: typeof sampleRecord[key]
                })),
                record_count: tableData.length
              }
            } else {
              tablesSchema[tableName] = {
                columns: [],
                record_count: 0
              }
            }

            totalRecords += tableData.length
            tablesCount++
            
            operationLogs.push({
              timestamp: new Date().toISOString(),
              operation: 'backup_table_success',
              table: tableName,
              records: tableData.length
            })

            console.log(`Backup da tabela ${tableName}: ${tableData.length} registros`)
          } else {
            operationLogs.push({
              timestamp: new Date().toISOString(),
              operation: 'backup_table_error',
              table: tableName,
              error: error?.message || 'Unknown error'
            })
            console.warn(`Erro ao fazer backup da tabela ${tableName}:`, error)
          }
        } catch (error) {
          operationLogs.push({
            timestamp: new Date().toISOString(),
            operation: 'backup_table_error',
            table: tableName,
            error: error.message
          })
          console.error(`Erro ao fazer backup da tabela ${tableName}:`, error)
        }
      }

      // Criar metadata.json
      const metadata = {
        backup_info: {
          created_at: backupStartTime.toISOString(),
          completed_at: new Date().toISOString(),
          version: '1.0',
          created_by: user.email,
          database_name: 'TrackSteel Production Database'
        },
        statistics: {
          total_tables: tablesCount,
          total_records: totalRecords,
          backup_size_estimate: 'calculated_after_compression'
        }
      }

      // Criar schema.json
      const schema = {
        version: '1.0',
        created_at: new Date().toISOString(),
        tables: tablesSchema
      }

      // Criar logs.json
      const logs = {
        backup_start: backupStartTime.toISOString(),
        backup_end: new Date().toISOString(),
        operations: operationLogs,
        summary: {
          total_operations: operationLogs.length,
          successful_tables: operationLogs.filter(log => log.operation === 'backup_table_success').length,
          failed_tables: operationLogs.filter(log => log.operation === 'backup_table_error').length
        }
      }

      // Adicionar arquivos de controle ao ZIP
      zip.addFile('metadata.json', JSON.stringify(metadata, null, 2))
      zip.addFile('schema.json', JSON.stringify(schema, null, 2))
      zip.addFile('logs.json', JSON.stringify(logs, null, 2))

      // Gerar o arquivo ZIP
      const zipData = await zip.generateAsync({ type: 'uint8array' })

      // Atualizar log como concluído
      await supabaseClient
        .from('backup_logs')
        .update({
          status: 'completed',
          file_size: zipData.length,
          tables_count: tablesCount,
          records_count: totalRecords
        })
        .eq('id', logEntry.id)

      console.log(`Backup concluído: ${tablesCount} tabelas, ${totalRecords} registros, ${zipData.length} bytes`)

      return new Response(zipData, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${backupFileName}"`,
        }
      })

    } catch (error) {
      console.error('Erro durante o backup:', error)
      
      // Atualizar log com erro
      await supabaseClient
        .from('backup_logs')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', logEntry.id)

      return new Response(
        JSON.stringify({ error: `Erro durante o backup: ${error.message}` }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

  } catch (error) {
    console.error('Erro geral no backup:', error)
    return new Response(
      JSON.stringify({ error: `Erro no backup: ${error.message}` }), 
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
