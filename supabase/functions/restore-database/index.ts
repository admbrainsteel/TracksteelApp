
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    // Verificar se o usuário é admin
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (!userRole) {
      return new Response('Forbidden', { status: 403, headers: corsHeaders })
    }

    // Ler arquivo do request
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new Response('No file provided', { status: 400, headers: corsHeaders })
    }

    // Criar registro de log inicial
    const { data: logEntry } = await supabaseClient
      .from('backup_logs')
      .insert({
        operation_type: 'restore',
        file_name: file.name,
        file_size: file.size,
        created_by: user.id
      })
      .select()
      .single()

    try {
      // Ler conteúdo do arquivo
      const fileContent = await file.text()
      const backupData = JSON.parse(fileContent)

      // Validar estrutura do backup
      if (!backupData.version || !backupData.tables) {
        throw new Error('Formato de backup inválido')
      }

      let totalRecords = 0

      // Restaurar cada tabela
      for (const [tableName, tableData] of Object.entries(backupData.tables)) {
        if (Array.isArray(tableData) && tableData.length > 0) {
          try {
            // Limpar tabela antes de restaurar (cuidado!)
            await supabaseClient
              .from(tableName)
              .delete()
              .not('id', 'is', null)

            // Inserir dados em lotes
            const batchSize = 100
            for (let i = 0; i < tableData.length; i += batchSize) {
              const batch = tableData.slice(i, i + batchSize)
              await supabaseClient
                .from(tableName)
                .insert(batch)
            }

            totalRecords += tableData.length
          } catch (error) {
            console.error(`Erro ao restaurar tabela ${tableName}:`, error)
            // Continuar com outras tabelas mesmo se uma falhar
          }
        }
      }

      // Atualizar log como concluído
      await supabaseClient
        .from('backup_logs')
        .update({
          status: 'completed',
          tables_count: Object.keys(backupData.tables).length,
          records_count: totalRecords
        })
        .eq('id', logEntry.id)

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Restauração concluída com sucesso',
        tablesRestored: Object.keys(backupData.tables).length,
        recordsRestored: totalRecords
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (error) {
      // Atualizar log com erro
      await supabaseClient
        .from('backup_logs')
        .update({
          status: 'failed',
          error_message: error.message
        })
        .eq('id', logEntry.id)

      throw error
    }

  } catch (error) {
    console.error('Erro na restauração:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
