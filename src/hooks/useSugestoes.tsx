
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

export interface Sugestao {
  id: string;
  created_at: string;
  sugestao: string;
  user_id: string;
  user_name: string;
  status: 'Pendente' | 'Implementada' | 'Rejeitada';
  developer_notes: string | null;
  archived_at: string | null;
  archived_by: string | null;
}

export interface SugestaoNotification {
  id: string;
  user_id: string;
  sugestao_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const useSugestoes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar sugestões não arquivadas
  const { data: sugestoes = [], isLoading, error } = useQuery({
    queryKey: ['sugestoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sugestoes')
        .select('*')
        .is('archived_at', null)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Sugestao[];
    },
  });

  // Buscar sugestões arquivadas
  const { data: sugestoesArquivadas = [], isLoading: isLoadingArchived } = useQuery({
    queryKey: ['sugestoes-arquivadas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sugestoes')
        .select('*')
        .not('archived_at', 'is', null)
        .order('archived_at', { ascending: false });
      
      if (error) throw error;
      return data as Sugestao[];
    },
  });

  // Buscar notificações do usuário
  const { data: notifications = [] } = useQuery({
    queryKey: ['sugestao-notifications'],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('sugestao_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as SugestaoNotification[];
    },
    enabled: !!user,
  });

  // Mutation para criar nova sugestão
  const createSugestaeMutation = useMutation({
    mutationFn: async (sugestao: string) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('sugestoes')
        .insert({
          sugestao,
          user_id: user.id,
          user_name: user.user_metadata?.full_name || user.email || 'Usuário'
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sugestoes'] });
      toast.success('Sugestão enviada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao enviar sugestão:', error);
      toast.error('Erro ao enviar sugestão');
    },
  });

  // Mutation para atualizar status da sugestão (admin only)
  const updateSugestaoMutation = useMutation({
    mutationFn: async ({ id, status, developer_notes }: { 
      id: string; 
      status: string; 
      developer_notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('sugestoes')
        .update({ status, developer_notes })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sugestoes'] });
      queryClient.invalidateQueries({ queryKey: ['sugestoes-arquivadas'] });
      queryClient.invalidateQueries({ queryKey: ['sugestao-notifications'] });
      toast.success('Sugestão atualizada com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar sugestão:', error);
      toast.error('Erro ao atualizar sugestão');
    },
  });

  // Mutation para marcar notificação como lida
  const markNotificationAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('sugestao_notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sugestao-notifications'] });
    },
  });

  const createSugestao = (sugestao: string) => {
    createSugestaeMutation.mutate(sugestao);
  };

  const updateSugestao = (id: string, status: string, developer_notes?: string) => {
    updateSugestaoMutation.mutate({ id, status, developer_notes });
  };

  const markNotificationAsRead = (notificationId: string) => {
    markNotificationAsReadMutation.mutate(notificationId);
  };

  return {
    sugestoes,
    sugestoesArquivadas,
    notifications,
    loading: isLoading,
    loadingArchived: isLoadingArchived,
    error,
    createSugestao,
    updateSugestao,
    markNotificationAsRead,
    isCreating: createSugestaeMutation.isPending,
    isUpdating: updateSugestaoMutation.isPending,
  };
};
