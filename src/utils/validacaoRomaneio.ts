import { supabase } from '@/integrations/supabase/client';
import { ItemPendenciaProducao } from '@/components/expedicao/PendenciasProducaoModal';

export interface ResultadoValidacaoEntrega {
  valido: boolean;
  mensagem?: string;
  pendencias?: ItemPendenciaProducao[];
}

/**
 * Valida se um romaneio pode ser marcado com o status "Entregue".
 * Verifica se todas as peças cadastradas no romaneio foram devidamente apontadas
 * em todos os processos de fabricação anteriores à Expedição (Detalhamento, Corte, Solda - quando aplicável -, Pintura/Galv).
 */
export async function validarRomaneioParaEntrega(
  romaneioId?: string,
  ofNumber?: string
): Promise<ResultadoValidacaoEntrega> {
  // Se não tem ID do romaneio (está criando um novo romaneio no momento)
  if (!romaneioId) {
    return {
      valido: false,
      mensagem: 'Não é possível criar um novo romaneio diretamente com o status "Entregue". Crie o romaneio primeiro em planejamento, adicione as peças e garanta que todos os processos anteriores foram apontados na produção.'
    };
  }

  try {
    // 1. Buscar as peças cadastradas no romaneio
    const { data: itens, error: itensError } = await supabase
      .from('itens_romaneio_pecas')
      .select('id, peca_id, marca, quantidade_expedida, fase')
      .eq('romaneio_id', romaneioId);

    if (itensError) {
      console.error('❌ Erro ao buscar peças do romaneio:', itensError);
      return {
        valido: false,
        mensagem: 'Erro ao consultar peças do romaneio: ' + itensError.message
      };
    }

    if (!itens || itens.length === 0) {
      return {
        valido: false,
        mensagem: 'O romaneio não possui nenhuma peça cadastrada. Adicione as peças antes de alterar o status para "Entregue".'
      };
    }

    // 2. Buscar processos de fabricação ativos ordenados por ordem
    const { data: processos, error: procError } = await supabase
      .from('processos_fabricacao')
      .select('id, nome, ordem')
      .eq('ativo', true)
      .order('ordem');

    if (procError || !processos) {
      console.error('❌ Erro ao buscar processos de fabricação:', procError);
      return {
        valido: false,
        mensagem: 'Erro ao consultar processos de fabricação.'
      };
    }

    // Encontrar o processo de Expedição (ordem 5 ou nome contendo 'expedi')
    const processoExpedicao = processos.find(p => 
      p.nome?.toLowerCase().includes('expedi') || p.ordem === 5
    ) || { ordem: 5 };

    // Processos anteriores que precisam estar concluídos
    const processosAnteriores = processos.filter(p => p.ordem < processoExpedicao.ordem);

    // 3. Buscar dados das peças (para saber se tem_componentes)
    const pecaIds = Array.from(new Set(itens.map(i => i.peca_id).filter(Boolean)));
    const { data: pecasInfo, error: pecasError } = await supabase
      .from('pecas')
      .select('id, marca, tem_componentes')
      .in('id', pecaIds);

    if (pecasError) {
      console.error('❌ Erro ao buscar especificações das peças:', pecasError);
    }

    const pecasMap = new Map((pecasInfo || []).map(p => [p.id, p]));

    // 4. Buscar apontamentos de produção existentes para essas peças
    let queryApontamentos = supabase
      .from('apontamentos_producao')
      .select('peca_id, processo_id, quantidade_produzida')
      .in('peca_id', pecaIds);

    if (ofNumber) {
      queryApontamentos = queryApontamentos.eq('of_number', ofNumber);
    }

    const { data: apontamentos, error: aptError } = await queryApontamentos;

    if (aptError) {
      console.error('❌ Erro ao buscar apontamentos:', aptError);
    }

    // Mapear quantidades apontadas: peca_id -> processo_id -> soma(quantidade_produzida)
    const apontamentosMap = new Map<string, Map<string, number>>();
    (apontamentos || []).forEach(apt => {
      if (!apt.peca_id || !apt.processo_id) return;
      if (!apontamentosMap.has(apt.peca_id)) {
        apontamentosMap.set(apt.peca_id, new Map<string, number>());
      }
      const procMap = apontamentosMap.get(apt.peca_id)!;
      const atual = procMap.get(apt.processo_id) || 0;
      procMap.set(apt.processo_id, atual + Number(apt.quantidade_produzida || 0));
    });

    // 5. Consolidar quantidade total exigida por peça no romaneio
    const somaQtdRomaneioPorPeca = new Map<string, { marca: string; totalQtd: number }>();
    itens.forEach(item => {
      const atual = somaQtdRomaneioPorPeca.get(item.peca_id) || {
        marca: item.marca,
        totalQtd: 0
      };
      atual.totalQtd += Number(item.quantidade_expedida || 0);
      somaQtdRomaneioPorPeca.set(item.peca_id, atual);
    });

    // 6. Verificar conformidade em todos os processos anteriores
    const pendencias: ItemPendenciaProducao[] = [];

    for (const [pecaId, { marca, totalQtd }] of somaQtdRomaneioPorPeca.entries()) {
      const peca = pecasMap.get(pecaId);
      const temComponentes = peca?.tem_componentes ?? false;
      const procMap = apontamentosMap.get(pecaId) || new Map<string, number>();

      for (const processo of processosAnteriores) {
        // Se for Solda e a peça NÃO tem componentes (peça solta), ela não passa por solda
        const isSolda = processo.ordem === 3 || processo.nome.toLowerCase().includes('solda');
        if (isSolda && !temComponentes) {
          continue;
        }

        const qtdApontada = procMap.get(processo.id) || 0;

        if (qtdApontada < totalQtd) {
          pendencias.push({
            peca_id: pecaId,
            marca: marca || peca?.marca || 'Peça',
            processo: processo.nome,
            ordem: processo.ordem,
            qtdNecessaria: totalQtd,
            qtdApontada,
            qtdFaltante: Math.max(0, totalQtd - qtdApontada)
          });
        }
      }
    }

    if (pendencias.length > 0) {
      console.warn(`⚠️ Romaneio ${romaneioId} possui ${pendencias.length} pendência(s) de processos anteriores:`, pendencias);
      return {
        valido: false,
        pendencias
      };
    }

    return {
      valido: true
    };
  } catch (err: any) {
    console.error('❌ Exceção ao validar romaneio para entrega:', err);
    return {
      valido: false,
      mensagem: 'Erro inesperado ao validar romaneio: ' + (err?.message || 'Falha de comunicação')
    };
  }
}
