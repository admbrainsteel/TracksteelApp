import React, { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  ConnectionMode,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { SystemModuleNode } from './nodes/SystemModuleNode';
import { DataEntityNode } from './nodes/DataEntityNode';
import { ProcessFlowNode } from './nodes/ProcessFlowNode';
import { useSystemMapData } from './hooks/useSystemMapData';
import { SystemMapFilters } from './SystemMapFilters';
import { SystemMapLegend } from './SystemMapLegend';
import { SystemMapTour } from './SystemMapTour';

const nodeTypes = {
  module: SystemModuleNode,
  entity: DataEntityNode,
  process: ProcessFlowNode,
};

export function MapaInterativoFlow() {
  const { nodes: initialNodes, edges: initialEdges } = useSystemMapData();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [filteredView, setFilteredView] = React.useState<string>('all');
  const [showTour, setShowTour] = React.useState(false);

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (node.data.url) {
      window.open(node.data.url as string, '_blank');
    }
  }, []);

  const filteredNodes = useMemo(() => {
    if (filteredView === 'all') return nodes;
    
    return nodes.filter(node => {
      if (filteredView === 'permissions') {
        return node.data.hasAccess !== false;
      }
      if (filteredView === 'main-flow') {
        return node.data.isMainFlow;
      }
      if (filteredView === 'recent') {
        return node.data.recentlyUsed;
      }
      return true;
    });
  }, [nodes, filteredView]);

  const filteredEdges = useMemo(() => {
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    return edges.filter(edge => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );
  }, [edges, filteredNodes]);

  return (
    <div className="w-full h-full relative bg-background">
      {/* Controles superiores */}
      <div className="absolute top-4 left-4 z-10 flex gap-4">
        <SystemMapFilters 
          currentFilter={filteredView}
          onFilterChange={setFilteredView}
        />
        <button
          onClick={() => setShowTour(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Tour Guiado
        </button>
      </div>

      {/* Legenda */}
      <div className="absolute top-4 right-4 z-10">
        <SystemMapLegend />
      </div>

      {/* React Flow */}
      <ReactFlow
        nodes={filteredNodes}
        edges={filteredEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        className="system-map-flow"
        proOptions={{ hideAttribution: true }}
      >
        <Background 
          color="hsl(var(--muted-foreground))" 
          size={1} 
          gap={20}
        />
        <Controls 
          className="bg-card border border-border"
          showInteractive={false}
        />
        <MiniMap 
          className="bg-card border border-border"
          nodeColor="hsl(var(--primary))"
          maskColor="hsl(var(--background) / 0.8)"
        />
      </ReactFlow>

      {/* Tour Modal */}
      {showTour && (
        <SystemMapTour onClose={() => setShowTour(false)} />
      )}

      <style>{`
        .system-map-flow .react-flow__node {
          font-family: inherit;
        }
        .system-map-flow .react-flow__edge-path {
          stroke: hsl(var(--border));
          stroke-width: 2;
        }
        .system-map-flow .react-flow__edge.animated .react-flow__edge-path {
          stroke-dasharray: 5;
          animation: dashdraw 0.5s linear infinite;
        }
        @keyframes dashdraw {
          to {
            stroke-dashoffset: -10;
          }
        }
      `}</style>
    </div>
  );
}