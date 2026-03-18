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
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ email: '', password: '', confirmPassword: '' });
  const { signIn, signUp, user, loading, isRecoveryFlow, session } = useAuth();
  const { brandSettings } = useBrandSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Estado para controlar se está em modo de recuperação
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  useEffect(() => {
    console.log('🔍 Auth.tsx - Verificando fluxo de recuperação...');
    console.log('Location:', {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash
    });
    console.log('Auth states:', {
      user: !!user,
      session: !!session,
      isRecoveryFlow,
      loading
    });
    
    // Verificar se é fluxo de recuperação
    const recoveryType = searchParams.get('type');
    const hashParams = new URLSearchParams(location.hash.substring(1));
    const hashType = hashParams.get('type');
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    
    console.log('🔍 Parâmetros de recuperação:', { 
      recoveryType, 
      hashType, 
      accessToken: !!accessToken, 
      refreshToken: !!refreshToken,
      isRecoveryFlow
    });
    
    // Se há type=recovery OU isRecoveryFlow OU tokens, mostrar tela de reset
    const shouldShowReset = recoveryType === 'recovery' || 
                           hashType === 'recovery' || 
                           isRecoveryFlow || 
                           (accessToken && refreshToken);
    
    console.log('🔑 Deve mostrar reset de senha:', shouldShowReset);
    setShowPasswordReset(Boolean(shouldShowReset));
  }, [searchParams, location.hash, location.search, isRecoveryFlow, user, session]);

  // Redirecionar usuários autenticados para página principal (exceto em fluxo de recuperação)
  useEffect(() => {
    if (!loading && user && !showPasswordReset) {
      console.log('🔄 Redirecionando usuário autenticado para página principal');
      navigate('/');
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

  const validatePassword = (password: string) => {
    const minLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const score = [minLength, hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
    
    return {
      score,
      minLength,
      hasUpperCase,
      hasLowerCase,
      hasNumbers,
      hasSpecialChar,
      isValid: score >= 4 && minLength
    };
  };

  const passwordStrength = validatePassword(signupData.password);

  // Email validation
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginData.email || !loginData.password) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    if (!isValidEmail(loginData.email)) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    setIsLoading(true);
    const { error } = await signIn(loginData.email, loginData.password);
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Email ou senha incorretos');
      } else {
        toast.error('Erro ao fazer login: ' + error.message);
      }
    } else {
      toast.success('Login realizado com sucesso!');
      navigate('/');
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupData.email || !signupData.password || !signupData.confirmPassword) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    if (!isValidEmail(signupData.email)) {
      toast.error('Por favor, insira um email válido');
      return;
    }

    if (!passwordStrength.isValid) {
      toast.error('A senha deve ter pelo menos 8 caracteres e incluir maiúsculas, minúsculas, números e símbolos');
      return;
    }

    if (signupData.password !== signupData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsLoading(true);
    const { error } = await signUp(signupData.email, signupData.password);
    
    if (error) {
      if (error.message.includes('User already registered')) {
        toast.error('Este email já está cadastrado');
      } else {
        toast.error('Erro ao criar conta: ' + error.message);
      }
    } else {
      toast.success('Conta criada com sucesso! Verifique seu email.');
    }
    setIsLoading(false);
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score <= 2) return 'bg-red-500';
    if (score <= 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getPasswordStrengthText = (score: number) => {
    if (score <= 2) return 'Fraca';
    if (score <= 3) return 'Média';
    return 'Forte';
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
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" className="text-sm">Entrar</TabsTrigger>
                  <TabsTrigger value="signup" className="text-sm">Cadastrar</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={loginData.email}
                          onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                          className="pl-10 h-12"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium">
                        Senha
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="login-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Sua senha"
                          value={loginData.password}
                          onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                          className="pl-10 pr-10 h-12"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium text-sm"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Entrando...' : 'Entrar'}
                    </Button>

                    {/* Botão Esqueci a Senha */}
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(true)}
                        className="text-sm text-muted-foreground hover:text-foreground underline"
                        disabled={isLoading}
                      >
                        Esqueci a senha
                      </button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="seu@email.com"
                          value={signupData.email}
                          onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                          className="pl-10 h-12"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium">
                        Senha
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Mínimo 8 caracteres"
                          value={signupData.password}
                          onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                          className="pl-10 pr-10 h-12"
                          disabled={isLoading}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      
                      {/* Password Strength Indicator */}
                      {signupData.password && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full transition-all duration-300 ${getPasswordStrengthColor(passwordStrength.score)}`}
                                style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {getPasswordStrengthText(passwordStrength.score)}
                            </span>
                          </div>
                          <div className="text-xs space-y-1">
                            <div className={`flex items-center gap-1 ${passwordStrength.minLength ? 'text-green-600' : 'text-red-600'}`}>
                              <span className="w-2 h-2 rounded-full bg-current"></span>
                              Mínimo 8 caracteres
                            </div>
                            <div className={`flex items-center gap-1 ${passwordStrength.hasUpperCase ? 'text-green-600' : 'text-red-600'}`}>
                              <span className="w-2 h-2 rounded-full bg-current"></span>
                              Letra maiúscula
                            </div>
                            <div className={`flex items-center gap-1 ${passwordStrength.hasNumbers ? 'text-green-600' : 'text-red-600'}`}>
                              <span className="w-2 h-2 rounded-full bg-current"></span>
                              Número
                            </div>
                            <div className={`flex items-center gap-1 ${passwordStrength.hasSpecialChar ? 'text-green-600' : 'text-red-600'}`}>
                              <span className="w-2 h-2 rounded-full bg-current"></span>
                              Símbolo especial
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm" className="text-sm font-medium">
                        Confirmar Senha
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="signup-confirm"
                          type={showPassword ? "text" : "password"}
                          placeholder="Confirme sua senha"
                          value={signupData.confirmPassword}
                          onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                          className="pl-10 h-12"
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium text-sm"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Criando conta...' : 'Criar conta'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground mt-6 italic">
            Desenvolvido por TrackSteel
          </p>
        </div>
      </div>

      {/* Modal Esqueci a Senha */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </BeamsBackground>
  );
};

export default Auth;
