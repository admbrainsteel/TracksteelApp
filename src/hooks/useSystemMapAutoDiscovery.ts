
import { useState, useEffect } from 'react';
import { useUserPermissions } from '@/hooks/useUserPermissions';

export interface SystemMapNode {
  id: string;
  left: number;
  top: number;
  title: string;
  description: string;
  icon: string;
  color: string;
  group: string;
  profiles: string[];
  hasAccess: boolean;
  isMainFlow?: boolean;
  url?: string;
}

export interface SystemMapConnection {
  id: string;
  from: string;
  to: string;
  color?: string;
  type?: string;
}

export function useSystemMapAutoDiscovery() {
  const [nodes, setNodes] = useState<SystemMapNode[]>([]);
  const [connections, setConnections] = useState<SystemMapConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const { hasAccess, loading: permissionsLoading } = useUserPermissions();

  const generateSystemMap = async () => {
    if (permissionsLoading) return;
    
    setLoading(true);
    
    try {
      // Auto-discover system components based on user permissions
      const discoveredNodes: SystemMapNode[] = [];
      const discoveredConnections: SystemMapConnection[] = [];

      // Check access to different routes and create nodes accordingly
      const routes = [
        { 
          path: '/equipamentos', 
          title: 'Equipamentos', 
          description: 'Gestão de equipamentos e ferramentas',
          icon: '🔧',
          color: '#3b82f6',
          group: 'Cadastros'
        },
        { 
          path: '/dashboard', 
          title: 'Dashboard', 
          description: 'Painel principal do sistema',
          icon: '📊',
          color: '#10b981',
          group: 'Principal'
        },
        { 
          path: '/producao', 
          title: 'Produção', 
          description: 'Controle de produção',
          icon: '🏭',
          color: '#f59e0b',
          group: 'Principal'
        },
        { 
          path: '/estoque', 
          title: 'Estoque', 
          description: 'Gestão de materiais',
          icon: '📦',
          color: '#8b5cf6',
          group: 'Principal'
        },
        { 
          path: '/ofs', 
          title: 'Ordens de Fabricação', 
          description: 'Gestão de OFs',
          icon: '📋',
          color: '#ef4444',
          group: 'Principal'
        },
        { 
          path: '/expedicao', 
          title: 'Expedição', 
          description: 'Controle de expedição',
          icon: '🚛',
          color: '#06b6d4',
          group: 'Principal'
        },
        { 
          path: '/admin', 
          title: 'Administração', 
          description: 'Configurações do sistema',
          icon: '⚙️',
          color: '#6b7280',
          group: 'Admin'
        }
      ];

      routes.forEach((route, index) => {
        // Use hasAccess with resource mapping instead of canAccessRoute
        let resourceKey = '';
        switch (route.path) {
          case '/equipamentos':
            resourceKey = 'equipamentos';
            break;
          case '/admin':
            resourceKey = 'admin';
            break;
          default:
            resourceKey = '';
        }

        const canAccess = resourceKey ? hasAccess(resourceKey) : hasAccess();
        
        discoveredNodes.push({
          id: `node-${index}`,
          left: (index % 3) * 250 + 50,
          top: Math.floor(index / 3) * 150 + 50,
          title: route.title,
          description: route.description,
          icon: route.icon,
          color: route.color,
          group: route.group,
          profiles: ['Usuário', 'Admin'],
          hasAccess: canAccess,
          isMainFlow: route.group === 'Principal',
          url: route.path
        });
      });

      // Create connections between related nodes
      for (let i = 0; i < discoveredNodes.length - 1; i++) {
        discoveredConnections.push({
          id: `edge-${i}`,
          from: discoveredNodes[i].id,
          to: discoveredNodes[i + 1].id,
          color: '#9ca3af',
          type: 'smoothstep'
        });
      }

      setNodes(discoveredNodes);
      setConnections(discoveredConnections);
    } catch (error) {
      console.error('Error generating system map:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!permissionsLoading) {
      generateSystemMap();
    }
  }, [permissionsLoading, hasAccess]);

  return {
    nodes,
    connections,
    loading,
    regenerateMap: generateSystemMap
  };
}
