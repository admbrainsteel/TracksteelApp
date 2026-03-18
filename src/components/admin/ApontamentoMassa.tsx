
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Database, Trash2 } from 'lucide-react';
import { CleanupDuplicatesModal } from './CleanupDuplicatesModal';

export const ApontamentoMassa: React.FC = () => {
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Gestão de Apontamentos em Massa</h2>
        <p className="text-muted-foreground">
          Ferramentas para análise e correção de inconsistências nos apontamentos de produção.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Limpeza de Duplicatas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Identifica e remove apontamentos duplicados ou em excesso por OF. 
              O sistema analisa peças que foram apontadas múltiplas vezes para o mesmo processo 
              e remove os registros mais recentes, mantendo apenas a quantidade correta.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <h4 className="font-medium text-yellow-800 mb-2">Como funciona:</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Agrupa apontamentos por OF + Marca + Fase + Processo</li>
                <li>• Identifica quando o total apontado excede a quantidade da peça</li>
                <li>• Remove apontamentos mais recentes, mantendo os mais antigos</li>
                <li>• Preserva a integridade dos dados de produção</li>
              </ul>
            </div>

            <Button 
              onClick={() => setIsCleanupModalOpen(true)}
              className="w-full flex items-center gap-2"
              variant="destructive"
            >
              <Trash2 className="w-4 h-4" />
              Analisar e Limpar Duplicatas
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-blue-500" />
              Outras Ferramentas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ferramentas adicionais para gestão de apontamentos em massa estarão disponíveis em breve.
            </p>
            
            <div className="space-y-2">
              <Button disabled className="w-full" variant="outline">
                Recalcular Totais por OF (Em breve)
              </Button>
              <Button disabled className="w-full" variant="outline">
                Validar Sequência de Processos (Em breve)
              </Button>
              <Button disabled className="w-full" variant="outline">
                Relatório de Inconsistências (Em breve)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <CleanupDuplicatesModal
        isOpen={isCleanupModalOpen}
        onClose={() => setIsCleanupModalOpen(false)}
      />
    </div>
  );
};
