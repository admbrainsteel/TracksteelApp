import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ItemPrioridade {
  id: string;
  peca_id: string;
  prioridade_fabricacao_id: string;
  quantidade_priorizada: number;
  peso_total: number;
  ordem_fabricacao: number;
  peca?: {
    marca: string;
    descricao?: string;
    peso_unitario: number;
    quantidade: number;
    tem_componentes?: boolean;
    of_number?: string;
    etapa_fase?: string;
  };
  prioridade_fabricacao?: {
    of_number: string;
    etapa_fase: string;
    revisao?: number;
    data_ultima_modificacao?: string;
    modificado_por?: string;
    prioridade_config?: {
      codigo: string;
      nome: string;
      cor: string;
    };
  };
}

export const useItensPrioridadeFabricacao = () => {
  const [itensPorPrioridade, setItensPorPrioridade] = useState<{ [key: string]: ItemPrioridade[] }>({});
  const [loading, setLoading] = useState(true);

  const fetchItens = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('itens_prioridade_fabricacao')
        .select(`
          *,
          peca:pecas!itens_prioridade_fabricacao_peca_id_fkey(marca, descricao, peso_unitario, quantidade, tem_componentes, of_number, etapa_fase),
          prioridade_fabricacao:prioridades_fabricacao!itens_prioridade_fabricacao_prioridade_fabricacao_id_fkey(
            of_number,
            etapa_fase,
            revisao,
            data_ultima_modificacao,
            modificado_por,
            prioridade_config:prioridades_config!prioridades_fabricacao_prioridade_id_fkey(codigo, nome, cor)
          )
        `)
        .order('ordem_fabricacao', { ascending: true });

      if (error) {
        console.error('Erro ao buscar itens:', error);
        toast.error('Erro ao carregar itens de prioridade');
        return;
      }

      // Organizar itens por código de prioridade
      const itensPorCodigo: { [key: string]: ItemPrioridade[] } = {};
      
      data?.forEach((item) => {
        const codigo = item.prioridade_fabricacao?.prioridade_config?.codigo || 'P4';
        if (!itensPorCodigo[codigo]) {
          itensPorCodigo[codigo] = [];
        }
        itensPorCodigo[codigo].push(item as ItemPrioridade);
      });

      setItensPorPrioridade(itensPorCodigo);
    } catch (error) {
      console.error('Erro ao buscar itens:', error);
      toast.error('Erro ao carregar itens de prioridade');
    } finally {
      setLoading(false);
    }
  };

  const atualizarQuantidade = async (itemId: string, novaQuantidade: number, pesoUnitario: number): Promise<boolean> => {
    try {
      const pesoTotal = novaQuantidade * pesoUnitario;
      
      const { error } = await supabase
        .from('itens_prioridade_fabricacao')
        .update({ 
          quantidade_priorizada: novaQuantidade,
          peso_total: pesoTotal
        })
        .eq('id', itemId);

      if (error) {
        console.error('Erro ao atualizar quantidade:', error);
        // Se o erro for de validação (função SQL), mostrar mensagem mais amigável
        if (error.message.includes('excede o disponível')) {
          toast.error('Quantidade solicitada excede o disponível para esta peça');
        } else {
          toast.error('Erro ao atualizar quantidade');
        }
        return false;
      }

      await fetchItens();
      toast.success('Quantidade atualizada!');
      return true;
    } catch (error) {
      console.error('Erro ao atualizar quantidade:', error);
      toast.error('Erro ao atualizar quantidade');
      return false;
    }
  };

  const removerItem = async (itemId: string): Promise<boolean> => {
    try {
      console.log('🗑️ Iniciando remoção do item:', itemId);

      // Buscar o item com todos os dados necessários incluindo OF e fase
      const { data: itemParaRemover, error: errorBuscar } = await supabase
        .from('itens_prioridade_fabricacao')
        .select(`
          *,
          peca:pecas!itens_prioridade_fabricacao_peca_id_fkey(of_number, etapa_fase, marca),
          prioridade_fabricacao:prioridades_fabricacao!itens_prioridade_fabricacao_prioridade_fabricacao_id_fkey(of_number, etapa_fase)
        `)
        .eq('id', itemId)
        .single();

      if (errorBuscar || !itemParaRemover) {
        console.error('❌ Erro ao buscar item para remoção:', errorBuscar);
        toast.error('Erro: Item não encontrado');
        return false;
      }

      const ofNumber = itemParaRemover.peca?.of_number || itemParaRemover.prioridade_fabricacao?.of_number;
      const etapaFase = itemParaRemover.peca?.etapa_fase || itemParaRemover.prioridade_fabricacao?.etapa_fase;

      if (!ofNumber || !etapaFase) {
        console.error('❌ Dados de OF ou etapa/fase não encontrados:', { ofNumber, etapaFase });
        toast.error('Erro: Dados da OF ou etapa/fase não encontrados');
        return false;
      }

      console.log('📋 Validando remoção para OF:', ofNumber, 'Etapa/Fase:', etapaFase);

      // Remover o item com validação adicional de OF e fase
      const { error } = await supabase
        .from('itens_prioridade_fabricacao')
        .delete()
        .eq('id', itemId)
        .eq('prioridade_fabricacao_id', itemParaRemover.prioridade_fabricacao_id);

      if (error) {
        console.error('❌ Erro ao remover item:', error);
        toast.error('Erro ao remover item');
        return false;
      }

      console.log('✅ Item removido com sucesso da OF:', ofNumber, 'Etapa/Fase:', etapaFase);
      await fetchItens();
      toast.success('Peça removida da prioridade!');
      return true;
    } catch (error) {
      console.error('❌ Erro ao remover item:', error);
      toast.error('Erro ao remover item');
      return false;
    }
  };

  const removerItensPorPrioridade = async (codigoPrioridade: string): Promise<{ sucessos: number; falhas: number }> => {
    try {
      console.log('🗑️ Iniciando remoção em lote para prioridade:', codigoPrioridade);

      const itens = itensPorPrioridade[codigoPrioridade] || [];
      
      if (itens.length === 0) {
        console.log('⚠️ Nenhum item para remover na prioridade:', codigoPrioridade);
        return { sucessos: 0, falhas: 0 };
      }

      // Agrupar itens por OF e etapa/fase para validação
      const itensAgrupados: { [key: string]: ItemPrioridade[] } = {};
      
      itens.forEach(item => {
        const ofNumber = item.peca?.of_number || item.prioridade_fabricacao?.of_number;
        const etapaFase = item.peca?.etapa_fase || item.prioridade_fabricacao?.etapa_fase;
        const chave = `${ofNumber}-${etapaFase}`;
        
        if (!itensAgrupados[chave]) {
          itensAgrupados[chave] = [];
        }
        itensAgrupados[chave].push(item);
      });

      console.log('📊 Itens agrupados por OF/Etapa:', Object.keys(itensAgrupados));

      let sucessos = 0;
      let falhas = 0;

      // Processar cada grupo de OF/Etapa separadamente
      for (const [chaveGrupo, itensGrupo] of Object.entries(itensAgrupados)) {
        const [ofNumber, etapaFase] = chaveGrupo.split('-');
        
        console.log(`🔄 Processando grupo: OF ${ofNumber}, Etapa/Fase ${etapaFase} (${itensGrupo.length} itens)`);

        // Buscar IDs dos itens deste grupo para validação adicional
        const idsParaRemover = itensGrupo.map(item => item.id);
        
        const { data: itensValidados, error: errorValidacao } = await supabase
          .from('itens_prioridade_fabricacao')
          .select(`
            id,
            prioridade_fabricacao_id,
            peca:pecas!itens_prioridade_fabricacao_peca_id_fkey(of_number, etapa_fase, marca),
            prioridade_fabricacao:prioridades_fabricacao!itens_prioridade_fabricacao_prioridade_fabricacao_id_fkey(of_number, etapa_fase)
          `)
          .in('id', idsParaRemover);

        if (errorValidacao) {
          console.error('❌ Erro na validação dos itens:', errorValidacao);
          falhas += itensGrupo.length;
          continue;
        }

        // Filtrar apenas itens que realmente pertencem à OF e etapa/fase corretas
        const itensValidadosParaRemover = itensValidados?.filter(item => {
          const itemOfNumber = item.peca?.of_number || item.prioridade_fabricacao?.of_number;
          const itemEtapaFase = item.peca?.etapa_fase || item.prioridade_fabricacao?.etapa_fase;
          
          return itemOfNumber === ofNumber && itemEtapaFase === etapaFase;
        }) || [];

        if (itensValidadosParaRemover.length === 0) {
          console.log(`⚠️ Nenhum item validado para remoção no grupo ${chaveGrupo}`);
          falhas += itensGrupo.length;
          continue;
        }

        // Remover itens validados
        const { error: errorRemocao } = await supabase
          .from('itens_prioridade_fabricacao')
          .delete()
          .in('id', itensValidadosParaRemover.map(item => item.id));

        if (errorRemocao) {
          console.error(`❌ Erro ao remover itens do grupo ${chaveGrupo}:`, errorRemocao);
          falhas += itensGrupo.length;
        } else {
          console.log(`✅ ${itensValidadosParaRemover.length} itens removidos do grupo ${chaveGrupo}`);
          sucessos += itensValidadosParaRemover.length;
        }
      }

      console.log(`📊 Resultado da remoção em lote: ${sucessos} sucessos, ${falhas} falhas`);
      
      if (sucessos > 0) {
        await fetchItens();
      }

      return { sucessos, falhas };
    } catch (error) {
      console.error('❌ Erro na remoção em lote:', error);
      const totalItens = itensPorPrioridade[codigoPrioridade]?.length || 0;
      return { sucessos: 0, falhas: totalItens };
    }
  };

  const buscarOuCriarPrioridadeFabricacao = async (ofNumber: string, etapaFase: string, codigoPrioridade: string): Promise<string | null> => {
    try {
      console.log('🔍 Buscando prioridade fabricação para:', { ofNumber, etapaFase, codigoPrioridade });
      
      // Primeiro, buscar a configuração de prioridade pelo código
      const { data: prioridadeConfig, error: errorConfig } = await supabase
        .from('prioridades_config')
        .select('id, nome')
        .eq('codigo', codigoPrioridade)
        .single();

      if (errorConfig || !prioridadeConfig) {
        console.error('❌ Erro ao buscar configuração de prioridade:', errorConfig);
        toast.error('Configuração de prioridade não encontrada');
        return null;
      }

      console.log('✅ Configuração de prioridade encontrada:', prioridadeConfig);

      // Buscar prioridade_fabricacao existente
      const { data: prioridadeExistente, error: errorExistente } = await supabase
        .from('prioridades_fabricacao')
        .select('id')
        .eq('of_number', ofNumber)
        .eq('etapa_fase', etapaFase)
        .eq('prioridade_id', prioridadeConfig.id)
        .single();

      if (prioridadeExistente && !errorExistente) {
        console.log('✅ Prioridade fabricação existente encontrada:', prioridadeExistente.id);
        return prioridadeExistente.id;
      }

      // Se não existe, criar nova prioridade_fabricacao
      console.log('🔨 Criando nova prioridade fabricação...');
      const { data: novaPrioridade, error: errorNova } = await supabase
        .from('prioridades_fabricacao')
        .insert({
          of_number: ofNumber,
          etapa_fase: etapaFase,
          prioridade_id: prioridadeConfig.id,
          nome_prioridade: prioridadeConfig.nome,
          ativo: true,
          revisao: 0
        })
        .select('id')
        .single();

      if (errorNova || !novaPrioridade) {
        console.error('❌ Erro ao criar prioridade de fabricação:', errorNova);
        toast.error('Erro ao criar prioridade de fabricação');
        return null;
      }

      console.log('✅ Nova prioridade fabricação criada:', novaPrioridade.id);
      return novaPrioridade.id;
    } catch (error) {
      console.error('❌ Erro ao buscar/criar prioridade de fabricação:', error);
      toast.error('Erro ao processar prioridade de fabricação');
      return null;
    }
  };

  const transferirItem = async (itemId: string, codigoPrioridadeDestino: string): Promise<boolean> => {
    try {
      console.log('🔄 Iniciando transferência do item:', itemId, 'para prioridade:', codigoPrioridadeDestino);

      // Buscar o item atual com todos os dados necessários
      const { data: itemAtual, error: errorItem } = await supabase
        .from('itens_prioridade_fabricacao')
        .select(`
          *,
          prioridade_fabricacao:prioridades_fabricacao!itens_prioridade_fabricacao_prioridade_fabricacao_id_fkey(
            of_number,
            etapa_fase
          )
        `)
        .eq('id', itemId)
        .single();

      if (errorItem || !itemAtual) {
        console.error('❌ Erro ao buscar item atual:', errorItem);
        toast.error('Erro ao buscar item para transferência');
        return false;
      }

      console.log('✅ Item atual encontrado:', itemAtual);

      // Verificar se a prioridade_fabricacao existe e tem os dados necessários
      if (!itemAtual.prioridade_fabricacao) {
        console.error('❌ Prioridade de fabricação não encontrada no item');
        toast.error('Prioridade de fabricação não encontrada no item');
        return false;
      }

      // Type assertion para garantir que temos o tipo correto
      const prioridadeFab = itemAtual.prioridade_fabricacao as { of_number: string; etapa_fase: string };
      
      if (!prioridadeFab.of_number || !prioridadeFab.etapa_fase) {
        console.error('❌ Dados da prioridade de fabricação incompletos:', prioridadeFab);
        toast.error('Dados da prioridade de fabricação incompletos');
        return false;
      }

      const { of_number, etapa_fase } = prioridadeFab;
      console.log('📋 Dados extraídos:', { of_number, etapa_fase });

      // Buscar ou criar prioridade_fabricacao de destino
      const prioridadeFabricacaoDestinoId = await buscarOuCriarPrioridadeFabricacao(
        of_number,
        etapa_fase,
        codigoPrioridadeDestino
      );

      if (!prioridadeFabricacaoDestinoId) {
        console.error('❌ Falha ao obter ID da prioridade de fabricação de destino');
        return false;
      }

      console.log('🎯 Prioridade de destino obtida:', prioridadeFabricacaoDestinoId);

      // Buscar a maior ordem_fabricacao existente na prioridade de destino
      const { data: itensDestino, error: errorItensDestino } = await supabase
        .from('itens_prioridade_fabricacao')
        .select('ordem_fabricacao')
        .eq('prioridade_fabricacao_id', prioridadeFabricacaoDestinoId)
        .order('ordem_fabricacao', { ascending: false })
        .limit(1);

      if (errorItensDestino) {
        console.error('❌ Erro ao buscar itens da prioridade de destino:', errorItensDestino);
        toast.error('Erro ao buscar itens da prioridade de destino');
        return false;
      }

      // Calcular a nova ordem_fabricacao (final da lista)
      const novaOrdem = itensDestino && itensDestino.length > 0 ? itensDestino[0].ordem_fabricacao + 1 : 1;

      console.log('🔢 Nova ordem calculada:', novaOrdem);

      // Transferir o item com a nova ordem
      const { error: errorTransferencia } = await supabase
        .from('itens_prioridade_fabricacao')
        .update({ 
          prioridade_fabricacao_id: prioridadeFabricacaoDestinoId,
          ordem_fabricacao: novaOrdem
        })
        .eq('id', itemId);

      if (errorTransferencia) {
        console.error('❌ Erro ao transferir item:', errorTransferencia);
        // Se o erro for de validação (função SQL), mostrar mensagem mais amigável
        if (errorTransferencia.message.includes('excede o disponível')) {
          toast.error('Não é possível transferir: quantidade excede o disponível na prioridade de destino');
        } else {
          toast.error('Erro ao transferir item');
        }
        return false;
      }

      console.log('✅ Item transferido com sucesso para o final da lista');
      await fetchItens();
      toast.success('Item transferido com sucesso!');
      return true;
    } catch (error) {
      console.error('❌ Erro ao transferir item:', error);
      toast.error('Erro ao transferir item');
      return false;
    }
  };

  const reorderItems = async (prioridadeId: string, itensOrdenados: { id: string; ordem_fabricacao: number }[]): Promise<boolean> => {
    try {
      const updates = itensOrdenados.map(item => 
        supabase
          .from('itens_prioridade_fabricacao')
          .update({ ordem_fabricacao: item.ordem_fabricacao })
          .eq('id', item.id)
      );

      const results = await Promise.all(updates);
      
      const hasError = results.some(result => result.error);
      if (hasError) {
        console.error('❌ Erro ao reordenar itens');
        toast.error('Erro ao reordenar itens');
        return false;
      }

      await fetchItens();
      return true;
    } catch (error) {
      console.error('❌ Erro ao reordenar itens:', error);
      toast.error('Erro ao reordenar itens');
      return false;
    }
  };

  useEffect(() => {
    fetchItens();
  }, []);

  return {
    itensPorPrioridade,
    loading,
    atualizarQuantidade,
    removerItem,
    removerItensPorPrioridade,
    transferirItem,
    reorderItems,
    refetch: fetchItens,
    buscarOuCriarPrioridadeFabricacao
  };
};
