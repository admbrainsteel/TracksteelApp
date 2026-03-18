import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Users, Activity } from 'lucide-react';

interface SystemModuleNodeData {
  title: string;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
  stats: {
    active: boolean;
    count: number;
  };
  url?: string;
  hasAccess: boolean;
  isMainFlow: boolean;
  recentlyUsed: boolean;
}

export function SystemModuleNode({ data }: NodeProps<any>) {
  const Icon = data.icon;
  
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-border"
      />
      
      <Card 
        className={`
          w-48 cursor-pointer transition-all duration-300 hover:shadow-lg
          ${data.hasAccess ? 'hover:scale-105' : 'opacity-60'}
          ${data.isMainFlow ? 'ring-2 ring-primary/30' : ''}
          ${data.recentlyUsed ? 'bg-accent/5' : ''}
        `}
        style={{ borderColor: data.color }}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${data.color}20` }}
            >
              <Icon 
                className="w-5 h-5" 
                style={{ color: data.color }}
              />
            </div>
            
            <div className="flex flex-col gap-1">
              {data.recentlyUsed && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  <Activity className="w-3 h-3 mr-1" />
                  Recente
                </Badge>
              )}
              {data.url && data.hasAccess && (
                <ExternalLink className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-semibold text-sm leading-tight">
              {data.title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {data.description}
            </p>
            
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                {data.stats.count}
              </div>
              
              <Badge 
                variant={data.stats.active ? "default" : "secondary"}
                className="text-xs"
                style={data.stats.active ? { backgroundColor: data.color } : {}}
              >
                {data.stats.active ? 'Ativo' : 'Inativo'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-border"
      />
      
      {!data.hasAccess && (
        <div className="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center">
          <Badge variant="destructive" className="text-xs">
            Sem Acesso
          </Badge>
        </div>
      )}
    </div>
  );
}