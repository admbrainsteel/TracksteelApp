import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface Peca {
  id: string;
  created_at: string;
  of_number: string;
  etapa_fase: string;
  marca: string;
  descricao: string;
  quantidade: number;
  peso_unitario: number;
  peso_total: number;
  tratamento_superficial: string;
  material: string;
  perfil_principal: string;
  tem_componentes: boolean;
  user_id: string;
  prioridade: string;
  quantidadeDisponivel?: number;
}

interface PecaPrioridade {
  peca_id: string;
  prioridade_mais_alta: string;
}

export function usePecas() {
  const { user } = useAuth();
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(true);
  const [ofNumbers, setOfNumbers] = useState<string[]>([]);
  const [hasRecentImport, setHasRecentImport] = useState(false);

  const loadPecas = useCallback(async () => {
    console.log('🔄 Carregando peças...');
    try {
      const { data, error } = await supabase
        .from('pecas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Erro ao carregar peças:', error);
        throw error;
      }

      console.log('✅ Peças carregadas:', data?.length || 0);
      setPecas(data || []);
      
      const uniqueOFs = Array.from(new Set(data?.map(peca => peca.of_number).filter(Boolean) || []));
      setOfNumbers(uniqueOFs);
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao carregar peças:', error);
      toast.error('Erro ao carregar peças');
      return [];
    }
  }, []);

  const sincronizarPrioridades = useCallback(async (showToast = true) => {
    try {
      console.log('🔄 Sincronizando prioridades...');
      
      const { data: pecasComPrioridades, error } = await supabase
        .rpc('calcular_prioridades_pecas_bulk') as { data: PecaPrioridade[] | null, error: any };

      if (error) {
        console.error('❌ Erro ao calcular prioridades:', error);
        return;
      }

      console.log('✅ Prioridades calculadas:', pecasComPrioridades?.length || 0);
      
      if (pecasComPrioridades && Array.isArray(pecasComPrioridades) && pecasComPrioridades.length > 0) {
        const updates = pecasComPrioridades.map(p => ({
          id: p.peca_id,
          prioridade: p.prioridade_mais_alta
        }));

        const batchSize = 100;
        for (let i = 0; i < updates.length; i += batchSize) {
          const batch = updates.slice(i, i + batchSize);
          
          for (const update of batch) {
            const { error: updateError } = await supabase
              .from('pecas')
              .update({ prioridade: update.prioridade })
              .eq('id', update.id);

            if (updateError) {
              console.error('❌ Erro ao atualizar prioridade da peça:', updateError);
            }
          }
        }
        
        console.log('✅ Prioridades sincronizadas com sucesso');
        return await loadPecas();
      }
    } catch (error) {
      console.error('❌ Erro ao sincronizar prioridades:', error);
      if (showToast) {
        toast.error('Erro ao sincronizar prioridades');
      }
    }
  }, [loadPecas]);

  // Carregamento inicial otimizado - sem sincronização automática
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        console.log('🚀 Iniciando carregamento da tela Cadastro de Peças...');
        
        // Apenas carrega as peças inicialmente
        await loadPecas();
        
        console.log('✅ Carregamento inicial concluído');
      } catch (error) {
        console.error('❌ Erro no carregamento inicial:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, [loadPecas]);

  // Listeners otimizados - menos triggers automáticos
  useEffect(() => {
    const channel = supabase
      .channel('pecas_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pecas' }, (payload) => {
        console.log('📡 Mudança detectada em pecas:', payload);
        // Apenas recarrega se não for atualização de prioridade
        if (payload.eventType !== 'UPDATE' || !payload.new?.prioridade) {
          if (!loading) {
            loadPecas();
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loading, loadPecas]);

  const checkRecentImport = useCallback(async () => {
    try {
      const { data, error, count } = await supabase
        .from('pecas')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error("Erro ao verificar importação recente:", error);
        return;
      }

      setHasRecentImport(count !== null && count > 0);
      console.log(`Importação recente detectada: ${count !== null && count > 0}`);
    } catch (error) {
      console.error("Erro ao verificar importação recente:", error);
    }
  }, [user?.id]);

  const savePeca = async (pecaData: any): Promise<boolean> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const { prioridade, ...cleanedData } = pecaData;
      
      const { data, error } = await supabase
        .from('pecas')
        .insert([{ ...cleanedData, user_id: user.id, prioridade: 'P4' }])
        .select();

      if (error) {
        console.error('Erro ao salvar peça:', error);
        toast.error('Erro ao salvar peça');
        return false;
      }

      toast.success('Peça salva com sucesso!');
      
      // Sincronização manual apenas quando necessário
      setTimeout(() => {
        sincronizarPrioridades(false);
      }, 2000);
      
      await loadPecas();
      return true;
    } catch (error) {
      console.error('Erro ao salvar peça:', error);
      toast.error('Erro ao salvar peça');
      return false;
    }
  };

  const updatePeca = async (id: string, pecaData: any): Promise<boolean> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const { prioridade, ...cleanedData } = pecaData;
      
      const { data, error } = await supabase
        .from('pecas')
        .update(cleanedData)
        .eq('id', id)
        .select();

      if (error) {
        console.error('Erro ao atualizar peça:', error);
        toast.error('Erro ao atualizar peça');
        return false;
      }

      toast.success('Peça atualizada com sucesso!');
      
      // Sincronização manual apenas quando necessário
      setTimeout(() => {
        sincronizarPrioridades(false);
      }, 2000);
      
      await loadPecas();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar peça:', error);
      toast.error('Erro ao atualizar peça');
      return false;
    }
  };

  const deletePeca = async (pecaId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const { error } = await supabase
        .from('pecas')
        .delete()
        .eq('id', pecaId);

      if (error) {
        console.error('Erro ao apagar peça:', error);
        toast.error('Erro ao apagar peça');
        return false;
      }

      toast.success('Peça apagada com sucesso!');
      await loadPecas();
      return true;
    } catch (error) {
      console.error('Erro ao apagar peça:', error);
      toast.error('Erro ao apagar peça');
      return false;
    }
  };

  const importCSV = async (file: File) => {
    console.log('📄 Importando CSV...');
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        toast.error('Arquivo CSV vazio ou inválido');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      const pecasData = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length === headers.length) {
          const peca: any = { user_id: user.id, prioridade: 'P4' };
          
          headers.forEach((header, index) => {
            const value = values[index];
            if (header === 'quantidade' || header === 'peso_unitario' || header === 'peso_total') {
              peca[header] = parseFloat(value) || 0;
            } else if (header === 'tem_componentes') {
              peca[header] = ['true', '1', 'sim'].includes(value.toLowerCase());
            } else if (header !== 'prioridade') {
              peca[header] = value;
            }
          });
          
          pecasData.push(peca);
        }
      }

      if (pecasData.length === 0) {
        toast.error('Nenhuma peça válida encontrada no arquivo CSV');
        return;
      }

      const { error } = await supabase
        .from('pecas')
        .insert(pecasData);

      if (error) {
        console.error('❌ Erro ao importar CSV:', error);
        throw error;
      }

      console.log('✅ CSV importado com sucesso:', pecasData.length, 'peças');
      toast.success(`${pecasData.length} peça(s) importada(s) com sucesso!`);
      setHasRecentImport(true);
      
      // Sincronização manual apenas após importação
      setTimeout(() => {
        sincronizarPrioridades(false);
      }, 3000);
      
      await loadPecas();
    } catch (error) {
      console.error('❌ Erro ao importar CSV:', error);
      toast.error('Erro ao importar arquivo CSV');
      throw error;
    }
  };

  const importPecas = async (pecasData: any[]) => {
    console.log('📦 Iniciando importação de peças:', pecasData.length);
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      const pecasMap = new Map<string, any>();
      const componentesMap = new Map<string, any[]>();

      console.log('🔍 Separando dados de peças e componentes...');
      
      pecasData.forEach((item, index) => {
        console.log(`📋 Processando item ${index + 1}:`, item);
        
        const pecaKey = `${item.of_number || ''}-${item.etapa_fase || ''}-${item.marca || ''}`;
        
        const pecaData = {
          of_number: item.of_number || '',
          etapa_fase: item.etapa_fase || '',
          marca: item.marca || '',
          descricao: item.descricao || '',
          quantidade: Number(item.quantidade) || 0,
          peso_unitario: Number(item.peso_unitario) || 0,
          peso_total: Number(item.peso_total) || 0,
          tratamento_superficial: item.tratamento_superficial || '',
          material: item.material || '',
          perfil_principal: item.perfil_principal || '',
          tem_componentes: Boolean(item.tem_componentes),
          user_id: user.id,
          prioridade: 'P4'
        };

        if (!pecasMap.has(pecaKey)) {
          pecasMap.set(pecaKey, pecaData);
        }

        if (item.marca_componente && item.marca_componente.trim()) {
          const componenteData = {
            marca_componente: item.marca_componente.trim(),
            descricao: item.descricao_componente || '',
            perfil: item.perfil_componente || '',
            peso_unitario: Number(item.peso_unitario_componente) || 0,
            quantidade_por_peca: Number(item.quantidade_por_peca) || 1,
            user_id: user.id
          };

          if (!componentesMap.has(pecaKey)) {
            componentesMap.set(pecaKey, []);
          }
          componentesMap.get(pecaKey)!.push(componenteData);
        }
      });

      const pecasParaInserir = Array.from(pecasMap.values());
      console.log('✅ Peças para inserir:', pecasParaInserir.length);
      console.log('✅ Peças com componentes:', componentesMap.size);

      if (pecasParaInserir.length === 0) {
        toast.error('Nenhuma peça válida encontrada para importação');
        return;
      }

      console.log('💾 Inserindo peças principais...');
      const { data: pecasInseridas, error: pecasError } = await supabase
        .from('pecas')
        .insert(pecasParaInserir)
        .select('id, of_number, etapa_fase, marca');

      if (pecasError) {
        console.error('❌ Erro ao inserir peças:', pecasError);
        toast.error(`Erro ao inserir peças: ${pecasError.message}`);
        throw pecasError;
      }

      console.log('✅ Peças inseridas com sucesso:', pecasInseridas?.length || 0);

      let totalComponentesInseridos = 0;
      
      if (componentesMap.size > 0 && pecasInseridas) {
        console.log('🔧 Inserindo componentes...');
        
        for (const [pecaKey, componentes] of componentesMap.entries()) {
          const [of_number, etapa_fase, marca] = pecaKey.split('-');
          
          const pecaInserida = pecasInseridas.find(p => 
            p.of_number === of_number && 
            p.etapa_fase === etapa_fase && 
            p.marca === marca
          );
          
          if (pecaInserida && componentes.length > 0) {
            const componentesComPecaId = componentes.map(comp => ({
              ...comp,
              peca_id: pecaInserida.id
            }));

            console.log(`🔧 Inserindo ${componentesComPecaId.length} componentes para peça ${marca}...`);

            const { error: componentesError } = await supabase
              .from('componentes_peca')
              .insert(componentesComPecaId);

            if (componentesError) {
              console.error('❌ Erro ao inserir componentes:', componentesError);
            } else {
              totalComponentesInseridos += componentesComPecaId.length;
              console.log(`✅ Componentes inseridos para peça ${marca}: ${componentesComPecaId.length}`);
            }
          }
        }
      }

      let successMessage = `✅ ${pecasInseridas?.length || 0} peça(s) importada(s) com sucesso!`;
      if (totalComponentesInseridos > 0) {
        successMessage += ` ${totalComponentesInseridos} componente(s) também foram criados.`;
      }

      console.log('🎉 Importação concluída:', successMessage);
      toast.success(successMessage);
      setHasRecentImport(true);
      
      // Sincronização manual apenas após importação
      setTimeout(() => {
        sincronizarPrioridades(false);
      }, 3000);
      
      await loadPecas();
    } catch (error) {
      console.error('❌ Erro ao importar peças:', error);
      toast.error(`Erro ao importar peças: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      throw error;
    }
  };

  const undoLastImport = async () => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      const { data: pecasParaApagar, error: selectError } = await supabase
        .from('pecas')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (selectError) {
        console.error('Erro ao selecionar peças para apagar:', selectError);
        toast.error('Erro ao selecionar peças para apagar');
        return;
      }

      if (!pecasParaApagar || pecasParaApagar.length === 0) {
        toast.info('Nenhuma peça recente para desfazer a importação.');
        return;
      }

      const pecaIds = pecasParaApagar.map(peca => peca.id);
      const { error: deleteComponentesError } = await supabase
        .from('componentes_peca')
        .delete()
        .in('peca_id', pecaIds);

      if (deleteComponentesError) {
        console.error('Erro ao apagar componentes das peças:', deleteComponentesError);
        toast.error('Erro ao apagar componentes das peças');
        return;
      }

      const { error: deleteError } = await supabase
        .from('pecas')
        .delete()
        .in('id', pecaIds);

      if (deleteError) {
        console.error('Erro ao apagar peças:', deleteError);
        toast.error('Erro ao apagar peças');
        return;
      }

      toast.success('Última importação desfeita com sucesso!');
      setHasRecentImport(false);
      await loadPecas();
    } catch (error) {
      console.error('Erro ao desfazer importação:', error);
      toast.error('Erro ao desfazer importação');
    }
  };

  const deleteLastImport = async () => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      const { data: pecasParaApagar, error: selectError } = await supabase
        .from('pecas')
        .select('id')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (selectError) {
        console.error('Erro ao selecionar peças para apagar:', selectError);
        toast.error('Erro ao selecionar peças para apagar');
        return;
      }

      if (!pecasParaApagar || pecasParaApagar.length === 0) {
        toast.info('Nenhuma peça recente para apagar.');
        return;
      }

      const pecaIds = pecasParaApagar.map(peca => peca.id);
      const { error: deleteComponentesError } = await supabase
        .from('componentes_peca')
        .delete()
        .in('peca_id', pecaIds);

      if (deleteComponentesError) {
        console.error('Erro ao apagar componentes das peças:', deleteComponentesError);
        toast.error('Erro ao apagar componentes das peças');
        return;
      }

      const { error: deleteError } = await supabase
        .from('pecas')
        .delete()
        .in('id', pecaIds);

      if (deleteError) {
        console.error('Erro ao apagar peças:', deleteError);
        toast.error('Erro ao apagar peças');
        return;
      }

      toast.success('Última importação apagada com sucesso!');
      setHasRecentImport(false);
      await loadPecas();
    } catch (error) {
      console.error('Erro ao apagar importação:', error);
      toast.error('Erro ao apagar importação');
    }
  };

  const batchUpdatePecas = async (pecaIds: string[], updates: any) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }
  
    try {
      const { prioridade, ...cleanedUpdates } = updates;
      
      const { error } = await supabase
        .from('pecas')
        .update(cleanedUpdates)
        .in('id', pecaIds);
  
      if (error) {
        console.error('Erro ao atualizar peças em lote:', error);
        toast.error('Erro ao atualizar peças em lote');
        throw error;
      }
  
      toast.success(`${pecaIds.length} peças atualizadas com sucesso!`);
      
      // Sincronização manual apenas quando necessário
      setTimeout(() => {
        sincronizarPrioridades(false);
      }, 2000);
      
      await loadPecas();
    } catch (error) {
      console.error('Erro ao atualizar peças em lote:', error);
      toast.error('Erro ao atualizar peças em lote');
      throw error;
    }
  };

  useEffect(() => {
    if (user?.id) {
      checkRecentImport();
    }
  }, [user?.id, checkRecentImport]);

  return {
    pecas,
    loading,
    ofNumbers,
    savePeca,
    updatePeca,
    deletePeca,
    importCSV,
    importPecas,
    undoLastImport,
    deleteLastImport,
    hasRecentImport,
    batchUpdatePecas,
    loadPecas,
    sincronizarPrioridades
  };
}
