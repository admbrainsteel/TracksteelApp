
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, Shield } from 'lucide-react';
import { logger } from '@/utils/logger';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  isPermissionError: boolean;
}

// Função auxiliar para verificar erro de permissão (fora da classe)
const isPermissionRelatedError = (error: Error): boolean => {
  const errorMessage = error.message?.toLowerCase() || '';
  const errorStack = error.stack?.toLowerCase() || '';
  
  // Palavras-chave que indicam erro de permissão
  const permissionKeywords = [
    'permission', 'permissao', 'permissão',
    'access', 'acesso', 
    'unauthorized', 'não autorizado', 'nao autorizado',
    'forbidden', 'proibido',
    'privilege', 'privilegio', 'privilégio',
    'role', 'papel', 'função', 'funcao',
    'restricted', 'restrito', 'restricao', 'restrição'
  ];
  
  return permissionKeywords.some(keyword => 
    errorMessage.includes(keyword) || errorStack.includes(keyword)
  );
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      isPermissionError: false 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Verificar se é erro relacionado a permissões usando a função auxiliar
    const isPermissionError = isPermissionRelatedError(error);
    
    return { 
      hasError: true, 
      error,
      isPermissionError
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('Error caught by boundary', { error, errorInfo });
    
    const isPermissionError = isPermissionRelatedError(error);
    
    this.setState({
      error,
      errorInfo,
      isPermissionError
    });

    this.props.onError?.(error, errorInfo);
  }

  handleReload = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      isPermissionError: false 
    });
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
      isPermissionError: false 
    });
  };

  handleGoBack = () => {
    window.history.back();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Renderizar erro específico de permissão
      if (this.state.isPermissionError) {
        return (
          <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                  <Shield className="w-6 h-6 text-orange-600" />
                </div>
                <CardTitle className="text-xl">Acesso Restrito</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Você não tem permissão para acessar esta funcionalidade do sistema. 
                  Entre em contato com o administrador para solicitar as permissões necessárias.
                </p>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <p className="text-sm text-orange-800">
                    <strong>Possíveis soluções:</strong>
                  </p>
                  <ul className="text-sm text-orange-700 mt-1 space-y-1">
                    <li>• Solicite acesso ao administrador do sistema</li>
                    <li>• Verifique se você está logado com a conta correta</li>
                    <li>• Aguarde a aprovação das suas permissões</li>
                  </ul>
                </div>

                <div className="flex gap-2 justify-center">
                  <Button variant="outline" onClick={this.handleGoBack}>
                    Voltar
                  </Button>
                  <Button onClick={this.handleReload} className="gap-2">
                    <RefreshCw className="w-4 h-4" />
                    Tentar novamente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      }

      // Renderizar erro genérico
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <CardTitle className="text-xl">Algo deu errado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Ocorreu um erro inesperado. Tente novamente ou recarregue a página.
              </p>
              
              {import.meta.env.DEV && this.state.error && (
                <details className="mt-4 p-3 bg-red-50 rounded border text-sm">
                  <summary className="cursor-pointer font-medium text-red-800">
                    Detalhes do erro (desenvolvimento)
                  </summary>
                  <pre className="mt-2 text-xs text-red-700 whitespace-pre-wrap">
                    {this.state.error.message}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}

              <div className="flex gap-2 justify-center">
                <Button variant="outline" onClick={this.handleRetry}>
                  Tentar novamente
                </Button>
                <Button onClick={this.handleReload} className="gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Recarregar página
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook para usar com componentes funcionais
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};
