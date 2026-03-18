const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Configuração do Supabase
const supabaseUrl = 'https://lwjppiicofojfcdfjsto.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3anBwaWljb2ZvamZjZGZqc3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ2MzA1MywiZXhwIjoyMDY2MDM5MDUzfQ.t9vlXHQH4ou2S-CKSeDYSnAeMDYpmkklqlwyGDvpocI';

// Inicializar cliente Supabase com service role para operações administrativas
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Interface para entrada do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Função para solicitar confirmação do usuário
function askConfirmation(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes' || answer.toLowerCase() === 's' || answer.toLowerCase() === 'sim');
    });
  });
}

// Função principal
async function updateApontamentosB101Fase9() {
  console.log('🔧 Script de Atualização de Apontamentos - OF B101 Fase 9');
  console.log('=' .repeat(60));
  console.log('Objetivo: Alterar data de 08/09/2025 para 10/09/2025');
  console.log('Filtro: Apenas peças com marca entre 10 e 70');
  console.log('');

  try {
    // Passo 1: Buscar registros que serão afetados
    console.log('📋 Passo 1: Identificando registros a serem atualizados...');
    
    const { data: registrosParaAtualizar, error: selectError } = await supabase
      .from('apontamentos_producao')
      .select(`
        id,
        of_number,
        data_apontamento,
        quantidade_produzida,
        observacoes,
        pecas!inner(
          id,
          of_number,
          etapa_fase,
          marca,
          descricao
        )
      `)
      .eq('pecas.of_number', 'B101')
      .eq('pecas.etapa_fase', '9')
      .gte('pecas.marca', '10')
      .lte('pecas.marca', '70')
      .eq('data_apontamento', '2025-09-08');

    if (selectError) {
      console.error('❌ Erro ao buscar registros:', selectError.message);
      return;
    }

    if (!registrosParaAtualizar || registrosParaAtualizar.length === 0) {
      console.log('ℹ️  Nenhum registro encontrado com os critérios especificados.');
      console.log('   - OF: B101');
      console.log('   - Fase: 9');
      console.log('   - Marca: entre 10 e 70');
      console.log('   - Data atual: 08/09/2025');
      return;
    }

    // Mostrar registros encontrados
    console.log(`✅ Encontrados ${registrosParaAtualizar.length} registro(s) para atualização:`);
    console.log('');
    
    registrosParaAtualizar.forEach((registro, index) => {
      console.log(`📦 Registro ${index + 1}:`);
      console.log(`   ID: ${registro.id}`);
      console.log(`   OF: ${registro.of_number}`);
      console.log(`   Peça: ${registro.pecas.marca} - ${registro.pecas.descricao}`);
      console.log(`   Fase: ${registro.pecas.etapa_fase}`);
      console.log(`   Data atual: ${registro.data_apontamento}`);
      console.log(`   Quantidade: ${registro.quantidade_produzida}`);
      if (registro.observacoes) {
        console.log(`   Observações: ${registro.observacoes}`);
      }
      console.log('');
    });

    // Passo 2: Solicitar confirmação
    console.log('⚠️  ATENÇÃO: Esta operação irá alterar a data dos registros acima.');
    console.log('   Data atual: 08/09/2025');
    console.log('   Nova data:  10/09/2025');
    console.log('');
    
    const confirmacao = await askConfirmation('Deseja continuar com a atualização? (s/n): ');
    
    if (!confirmacao) {
      console.log('❌ Operação cancelada pelo usuário.');
      return;
    }

    // Passo 3: Executar a atualização
    console.log('');
    console.log('🔄 Passo 2: Executando atualização...');
    
    // Extrair IDs dos registros para atualização
    const idsParaAtualizar = registrosParaAtualizar.map(r => r.id);
    
    const { data: registrosAtualizados, error: updateError } = await supabase
      .from('apontamentos_producao')
      .update({ 
        data_apontamento: '2025-09-10',
        updated_at: new Date().toISOString()
      })
      .in('id', idsParaAtualizar)
      .select(`
        id,
        of_number,
        data_apontamento,
        quantidade_produzida,
        updated_at,
        pecas!inner(
          of_number,
          etapa_fase,
          marca
        )
      `);

    if (updateError) {
      console.error('❌ Erro ao atualizar registros:', updateError.message);
      return;
    }

    // Passo 4: Confirmar atualização
    console.log(`✅ Atualização concluída com sucesso!`);
    console.log(`📊 ${registrosAtualizados?.length || 0} registro(s) atualizado(s).`);
    console.log('');
    
    if (registrosAtualizados && registrosAtualizados.length > 0) {
      console.log('📋 Registros atualizados:');
      registrosAtualizados.forEach((registro, index) => {
        console.log(`   ${index + 1}. ID: ${registro.id} | Nova data: ${registro.data_apontamento} | Atualizado em: ${new Date(registro.updated_at).toLocaleString('pt-BR')}`);
      });
    }

    // Passo 5: Verificação final
    console.log('');
    console.log('🔍 Passo 3: Verificação final...');
    
    const { data: verificacao, error: verifyError } = await supabase
      .from('apontamentos_producao')
      .select(`
        id,
        of_number,
        data_apontamento,
        pecas!inner(
          of_number,
          etapa_fase,
          marca
        )
      `)
      .eq('pecas.of_number', 'B101')
      .eq('pecas.etapa_fase', '9')
      .gte('pecas.marca', '10')
      .lte('pecas.marca', '70')
      .eq('data_apontamento', '2025-09-10');

    if (verifyError) {
      console.error('❌ Erro na verificação final:', verifyError.message);
      return;
    }

    console.log(`✅ Verificação concluída: ${verificacao?.length || 0} registro(s) com a nova data (10/09/2025).`);
    
    // Verificar se ainda existem registros com a data antiga
    const { data: registrosAntigos, error: oldRecordsError } = await supabase
      .from('apontamentos_producao')
      .select('id, pecas!inner(of_number, etapa_fase, marca)')
      .eq('pecas.of_number', 'B101')
      .eq('pecas.etapa_fase', '9')
      .gte('pecas.marca', '10')
      .lte('pecas.marca', '70')
      .eq('data_apontamento', '2025-09-08');

    if (!oldRecordsError && registrosAntigos && registrosAntigos.length > 0) {
      console.log(`⚠️  Atenção: Ainda existem ${registrosAntigos.length} registro(s) com a data antiga (08/09/2025).`);
    } else {
      console.log('✅ Nenhum registro restante com a data antiga.');
    }

  } catch (error) {
    console.error('❌ Erro inesperado:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    rl.close();
    console.log('');
    console.log('🏁 Script finalizado.');
  }
}

// Executar o script
if (require.main === module) {
  updateApontamentosB101Fase9();
}

module.exports = { updateApontamentosB101Fase9 };