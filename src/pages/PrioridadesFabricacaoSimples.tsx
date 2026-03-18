import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const PrioridadesFabricacaoSimples = () => {
  console.log('🎯 PrioridadesFabricacaoSimples carregando...');
  
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <CheckCircle className="h-8 w-8 text-green-500" />
        <div>
          <h1 className="text-3xl font-bold text-foreground">Prioridades de Fabricação</h1>
          <p className="text-muted-foreground">
            Componente carregado com sucesso! 
          </p>
        </div>
      </div>

      <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
        <CardHeader>
          <CardTitle className="text-green-800 dark:text-green-200">
            ✅ Status do Componente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-green-700 dark:text-green-300">
            <p>• Rota funcionando: /producao/prioridades</p>
            <p>• Componente renderizando sem erros</p>
            <p>• Layout aplicado corretamente</p>
            <p>• Usuário autenticado com sucesso</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PrioridadesFabricacaoSimples;