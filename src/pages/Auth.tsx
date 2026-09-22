import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBrandSettings } from '@/hooks/useBrandSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeToggle } from '@/components/ThemeToggle';
import { BeamsBackground } from '@/components/ui/beams-background';
import { ForgotPasswordModal } from '@/components/auth/ForgotPasswordModal';
import { PasswordResetForm } from '@/components/auth/PasswordResetForm';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';

const Auth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user, loading, isRecoveryFlow } = useAuth();
  const { brandSettings } = useBrandSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const recoveryType = searchParams.get('type');
  const hashParams = new URLSearchParams(location.hash.substring(1));
  const hashType = hashParams.get('type');
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  
  const shouldShowReset = Boolean(
    recoveryType === 'recovery' || 
    hashType === 'recovery' || 
    isRecoveryFlow || 
    (accessToken && refreshToken)
  );

  // Estado para controlar se está em modo de recuperação
  const [showPasswordReset, setShowPasswordReset] = useState(shouldShowReset);

  useEffect(() => {
    if (shouldShowReset !== showPasswordReset) {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      setShowPasswordReset(shouldShowReset);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShowReset, showPasswordReset, loading, location.pathname]);

  // Redirecionar usuários autenticados para página principal ou Modo Smart
  useEffect(() => {
    if (!loading && user && !showPasswordReset) {
      const isSmartMode = localStorage.getItem('tracksteel_app_mode') === 'smart';
      console.log('🔄 Redirecionando usuário autenticado:', isSmartMode ? '/smart' : '/');
      if (isSmartMode) {
        navigate('/smart');
      } else {
        navigate('/');
      }
    }
  }, [user, loading, navigate, showPasswordReset]);

  // Mostrar formulário de redefinição de senha se em modo de recuperação
  if (!loading && showPasswordReset) {
    console.log('🔐 Exibindo formulário de redefinição de senha');
    return (
      <BeamsBackground intensity="medium">
        <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300">
          <div className="absolute top-4 right-4">
            <ThemeToggle />
          </div>
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              {brandSettings?.logo_url && (
                <div className="flex justify-center mb-4">
                  <img
                    src={brandSettings.logo_url}
                    alt="Logo da empresa"
                    className="h-16 w-auto object-contain"
                  />
                </div>
              )}
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {brandSettings?.company_name || 'BSystem'}
              </h1>
              <p className="text-sm text-muted-foreground mb-4">
                Defina sua nova senha
              </p>
            </div>
            <PasswordResetForm />
            <div className="text-center mt-6">
              <button
                onClick={() => {
                  setShowPasswordReset(false);
                  window.history.replaceState({}, '', '/auth');
                }}
                className="text-sm text-muted-foreground hover:text-foreground underline"
              >
                Voltar ao login
              </button>
            </div>
            <p className="text-center text-sm text-muted-foreground mt-4 italic">
              Desenvolvido por TrackSteel
            </p>
          </div>
        </div>
      </BeamsBackground>
    );
  }

  // Mostrar estado de carregamento
  if (loading) {
    console.log('⏳ Exibindo estado de carregamento');
    return (
      <BeamsBackground intensity="medium">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </BeamsBackground>
    );
  }

  const handleLogin = async () => {
    setIsLoading(true);
    const { error } = await signIn();
    
    if (error) {
      toast.error('Erro ao redirecionar para o login: ' + (error as Error).message);
      setIsLoading(false);
    }
    // No else block needed as it redirects to external OIDC provider
  };



  console.log('📱 Renderizando página de login/cadastro');
  return (
    <BeamsBackground intensity="medium">
      <div className="min-h-screen flex items-center justify-center p-4 transition-colors duration-300">
        {/* Theme Toggle Button */}
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          {/* Logo and Company Name */}
          <div className="text-center mb-8">
            {brandSettings?.logo_url && (
              <div className="flex justify-center mb-4">
                <img
                  src={brandSettings.logo_url}
                  alt="Logo da empresa"
                  className="h-16 w-auto object-contain"
                />
              </div>
            )}
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Bem-vindo ao {brandSettings?.company_name || 'BSystem'}
            </h1>
            <p className="text-muted-foreground">Entre em sua conta ou crie uma nova</p>
          </div>

          <Card className="shadow-xl border-0 bg-background/80 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex justify-center mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Lock className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <Button
                onClick={handleLogin}
                className="w-full h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium text-lg rounded-xl transition-all hover:scale-[1.02] shadow-md"
                disabled={isLoading}
              >
                {isLoading ? 'Redirecionando...' : 'Acessar Sistema Seguramente'}
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6 italic">
            Desenvolvido por TrackSteel
          </p>
        </div>
      </div>
    </BeamsBackground>
  );
};

export default Auth;
