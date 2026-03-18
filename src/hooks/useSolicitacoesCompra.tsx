import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTasksEnhanced } from '@/hooks/useTasksEnhanced';
import { useUserFunction } from '@/hooks/useUserFunction';
import { useAuth } from '@/hooks/useAuth';

export interface SolicitacaoCompra {
  id: string;
  numero_sc: string;
  data_solicitacao: string;
  of_number?: string;
  objetivo?: string;
  justificativa?: string;
  status: string;
  revisao: number;
  data_previsao_chegada?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  anexos_urls?: string[];
  itens?: ItemSolicitacao[];
  creator?: {
    id: string;
    full_name: string;
    email: string;
    profile_image_url?: string;
  } | null;
}

export interface ItemSolicitacao {
  id: string;
  solicitacao_id: string;
  material_id: string;
  quantidade: number;
  prazo_recebimento: string;
  created_at: string;
  material?: {
    id: string;
    descricao: string;
    unidade: string;
    tipo_material_id?: string;
  };
}

export interface CreateSolicitacaoData {
  data_solicitacao: string;
  of_number?: string;
  objetivo?: string;
  justificativa?: string;
  anexos_urls?: string[];
  itens: Array<{
    material_id: string;
    quantidade: number;
    prazo_recebimento: string;
  }>;
}

export const useSolicitacoesCompra = () => {
  const queryClient = useQueryClient();
  const { createTask, updateTask } = useTasksEnhanced();
  const { isComprador } = useUserFunction();
  const { user } = useAuth();

  const { data: solicitacoes = [], isLoading } = useQuery({
    queryKey: ['solicitacoes-compra'],
    queryFn: async () => {
      // Primeiro buscar as solicitações com seus itens
      const { data: solicitacoesData, error: solicitacoesError } = await supabase
        .from('solicitacoes_compra')
        .select(`
          *,
          itens:itens_solicitacao_compra(
            *,
            material:estoque_materiais(id, descricao, unidade, tipo_material_id)
          )
        `)
        .order('created_at', { ascending: false });

      if (solicitacoesError) {
        console.error('Erro ao buscar solicitações:', solicitacoesError);
        throw solicitacoesError;
      }

      // Se não há solicitações, retornar array vazio
      if (!solicitacoesData || solicitacoesData.length === 0) {
        return [];
      }

      // Buscar dados de TODOS os criadores (profiles)
      const creatorIds = [...new Set(solicitacoesData.map(s => s.created_by).filter(Boolean))];
      
      if (creatorIds.length === 0) {
        return solicitacoesData.map(solicitacao => ({
          ...solicitacao,
          creator: null
        }));
      }
      
      const { data: creatorsData, error: creatorsError } = await supabase
        .from('profiles')
        .select('id, full_name, email, profile_image_url')
        .in('id', creatorIds);

      if (creatorsError) {
        console.error('Erro ao buscar criadores:', creatorsError);
        // Não falhar completamente se não conseguir buscar os criadores
      }

      // Combinar os dados
      const result: SolicitacaoCompra[] = solicitacoesData.map(solicitacao => ({
        ...solicitacao,
        creator: creatorsData?.find(creator => creator.id === solicitacao.created_by) || {
          id: solicitacao.created_by || '',
          full_name: 'Usuário não encontrado',
          email: '',
          profile_image_url: null
        }
      }));

      return result;
    },
  });

  // Função para verificar se pode editar
  const canEdit = (solicitacao: SolicitacaoCompra) => {
    if (!user?.id) return false;
    return user.id === solicitacao.created_by;
  };

  // Função para verificar se pode excluir
  const canDelete = (solicitacao: SolicitacaoCompra) => {
    if (!user?.id) return false;
    
    // Comprador pode excluir qualquer solicitação
    if (isComprador) {
      return true;
    }
    
    // Proprietário só pode excluir se estiver "Em planejamento"
    if (user.id === solicitacao.created_by && solicitacao.status === 'Em planejamento') {
      return true;
    }
    
    return false;
  };

  const createSolicitacao = useMutation({
    mutationFn: async (data: CreateSolicitacaoData) => {
      // Criar a solicitação com created_by definido automaticamente
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('Usuário não autenticado');
      }

      const insertData: any = {
        data_solicitacao: data.data_solicitacao,
        justificativa: data.justificativa,
        created_by: user.data.user.id,
        anexos_urls: data.anexos_urls || [],
      };

      if (data.of_number) {
        insertData.of_number = data.of_number;
      }
      if (data.objetivo) {
        insertData.objetivo = data.objetivo;
      }

      const { data: solicitacao, error: errorSolicitacao } = await supabase
        .from('solicitacoes_compra')
        .insert(insertData)
        .select()
        .single();

      if (errorSolicitacao) throw errorSolicitacao;

      // Criar os itens
      const itensData = data.itens.map(item => ({
        ...item,
        solicitacao_id: solicitacao.id,
      }));

      const { error: errorItens } = await supabase
        .from('itens_solicitacao_compra')
        .insert(itensData);

      if (errorItens) throw errorItens;

      return solicitacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-compra'] });
      toast.success('Solicitação de compra criada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar solicitação:', error);
      toast.error('Erro ao criar solicitação de compra');
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, revisao }: { id: string; status: string; revisao?: number }) => {
      const updateData: any = { status };
      if (revisao !== undefined) {
        updateData.revisao = revisao;
      }

      const { error } = await supabase
        .from('solicitacoes_compra')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-compra'] });
      toast.success('Status atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status');
    },
  });

  const revisar = useMutation({
    mutationFn: async ({ id, created_by }: { id: string; created_by: string }) => {
      console.log('🔄 Iniciando processo de revisão para solicitação:', id);
      
      try {
        // Primeiro buscar a solicitação atual
        const { data: solicitacaoAtual, error: fetchError } = await supabase
          .from('solicitacoes_compra')
          .select('revisao, numero_sc')
          .eq('id', id)
          .maybeSingle();

        if (fetchError) {
          console.error('❌ Erro ao buscar solicitação:', fetchError);
          throw new Error(`Erro ao buscar solicitação: ${fetchError.message}`);
        }

        if (!solicitacaoAtual) {
          console.error('❌ Solicitação não encontrada');
          throw new Error('Solicitação não encontrada');
        }

        console.log('✅ Solicitação encontrada:', solicitacaoAtual);

        // Atualizar status para 'Revisado' e incrementar revisão
        const { error: updateError } = await supabase
          .from('solicitacoes_compra')
          .update({
            status: 'Revisado',
            revisao: (solicitacaoAtual.revisao || 0) + 1
          })
          .eq('id', id);

        if (updateError) {
          console.error('❌ Erro ao atualizar status:', updateError);
          throw new Error(`Erro ao atualizar status: ${updateError.message}`);
        }

        console.log('✅ Status atualizado para Revisado');

        // Criar tarefa para o usuário que fez a solicitação
        const taskData = {
          title: `Revisão necessária - SC ${solicitacaoAtual.numero_sc}`,
          description: `Sua solicitação de compra ${solicitacaoAtual.numero_sc} precisa de revisão. Clique para visualizar os itens e fazer as correções necessárias.`,
          assigned_to: [created_by],
          priority: 'media' as const,
          category: 'compras' as const,
          status: 'a_fazer' as const,
          of_number: 'ADM-Compras',
          due_date: new Date().toISOString(),
        };

        console.log('📝 Dados da tarefa a ser criada:', taskData);

        await createTask(taskData);
        
        console.log('✅ Tarefa criada com sucesso');
        
        return { numero_sc: solicitacaoAtual.numero_sc };
      } catch (error) {
        console.error('❌ Erro no processo de revisão:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-compra'] });
      toast.success('Solicitação enviada para revisão e tarefa criada!');
    },
    onError: (error) => {
      console.error('❌ Erro ao revisar solicitação:', error);
      toast.error(`Erro ao revisar solicitação: ${error.message}`);
    },
  });

  const aceitar = useMutation({
    mutationFn: async ({ id, created_by }: { id: string; created_by: string }) => {
      console.log('🔄 Iniciando processo de aceitação para solicitação:', id);
      
      try {
        // Primeiro buscar a solicitação atual
        const { data: solicitacaoAtual, error: fetchError } = await supabase
          .from('solicitacoes_compra')
          .select('numero_sc')
          .eq('id', id)
          .maybeSingle();

        if (fetchError) {
          console.error('❌ Erro ao buscar solicitação:', fetchError);
          throw new Error(`Erro ao buscar solicitação: ${fetchError.message}`);
        }

        if (!solicitacaoAtual) {
          console.error('❌ Solicitação não encontrada');
          throw new Error('Solicitação não encontrada');
        }

        console.log('✅ Solicitação encontrada:', solicitacaoAtual);

        // Atualizar status para 'Solicitado'
        const { error: updateError } = await supabase
          .from('solicitacoes_compra')
          .update({ status: 'Solicitado' })
          .eq('id', id);

        if (updateError) {
          console.error('❌ Erro ao atualizar status:', updateError);
          throw new Error(`Erro ao atualizar status: ${updateError.message}`);
        }

        console.log('✅ Status atualizado para Solicitado');

        // Criar tarefa informativa para o usuário que fez a solicitação
        const taskData = {
          title: `SC ${solicitacaoAtual.numero_sc} aceita!`,
          description: `Sua solicitação de compra ${solicitacaoAtual.numero_sc} foi aceita pelo comprador e está sendo processada.`,
          assigned_to: [created_by],
          priority: 'baixa' as const,
          category: 'compras' as const,
          status: 'a_fazer' as const,
          of_number: 'ADM-Compras',
          due_date: new Date().toISOString(),
        };

        console.log('📝 Dados da tarefa a ser criada:', taskData);

        await createTask(taskData);
        
        console.log('✅ Tarefa criada com sucesso');
        
        return { numero_sc: solicitacaoAtual.numero_sc };
      } catch (error) {
        console.error('❌ Erro no processo de aceitação:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-compra'] });
      toast.success('Solicitação aceita e usuário notificado!');
    },
    onError: (error) => {
      console.error('❌ Erro ao aceitar solicitação:', error);
      toast.error(`Erro ao aceitar solicitação: ${error.message}`);
    },
  });

  const comprar = useMutation({
    mutationFn: async ({ id, created_by }: { id: string; created_by: string }) => {
      console.log('🔄 Iniciando processo de compra para solicitação:', id);
      
      try {
        // Primeiro buscar a solicitação atual
        const { data: solicitacaoAtual, error: fetchError } = await supabase
          .from('solicitacoes_compra')
          .select('numero_sc')
          .eq('id', id)
          .maybeSingle();

        if (fetchError) {
          console.error('❌ Erro ao buscar solicitação:', fetchError);
          throw new Error(`Erro ao buscar solicitação: ${fetchError.message}`);
        }

        if (!solicitacaoAtual) {
          console.error('❌ Solicitação não encontrada');
          throw new Error('Solicitação não encontrada');
        }

        console.log('✅ Solicitação encontrada:', solicitacaoAtual);

        // Atualizar status para 'Comprado'
        const { error: updateError } = await supabase
          .from('solicitacoes_compra')
          .update({ status: 'Comprado' })
          .eq('id', id);

        if (updateError) {
          console.error('❌ Erro ao atualizar status:', updateError);
          throw new Error(`Erro ao atualizar status: ${updateError.message}`);
        }

        console.log('✅ Status atualizado para Comprado');

        // Buscar tarefa relacionada a esta SC
        const { data: taskData, error: taskError } = await supabase
          .from('tasks')
          .select('*')
          .ilike('title', `%${solicitacaoAtual.numero_sc}%`)
          .contains('assigned_to', [created_by])
          .eq('category', 'compras')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (taskError) {
          console.error('❌ Erro ao buscar tarefa:', taskError);
          // Não falhar completamente se não conseguir buscar a tarefa
        }

        if (taskData) {
          console.log('✅ Tarefa encontrada:', taskData.id);
          
          // Atualizar a tarefa existente marcando como concluída com informação de compra
          await updateTask({
            id: taskData.id,
            updates: {
              title: `SC ${solicitacaoAtual.numero_sc} - Comprado`,
              description: `Sua solicitação de compra ${solicitacaoAtual.numero_sc} foi comprada pelo comprador e está sendo processada.`,
              status: 'concluido',
              is_completed: true,
              completed_at: new Date().toISOString(),
              completed_by: user?.id || null,
              updated_at: new Date().toISOString()
            }
          });
          
          console.log('✅ Tarefa atualizada com sucesso');
        } else {
          console.log('ℹ️ Nenhuma tarefa encontrada para atualizar');
        }
        
        return { numero_sc: solicitacaoAtual.numero_sc };
      } catch (error) {
        console.error('❌ Erro no processo de compra:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-compra'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Solicitação marcada como comprada!');
    },
    onError: (error) => {
      console.error('❌ Erro ao marcar como comprada:', error);
      toast.error(`Erro ao marcar como comprada: ${error.message}`);
    },
  });

  const comprarDireto = useMutation({
    mutationFn: async ({ id, created_by }: { id: string; created_by: string }) => {
      console.log('🔄 Iniciando processo de compra direta SIMPLIFICADO para solicitação:', id);
      
      try {
        // Buscar dados da solicitação atual
        const { data: solicitacaoAtual, error: fetchError } = await supabase
          .from('solicitacoes_compra')
          .select('numero_sc, status, revisao')
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('❌ Erro ao buscar solicitação:', fetchError);
          throw new Error(`Erro ao buscar solicitação: ${fetchError.message}`);
        }

        console.log('✅ Solicitação encontrada:', solicitacaoAtual);

        // Atualização DIRETA e FORÇADA do status
        console.log('🔄 Executando atualização FORÇADA do status...');
        
        const { data: updateResult, error: updateError } = await supabase
          .from('solicitacoes_compra')
          .update({ 
            status: 'Comprado',
            revisao: (solicitacaoAtual.revisao || 0) + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select('status, revisao');

        if (updateError) {
          console.error('❌ Erro na atualização:', updateError);
          throw new Error(`Falha na atualização: ${updateError.message}`);
        }

        console.log('✅ Resultado da atualização:', updateResult);

        // Verificação MÚLTIPLA para confirmar se foi atualizado
        let verificacaoTentativas = 0;
        const maxVerificacoes = 3;
        let statusConfirmado = false;

        while (verificacaoTentativas < maxVerificacoes && !statusConfirmado) {
          verificacaoTentativas++;
          
          // Aguardar antes da verificação
          await new Promise(resolve => setTimeout(resolve, 300 * verificacaoTentativas));
          
          const { data: verificacao, error: verError } = await supabase
            .from('solicitacoes_compra')
            .select('status')
            .eq('id', id)
            .single();

          if (!verError && verificacao?.status === 'Comprado') {
            console.log(`✅ Verificação ${verificacaoTentativas}: Status CONFIRMADO como 'Comprado'`);
            statusConfirmado = true;
          } else {
            console.log(`⚠️ Verificação ${verificacaoTentativas}: Status ainda é '${verificacao?.status}' - Tentando novamente...`);
            
            // Forçar nova atualização se necessário
            if (verificacaoTentativas < maxVerificacoes) {
              await supabase
                .from('solicitacoes_compra')
                .update({ 
                  status: 'Comprado',
                  updated_at: new Date().toISOString()
                })
                .eq('id', id);
            }
          }
        }

        if (!statusConfirmado) {
          throw new Error('FALHA CRÍTICA: Não foi possível confirmar a atualização do status após múltiplas tentativas');
        }

        // Atualizar tarefa relacionada
        try {
          const { data: taskData } = await supabase
            .from('tasks')
            .select('*')
            .ilike('title', `%${solicitacaoAtual.numero_sc}%`)
            .contains('assigned_to', [created_by])
            .eq('category', 'compras')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (taskData) {
            console.log('✅ Atualizando tarefa relacionada:', taskData.id);
            
            await updateTask({
              id: taskData.id,
              updates: {
                title: `SC ${solicitacaoAtual.numero_sc} - Comprado`,
                description: `Sua solicitação de compra ${solicitacaoAtual.numero_sc} foi comprada pelo comprador.`,
                status: 'concluido',
                is_completed: true,
                completed_at: new Date().toISOString(),
                completed_by: user?.id || null,
                updated_at: new Date().toISOString()
              }
            });
          }
        } catch (taskError) {
          console.error('⚠️ Erro ao atualizar tarefa (não crítico):', taskError);
        }
        
        return { 
          numero_sc: solicitacaoAtual.numero_sc, 
          status: 'Comprado',
          success: true 
        };
      } catch (error) {
        console.error('❌ ERRO CRÍTICO na compra direta:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('✅ SUCESSO TOTAL - Compra direta concluída:', data);
      
      // Invalidar queries IMEDIATAMENTE
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-compra'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      
      // Refetch forçado após delays
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['solicitacoes-compra'] });
      }, 200);
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['solicitacoes-compra'] });
      }, 1000);
      
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['solicitacoes-compra'] });
      }, 1000);
      
      toast.success(`✅ SC ${data.numero_sc} marcada como COMPRADA com sucesso!`);
    },
    onError: (error) => {
      console.error('❌ ERRO FINAL na compra direta:', error);
      toast.error(`❌ Falha ao marcar como comprada: ${error.message}`);
      
      // Refetch mesmo com erro para verificar estado atual
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['solicitacoes-compra'] });
      }, 1000);
    },
  });

  const deleteSolicitacao = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('solicitacoes_compra')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['solicitacoes-compra'] });
      toast.success('Solicitação excluída com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir solicitação:', error);
      toast.error('Erro ao excluir solicitação');
    },
  });

  return {
    solicitacoes,
    isLoading,
    canEdit,
    canDelete,
    createSolicitacao: createSolicitacao.mutate,
    updateStatus: updateStatus.mutate,
    revisar: revisar.mutate,
    aceitar: aceitar.mutate,
    comprar: comprar.mutate,
    comprarDireto: comprarDireto.mutate,
    deleteSolicitacao: deleteSolicitacao.mutate,
    isCreating: createSolicitacao.isPending,
    isUpdating: updateStatus.isPending,
    isRevisando: revisar.isPending,
    isAceitando: aceitar.isPending,
    isComprando: comprar.isPending,
    isComprandoDireto: comprarDireto.isPending,
    isDeleting: deleteSolicitacao.isPending,
  };
};
