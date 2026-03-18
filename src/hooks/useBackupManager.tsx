
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface BackupLog {
  id: string;
  operation_type: 'backup' | 'restore';
  status: 'in_progress' | 'completed' | 'failed';
  file_name: string;
  file_size?: number;
  tables_count?: number;
  records_count?: number;
  started_at: string;
  completed_at?: string;
  error_message?: string;
  created_by: string;
}

export const useBackupManager = () => {
  const queryClient = useQueryClient();
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Buscar logs de backup
  const { data: backupLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['backup-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('backup_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as BackupLog[];
    },
  });

  // Criar backup
  const createBackup = useMutation({
    mutationFn: async () => {
      setIsBackingUp(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      console.log('Iniciando backup...');

      // Fazer a requisição para a função edge
      const response = await fetch(`https://lwjppiicofojfcdfjsto.supabase.co/functions/v1/backup-database`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', errorText);
        throw new Error(`Erro ao criar backup: ${response.status} ${response.statusText}`);
      }

      // Verificar se a resposta é um arquivo ZIP
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/zip')) {
        // É um arquivo ZIP - fazer download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        
        // Tentar obter o nome do arquivo do header Content-Disposition
        const contentDisposition = response.headers.get('content-disposition');
        let filename = `backup_${new Date().toISOString().split('T')[0]}.zip`;
        
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
          if (filenameMatch) {
            filename = filenameMatch[1];
          }
        }
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        return { success: true, filename };
      } else {
        // Resposta JSON com erro
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro desconhecido');
      }
    },
    onSuccess: (data) => {
      console.log('Backup concluído com sucesso');
      toast.success(`Backup criado com sucesso! Arquivo: ${data.filename}`);
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] });
    },
    onError: (error: Error) => {
      console.error('Erro ao criar backup:', error);
      toast.error(`Erro ao criar backup: ${error.message}`);
    },
    onSettled: () => {
      setIsBackingUp(false);
    }
  });

  // Restaurar backup
  const restoreBackup = useMutation({
    mutationFn: async (file: File) => {
      setIsRestoring(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const formData = new FormData();
      formData.append('file', file);

      const { data, error } = await supabase.functions.invoke('restore-database', {
        body: formData,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (error) {
        throw new Error(error.message || 'Erro ao restaurar backup');
      }

      return data;
    },
    onSuccess: (data) => {
      toast.success(`Backup restaurado com sucesso! ${data.tablesRestored || 0} tabelas e ${data.recordsRestored || 0} registros restaurados.`);
      queryClient.invalidateQueries({ queryKey: ['backup-logs'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao restaurar backup: ${error.message}`);
    },
    onSettled: () => {
      setIsRestoring(false);
    }
  });

  return {
    backupLogs,
    logsLoading,
    isBackingUp,
    isRestoring,
    createBackup: createBackup.mutate,
    restoreBackup: restoreBackup.mutate
  };
};
