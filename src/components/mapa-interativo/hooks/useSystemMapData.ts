import { useMemo } from 'react';
import { Node, Edge, MarkerType } from '@xyflow/react';
import { 
  BarChart3, 
  FileText, 
  Warehouse, 
  Building2, 
  Truck, 
  HardHat, 
  CheckSquare, 
  Book,
  Database,
  Users,
  Settings,
  Wrench
} from 'lucide-react';

export function useSystemMapData() {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [
      // Módulos Principais
      {
        id: 'dashboard',
        type: 'module',
        position: { x: 400, y: 50 },
        data: {
          title: 'Dashboard',
          icon: BarChart3,
          description: 'Visão geral do sistema',
          color: '#10b981',
          stats: { active: true, count: 1 },
          url: '/dashboard',
          hasAccess: true,
          isMainFlow: true,
          recentlyUsed: true
        },
      },
      {
        id: 'cadastro-of',
        type: 'module',
        position: { x: 100, y: 150 },
        data: {
          title: 'Cadastro OF',
          icon: FileText,
          description: 'Gestão de Ordens de Fabricação',
          color: '#3b82f6',
          stats: { active: true, count: 25 },
          url: '/cadastro-of',
          hasAccess: true,
          isMainFlow: true,
          recentlyUsed: false
        },
      },
      {
        id: 'cadastro-pecas',
        type: 'module',
        position: { x: 300, y: 150 },
        data: {
          title: 'Cadastro Peças',
          icon: FileText,
          description: 'Gestão de Peças e Componentes',
          color: '#3b82f6',
          stats: { active: true, count: 150 },
          url: '/seletor-of',
          hasAccess: true,
          isMainFlow: true,
          recentlyUsed: true
        },
      },
      {
        id: 'estoque',
        type: 'module',
        position: { x: 500, y: 150 },
        data: {
          title: 'Estoque',
          icon: Warehouse,
          description: 'Gestão de Materiais e Estoque',
          color: '#06b6d4',
          stats: { active: true, count: 320 },
          url: '/estoque',
          hasAccess: true,
          isMainFlow: true,
          recentlyUsed: true
        },
      },
      {
        id: 'producao',
        type: 'module',
        position: { x: 200, y: 300 },
        data: {
          title: 'Produção',
          icon: Building2,
          description: 'Gestão da Produção Industrial',
          color: '#f59e0b',
          stats: { active: true, count: 75 },
          url: '/producao',
          hasAccess: true,
          isMainFlow: true,
          recentlyUsed: true
        },
      },
      {
        id: 'expedicao',
        type: 'module',
        position: { x: 400, y: 300 },
        data: {
          title: 'Expedição',
          icon: Truck,
          description: 'Gestão de Expedição e Romaneios',
          color: '#ef4444',
          stats: { active: true, count: 45 },
          url: '/expedicao',
          hasAccess: true,
          isMainFlow: true,
          recentlyUsed: false
        },
      },
      {
        id: 'obra',
        type: 'module',
        position: { x: 600, y: 300 },
        data: {
          title: 'Obra',
          icon: HardHat,
          description: 'Gestão de Obras e RDO',
          color: '#ef4444',
          stats: { active: true, count: 12 },
          url: '/obra',
          hasAccess: true,
          isMainFlow: true,
          recentlyUsed: false
        },
      },
      // Entidades de Dados
      {
        id: 'data-ofs',
        type: 'entity',
        position: { x: 100, y: 250 },
        data: {
          title: 'OFs',
          icon: Database,
          description: 'Ordens de Fabricação',
          color: '#6b7280',
          count: 25,
          isMainFlow: true
        },
      },
      {
        id: 'data-pecas',
        type: 'entity',
        position: { x: 300, y: 250 },
        data: {
          title: 'Peças',
          icon: Database,
          description: 'Peças e Componentes',
          color: '#6b7280',
          count: 150,
          isMainFlow: true
        },
      },
      {
        id: 'data-materiais',
        type: 'entity',
        position: { x: 500, y: 250 },
        data: {
          title: 'Materiais',
          icon: Database,
          description: 'Materiais de Estoque',
          color: '#6b7280',
          count: 320,
          isMainFlow: true
        },
      },
      // Módulos de Apoio
      {
        id: 'tarefas',
        type: 'module',
        position: { x: 50, y: 450 },
        data: {
          title: 'Tarefas',
          icon: CheckSquare,
          description: 'Sistema de Tarefas',
          color: '#6b7280',
          stats: { active: true, count: 8 },
          url: '/tarefas',
          hasAccess: true,
          isMainFlow: false,
          recentlyUsed: false
        },
      },
      {
        id: 'biblioteca',
        type: 'module',
        position: { x: 250, y: 450 },
        data: {
          title: 'Biblioteca',
          icon: Book,
          description: 'Catálogos e Documentos',
          color: '#6b7280',
          stats: { active: true, count: 50 },
          url: '/biblioteca/catalogos',
          hasAccess: true,
          isMainFlow: false,
          recentlyUsed: false
        },
      },
      {
        id: 'usuarios',
        type: 'module',
        position: { x: 450, y: 450 },
        data: {
          title: 'Usuários',
          icon: Users,
          description: 'Gestão de Usuários',
          color: '#dc2626',
          stats: { active: true, count: 15 },
          url: '/user-management',
          hasAccess: false,
          isMainFlow: false,
          recentlyUsed: false
        },
      },
      {
        id: 'configuracoes',
        type: 'module',
        position: { x: 650, y: 450 },
        data: {
          title: 'Configurações',
          icon: Settings,
          description: 'Configurações do Sistema',
          color: '#64748b',
          stats: { active: true, count: 1 },
          url: '/configuracoes',
          hasAccess: true,
          isMainFlow: false,
          recentlyUsed: false
        },
      },
      // Processo de Início
      {
        id: 'start',
        type: 'process',
        position: { x: 400, y: -50 },
        data: {
          title: 'Início',
          description: 'Ponto de entrada do sistema',
          color: '#10b981',
          isMainFlow: true
        },
      },
    ];

    const edges: Edge[] = [
      // Fluxo Principal
      {
        id: 'start-dashboard',
        source: 'start',
        target: 'dashboard',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: '#10b981', strokeWidth: 3 }
      },
      {
        id: 'dashboard-cadastro-of',
        source: 'dashboard',
        target: 'cadastro-of',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        label: '1. Criar OF'
      },
      {
        id: 'cadastro-of-data-ofs',
        source: 'cadastro-of',
        target: 'data-ofs',
        type: 'straight',
        markerEnd: { type: MarkerType.ArrowClosed }
      },
      {
        id: 'cadastro-of-cadastro-pecas',
        source: 'cadastro-of',
        target: 'cadastro-pecas',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        label: '2. Cadastrar Peças'
      },
      {
        id: 'cadastro-pecas-data-pecas',
        source: 'cadastro-pecas',
        target: 'data-pecas',
        type: 'straight',
        markerEnd: { type: MarkerType.ArrowClosed }
      },
      {
        id: 'cadastro-pecas-estoque',
        source: 'cadastro-pecas',
        target: 'estoque',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        label: '3. Gestão Materiais'
      },
      {
        id: 'estoque-data-materiais',
        source: 'estoque',
        target: 'data-materiais',
        type: 'straight',
        markerEnd: { type: MarkerType.ArrowClosed }
      },
      {
        id: 'data-pecas-producao',
        source: 'data-pecas',
        target: 'producao',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        label: '4. Produzir'
      },
      {
        id: 'data-materiais-producao',
        source: 'data-materiais',
        target: 'producao',
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed }
      },
      {
        id: 'producao-expedicao',
        source: 'producao',
        target: 'expedicao',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        label: '5. Expedir'
      },
      {
        id: 'expedicao-obra',
        source: 'expedicao',
        target: 'obra',
        type: 'smoothstep',
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed },
        label: '6. Instalar'
      },
      // Conexões de Apoio
      {
        id: 'dashboard-tarefas',
        source: 'dashboard',
        target: 'tarefas',
        type: 'smoothstep',
        style: { strokeDasharray: '5,5' }
      },
      {
        id: 'dashboard-biblioteca',
        source: 'dashboard',
        target: 'biblioteca',
        type: 'smoothstep',
        style: { strokeDasharray: '5,5' }
      },
      {
        id: 'configuracoes-usuarios',
        source: 'configuracoes',
        target: 'usuarios',
        type: 'smoothstep',
        style: { strokeDasharray: '5,5' }
      },
    ];

    return { nodes, edges };
  }, []);

  return { nodes, edges };
}