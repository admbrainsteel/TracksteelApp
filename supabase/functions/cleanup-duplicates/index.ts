
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface DuplicateGroup {
  chave_agrupamento: string;
  of_number: string;
  marca: string;
  etapa_fase: string;
  processo_nome: string;
  quantidade_total_peca: number;
  apontamentos: Array<{
    id: string;
    data_apontamento: string;
    created_at: string;
    quantidade_produzida: number;
    tipo_apontamento: string;
  }>;
  total_apontado: number;
  excesso: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { of_number, action = 'execute' } = await req.json();

    if (!of_number) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Número da OF é obrigatório' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    console.log(`🔍 Iniciando ${action === 'analyze' ? 'análise' : 'limpeza'} de duplicatas para OF ${of_number}...`);

    // Buscar todos os apontamentos da OF com dados completos
    const { data: apontamentos, error } = await supabase
      .from('apontamentos_producao')
      .select(`
        id,
        of_number,
        processo_id,
        quantidade_produzida,
        data_apontamento,
        created_at,
        tipo_apontamento,
        peca_id,
        componente_id,
        peca:pecas(id, marca, etapa_fase, quantidade),
        componente:componentes_peca(id, marca_componente),
        processo:processos_fabricacao(nome)
      `)
      .eq('of_number', of_number)
      .order('data_apontamento', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Erro ao buscar apontamentos:', error);
      throw error;
    }

    console.log(`📋 Encontrados ${apontamentos?.length || 0} apontamentos para OF ${of_number}`);

    if (!apontamentos || apontamentos.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Nenhum apontamento encontrado para OF ${of_number}`,
          duplicatesRemoved: 0,
          totalGroups: 0,
          groupsWithDuplicates: 0,
          details: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Agrupar apontamentos por peça+fase+processo
    const grupos = new Map<string, DuplicateGroup>();

    apontamentos.forEach(apt => {
      let marca = '';
      let etapa_fase = '';
      let quantidade_total_peca = 0;

      if (apt.tipo_apontamento === 'peca' && apt.peca) {
        marca = apt.peca.marca;
        etapa_fase = apt.peca.etapa_fase || '0';
        quantidade_total_peca = apt.peca.quantidade || 0;
      } else if (apt.tipo_apontamento === 'componente' && apt.componente) {
        marca = apt.componente.marca_componente;
        etapa_fase = '0';
        quantidade_total_peca = 0;
        return; // Pular componentes nesta análise
      } else {
        console.warn('⚠️ Apontamento sem peça válida:', apt.id);
        return;
      }

      // Chave única: OF + Marca + Fase + Processo
      const chave = `${apt.of_number}|${marca}|${etapa_fase}|${apt.processo_id}`;
      const processo_nome = apt.processo?.nome || 'Desconhecido';
      
      console.log(`📝 Processando: OF=${apt.of_number}, Marca=${marca}, Fase=${etapa_fase}, Processo=${processo_nome}, Data=${apt.data_apontamento}, Qtd=${apt.quantidade_produzida}`);
      
      if (!grupos.has(chave)) {
        grupos.set(chave, {
          chave_agrupamento: chave,
          of_number: apt.of_number,
          marca,
          etapa_fase,
          processo_nome,
          quantidade_total_peca,
          apontamentos: [],
          total_apontado: 0,
          excesso: 0
        });
      }

      const grupo = grupos.get(chave)!;
      grupo.apontamentos.push({
        id: apt.id,
        data_apontamento: apt.data_apontamento,
        created_at: apt.created_at,
        quantidade_produzida: apt.quantidade_produzida,
        tipo_apontamento: apt.tipo_apontamento
      });
    });

    console.log(`🔍 Identificados ${grupos.size} grupos únicos de OF+Marca+Fase+Processo`);

    // Identificar duplicatas REAIS
    const idsParaExcluir: string[] = [];
    const detalhesLimpeza: DuplicateGroup[] = [];

    grupos.forEach((grupo) => {
      // Calcular total apontado para este grupo
      grupo.total_apontado = grupo.apontamentos.reduce((sum, apt) => sum + apt.quantidade_produzida, 0);
      grupo.excesso = Math.max(0, grupo.total_apontado - grupo.quantidade_total_peca);
      
      console.log(`\n🔄 Analisando grupo: ${grupo.marca} | Fase: ${grupo.etapa_fase} | Processo: ${grupo.processo_nome}`);
      console.log(`   📊 Quantidade total da peça: ${grupo.quantidade_total_peca}`);
      console.log(`   📈 Total apontado: ${grupo.total_apontado}`);
      console.log(`   📝 Número de apontamentos: ${grupo.apontamentos.length}`);

      // Se só tem 1 apontamento, não há duplicata
      if (grupo.apontamentos.length <= 1) {
        console.log(`   ✅ Apenas 1 apontamento - OK`);
        return;
      }

      // Ordenar apontamentos por data (mais antigo primeiro)
      grupo.apontamentos.sort((a, b) => {
        const dataA = new Date(a.data_apontamento);
        const dataB = new Date(b.data_apontamento);
        
        if (dataA.getTime() !== dataB.getTime()) {
          return dataA.getTime() - dataB.getTime();
        }
        
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });

      console.log(`   📅 Apontamentos ordenados por data:`);
      grupo.apontamentos.forEach((apt, idx) => {
        console.log(`     ${idx + 1}. Data: ${apt.data_apontamento}, Qtd: ${apt.quantidade_produzida}, ID: ${apt.id}`);
      });

      // Verificar se há excesso real de apontamentos ou múltiplas datas
      const datasUnicas = [...new Set(grupo.apontamentos.map(a => a.data_apontamento))];
      const temExcesso = grupo.total_apontado > grupo.quantidade_total_peca;
      const temMultiplasDatas = datasUnicas.length > 1;

      if (temExcesso || temMultiplasDatas) {
        console.log(`   🚨 DUPLICATA DETECTADA!`);
        if (temExcesso) {
          console.log(`   ⚠️ EXCESSO: Total apontado (${grupo.total_apontado}) > Quantidade da peça (${grupo.quantidade_total_peca})`);
        }
        if (temMultiplasDatas) {
          console.log(`   📅 MÚLTIPLAS DATAS: Mesma peça apontada em ${datasUnicas.length} datas diferentes: ${datasUnicas.join(', ')}`);
        }
        
        let quantidadeAcumulada = 0;

        // Processar apontamentos em ordem cronológica (manter os mais antigos)
        for (let i = 0; i < grupo.apontamentos.length; i++) {
          const apt = grupo.apontamentos[i];
          
          if (quantidadeAcumulada + apt.quantidade_produzida <= grupo.quantidade_total_peca) {
            // Este apontamento ainda cabe na quantidade da peça
            quantidadeAcumulada += apt.quantidade_produzida;
            console.log(`     ✅ MANTIDO: ${apt.data_apontamento} - Qtd: ${apt.quantidade_produzida} (Acum: ${quantidadeAcumulada})`);
          } else {
            // Este apontamento é excesso - REMOVER
            idsParaExcluir.push(apt.id);
            console.log(`     🗑️ REMOVIDO: ${apt.data_apontamento} - Qtd: ${apt.quantidade_produzida} - MOTIVO: Excesso`);
          }
        }

        detalhesLimpeza.push(grupo);
      }
    });

    const resultado = {
      success: true,
      message: action === 'analyze' 
        ? `Análise concluída para OF ${of_number}. ${detalhesLimpeza.length} duplicatas encontradas.`
        : `Limpeza concluída para OF ${of_number}. ${idsParaExcluir.length} duplicatas/excessos removidos.`,
      duplicatesRemoved: action === 'execute' ? idsParaExcluir.length : 0,
      totalGroups: grupos.size,
      groupsWithDuplicates: detalhesLimpeza.length,
      details: detalhesLimpeza
    };

    // Se for apenas análise, não executar exclusões
    if (action === 'analyze') {
      console.log('\n📊 Análise concluída - não executando exclusões');
      return new Response(
        JSON.stringify(resultado),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Executar exclusões em lotes (apenas se action === 'execute')
    let duplicatasRemovidas = 0;
    if (idsParaExcluir.length > 0) {
      console.log(`\n🗑️ Iniciando exclusão de ${idsParaExcluir.length} apontamentos duplicados/excessivos`);
      
      const loteSize = 50;
      
      for (let i = 0; i < idsParaExcluir.length; i += loteSize) {
        const lote = idsParaExcluir.slice(i, i + loteSize);
        
        console.log(`🔄 Processando lote ${Math.floor(i/loteSize) + 1}/${Math.ceil(idsParaExcluir.length/loteSize)} com ${lote.length} registros...`);
        
        const { error: deleteError } = await supabase
          .from('apontamentos_producao')
          .delete()
          .in('id', lote);

        if (deleteError) {
          console.error(`❌ Erro ao excluir lote:`, deleteError);
          throw deleteError;
        }

        duplicatasRemovidas += lote.length;
        console.log(`✅ Lote processado: ${lote.length} registros excluídos`);
      }
    }

    resultado.duplicatesRemoved = duplicatasRemovidas;

    console.log('\n✅ Operação concluída:', resultado);

    return new Response(
      JSON.stringify(resultado),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('❌ Erro durante operação:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Erro interno do servidor',
        duplicatesRemoved: 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
