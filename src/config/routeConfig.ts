import { ComponentType, lazy } from 'react';

// ============================================================================
// Definição de tipos para o sistema de rotas
// ============================================================================

export type RouteGuard = 'public' | 'protected' | 'admin' | 'resource';

export interface RouteDefinition {
  path: string;
  component: () => Promise<{ default: ComponentType<unknown> }>;
  guard: RouteGuard;
  resourceKey?: string;
}

// ============================================================================
// Configuração centralizada de todas as rotas do aplicativo
// ============================================================================

export const routeConfig: RouteDefinition[] = [
  // ── Pública ──────────────────────────────────────────────
  {
    path: '/auth',
    component: () => import('@/pages/Auth'),
    guard: 'public',
  },
  {
    path: '/callback',
    component: () => import('@/pages/Callback'),
    guard: 'public',
  },

  // ── Dashboard ────────────────────────────────────────────
  {
    path: '/',
    component: () => import('@/pages/Dashboard'),
    guard: 'protected',
  },
  {
    path: '/dashboard',
    component: () => import('@/pages/Dashboard'),
    guard: 'protected',
  },

  // ── Cadastro ─────────────────────────────────────────────
  {
    path: '/cadastro-of',
    component: () => import('@/pages/CadastroOF'),
    guard: 'resource',
    resourceKey: 'cadastro-of',
  },
  {
    path: '/ficha-tecnica',
    component: () => import('@/pages/CadastroOF'),
    guard: 'resource',
    resourceKey: 'cadastro-of',
  },
  {
    path: '/seletor-of',
    component: () => import('@/pages/SeletorOF'),
    guard: 'resource',
    resourceKey: 'cadastro-pecas',
  },
  {
    path: '/cadastro/pecas',
    component: () => import('@/pages/SeletorOF'),
    guard: 'resource',
    resourceKey: 'cadastro-pecas',
  },
  {
    path: '/cadastro-pecas/:ofNumber',
    component: () => import('@/pages/CadastroPecasFiltrado'),
    guard: 'resource',
    resourceKey: 'cadastro-pecas',
  },

  // ── Equipamentos ─────────────────────────────────────────
  {
    path: '/equipamentos',
    component: () => import('@/pages/Equipamentos'),
    guard: 'resource',
    resourceKey: 'equipamentos',
  },

  // ── Ferramentas ──────────────────────────────────────────
  {
    path: '/ferramentas/conversores',
    component: () => import('@/pages/ConversoresDados'),
    guard: 'resource',
    resourceKey: 'ferramentas-conversores',
  },
  {
    path: '/ferramentas/inconsistencias',
    component: () => import('@/pages/VerInconsistencias'),
    guard: 'resource',
    resourceKey: 'ferramentas-inconsistencias',
  },


  // ── Estoque ──────────────────────────────────────────────
  {
    path: '/estoque',
    component: () => import('@/pages/Estoque'),
    guard: 'resource',
    resourceKey: 'estoque',
  },
  {
    path: '/estoque/solicitacao-compras',
    component: () => import('@/pages/SolicitacaoCompras'),
    guard: 'resource',
    resourceKey: 'estoque-solicitacao-compras',
  },

  // ── OFs ──────────────────────────────────────────────────
  {
    path: '/ofs',
    component: () => import('@/pages/OrdensFabricacao'),
    guard: 'resource',
    resourceKey: 'ofs-lista',
  },
  {
    path: '/ofs/cronograma',
    component: () => import('@/pages/CronogramaOF'),
    guard: 'resource',
    resourceKey: 'ofs-cronograma',
  },
  {
    path: '/cronograma',
    component: () => import('@/pages/CronogramaOF'),
    guard: 'resource',
    resourceKey: 'ofs-cronograma',
  },
  {
    path: '/cadastro/ofs-concluidas',
    component: () => import('@/pages/OFsConcluidas'),
    guard: 'resource',
    resourceKey: 'ofs-concluidas',
  },

  // ── Produção ─────────────────────────────────────────────
  {
    path: '/producao',
    component: () => import('@/pages/Producao'),
    guard: 'resource',
    resourceKey: 'producao-visao',
  },
  {
    path: '/diario-producao',
    component: () => import('@/pages/DiarioProducao'),
    guard: 'resource',
    resourceKey: 'diario-producao',
  },
  {
    path: '/apontamento-producao',
    component: () => import('@/pages/ApontamentoProducao'),
    guard: 'resource',
    resourceKey: 'producao-apontamento',
  },
  {
    path: '/dashboard-producao',
    component: () => import('@/pages/DashboardProducao'),
    guard: 'resource',
    resourceKey: 'producao-dashboard',
  },

  // ── Painel Industrial ────────────────────────────────────
  {
    path: '/painel-industrial',
    component: () => import('@/pages/PainelIndustrial'),
    guard: 'resource',
    resourceKey: 'painel-industrial',
  },

  // ── Expedição ────────────────────────────────────────────
  {
    path: '/expedicao',
    component: () => import('@/pages/Expedicao'),
    guard: 'resource',
    resourceKey: 'expedicao',
  },

  // ── Obra ─────────────────────────────────────────────────
  {
    path: '/obra',
    component: () => import('@/pages/Obra'),
    guard: 'resource',
    resourceKey: 'obra-dashboard',
  },
  {
    path: '/obra/configuracoes',
    component: () => import('@/pages/ObraConfiguracoes'),
    guard: 'resource',
    resourceKey: 'obra-configuracoes',
  },

  // ── Tarefas ──────────────────────────────────────────────
  {
    path: '/tarefas',
    component: () => import('@/pages/Tarefas'),
    guard: 'resource',
    resourceKey: 'tarefas-lista',
  },
  {
    path: '/tarefas/historico',
    component: () => import('@/pages/TarefasHistorico'),
    guard: 'resource',
    resourceKey: 'tarefas-historico',
  },

  // ── Biblioteca ───────────────────────────────────────────
  {
    path: '/biblioteca/catalogos',
    component: () => import('@/pages/Catalogos'),
    guard: 'resource',
    resourceKey: 'biblioteca-catalogos',
  },
  {
    path: '/biblioteca/normas',
    component: () => import('@/pages/BibliotecaNormas'),
    guard: 'resource',
    resourceKey: 'biblioteca-normas',
  },
  {
    path: '/biblioteca/referencias',
    component: () => import('@/pages/BibliotecaReferencias'),
    guard: 'resource',
    resourceKey: 'biblioteca-referencias',
  },

  // ── Sistema ──────────────────────────────────────────────
  {
    path: '/sistema',
    component: () => import('@/pages/Sistema'),
    guard: 'resource',
    resourceKey: 'sistema',
  },

  // ── Sugestões ────────────────────────────────────────────
  {
    path: '/sugestoes',
    component: () => import('@/pages/Sugestoes'),
    guard: 'resource',
    resourceKey: 'sugestoes',
  },

  // ── Configurações ────────────────────────────────────────
  {
    path: '/configuracoes',
    component: () => import('@/pages/Configuracoes'),
    guard: 'admin',
    resourceKey: 'configuracoes-gerais',
  },
  {
    path: '/admin/theme-customization',
    component: () => import('@/pages/ThemeCustomizationPage'),
    guard: 'admin',
    resourceKey: 'theme-customization',
  },

  // ── Admin ────────────────────────────────────────────────
  {
    path: '/admin',
    component: () => import('@/pages/Admin'),
    guard: 'admin',
  },
  {
    path: '/user-management',
    component: () => import('@/pages/UserManagement'),
    guard: 'admin',
  },
  {
    path: '/mapa-interativo',
    component: () => import('@/pages/MapaInterativo'),
    guard: 'admin',
  },
  {
    path: '/atribuicoes',
    component: () => import('@/pages/Atribuicoes'),
    guard: 'admin',
  },

  // ── Prioridades (Protected simples) ──────────────────────
  {
    path: '/prioridades-fabricacao',
    component: () => import('@/pages/PrioridadesFabricacao'),
    guard: 'protected',
  },
];
