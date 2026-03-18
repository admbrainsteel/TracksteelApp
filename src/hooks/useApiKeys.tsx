
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}

export function useApiKeys() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApiKeys = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('api_keys')
        .select('*')
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Erro ao carregar chaves API:', error);
      toast.error('Erro ao carregar chaves API');
    } finally {
      setLoading(false);
    }
  };

  const saveApiKey = async (apiKey: Partial<ApiKey>) => {
    try {
      if (apiKey.id) {
        // Atualizar chave existente
        const { error } = await (supabase as any)
          .from('api_keys')
          .update({
            name: apiKey.name,
            key: apiKey.key,
            updated_at: new Date().toISOString()
          })
          .eq('id', apiKey.id);

        if (error) throw error;
      } else {
        // Criar nova chave
        const { error } = await (supabase as any)
          .from('api_keys')
          .insert({
            name: apiKey.name,
            key: apiKey.key,
            is_primary: false
          });

        if (error) throw error;
      }

      await fetchApiKeys();
      toast.success('Chave API salva com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar chave API:', error);
      toast.error('Erro ao salvar chave API');
    }
  };

  const setPrimaryKey = async (keyId: string) => {
    try {
      // Primeiro, remove o status de primary de todas as chaves
      await (supabase as any)
        .from('api_keys')
        .update({ is_primary: false })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Atualiza todas as linhas

      // Depois, define a chave selecionada como primary
      const { error } = await (supabase as any)
        .from('api_keys')
        .update({ is_primary: true })
        .eq('id', keyId);

      if (error) throw error;

      await fetchApiKeys();
      toast.success('Chave principal definida com sucesso!');
    } catch (error) {
      console.error('Erro ao definir chave principal:', error);
      toast.error('Erro ao definir chave principal');
    }
  };

  const deleteApiKey = async (keyId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('api_keys')
        .delete()
        .eq('id', keyId);

      if (error) throw error;

      await fetchApiKeys();
      toast.success('Chave API removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover chave API:', error);
      toast.error('Erro ao remover chave API');
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  return {
    apiKeys,
    loading,
    saveApiKey,
    setPrimaryKey,
    deleteApiKey,
    refetch: fetchApiKeys
  };
}
