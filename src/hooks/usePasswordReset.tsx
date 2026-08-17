// Password reset usando Logto (substitui supabase.auth.resetPasswordForEmail)
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { requestPasswordReset as logtoRequestPasswordReset } from '@/lib/logto/client';
import { toast } from 'sonner';

export const usePasswordReset = () => {
  const queryClient = useQueryClient();

  const requestPasswordReset = useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      console.log('🔄 [Logto] Solicitando redefinição de senha para:', email);

      const result = await logtoRequestPasswordReset(email);
      if (!result.ok) {
        throw new Error(result.error || 'Falha ao solicitar reset');
      }

      console.log('✅ [Logto] E-mail de redefinição processado para:', email);
      return { success: true };
    },
    onSuccess: () => {
      toast.success(
        'Se o e-mail estiver cadastrado, você receberá um link para redefinir sua senha em alguns minutos.'
      );
      queryClient.invalidateQueries({ queryKey: ['password-reset-requests'] });
    },
    onError: (error: Error) => {
      console.error('❌ Erro ao solicitar reset:', error);
      // Não revela se o email existe (segurança)
      toast.error(
        'Não foi possível enviar o e-mail. Tente novamente em alguns minutos.'
      );
    },
  });

  return {
    requestPasswordReset: requestPasswordReset.mutate,
    isRequesting: requestPasswordReset.isPending,
  };
};