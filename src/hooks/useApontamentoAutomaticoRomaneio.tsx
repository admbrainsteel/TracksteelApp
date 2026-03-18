
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface ConflitoPeca {
  peca_id: string;
  marca: string;
  quantidade_existente: number;
  quantidade_romaneio: number;
  fase?: string;
}

export interface ProcessoPulado {
  nome: string;
  ordem: number;
  dataRetroativa: string;
  processo_id: string;
}

export interface PecaComProcessosPulados {
  peca_id: string;
  marca: string;
  quantidade_expedida: number;
  processos_pulados: ProcessoPulado[];
  processo_atual: string;
  fase?: string;
}

export interface ProcessarApontamentoParams {
  romaneioId: string;
  numeroRomaneio: string;
  ofNumber: string;
  itens: Array<{
    peca_id: string;
    marca: string;
    quantidade_expedida: number;
    fase?: string;
  }>;
  resolucaoConflitos?: 'somar' | 'substituir' | 'cancelar';
  criarProcessosRetroativos?: boolean;
}

export const useApontamentoAutomaticoRomaneio = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const verificarProcessamentoExistente = async (romaneioId: string, numeroRomaneio: string, ofNumber: string, itens: ProcessarApontamentoParams['itens']) => {
    console.log('🔍 VERIFICAÇÃO ULTRA ROBUSTA - Checando se romaneio já foi processado...');
    
    // VERIFICAÇÃO 1: Por logs de apontamentos automáticos (mais confiável)
    const { data: logsExistentes, error: errorLogs } = await supabase
      .from('logs_apontamentos_automaticos')
      .select('id, status_operacao, total_pecas_processadas, created_at')
      .eq('romaneio_id', romaneioId)
      .eq('numero_romaneio', numeroRomaneio)
      .eq('of_number', ofNumber)
      .eq('status_operacao', 'sucesso')
      .order('created_at', { ascending: false });

    if (errorLogs) {
      console.error('❌ Erro ao verificar logs existentes:', errorLogs);
    }

    console.log('📊 Logs de sucesso encontrados:', logsExistentes?.length || 0);

    // Se há logs de sucesso, considera processado
    if (logsExistentes && logsExistentes.length > 0) {
      const logMaisRecente = logsExistentes[0];
      console.log('🚫 ROMANEIO JÁ PROCESSADO - Log de sucesso encontrado:', logMaisRecente);
      return true;
    }

    console.log('✅ ROMANEIO NÃO PROCESSADO - Pode prosseguir com apontamento');
    return false;
  };

  const verificarSequenciaProcessos = async (ofNumber: string, itens: ProcessarApontamentoParams['itens']) => {
    console.log('🔍 Verificando sequência de processos para peças...');

    // Buscar processos ordenados
    const { data: processos, error: processoError } = await supabase
      .from('processos_fabricacao')
      .select('id, nome, ordem')
      .eq('ativo', true)
      .order('ordem');

    if (processoError || !processos) {
      console.error('❌ Erro ao buscar processos:', processoError);
      return { pecasOK: itens, pecasComProcessosPulados: [] };
    }

    const processoExpedicao = processos.find(p => 
      p.nome?.toLowerCase().includes('expedição') || 
      p.nome?.toLowerCase().includes('expedicao') || 
      p.nome?.toLowerCase().includes('expedica')
    );

    if (!processoExpedicao) {
      console.error('❌ Processo Expedição não encontrado');
      return { pecasOK: [], pecasComProcessosPulados: [] };
    }

    const pecasOK: ProcessarApontamentoParams['itens'] = [];
    const pecasComProcessosPulados: PecaComProcessosPulados[] = [];

    for (const item of itens) {
      console.log(`\n🔍 Analisando sequência da peça ${item.marca}:`);

      // Buscar informações da peça (se tem componentes)
      const { data: pecaInfo } = await supabase
        .from('pecas')
        .select('tem_componentes')
        .eq('id', item.peca_id)
        .single();

      const temComponentes = pecaInfo?.tem_componentes || false;

      // Buscar apontamentos existentes para esta peça
      const { data: apontamentosExistentes } = await supabase
        .from('apontamentos_producao')
        .select(`
          processo_id,
          quantidade_produzida,
          processos_fabricacao(nome, ordem)
        `)
        .eq('of_number', ofNumber)
        .eq('peca_id', item.peca_id)
        .eq('tipo_apontamento', 'peca');

      if (!apontamentosExistentes) {
        console.log(`❌ Erro ao buscar apontamentos da peça ${item.marca}`);
        continue;
      }

      // Calcular quantidades por processo
      const quantidadesPorProcesso = new Map<string, number>();
      apontamentosExistentes.forEach(apt => {
        const processoId = apt.processo_id;
        const atual = quantidadesPorProcesso.get(processoId) || 0;
        quantidadesPorProcesso.set(processoId, atual + apt.quantidade_produzida);
      });

      // Determinar qual é o último processo válido para esta peça
      let ultimoProcessoValido = processoExpedicao;
      for (let i = processoExpedicao.ordem - 1; i >= 1; i--) {
        const processo = processos.find(p => p.ordem === i);
        if (!processo) continue;

        // Se é solda (ordem 3) e peça não tem componentes, pular
        if (i === 3 && !temComponentes) {
          console.log(`⏭️ Peça ${item.marca} sem componentes - pulando Solda (ordem 3)`);
          continue;
        }

        ultimoProcessoValido = processo;
        break;
      }

      // Verificar se foi apontada no último processo válido
      const quantidadeUltimoProcesso = quantidadesPorProcesso.get(ultimoProcessoValido.id) || 0;
      
      // Calcular quantidades já expedidas
      const processoExpedicaoId = processoExpedicao.id;
      const quantidadeJaExpedida = quantidadesPorProcesso.get(processoExpedicaoId) || 0;

      // Calcular quantidade disponível para expedição
      const quantidadeDisponivel = quantidadeUltimoProcesso - quantidadeJaExpedida;
      const quantidadeParaApontar = Math.min(item.quantidade_expedida, quantidadeDisponivel);

      console.log(`📊 Peça ${item.marca}:`);
      console.log(`  - Último processo válido: ${ultimoProcessoValido.nome} (${ultimoProcessoValido.ordem})`);
      console.log(`  - Quantidade no último processo: ${quantidadeUltimoProcesso}`);
      console.log(`  - Quantidade já expedida: ${quantidadeJaExpedida}`);
      console.log(`  - Quantidade disponível: ${quantidadeDisponivel}`);
      console.log(`  - Quantidade para apontar: ${quantidadeParaApontar}`);

      if (quantidadeParaApontar <= 0) {
        console.log(`⏭️ Peça ${item.marca} - sem quantidade disponível, pulando`);
        continue;
      }

      // Verificar se precisa de processos retroativos
      const processosQueDeviamTerSidoFeitos = [];
      
      // Encontrar o processo em que a peça realmente está
      let processoAtualEncontrado = null;
      let ordemAtual = 0;

      for (const processo of processos) {
        if (processo.ordem >= processoExpedicao.ordem) break;
        
        // Pular solda se não tem componentes
        if (processo.ordem === 3 && !temComponentes) continue;
        
        const qtdProcesso = quantidadesPorProcesso.get(processo.id) || 0;
        if (qtdProcesso > 0) {
          processoAtualEncontrado = processo;
          ordemAtual = processo.ordem;
        }
      }

      if (!processoAtualEncontrado) {
        console.log(`❌ Peça ${item.marca} não encontrada em nenhum processo anterior`);
        continue;
      }

      // Verificar processos que foram "pulados"
      const processosPulados: ProcessoPulado[] = [];
      const dataAtual = new Date();

      for (const processo of processos) {
        if (processo.ordem <= ordemAtual || processo.ordem >= processoExpedicao.ordem) continue;
        
        // Pular solda se não tem componentes
        if (processo.ordem === 3 && !temComponentes) continue;
        
        const qtdProcesso = quantidadesPorProcesso.get(processo.id) || 0;
        if (qtdProcesso === 0) {
          // Calcular data retroativa (2 dias por processo anterior)
          const diasRetroativos = (processoExpedicao.ordem - processo.ordem) * 2;
          const dataRetroativa = new Date(dataAtual);
          dataRetroativa.setDate(dataRetroativa.getDate() - diasRetroativos);

          processosPulados.push({
            nome: processo.nome,
            ordem: processo.ordem,
            processo_id: processo.id,
            dataRetroativa: dataRetroativa.toISOString().split('T')[0]
          });
        }
      }

      if (processosPulados.length > 0) {
        console.log(`⚠️ Peça ${item.marca} tem ${processosPulados.length} processos pulados`);
        
        pecasComProcessosPulados.push({
          peca_id: item.peca_id,
          marca: item.marca,
          quantidade_expedida: quantidadeParaApontar,
          processos_pulados: processosPulados,
          processo_atual: processoAtualEncontrado.nome,
          fase: item.fase
        });
      } else {
        console.log(`✅ Peça ${item.marca} está na sequência correta`);
        
        // Atualizar a quantidade para refletir apenas o disponível
        pecasOK.push({
          ...item,
          quantidade_expedida: quantidadeParaApontar
        });
      }
    }

    console.log(`📋 Resultado da verificação:`);
    console.log(`  - Peças OK: ${pecasOK.length}`);
    console.log(`  - Peças com processos pulados: ${pecasComProcessosPulados.length}`);

    return { pecasOK, pecasComProcessosPulados };
  };

  const processarApontamentos = useMutation({
    mutationFn: async ({ 
      romaneioId, 
      numeroRomaneio, 
      ofNumber, 
      itens, 
      resolucaoConflitos,
      criarProcessosRetroativos = false 
    }: ProcessarApontamentoParams) => {
      if (!user) throw new Error('Usuário não autenticado');

      console.log('=== INICIANDO APONTAMENTO AUTOMÁTICO ===');
      console.log('📦 Romaneio ID:', romaneioId);
      console.log('📋 Romaneio:', numeroRomaneio);
      console.log('🔧 OF:', ofNumber);
      console.log('📊 Itens para processar:', itens.length);
      console.log('🔄 Criar processos retroativos:', criarProcessosRetroativos);

      try {
        // VERIFICAÇÃO ULTRA ROBUSTA DE PROCESSAMENTO EXISTENTE
        const jaProcessado = await verificarProcessamentoExistente(romaneioId, numeroRomaneio, ofNumber, itens);
        
        if (jaProcessado) {
          console.log('🚫 APONTAMENTO JÁ PROCESSADO - Operação cancelada');
          toast.info(`ℹ️ Apontamento já processado para o romaneio ${numeroRomaneio}`);
          return { 
            sucesso: false, 
            erro: 'Apontamento já processado para este romaneio',
            totalProcessado: 0,
            pecasProcessadas: []
          };
        }

        // Verificar sequência de processos
        const { pecasOK, pecasComProcessosPulados } = await verificarSequenciaProcessos(ofNumber, itens);

        // Se há peças com processos pulados e não foi confirmado, retornar para confirmação
        if (pecasComProcessosPulados.length > 0 && !criarProcessosRetroativos) {
          console.log('⚠️ Peças com processos pulados detectadas, requerendo confirmação do usuário');
          return { 
            precisaConfirmacaoProcessosPulados: true, 
            pecasOK,
            pecasComProcessosPulados 
          };
        }

        // Buscar processo de Expedição
        const { data: processosExpedicao, error: processoError } = await supabase
          .from('processos_fabricacao')
          .select('id, nome')
          .or('nome.ilike.%expedição%,nome.ilike.%expedicao%,nome.ilike.%expedica%')
          .eq('ativo', true);

        if (processoError || !processosExpedicao || processosExpedicao.length === 0) {
          console.error('❌ Erro ao buscar processo Expedição:', processoError);
          throw new Error('Processo Expedição não encontrado');
        }

        const processoExpedicao = processosExpedicao[0];
        console.log('✅ Processo Expedição encontrado:', processoExpedicao);

        // Processar apontamentos
        const apontamentosParaInserir = [];
        const dataApontamento = new Date().toISOString().split('T')[0];
        const observacaoEspecifica = `Apontamento automático via Romaneio ${numeroRomaneio} - ID: ${romaneioId}`;

        let totalPecasProcessadas = 0;
        const marcasProcessadas: string[] = [];

        // 1. Se deve criar processos retroativos, criar primeiro
        if (criarProcessosRetroativos && pecasComProcessosPulados.length > 0) {
          console.log('🔙 Criando apontamentos retroativos...');
          
          for (const pecaComProcessosPulados of pecasComProcessosPulados) {
            for (const processoRetroativo of pecaComProcessosPulados.processos_pulados) {
              apontamentosParaInserir.push({
                of_number: ofNumber,
                peca_id: pecaComProcessosPulados.peca_id,
                processo_id: processoRetroativo.processo_id,
                quantidade_produzida: pecaComProcessosPulados.quantidade_expedida,
                data_apontamento: processoRetroativo.dataRetroativa,
                observacoes: `Apontamento retroativo automático - ${observacaoEspecifica}`,
                tipo_apontamento: 'peca',
                created_by: user.id
              });
            }
            
            // Adicionar também o apontamento de expedição para essa peça
            apontamentosParaInserir.push({
              of_number: ofNumber,
              peca_id: pecaComProcessosPulados.peca_id,
              processo_id: processoExpedicao.id,
              quantidade_produzida: pecaComProcessosPulados.quantidade_expedida,
              data_apontamento: dataApontamento,
              observacoes: observacaoEspecifica,
              tipo_apontamento: 'peca',
              created_by: user.id
            });

            totalPecasProcessadas++;
            marcasProcessadas.push(pecaComProcessosPulados.marca);
          }
        }

        // 2. Processar peças que estão na sequência correta
        for (const item of pecasOK) {
          apontamentosParaInserir.push({
            of_number: ofNumber,
            peca_id: item.peca_id,
            processo_id: processoExpedicao.id,
            quantidade_produzida: item.quantidade_expedida,
            data_apontamento: dataApontamento,
            observacoes: observacaoEspecifica,
            tipo_apontamento: 'peca',
            created_by: user.id
          });

          totalPecasProcessadas++;
          marcasProcessadas.push(item.marca);
        }

        if (apontamentosParaInserir.length === 0) {
          console.log('ℹ️ Nenhum apontamento para inserir');
          return { 
            sucesso: true, 
            totalProcessado: 0, 
            pecasProcessadas: [],
            mensagem: 'Nenhuma peça elegível para apontamento automático'
          };
        }

        console.log('📝 Inserindo', apontamentosParaInserir.length, 'apontamentos');

        // Inserir apontamentos
        const { error: insertError } = await supabase
          .from('apontamentos_producao')
          .insert(apontamentosParaInserir);

        if (insertError) {
          console.error('❌ Erro ao inserir apontamentos:', insertError);
          throw new Error(`Erro ao inserir apontamentos: ${insertError.message}`);
        }

        // Registrar log de sucesso IMEDIATAMENTE após inserção bem-sucedida
        const { error: logError } = await supabase
          .from('logs_apontamentos_automaticos')
          .insert({
            romaneio_id: romaneioId,
            numero_romaneio: numeroRomaneio,
            of_number: ofNumber,
            total_pecas_processadas: totalPecasProcessadas,
            status_operacao: 'sucesso',
            usuario_executou: user.id
          });

        if (logError) {
          console.warn('⚠️ Erro ao registrar log (apontamento foi feito):', logError);
        }

        console.log('=== APONTAMENTO AUTOMÁTICO CONCLUÍDO COM SUCESSO ===');
        return { 
          sucesso: true, 
          totalProcessado: totalPecasProcessadas, 
          pecasProcessadas: marcasProcessadas,
          apontamentosRetroativosCriados: criarProcessosRetroativos ? 
            pecasComProcessosPulados.reduce((sum, p) => sum + p.processos_pulados.length, 0) : 0
        };

      } catch (error: any) {
        console.error('=== ERRO NO APONTAMENTO AUTOMÁTICO ===');
        console.error('❌ Erro:', error.message);
        
        // Registrar log de erro
        await supabase
          .from('logs_apontamentos_automaticos')
          .insert({
            romaneio_id: romaneioId,
            numero_romaneio: numeroRomaneio,
            of_number: ofNumber,
            total_pecas_processadas: 0,
            status_operacao: 'erro',
            detalhes_erro: error.message,
            usuario_executou: user.id
          });

        throw error;
      }
    },
    onSuccess: (result) => {
      if (result.sucesso) {
        queryClient.invalidateQueries({ queryKey: ['apontamentos-producao'] });
        queryClient.invalidateQueries({ queryKey: ['pecas-pintura'] });
        
        const marcas = result.pecasProcessadas?.join(', ') || '';
        let mensagem = `✅ Apontamento automático concluído! ${result.totalProcessado} peças apontadas no processo Expedição`;
        
        if (result.apontamentosRetroativosCriados && result.apontamentosRetroativosCriados > 0) {
          mensagem += ` (${result.apontamentosRetroativosCriados} apontamentos retroativos criados)`;
        }
        
        if (marcas) {
          mensagem += `: ${marcas}`;
        }
        
        toast.success(mensagem);
      } else if (result.erro) {
        toast.info(`ℹ️ ${result.erro}`);
      }
    },
    onError: (error: any) => {
      console.error('❌ Erro no apontamento automático:', error);
      toast.error(`❌ Erro no apontamento automático: ${error.message}`);
    }
  });

  return {
    processarApontamentos,
    verificarSequenciaProcessos,
    loading: processarApontamentos.isPending
  };
};
