
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const usePasswordReset = () => {
  const queryClient = useQueryClient();

  // Mutation para solicitar redefinição de senha
  const requestPasswordReset = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      console.log('🔄 Solicitando redefinição de senha para:', email);
      
      // Detectar o domínio atual e configurar URL de redirecionamento
      const currentHostname = window.location.hostname;
      let redirectUrl = '';
      
      if (currentHostname.includes('preview--tracksteel.lovable.app') || 
          currentHostname.includes('lovableproject.com') || 
          currentHostname.includes('lovable.app')) {
        // Ambiente de preview do Lovable
        redirectUrl = `${window.location.origin}/auth?type=recovery`;
      } else if (currentHostname.includes('tracksteel.com.br')) {
        // Domínio customizado
        redirectUrl = `https://app.tracksteel.com.br/auth?type=recovery`;
      } else {
        // Fallback para localhost ou outros casos
        redirectUrl = `${window.location.origin}/auth?type=recovery`;
      }
      
      console.log('📍 URL de redirecionamento configurada:', redirectUrl);
      
      // Enviar e-mail de redefinição usando o Supabase Auth
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        console.error('❌ Erro ao solicitar redefinição:', resetError);
        throw resetError;
      }

      console.log('✅ E-mail de redefinição enviado com sucesso para:', email);

      // Registrar a solicitação no banco de dados (opcional, não bloquear se falhar)
      try {
        const { error: insertError } = await supabase
          .from('password_reset_requests')
          .insert({
            email,
            user_id: null,
            ip_address: null,
            user_agent: navigator.userAgent,
          });

        if (insertError) {
          console.warn('⚠️ Falha ao registrar solicitação:', insertError);
        } else {
          console.log('📝 Solicitação registrada no banco de dados');
        }
      } catch (logError) {
        console.warn('⚠️ Erro no log da solicitação:', logError);
      }

      return { success: true };
    },
    onSuccess: () => {
      toast.success('E-mail de redefinição enviado com sucesso! Verifique sua caixa de entrada e clique no link recebido.');
      queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
    },
    onError: (error: any) => {
      console.error('❌ Erro na solicitação de redefinição:', error);
      
      // Tratamento específico de erros
      let errorMessage = 'Erro ao solicitar redefinição de senha. Tente novamente.';
      
      if (error.message?.includes('User not found')) {
        errorMessage = 'E-mail não encontrado no sistema. Verifique se o e-mail está correto.';
      } else if (error.message?.includes('rate limit') || error.message?.includes('Email rate limit exceeded')) {
        errorMessage = 'Muitas tentativas de redefinição. Aguarde alguns minutos antes de tentar novamente.';
      } else if (error.message?.includes('signup_disabled')) {
        errorMessage = 'Funcionalidade temporariamente indisponível. Contate o administrador.';
      } else if (error.message) {
        errorMessage = `Erro: ${error.message}`;
      }
      
      toast.error(errorMessage);
    },
  });

  return {
    requestPasswordReset: requestPasswordReset.mutate,
    isRequesting: requestPasswordReset.isPending,
  };
};
