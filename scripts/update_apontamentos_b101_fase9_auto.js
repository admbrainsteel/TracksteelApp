const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const supabaseUrl = 'https://lwjppiicofojfcdfjsto.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx3anBwaWljb2ZvamZjZGZqc3RvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDQ2MzA1MywiZXhwIjoyMDY2MDM5MDUzfQ.t9vlXHQH4ou2S-CKSeDYSnAeMDYpmkklqlwyGDvpocI';

// Inicializar cliente Supabase com service role para operações administrativas
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Função principal
async function updateApontamentosB101Fase9Auto() {
  console.log('🔧 Script de Atualização Automática - OF B101 Fase 9');
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

    console.log(`✅ Encontrados ${registrosParaAtualizar.length} registro(s) para atualização.`);
    console.log('');

    // Passo 2: Executar a atualização automaticamente
    console.log('🔄 Passo 2: Executando atualização automaticamente...');
    
    // Extrair IDs dos registros para atualização
    const idsParaAtualizar = registrosParaAtualizar.map(r => r.id);
    
    const { data: registrosAtualizados, error: updateError } = await supabase
      .from('apontamentos_producao')
      .update({ 
        data_apontamento: '2025-09-10',
        updated_at: new Date().toISOString(