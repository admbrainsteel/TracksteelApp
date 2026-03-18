import React from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Play } from 'lucide-react';

interface ProcessFlowNodeData {
  title: string;
  description: string;
  color: string;
  isMainFlow: boolean;
}

export function ProcessFlowNode({ data }: NodeProps<any>) {
  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 bg-border"
      />
      
      <Card 
        className="w-28 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30"
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-1">
            <div 
              className="p-1 rounded-full"
              style={{ backgroundColor: data.color }}
            >
              <Play className="w-3 h-3 text-white" />
            </div>
            <h4 className="font-semibold text-xs">{data.title}</h4>
          </div>
          
          <p className="text-xs text-muted-foreground">
            {data.description}
          </p>
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