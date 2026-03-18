import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Square, 
  Circle, 
  Triangle,
  ArrowRight,
  MoreHorizontal
} from 'lucide-react';

export function SystemMapLegend() {
  return (
    <Card className="w-64 bg-background/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Legenda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tipos de Nodes */}
        <div>
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Tipos de Módulos</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Square className="w-4 h-4 text-primary" />
              <span>Módulos do Sistema</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Circle className="w-4 h-4 text-muted-foreground" />
              <span>Entidades de Dados</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Triangle className="w-4 h-4 text-green-500" />
              <span>Pontos de Processo</span>
            </div>
          </div>
        </div>

        {/* Tipos de Conexões */}
        <div>
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Conexões</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <ArrowRight className="w-4 h-4 text-primary" />
              <span>Fluxo Principal</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
              <span>Relação de Dados</span>
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <h4 className="text-xs font-semibold mb-2 text-muted-foreground">Status</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="default" className="h-4 text-xs px-1">Ativo</Badge>
              <span>Com acesso</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="destructive" className="h-4 text-xs px-1">Sem Acesso</Badge>
              <span>Restrito</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="secondary" className="h-4 text-xs px-1">Recente</Badge>
              <span>Usado recentemente</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}