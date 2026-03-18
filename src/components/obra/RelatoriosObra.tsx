
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar, TrendingUp } from 'lucide-react';

export const RelatoriosObra: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Relatórios de Obra</h2>
        <p className="text-sm text-muted-foreground">Gere relatórios consolidados dos RDOs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Relatório Diário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Gere um resumo do RDO diário em formato PDF com fotos e informações consolidadas.
            </p>
            <Button className="w-full flex items-center gap-2">
              <Download className="w-4 h-4" />
              Gerar Relatório Diário
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Relatório Semanal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Consolidado semanal com total de peças montadas, horas trabalhadas e motivos de parada.
            </p>
            <Button className="w-full flex items-center gap-2">
              <Download className="w-4 h-4" />
              Gerar Relatório Semanal
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Relatório Mensal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Relatório mensal com gráficos de progresso, análise de produtividade e indicadores.
            </p>
            <Button className="w-full flex items-center gap-2">
              <Download className="w-4 h-4" />
              Gerar Relatório Mensal
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Relatório Customizado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure um relatório personalizado com período e filtros específicos.
            </p>
            <Button className="w-full flex items-center gap-2">
              <Download className="w-4 h-4" />
              Configurar Relatório
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <TrendingUp className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-card-foreground mb-2">Relatórios em Desenvolvimento</h3>
          <p className="text-muted-foreground max-w-md">
            Os relatórios estão sendo desenvolvidos e estarão disponíveis em breve com funcionalidades completas de exportação e compartilhamento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
