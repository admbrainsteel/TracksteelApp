import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WebhookConfig {
  id: string;
  converter_name: string;
  link_envio: string;
  link_recebimento: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface FileProcessing {
  id: string;
  webhook_config_id: string;
  file_name: string;
  file_type: string;
  status: string;
  sent_at: string;
  completed_at?: string;
  download_url?: string;
  created_at: string;
  updated_at: string;
}

interface CreateFileProcessingData {
  webhook_config_id: string;
  file_name: string;
  file_type: string;
  status?: string;
}

export const useWebhookConfigs = () => {
  const [webhookConfigs, setWebhookConfigs] = useState<WebhookConfig[]>([]);
  const [fileProcessings, setFileProcessings] = useState<FileProcessing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWebhookConfigs = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_configs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setWebhookConfigs(data || []);
    } catch (error) {
      console.error('Erro ao carregar configurações de webhook:', error);
      toast.error('Erro ao carregar configurações de webhook');
    }
  };

  const fetchFileProcessings = async () => {
    try {
      const { data, error } = await supabase
        .from('file_processings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFileProcessings(data || []);
    } catch (error) {
      console.error('Erro ao carregar processamentos:', error);
      toast.error('Erro ao carregar processamentos');
    }
  };

  const saveWebhookConfig = async (config: Partial<WebhookConfig>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      
      if (config.id) {
        const { error } = await supabase
          .from('webhook_configs')
          .update({
            converter_name: config.converter_name,
            link_envio: config.link_envio,
            link_recebimento: config.link_recebimento
          })
          .eq('id', config.id);

        if (error) throw error;
        toast.success('Configuração atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('webhook_configs')
          .insert({
            converter_name: config.converter_name,
            link_envio: config.link_envio,
            link_recebimento: config.link_recebimento,
            created_by: userData.user?.id
          });

        if (error) throw error;
        toast.success('Configuração criada com sucesso!');
      }

      await fetchWebhookConfigs();
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast.error('Erro ao salvar configuração');
    }
  };

  const deleteWebhookConfig = async (id: string) => {
    try {
      const { error } = await supabase
        .from('webhook_configs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Configuração excluída com sucesso!');
      await fetchWebhookConfigs();
    } catch (error) {
      console.error('Erro ao excluir configuração:', error);
      toast.error('Erro ao excluir configuração');
    }
  };

  const createFileProcessing = async (processing: CreateFileProcessingData) => {
    try {
      const insertData = {
        webhook_config_id: processing.webhook_config_id,
        file_name: processing.file_name,
        file_type: processing.file_type,
        status: processing.status || 'enviado'
      };

      const { error } = await supabase
        .from('file_processings')
        .insert(insertData);

      if (error) throw error;
      await fetchFileProcessings();
      return true;
    } catch (error) {
      console.error('Erro ao criar processamento:', error);
      toast.error('Erro ao criar processamento');
      return false;
    }
  };

  const updateFileProcessing = async (id: string, updates: Partial<FileProcessing>) => {
    try {
      const { error } = await supabase
        .from('file_processings')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      await fetchFileProcessings();
    } catch (error) {
      console.error('Erro ao atualizar processamento:', error);
      toast.error('Erro ao atualizar processamento');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchWebhookConfigs(), fetchFileProcessings()]);
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    webhookConfigs,
    fileProcessings,
    loading,
    saveWebhookConfig,
    deleteWebhookConfig,
    createFileProcessing,
    updateFileProcessing,
    refreshData: () => Promise.all([fetchWebhookConfigs(), fetchFileProcessings()])
  };
};
