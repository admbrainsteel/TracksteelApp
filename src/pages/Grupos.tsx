
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Grupos = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Grupos e Equipe</h1>
        <p className="text-slate-400">Gerenciamento de grupos e membros da equipe</p>
      </div>

      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Grupos Ativos</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-400">Nenhum grupo encontrado.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Grupos;
