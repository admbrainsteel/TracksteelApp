
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface ComponentePeca {
  id: string;
  peca_id: string;
  marca_componente: string;
  descricao: string | null;
  perfil: string | null;
  peso_unitario: number;
  quantidade_por_peca: number;
  created_at: string;
  updated_at: string;
}

export interface ComponenteFormData {
  marca_componente: string;
  descricao: string;
  perfil: string;
  peso_unitario: number;
  quantidade_por_peca: number;
}

// Cache local para componentes
const componentesCache = new Map<string, ComponentePeca[]>();
const CACHE_DURATION = 30000; // 30 segundos

export function useComponentesPeca(pecaIds: string | string[] = []) {
  const { user } = useAuth();
  const [componentes, setComponentes] = useState<ComponentePeca[]>([]);
  const [loading, setLoading] = useState(false);
  const lastPecaIdsRef = useRef<string>('');

  // Normalizar e validar pecaIds
  const normalizedPecaIds = Array.isArray(pecaIds) ? pecaIds : (pecaIds ? [pecaIds] : []);
  const validPecaIds = normalizedPecaIds.filter(id => id && id.trim() !== '');
  const pecaIdsKey = validPecaIds.sort().join(',');

  const loadComponentes = async () => {
    // Evitar chamadas desnecessárias
    if (validPecaIds.length === 0) {
      setComponentes([]);
      return;
    }

    // Evitar re-chamadas para os mesmos IDs
    if (pecaIdsKey === lastPecaIdsRef.current) {
      return;
    }

    // Verificar cache primeiro
    const cached = componentesCache.get(pecaIdsKey);
    if (cached && Date.now() - (cached as any).timestamp < CACHE_DURATION) {
      console.log('📦 Cache HIT para componentes:', pecaIdsKey.substring(0, 50));
      setComponentes(cached);
      return;
    }
    
    try {
      setLoading(true);
      lastPecaIdsRef.current = pecaIdsKey;
      
      console.log('🔄 Carregando componentes para peças:', validPecaIds.length);
      
      const { data, error } = await supabase
        .from('componentes_peca')
        .select('*')
        .in('peca_id', validPecaIds)
        .order('marca_componente');

      if (error) throw error;
      
      const resultado = data || [];
      
      // Salvar no cache
      (resultado as any).timestamp = Date.now();
      componentesCache.set(pecaIdsKey, resultado);
      
      setComponentes(resultado);
      console.log('✅ Componentes carregados:', resultado.length);
    } catch (error) {
      console.error('❌ Erro ao carregar componentes:', error);
      // Não mostrar toast para erros de componentes, apenas log
      // toast.error('Erro ao carregar componentes');
      setComponentes([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchComponentesPeca = async (pecaId: string): Promise<ComponentePeca[]> => {
    try {
      const { data, error } = await supabase
        .from('componentes_peca')
        .select('*')
        .eq('peca_id', pecaId)
        .order('marca_componente');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar componentes da peça:', error);
      toast.error('Erro ao buscar componentes da peça');
      return [];
    }
  };

  const saveComponente = async (formData: ComponenteFormData, pecaId: string) => {
    if (!user || !pecaId) {
      toast.error('Usuário não autenticado ou peça não selecionada');
      return false;
    }

    try {
      const { error } = await supabase
        .from('componentes_peca')
        .insert([{
          ...formData,
          peca_id: pecaId,
          user_id: user.id
        }]);

      if (error) throw error;

      toast.success('Componente cadastrado com sucesso!');
      
      // Invalidar cache
      componentesCache.clear();
      loadComponentes();
      return true;
    } catch (error) {
      console.error('Erro ao salvar componente:', error);
      toast.error('Erro ao salvar componente');
      return false;
    }
  };

  const updateComponente = async (id: string, formData: ComponenteFormData) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      const { error } = await supabase
        .from('componentes_peca')
        .update(formData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Componente atualizado com sucesso!');
      
      // Invalidar cache
      componentesCache.clear();
      loadComponentes();
      return true;
    } catch (error) {
      console.error('Erro ao atualizar componente:', error);
      toast.error('Erro ao atualizar componente');
      return false;
    }
  };

  const deleteComponente = async (id: string) => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return false;
    }

    try {
      // 1. Apagar apontamentos de produção vinculados ao componente
      await supabase
        .from('apontamentos_producao')
        .delete()
        .eq('componente_id', id);

      // 2. Apagar o componente
      const { error } = await supabase
        .from('componentes_peca')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Componente apagado com sucesso!');
      
      // Invalidar cache
      componentesCache.clear();
      loadComponentes();
      return true;
    } catch (error) {
      console.error('Erro ao apagar componente:', error);
      toast.error('Erro ao apagar componente');
      return false;
    }
  };

  useEffect(() => {
    loadComponentes();
  }, [pecaIdsKey]); // Usar a chave em vez do array diretamente

  return {
    componentes,
    loading,
    saveComponente,
    updateComponente,
    deleteComponente,
    loadComponentes,
    fetchComponentesPeca
  };
}
