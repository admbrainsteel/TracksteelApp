import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface DataEntityNodeData {
  title: string;
  icon: React.ComponentType<any>;
  description: string;
  color: string;
  count: number;
  isMainFlow: boolean;
}

export function DataEntityNode({ data }: NodeProps<any>) {
  const Icon = data.icon;
  
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-border"
      />
      
      <Card 
        className={`
          w-32 transition-all duration-300
          ${data.isMainFlow ? 'ring-1 ring-primary/20' : ''}
          bg-muted/30
        `}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-medium text-xs">{data.title}</h4>
          </div>
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              {data.description}
            </p>
            <Badge variant="outline" className="text-xs">
              {data.count} registros
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 bg-border"
      />
    </div>
  );
}