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

  const deletePecasCascade = async (pecaIds: string[]): Promise<boolean> => {
    if (!pecaIds || pecaIds.length === 0) return true;

    try {
      console.log('🗑️ Iniciando exclusão em cascata para peças:', pecaIds);

      // 1. Obter todos os IDs de componentes vinculados a essas peças
      const { data: componentes } = await supabase
        .from('componentes_peca')
        .select('id')
        .in('peca_id', pecaIds);

      const componenteIds = componentes?.map(c => c.id) || [];

      // 2. Apagar apontamentos de produção vinculados aos componentes
      if (componenteIds.length > 0) {
        const { error: apCompError } = await supabase
          .from('apontamentos_producao')
          .delete()
          .in('componente_id', componenteIds);
        if (apCompError) console.warn('Aviso ao apagar apontamentos de componentes:', apCompError);
      }

      // 3. Apagar apontamentos de produção vinculados diretamente às peças
      const { error: apPecaError } = await supabase
        .from('apontamentos_producao')
        .delete()
        .in('peca_id', pecaIds);
      if (apPecaError) console.warn('Aviso ao apagar apontamentos de peças:', apPecaError);

      // 4. Apagar itens de prioridades de fabricação
      const { error: prioridadesError } = await supabase
        .from('itens_prioridade_fabricacao')
        .delete()
        .in('peca_id', pecaIds);
      if (prioridadesError) console.warn('Aviso ao apagar itens de prioridade:', prioridadesError);

      // 5. Apagar itens de romaneio de peças
      const { error: romaneioError } = await supabase
        .from('itens_romaneio_pecas')
        .delete()
        .in('peca_id', pecaIds);
      if (romaneioError) console.warn('Aviso ao apagar itens de romaneio:', romaneioError);

      // 6. Apagar datas de processos
      const { error: processosError } = await supabase
        .from('processos_pecas_datas')
        .delete()
        .in('peca_id', pecaIds);
      if (processosError) console.warn('Aviso ao apagar processos datas:', processosError);

      // 7. Apagar componentes das peças
      const { error: compError } = await supabase
        .from('componentes_peca')
        .delete()
        .in('peca_id', pecaIds);
      if (compError) console.warn('Aviso ao apagar componentes:', compError);

      // 8. Apagar as peças principais
      const { error: deleteError } = await supabase
        .from('pecas')
        .delete()
        .in('id', pecaIds);

      if (deleteError) {
        console.error('❌ Erro ao apagar peças do banco:', deleteError);
        throw deleteError;
      }

      console.log('✅ Peças e vínculos apagados com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro na exclusão em cascata das peças:', error);
      throw error;
    }
  };

  const deletePeca = async (pecaId: string): Promise<boolean> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      await deletePecasCascade([pecaId]);
      toast.success('Peça apagada com sucesso!');
      await loadPecas();
      return true;
    } catch (error) {
      console.error('Erro ao apagar peça:', error);
      toast.error('Erro ao apagar peça');
      return false;
    }
  };

  const deletePecasBatch = async (pecaIds: string[]): Promise<boolean> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      await deletePecasCascade(pecaIds);
      toast.success(`${pecaIds.length} peça(s) apagada(s) com sucesso!`);
      await loadPecas();
      return true;
    } catch (error) {
      console.error('Erro ao apagar peças selecionadas:', error);
      toast.error('Erro ao apagar peças selecionadas');
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

      await importPecas(pecasData);
    } catch (error) {
      console.error('❌ Erro ao importar CSV:', error);
      toast.error('Erro ao importar arquivo CSV');
      throw error;
    }
  };

  const importPecas = async (pecasData: any[]) => {
    console.log('📦 Iniciando importação inteligente de peças:', pecasData.length);
    if (!user) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      const pecasMap = new Map<string, any>();
      const componentesMap = new Map<string, any[]>();

      console.log('🔍 Separando dados de peças e componentes...');
      
      pecasData.forEach((item, index) => {
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

        if (item.marca_componente && String(item.marca_componente).trim()) {
          const rawMarca = String(item.marca_componente).trim();
          let cleanMarca = rawMarca;
          
          // Extrair a marca numérica pura entre 1000 e 9999 (requisito do banco PostgreSQL)
          const matchSuffix = rawMarca.match(/-?(\d{4,})$/) || rawMarca.match(/(\d{4,})/);
          if (matchSuffix) {
            cleanMarca = matchSuffix[1];
          } else {
            const digits = rawMarca.replace(/\D/g, '');
            if (digits.length >= 4) {
              cleanMarca = digits.slice(-4);
            } else {
              cleanMarca = String(1000 + (componentesMap.get(pecaKey)?.length || 0));
            }
          }

          let numVal = parseInt(cleanMarca, 10);
          if (isNaN(numVal) || numVal < 1000 || numVal > 9999) {
            numVal = 1000 + (componentesMap.get(pecaKey)?.length || 0);
          }
          cleanMarca = String(numVal);

          const componenteData = {
            marca_componente: cleanMarca,
            descricao: item.descricao_componente || item.descricao || '',
            perfil: item.perfil_componente || item.perfil_principal || '',
            peso_unitario: Number(item.peso_unitario_componente) || 0,
            quantidade_por_peca: Math.max(1, Math.round(Number(item.quantidade_por_peca) || 1)),
            user_id: user.id
          };

          if (!componentesMap.has(pecaKey)) {
            componentesMap.set(pecaKey, []);
          }
          componentesMap.get(pecaKey)!.push(componenteData);
        }
      });

      const pecasParaProcessar = Array.from(pecasMap.values());
      console.log('✅ Peças únicas a processar:', pecasParaProcessar.length);
      console.log('✅ Peças com componentes:', componentesMap.size);

      if (pecasParaProcessar.length === 0) {
        toast.error('Nenhuma peça válida encontrada para importação');
        return;
      }

      // 1. Consultar peças existentes para não duplicar (mesma OF, Fase e Marca)
      const ofsParaConsultar = Array.from(new Set(pecasParaProcessar.map(p => p.of_number).filter(Boolean)));
      const { data: pecasExistentes, error: queryExistentesError } = await supabase
        .from('pecas')
        .select('id, of_number, etapa_fase, marca')
        .eq('user_id', user.id)
        .in('of_number', ofsParaConsultar);

      if (queryExistentesError) {
        console.warn('Aviso ao consultar peças existentes:', queryExistentesError);
      }

      const existingPecasMap = new Map<string, string>();
      if (pecasExistentes) {
        pecasExistentes.forEach(ep => {
          const key = `${ep.of_number || ''}-${ep.etapa_fase || ''}-${ep.marca || ''}`;
          existingPecasMap.set(key, ep.id);
        });
      }

      const pecaIdResolvedMap = new Map<string, string>();
      const pecasNovasParaInserir: any[] = [];
      let totalAtualizadas = 0;

      // 2. Atualizar existentes mantendo ID (preservando apontamentos e prioridades)
      for (const peca of pecasParaProcessar) {
        const key = `${peca.of_number || ''}-${peca.etapa_fase || ''}-${peca.marca || ''}`;
        const existingId = existingPecasMap.get(key);

        if (existingId) {
          const { error: updateError } = await supabase
            .from('pecas')
            .update({
              descricao: peca.descricao,
              quantidade: peca.quantidade,
              peso_unitario: peca.peso_unitario,
              peso_total: peca.peso_total,
              tratamento_superficial: peca.tratamento_superficial,
              material: peca.material,
              perfil_principal: peca.perfil_principal,
              tem_componentes: peca.tem_componentes
            })
            .eq('id', existingId);

          if (!updateError) {
            pecaIdResolvedMap.set(key, existingId);
            totalAtualizadas++;
          }
        } else {
          pecasNovasParaInserir.push(peca);
        }
      }

      // 3. Inserir novas peças
      let totalNovas = 0;
      if (pecasNovasParaInserir.length > 0) {
        console.log('💾 Inserindo novas peças principais:', pecasNovasParaInserir.length);
        const { data: pecasInseridas, error: pecasError } = await supabase
          .from('pecas')
          .insert(pecasNovasParaInserir)
          .select('id, of_number, etapa_fase, marca');

        if (pecasError) {
          console.error('❌ Erro ao inserir novas peças:', pecasError);
          toast.error(`Erro ao inserir peças: ${pecasError.message}`);
          throw pecasError;
        }

        if (pecasInseridas) {
          totalNovas = pecasInseridas.length;
          pecasInseridas.forEach(p => {
            const key = `${p.of_number || ''}-${p.etapa_fase || ''}-${p.marca || ''}`;
            pecaIdResolvedMap.set(key, p.id);
          });
        }
      }

      // 4. Inserir/Sincronizar Componentes (Limpa resíduos se a peça virou simples ou foi reimportada)
      let totalComponentesInseridos = 0;
      console.log('🔧 Inserindo e sincronizando componentes...');
      
      for (const peca of pecasParaProcessar) {
        const pecaKey = `${peca.of_number || ''}-${peca.etapa_fase || ''}-${peca.marca || ''}`;
        const pecaId = pecaIdResolvedMap.get(pecaKey);
        const componentes = componentesMap.get(pecaKey) || [];

        if (pecaId) {
          if (componentes.length > 0) {
            // Limpar componentes antigos desta peça para atualizar de forma limpa
            await supabase
              .from('componentes_peca')
              .delete()
              .eq('peca_id', pecaId);

            const componentesComPecaId = componentes.map(comp => ({
              ...comp,
              peca_id: pecaId
            }));

            const { error: componentesError } = await supabase
              .from('componentes_peca')
              .insert(componentesComPecaId);

            if (componentesError) {
              console.error(`❌ Erro ao inserir componentes para ${pecaKey}:`, componentesError);
            } else {
              totalComponentesInseridos += componentesComPecaId.length;
            }
          } else {
            // Peça simples sem componentes: limpar componentes residuais antigos caso existissem
            await supabase
              .from('componentes_peca')
              .delete()
              .eq('peca_id', pecaId);
          }
        }
      }

      let successMessage = `✅ Importação concluída!`;
      if (totalNovas > 0) successMessage += ` ${totalNovas} nova(s) peça(s).`;
      if (totalAtualizadas > 0) successMessage += ` ${totalAtualizadas} peça(s) atualizada(s).`;
      if (totalComponentesInseridos > 0) successMessage += ` ${totalComponentesInseridos} componente(s) vinculados.`;

      console.log('🎉 Importação concluída:', successMessage);
      toast.success(successMessage);
      setHasRecentImport(true);
      
      // Sincronização manual de prioridades
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
      await deletePecasCascade(pecaIds);

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
      await deletePecasCascade(pecaIds);

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
    deletePecasBatch,
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

