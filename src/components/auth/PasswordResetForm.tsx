
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Eye, EyeOff, Lock } from 'lucide-react';

export const PasswordResetForm = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { updatePassword } = useAuth();
  const navigate = useNavigate();

  // Password strength validation
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

  const passwordStrength = validatePassword(password);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error('Por favor, preencha todos os campos');
      return;
    }

    if (!passwordStrength.isValid) {
      toast.error('A senha deve ter pelo menos 8 caracteres e incluir maiúsculas, minúsculas, números e símbolos');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('🔄 Iniciando redefinição de senha...');
      const { error } = await updatePassword(password);

      if (error) {
        console.error('❌ Erro ao redefinir senha:', error);
        
        // Tratamento específico de erros
        let errorMessage = 'Erro ao redefinir senha. Tente novamente.';
        
        if (error.message?.includes('session_not_found')) {
          errorMessage = 'Sessão expirada. Solicite um novo link de redefinição.';
        } else if (error.message?.includes('same_password')) {
          errorMessage = 'A nova senha deve ser diferente da anterior.';
        } else if (error.message?.includes('password_invalid')) {
          errorMessage = 'Senha inválida. Verifique os critérios de segurança.';
        } else if (error.message) {
          errorMessage = `Erro: ${error.message}`;
        }
        
        toast.error(errorMessage);
      } else {
        console.log('✅ Senha redefinida com sucesso!');
        toast.success('Senha redefinida com sucesso! Redirecionando...');
        
        // Aguardar um pouco antes de redirecionar para mostrar a mensagem
        setTimeout(() => {
          navigate('/');
        }, 1500);
      }
    } catch (error) {
      console.error('❌ Erro inesperado:', error);
      toast.error('Erro inesperado ao redefinir senha. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-xl border-0 bg-background/80 backdrop-blur-sm w-full max-w-md">
      <CardHeader className="space-y-1 pb-4">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl text-center">Redefinir Senha</CardTitle>
        <CardDescription className="text-center">
          Digite sua nova senha abaixo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-sm font-medium">
              Nova Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 8 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            {password && (
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
            <Label htmlFor="confirm-password" className="text-sm font-medium">
              Confirmar Nova Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirm-password"
                type={showPassword ? "text" : "password"}
                placeholder="Confirme sua nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
            {isLoading ? 'Redefinindo...' : 'Redefinir Senha'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
