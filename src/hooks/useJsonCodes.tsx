
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface JsonCode {
  id: string;
  name: string;
  description?: string;
  json_code: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export function useJsonCodes() {
  const [jsonCodes, setJsonCodes] = useState<JsonCode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJsonCodes = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from('json_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJsonCodes(data || []);
    } catch (error) {
      console.error('Erro ao carregar códigos JSON:', error);
      toast.error('Erro ao carregar códigos JSON');
    } finally {
      setLoading(false);
    }
  };

  const saveJsonCode = async (jsonCode: Partial<JsonCode>) => {
    try {
      if (jsonCode.id) {
        // Atualizar código existente
        const { error } = await (supabase as any)
          .from('json_codes')
          .update({
            name: jsonCode.name,
            description: jsonCode.description,
            json_code: jsonCode.json_code,
            is_active: jsonCode.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', jsonCode.id);

        if (error) throw error;
      } else {
        // Criar novo código
        const { error } = await (supabase as any)
          .from('json_codes')
          .insert({
            name: jsonCode.name,
            description: jsonCode.description,
            json_code: jsonCode.json_code,
            is_active: jsonCode.is_active ?? true,
            created_by: (await supabase.auth.getUser()).data.user?.id
          });

        if (error) throw error;
      }

      await fetchJsonCodes();
      toast.success('Código JSON salvo com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar código JSON:', error);
      toast.error('Erro ao salvar código JSON');
    }
  };

  const deleteJsonCode = async (codeId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('json_codes')
        .delete()
        .eq('id', codeId);

      if (error) throw error;

      await fetchJsonCodes();
      toast.success('Código JSON removido com sucesso!');
    } catch (error) {
      console.error('Erro ao remover código JSON:', error);
      toast.error('Erro ao remover código JSON');
    }
  };

  const toggleActiveStatus = async (codeId: string, isActive: boolean) => {
    try {
      const { error } = await (supabase as any)
        .from('json_codes')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', codeId);

      if (error) throw error;

      await fetchJsonCodes();
      toast.success(`Código JSON ${isActive ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (error) {
      console.error('Erro ao alterar status do código JSON:', error);
      toast.error('Erro ao alterar status do código JSON');
    }
  };

  useEffect(() => {
    fetchJsonCodes();
  }, []);

  return {
    jsonCodes,
    loading,
    saveJsonCode,
    deleteJsonCode,
    toggleActiveStatus,
    refetch: fetchJsonCodes
  };
}
