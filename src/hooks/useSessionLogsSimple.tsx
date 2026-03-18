
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

interface SessionLog {
  id: string;
  user_id: string;
  session_start: string;
  session_end: string | null;
  duration_minutes: number | null;
  is_active: boolean;
  created_at: string;
}

interface OnlineUser {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  session_start: string;
}

export const useSessionLogsSimple = () => {
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  // Buscar logs de sessão
  const fetchSessionLogs = async (filters?: {
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    if (!user) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('user_session_logs')
        .select('*')
        .order('session_start', { ascending: false })
        .limit(100);

      if (filters?.userId && filters.userId !== 'all') {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.startDate) {
        query = query.gte('session_start', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('session_start', filters.endDate);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching session logs:', error);
        toast.error('Erro ao carregar logs de sessão');
        return;
      }
      
      setSessionLogs(data || []);
    } catch (error) {
      console.error('Error fetching session logs:', error);
      toast.error('Erro ao carregar logs de sessão');
    } finally {
      setLoading(false);
    }
  };

  // Buscar usuários online
  const fetchOnlineUsers = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.rpc('get_online_users');
      
      if (error) {
        console.error('Error fetching online users:', error);
        return;
      }
      
      setOnlineUsers(data || []);
    } catch (error) {
      console.error('Error fetching online users:', error);
    }
  };

  // Exportar relatório CSV
  const exportToCsv = async (filters?: {
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    if (!user) return;

    try {
      let query = supabase
        .from('user_session_logs')
        .select('*')
        .order('session_start', { ascending: false });

      if (filters?.userId && filters.userId !== 'all') {
        query = query.eq('user_id', filters.userId);
      }

      if (filters?.startDate) {
        query = query.gte('session_start', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('session_start', filters.endDate);
      }

      const { data, error } = await query;
      
      if (error) {
        toast.error('Erro ao exportar relatório');
        return;
      }

      // Buscar informações dos usuários
      const userIds = Array.from(new Set(data?.map(log => log.user_id) || []));
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const userMap = new Map(users?.map(user => [user.id, user]) || []);

      // Gerar CSV
      const csvHeader = 'Email,Nome,Início da Sessão,Fim da Sessão,Duração (min),Status\n';
      const csvRows = (data || []).map(log => {
        const user = userMap.get(log.user_id);
        const duration = log.duration_minutes ? Math.round(log.duration_minutes) : '';
        const status = log.is_active ? 'Ativa' : 'Finalizada';
        
        return `${user?.email || ''},${user?.full_name || ''},${log.session_start},${log.session_end || ''},${duration},${status}`;
      }).join('\n');

      const csv = csvHeader + csvRows;
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `logs-sessao-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success('Relatório exportado com sucesso!');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Erro ao exportar relatório');
    }
  };

  return {
    sessionLogs,
    onlineUsers,
    loading,
    fetchSessionLogs,
    fetchOnlineUsers,
    exportToCsv
  };
};
