
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Database, Package, Info, Activity } from 'lucide-react';
import { useDatabaseUsage } from '@/hooks/useDatabaseUsage';

const Sistema = () => {
  const {
    databaseInfo,
    loading,
    error
  } = useDatabaseUsage();

  // Versão extraída do package.json
  const version = "1.0.0";

  // Simulação de dados de ocupação (em produção seria calculado com base no plano)
  const calculateUsagePercentage = (sizeString: string) => {
    if (!sizeString) return 0;

    // Extrai o número da string (ex: "2048 kB" -> 2048)
    const match = sizeString.match(/(\d+(?:\.\d+)?)\s*(\w+)/);
    if (!match) return 0;
    const size = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    // Converte para MB
    let sizeInMB = size;
    if (unit === 'kb') sizeInMB = size / 1024;
    else if (unit === 'gb') sizeInMB = size * 1024;
    else if (unit === 'tb') sizeInMB = size * 1024 * 1024;

    // Assume limite de 500MB para o plano gratuito
    const limitMB = 500;
    return Math.min(sizeInMB / limitMB * 100, 100);
  };

  const usagePercentage = databaseInfo ? calculateUsagePercentage(databaseInfo.database_size) : 0;

  return (
    <div className="container mx-auto p-4 space-y-6 bg-background min-h-screen">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">Painel do Sistema</h1>
        <Badge variant="outline" className="text-sm bg-card text-card-foreground border-border">
          Versão {version}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Informações da Versão */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Versão do Sistema
            </CardTitle>
            <Info className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-card-foreground">{version}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </CardContent>
        </Card>

        {/* Uso do Banco de Dados */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Uso do Banco de Dados
            </CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : error ? (
              <div className="text-sm text-destructive">Erro ao carregar dados</div>
            ) : (
              <div className="space-y-3">
                <div className="text-2xl font-bold text-card-foreground">
                  {databaseInfo?.database_size || 'N/A'}
                </div>
                <Progress value={usagePercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {usagePercentage.toFixed(1)}% utilizado
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Número de Tabelas */}
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-card-foreground">
              Tabelas do Sistema
            </CardTitle>
            <Package className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Carregando...</div>
            ) : error ? (
              <div className="text-sm text-destructive">Erro ao carregar dados</div>
            ) : (
              <div>
                <div className="text-2xl font-bold text-card-foreground">
                  {databaseInfo?.table_count || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tabelas ativas
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Status do Sistema */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Status do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
              <span className="text-card-foreground">Banco de Dados</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-400">
                Ativo
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
              <span className="text-card-foreground">Autenticação</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-400">
                Ativo
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border">
              <span className="text-card-foreground">Storage</span>
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-400">
                Ativo
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Sistema;
