
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { logger } from '@/utils/logger';

interface SessionLog {
  id: string;
  user_id: string;
  session_start: string;
  session_end: string | null;
  duration_minutes: number | null;
  ip_address: string | null;
  user_agent: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface OnlineUser {
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  session_start: string;
}

interface SessionStats {
  total_sessions: number;
  total_users: number;
  average_duration: number;
  active_sessions: number;
}

export const useSessionLogs = () => {
  const [sessionLogs, setSessionLogs] = useState<SessionLog[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { user } = useAuth();

  // Iniciar sessão quando o usuário faz login
  const startSession = async () => {
    if (!user) return;

    try {
      logger.info('Starting user session');
      
      // Finalizar sessões ativas anteriores (caso houve falha no logout)
      await supabase
        .from('user_session_logs')
        .update({ 
          is_active: false, 
          session_end: new Date().toISOString(),
          duration_minutes: 0
        })
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Criar nova sessão
      const { data, error } = await supabase
        .from('user_session_logs')
        .insert({
          user_id: user.id,
          ip_address: null, // Pode ser obtido do frontend se necessário
          user_agent: navigator.userAgent,
          is_active: true
        })
        .select()
        .single();

      if (error) {
        logger.error('Error starting session:', error);
        throw error;
      }
      
      setCurrentSessionId(data.id);
      
      // Armazenar ID da sessão no localStorage para persistência
      localStorage.setItem('currentSessionId', data.id);
      logger.success('Session started successfully');
    } catch (error) {
      logger.error('Erro ao iniciar sessão:', error);
    }
  };

  // Finalizar sessão quando o usuário faz logout
  const endSession = async () => {
    const sessionId = currentSessionId || localStorage.getItem('currentSessionId');
    if (!sessionId) return;

    try {
      logger.info('Ending user session');
      await supabase.rpc('end_user_session', { session_id: sessionId });
      setCurrentSessionId(null);
      localStorage.removeItem('currentSessionId');
      logger.success('Session ended successfully');
    } catch (error) {
      logger.error('Erro ao finalizar sessão:', error);
    }
  };

  // Buscar logs de sessão
  const fetchSessionLogs = async (filters?: {
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setLoading(true);
    try {
      logger.info('Fetching session logs with filters:', filters);
      
      let query = supabase
        .from('user_session_logs')
        .select('*')
        .order('session_start', { ascending: false });

      if (filters?.userId) {
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
        logger.error('Error fetching session logs:', error);
        throw error;
      }
      
      setSessionLogs(data as SessionLog[] || []);
      logger.success('Session logs fetched successfully');
    } catch (error) {
      logger.error('Erro ao buscar logs de sessão:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar usuários online
  const fetchOnlineUsers = async () => {
    try {
      logger.info('Fetching online users');
      const { data, error } = await supabase.rpc('get_online_users');
      if (error) {
        logger.error('Error fetching online users:', error);
        throw error;
      }
      setOnlineUsers(data || []);
      logger.success('Online users fetched successfully');
    } catch (error) {
      logger.error('Erro ao buscar usuários online:', error);
    }
  };

  // Buscar estatísticas de sessão
  const fetchSessionStats = async (filters?: {
    userId?: string;
    period?: 'day' | 'week' | 'month';
  }) => {
    try {
      logger.info('Fetching session stats with filters:', filters);
      
      let query = supabase
        .from('user_session_logs')
        .select('*');

      if (filters?.userId) {
        query = query.eq('user_id', filters.userId);
      }

      // Filtrar por período
      if (filters?.period) {
        const now = new Date();
        let startDate;
        
        switch (filters.period) {
          case 'day':
            startDate = new Date(now.setDate(now.getDate() - 1));
            break;
          case 'week':
            startDate = new Date(now.setDate(now.getDate() - 7));
            break;
          case 'month':
            startDate = new Date(now.setMonth(now.getMonth() - 1));
            break;
        }
        
        if (startDate) {
          query = query.gte('session_start', startDate.toISOString());
        }
      }

      const { data, error } = await query;
      if (error) {
        logger.error('Error fetching session stats:', error);
        throw error;
      }

      const stats: SessionStats = {
        total_sessions: data?.length || 0,
        total_users: new Set(data?.map(log => log.user_id)).size || 0,
        average_duration: data?.reduce((acc, log) => acc + (log.duration_minutes || 0), 0) / (data?.length || 1) || 0,
        active_sessions: data?.filter(log => log.is_active).length || 0
      };

      setSessionStats(stats);
      logger.success('Session stats fetched successfully');
    } catch (error) {
      logger.error('Erro ao buscar estatísticas:', error);
    }
  };

  // Exportar relatório
  const exportReport = async (format: 'csv' | 'json', filters?: {
    userId?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    try {
      logger.info(`Exporting report in ${format} format`);
      
      let query = supabase
        .from('user_session_logs')
        .select('*')
        .order('session_start', { ascending: false });

      if (filters?.userId) {
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
        logger.error('Error exporting report:', error);
        throw error;
      }

      // Buscar informações dos usuários separadamente
      const userIds = Array.from(new Set(data?.map(log => log.user_id) || []));
      const { data: users } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      const userMap = new Map(users?.map(user => [user.id, user]) || []);

      if (format === 'csv') {
        const csv = [
          'Email,Nome,Início da Sessão,Fim da Sessão,Duração (min),Status',
          ...(data || []).map(log => {
            const user = userMap.get(log.user_id);
            return `${user?.email || ''},${user?.full_name || ''},${log.session_start},${log.session_end || ''},${log.duration_minutes || ''},${log.is_active ? 'Ativa' : 'Finalizada'}`;
          })
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-sessoes-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const enrichedData = data?.map(log => ({
          ...log,
          user_info: userMap.get(log.user_id)
        }));
        
        const json = JSON.stringify(enrichedData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio-sessoes-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
      
      logger.success('Report exported successfully');
    } catch (error) {
      logger.error('Erro ao exportar relatório:', error);
    }
  };

  // Atualizar automaticamente usuários online
  useEffect(() => {
    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 30000); // Atualizar a cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  // Gerenciar sessão baseado no estado de autenticação
  useEffect(() => {
    if (user && !currentSessionId && !localStorage.getItem('currentSessionId')) {
      startSession();
    } else if (!user && currentSessionId) {
      endSession();
    }
  }, [user]);

  // Finalizar sessão quando a janela é fechada
  useEffect(() => {
    const handleBeforeUnload = () => {
      const sessionId = currentSessionId || localStorage.getItem('currentSessionId');
      if (sessionId) {
        // Para navegadores modernos, usar navigator.sendBeacon se disponível
        if (navigator.sendBeacon) {
          const payload = JSON.stringify({ session_id: sessionId });
          navigator.sendBeacon('/api/end-session', payload);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentSessionId]);

  return {
    sessionLogs,
    onlineUsers,
    sessionStats,
    loading,
    currentSessionId,
    startSession,
    endSession,
    fetchSessionLogs,
    fetchOnlineUsers,
    fetchSessionStats,
    exportReport
  };
};
