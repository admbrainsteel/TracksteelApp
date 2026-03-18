
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Prompt {
  id: string;
  name: string;
  content: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const usePrompts = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPrompts = async () => {
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPrompts(data || []);
    } catch (error) {
      console.error('Erro ao carregar prompts:', error);
      toast.error('Erro ao carregar prompts');
    }
  };

  const savePrompt = async (prompt: Partial<Prompt>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (prompt.id) {
        const { error } = await supabase
          .from('prompts')
          .update({
            name: prompt.name,
            content: prompt.content
          })
          .eq('id', prompt.id);

        if (error) throw error;
        toast.success('Prompt atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('prompts')
          .insert({
            name: prompt.name,
            content: prompt.content,
            created_by: userData.user?.id
          });

        if (error) throw error;
        toast.success('Prompt criado com sucesso!');
      }

      await fetchPrompts();
    } catch (error) {
      console.error('Erro ao salvar prompt:', error);
      toast.error('Erro ao salvar prompt');
    }
  };

  const deletePrompt = async (id: string) => {
    try {
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Prompt excluído com sucesso!');
      await fetchPrompts();
    } catch (error) {
      console.error('Erro ao excluir prompt:', error);
      toast.error('Erro ao excluir prompt');
    }
  };

  const downloadPromptAsJson = (prompt: Prompt, filename?: string) => {
    const jsonData = {
      name: prompt.name,
      content: prompt.content,
      created_at: prompt.created_at,
      updated_at: prompt.updated_at
    };

    const dataStr = JSON.stringify(jsonData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = filename || `${prompt.name.replace(/\s+/g, '_')}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchPrompts();
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    prompts,
    loading,
    savePrompt,
    deletePrompt,
    downloadPromptAsJson,
    refreshPrompts: fetchPrompts
  };
};
