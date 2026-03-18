
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissionControl } from '@/hooks/usePermissionControl';

const Cadastro = () => {
  const { canView } = usePermissionControl();

  // Verificar se pode acessar esta página
  if (!canView()) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-6xl">🔒</div>
          <h2 className="text-2xl font-semibold text-muted-foreground">
            Acesso Negado
          </h2>
          <p className="text-muted-foreground max-w-md">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Cadastro</h1>
        <p className="text-slate-400">Sistema de cadastros e registros</p>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Opções de Cadastro</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Selecione uma opção de cadastro.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Cadastro;
