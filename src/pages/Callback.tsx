import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BeamsBackground } from '@/components/ui/beams-background';
import { useAuth } from '@/hooks/useAuth';

const Callback = () => {
  const navigate = useNavigate();
  const { handleCallback, user, loading } = useAuth();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processando login...');

  useEffect(() => {
    let cancelled = false;

    async function processCallback() {
      try {
        const ok = await handleCallback();
        if (cancelled) return;

        if (ok) {
          setStatus('success');
          setMessage('Login realizado com sucesso!');
          setTimeout(() => navigate('/'), 1000);
        } else {
          setStatus('error');
          setMessage('Falha no login. Tente novamente.');
          // Não navega automaticamente - deixa o user ver o erro
        }
      } catch (err) {
        if (cancelled) return;
        setStatus('error');
        setMessage('Erro inesperado: ' + (err as Error).message);
        setTimeout(() => navigate('/auth'), 3000);
      }
    }

    processCallback();

    return () => {
      cancelled = true;
    };
  }, [handleCallback, navigate]);

  // Se já tá logado, redireciona
  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  return (
    <BeamsBackground intensity="medium">
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center bg-background/80 backdrop-blur-sm rounded-2xl shadow-xl p-8 max-w-md">
          {status === 'processing' && (
            <>
              <div className="h-12 w-12 mx-auto mb-4 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-lg font-medium text-foreground">{message}</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="mx-auto mb-4 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium text-foreground">{message}</p>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <p className="text-lg font-medium text-foreground">{message}</p>
            </>
          )}
        </div>
      </div>
    </BeamsBackground>
  );
};

export default Callback;