import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  X, 
  Filter, 
  Eye, 
  Workflow, 
  Shield,
  RotateCcw,
  Edit,
  Save
} from 'lucide-react';
import { useSystemMapAutoDiscovery, SystemMapNode, SystemMapConnection } from '@/hooks/useSystemMapAutoDiscovery';
import { useUserRole } from '@/hooks/useUserRole';
import { UserResourcePermissions } from '@/components/mapa-interativo/UserResourcePermissions';
import { cn } from '@/lib/utils';

const createCurvedPath = (fromX: number, fromY: number, toX: number, toY: number) => {
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  const curvature = Math.min(distance * 0.3, 100);
  const offsetX = -dy / distance * curvature;
  const offsetY = dx / distance * curvature;
  
  const controlX = midX + offsetX;
  const controlY = midY + offsetY;
  
  return `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`;
};

const getArrowPositions = (fromX: number, fromY: number, toX: number, toY: number) => {
  const arrows = [];
  const steps = 3; // Número de setas ao longo da linha
  
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    
    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const curvature = Math.min(distance * 0.3, 100);
    const offsetX = -dy / distance * curvature;
    const offsetY = dx / distance * curvature;
    const controlX = midX + offsetX;
    const controlY = midY + offsetY;
    
    const x = (1 - t) * (1 - t) * fromX + 2 * (1 - t) * t * controlX + t * t * toX;
    const y = (1 - t) * (1 - t) * fromY + 2 * (1 - t) * t * controlY + t * t * toY;
    
    const tangentX = 2 * (1 - t) * (controlX - fromX) + 2 * t * (toX - controlX);
    const tangentY = 2 * (1 - t) * (controlY - fromY) + 2 * t * (toY - controlY);
    const angle = Math.atan2(tangentY, tangentX) * 180 / Math.PI;
    
    arrows.push({ x, y, angle });
  }
  
  return arrows;
};

export default function MapaInterativo() {
  const { nodes, connections } = useSystemMapAutoDiscovery();
  const { isAdmin } = useUserRole();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedNode, setSelectedNode] = useState<SystemMapNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [highlightedPath, setHighlightedPath] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<{ title: string; description: string; group: string }>({ title: '', description: '', group: '' });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const filters = [
    { id: 'all', label: 'Ver Tudo', icon: Eye },
    { id: 'main-flow', label: 'Fluxo Principal', icon: Workflow },
    { id: 'permissions', label: 'Meus Acessos', icon: Shield }
  ];

  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      switch (activeFilter) {
        case 'main-flow': return node.isMainFlow;
        case 'permissions': return node.hasAccess;
        default: return true;
      }
    });
  }, [nodes, activeFilter]);

  const filteredConnections = useMemo(() => {
    return connections.filter(conn => {
      const sourceExists = filteredNodes.some(n => n.id === conn.from);
      const targetExists = filteredNodes.some(n => n.id === conn.to);
      return sourceExists && targetExists;
    });
  }, [connections, filteredNodes]);

  const getMapDimensions = useCallback(() => {
    if (filteredNodes.length === 0) return { width: 1200, height: 800 };
    
    const cardWidth = 240;
    const cardHeight = 140;
    const padding = 100; // Padding extra para garantir espaço
    
    let maxX = 0;
    let maxY = 0;
    
    filteredNodes.forEach(node => {
      const nodeEl = mapContainerRef.current?.querySelector(`[data-node="${node.id}"]`) as HTMLElement;
      if (nodeEl) {
        const rect = nodeEl.getBoundingClientRect();
        const containerRect = mapContainerRef.current!.getBoundingClientRect();
        maxX = Math.max(maxX, rect.left - containerRect.left + cardWidth);
        maxY = Math.max(maxY, rect.top - containerRect.top + cardHeight);
      } else {
        // Usar posições iniciais se o elemento ainda não foi renderizado
        maxX = Math.max(maxX, node.left + cardWidth);
        maxY = Math.max(maxY, node.top + cardHeight);
      }
    });
    
    return {
      width: Math.max(1200, maxX + padding),
      height: Math.max(800, maxY + padding)
    };
  }, [filteredNodes]);

  const [mapDimensions, setMapDimensions] = useState({ width: 1200, height: 800 });

  useEffect(() => {
    const updateDimensions = () => {
      setMapDimensions(prev => {
        const next = getMapDimensions();
        if (prev.width === next.width && prev.height === next.height) {
          return prev;
        }
        return next;
      });
    };
    
    updateDimensions();
    const interval = setInterval(updateDimensions, 1000); // Atualizar periodicamente
    
    return () => clearInterval(interval);
  }, [getMapDimensions]);



  const updateConnections = useCallback(() => {
    if (!mapContainerRef.current) return;
    
    const container = mapContainerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    filteredConnections.forEach(conn => {
      const fromEl = container.querySelector(`[data-node="${conn.from}"]`) as HTMLElement;
      const toEl = container.querySelector(`[data-node="${conn.to}"]`) as HTMLElement;
      
      if (!fromEl || !toEl) return;
      
      const fromRect = fromEl.getBoundingClientRect();
      const toRect = toEl.getBoundingClientRect();
      
      const fromX = fromRect.left + fromRect.width / 2 - containerRect.left;
      const fromY = fromRect.top + fromRect.height / 2 - containerRect.top;
      const toX = toRect.left + toRect.width / 2 - containerRect.left;
      const toY = toRect.top + toRect.height / 2 - containerRect.top;
      
      const svgEl = container.querySelector(`[data-connection-svg="${conn.from}-${conn.to}"]`) as HTMLElement;
      if (svgEl) {
        const pathEl = svgEl.querySelector('path');
        const arrowsGroup = svgEl.querySelector('.arrows-group');
        
        if (pathEl) {
          pathEl.setAttribute('d', createCurvedPath(fromX, fromY, toX, toY));
        }
        
        if (arrowsGroup) {
          const arrows = getArrowPositions(fromX, fromY, toX, toY);
          arrowsGroup.innerHTML = arrows.map(arrow => 
            `<polygon points="0,-4 8,0 0,4" fill="${conn.color || '#9ca3af'}" transform="translate(${arrow.x},${arrow.y}) rotate(${arrow.angle})" opacity="0.8"/>`
          ).join('');
        }
      }
    });
  }, [filteredConnections]);

  useEffect(() => {
    updateConnections();
    const handleResize = () => updateConnections();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateConnections]);

  const handleNodeMouseOver = (nodeId: string) => {
    const relatedNodes = new Set<string>();
    const relatedConnections: string[] = [];
    
    connections.forEach(conn => {
      if (conn.from === nodeId || conn.to === nodeId) {
        relatedNodes.add(conn.from);
        relatedNodes.add(conn.to);
        relatedConnections.push(`${conn.from}-${conn.to}`);
      }
    });
    
    setHighlightedPath([...relatedNodes]);
  };

  const handleNodeMouseOut = () => {
    setHighlightedPath([]);
  };

  const handleNodeDoubleClick = (node: SystemMapNode) => {
    if (isDragging) return;
    setSelectedNode(node);
    setEditData({ title: node.title, description: node.description, group: node.group });
    setIsEditing(false);
  };

  const handleMapClick = (e: React.MouseEvent) => {
    if (e.target === mapContainerRef.current) {
      setSelectedNode(null);
      setIsEditing(false);
    }
  };

  const handleNodeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(null);
    setIsEditing(false);
  };

  const checkCollision = (nodeEl: HTMLElement, newX: number, newY: number, excludeId: string) => {
    const nodeWidth = 240;
    const nodeHeight = 140;
    const margin = 20;
    
    return filteredNodes.some(node => {
      if (node.id === excludeId) return false;
      
      const otherEl = mapContainerRef.current?.querySelector(`[data-node="${node.id}"]`) as HTMLElement;
      if (!otherEl) return false;
      
      const otherRect = otherEl.getBoundingClientRect();
      const containerRect = mapContainerRef.current!.getBoundingClientRect();
      const otherX = otherRect.left - containerRect.left;
      const otherY = otherRect.top - containerRect.top;
      
      return !(newX + nodeWidth + margin < otherX || 
               newX > otherX + nodeWidth + margin || 
               newY + nodeHeight + margin < otherY || 
               newY > otherY + nodeHeight + margin);
    });
  };

  const findNonCollidingPosition = (originalX: number, originalY: number, nodeId: string) => {
    const step = 30;
    const maxAttempts = 50;
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const angle = (attempt * 45) % 360;
      const distance = Math.floor(attempt / 8) * step;
      const newX = originalX + Math.cos(angle * Math.PI / 180) * distance;
      const newY = originalY + Math.sin(angle * Math.PI / 180) * distance;
      
      if (newX < 0 || newY < 0 || newX > mapDimensions.width - 240 || newY > mapDimensions.height - 140) {
        continue;
      }
      
      if (!checkCollision(document.createElement('div'), newX, newY, nodeId)) {
        return { x: newX, y: newY };
      }
    }
    
    return { x: originalX, y: originalY };
  };

  const handleNodeDragStart = (e: React.MouseEvent, nodeId: string) => {
    e.preventDefault();
    setIsDragging(true);
    setDraggedNode(nodeId);
    
    const startX = e.clientX;
    const startY = e.clientY;
    const nodeEl = mapContainerRef.current?.querySelector(`[data-node="${nodeId}"]`) as HTMLElement;
    if (!nodeEl) return;
    
    const initialRect = nodeEl.getBoundingClientRect();
    const containerRect = mapContainerRef.current!.getBoundingClientRect();
    const initialLeft = initialRect.left - containerRect.left;
    const initialTop = initialRect.top - containerRect.top;
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!mapContainerRef.current) return;
      
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      let newLeft = initialLeft + deltaX;
      let newTop = initialTop + deltaY;
      
      newLeft = Math.max(0, Math.min(newLeft, mapDimensions.width - 240));
      newTop = Math.max(0, Math.min(newTop, mapDimensions.height - 140));
      
      if (!checkCollision(nodeEl, newLeft, newTop, nodeId)) {
        nodeEl.style.left = `${newLeft}px`;
        nodeEl.style.top = `${newTop}px`;
      } else {
        const { x, y } = findNonCollidingPosition(newLeft, newTop, nodeId);
        nodeEl.style.left = `${x}px`;
        nodeEl.style.top = `${y}px`;
      }
      
      updateConnections();
      setMapDimensions(getMapDimensions());
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setDraggedNode(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setTimeout(() => setMapDimensions(getMapDimensions()), 100);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (!isEditing && selectedNode) {
      setEditData({ title: selectedNode.title, description: selectedNode.description, group: selectedNode.group });
    }
  };

  const handleSaveEdit = () => {
    if (selectedNode) {
      console.log('Saving changes:', editData);
      setIsEditing(false);
    }
  };

  const resetLayout = () => {
    if (!mapContainerRef.current) return;
    
    filteredNodes.forEach(node => {
      const nodeEl = mapContainerRef.current!.querySelector(`[data-node="${node.id}"]`) as HTMLElement;
      if (nodeEl) {
        nodeEl.style.left = `${node.left}px`;
        nodeEl.style.top = `${node.top}px`;
      }
    });
    updateConnections();
    setMapDimensions(getMapDimensions());
  };

  return (
    <div className="w-full h-screen bg-background overflow-hidden">
      <div className="p-4 border-b bg-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Mapa Interativo - TrackSteel
            </h1>
            <p className="text-sm text-muted-foreground">
              Arraste os módulos, passe o mouse para ver fluxos e duplo-clique para detalhes
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {filters.map(filter => {
                const Icon = filter.icon;
                return (
                  <Button
                    key={filter.id}
                    variant={activeFilter === filter.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveFilter(filter.id)}
                    className="gap-2"
                  >
                    <Icon className="w-4 h-4" />
                    {filter.label}
                  </Button>
                );
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={resetLayout}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>
      </div>

      <div className="relative w-full overflow-auto" style={{ height: 'calc(100vh - 120px)' }}>
        <div 
          ref={mapContainerRef}
          className="relative bg-gradient-to-br from-background to-muted/20"
          style={{ 
            width: `${mapDimensions.width}px`, 
            height: `${mapDimensions.height}px`,
            minWidth: '100%',
            minHeight: '100%'
          }}
          onClick={handleMapClick}
        >
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            style={{ overflow: 'visible' }}
          >
            {filteredConnections.map(conn => (
              <g 
                key={`${conn.from}-${conn.to}`}
                data-connection-svg={`${conn.from}-${conn.to}`}
              >
                <path
                  stroke={conn.color || '#9ca3af'}
                  strokeWidth={highlightedPath.includes(conn.from) && highlightedPath.includes(conn.to) ? "3" : "2"}
                  fill="none"
                  opacity={highlightedPath.includes(conn.from) && highlightedPath.includes(conn.to) ? "1" : "0.7"}
                  filter={highlightedPath.includes(conn.from) && highlightedPath.includes(conn.to) ? "drop-shadow(0 0 8px rgba(0,0,0,0.3))" : "none"}
                />
                <g className="arrows-group" />
              </g>
            ))}
          </svg>

          {filteredNodes.map(node => (
            <div
              key={node.id}
              data-node={node.id}
              className={cn(
                "absolute p-4 bg-card border rounded-xl shadow-lg cursor-grab transition-all duration-300 z-20",
                "hover:shadow-xl hover:scale-[1.02]",
                draggedNode === node.id ? "cursor-grabbing scale-105 shadow-2xl z-30" : "",
                highlightedPath.includes(node.id) ? "border-2 shadow-2xl" : "border",
                !node.hasAccess ? "opacity-60 grayscale" : ""
              )}
              style={{ 
                left: `${node.left}px`, 
                top: `${node.top}px`,
                width: '240px',
                minHeight: '140px',
                borderColor: highlightedPath.includes(node.id) ? node.color : undefined,
                boxShadow: highlightedPath.includes(node.id) 
                  ? `0 20px 40px ${node.color}30, 0 0 0 2px ${node.color}` 
                  : undefined
              }}
              onMouseDown={(e) => handleNodeDragStart(e, node.id)}
              onMouseOver={() => handleNodeMouseOver(node.id)}
              onMouseOut={handleNodeMouseOut}
              onDoubleClick={() => handleNodeDoubleClick(node)}
              onClick={handleNodeClick}
            >
              <div className="flex items-start gap-2 mb-3">
                <div 
                  className="text-2xl flex-shrink-0"
                  style={{ 
                    filter: node.hasAccess ? 'none' : 'grayscale(1)',
                    textShadow: highlightedPath.includes(node.id) ? `0 0 10px ${node.color}80` : 'none'
                  }}
                >
                  {node.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground mb-1 leading-tight">
                    {node.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                    {node.group}
                  </p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {node.profiles.slice(0, 2).map((profile, index) => (
                  <Badge 
                    key={index}
                    variant="secondary" 
                    className="text-xs font-medium"
                    style={{ 
                      backgroundColor: `${node.color}20`, 
                      color: node.color,
                      borderColor: `${node.color}40`,
                      border: '1px solid'
                    }}
                  >
                    {profile}
                  </Badge>
                ))}
                {node.profiles.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{node.profiles.length - 2}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedNode && (
        <div className="fixed top-0 right-0 w-96 h-full bg-card border-l shadow-2xl z-50 transform transition-transform duration-300">
          <div className="p-6 h-full overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedNode.icon}</span>
                {isEditing ? (
                  <Input
                    value={editData.title}
                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                    className="text-xl font-bold"
                  />
                ) : (
                  <h2 className="text-xl font-bold text-primary">
                    {selectedNode.title}
                  </h2>
                )}
              </div>
              <div className="flex gap-2">
                {isAdmin && (
                  <>
                    {isEditing ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveEdit}
                      >
                        <Save className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleEditToggle}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    )}
                  </>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedNode(null);
                    setIsEditing(false);
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">Descrição</h4>
                {isEditing ? (
                  <Textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    className="text-sm"
                    rows={3}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {selectedNode.description}
                  </p>
                )}
              </div>

              <div>
                <h4 className="font-semibold mb-2">Informações</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Grupo:</span>
                    {isEditing ? (
                      <Input
                        value={editData.group}
                        onChange={(e) => setEditData({ ...editData, group: e.target.value })}
                        className="w-32 h-6 text-xs"
                      />
                    ) : (
                      <Badge variant="outline">{selectedNode.group}</Badge>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Acesso:</span>
                    <Badge variant={selectedNode.hasAccess ? "default" : "destructive"}>
                      {selectedNode.hasAccess ? "Permitido" : "Bloqueado"}
                    </Badge>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Perfis de Acesso</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedNode.profiles.map(profile => (
                    <Badge key={profile} variant="secondary" className="text-xs">
                      {profile}
                    </Badge>
                  ))}
                </div>
              </div>

              {isAdmin && selectedNode && (
                <UserResourcePermissions 
                  resourceKey={selectedNode.id}
                  resourceName={selectedNode.title}
                />
              )}

              {selectedNode.url && (
                <Button
                  className="w-full gap-2"
                  onClick={() => window.open(selectedNode.url, '_blank')}
                >
                  Acessar Módulo
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
