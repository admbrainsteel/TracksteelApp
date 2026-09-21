import React, { Suspense, lazy, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './Layout';
import { ProtectedRoute } from './ProtectedRoute';
import { ProtectedAdminRoute } from './ProtectedAdminRoute';
import { ProtectedRouteByResource } from './ProtectedRouteByResource';
import { routeConfig, RouteDefinition } from '@/config/routeConfig';

// ============================================================================
// Fallback de loading para Suspense
// ============================================================================

const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      <span className="text-sm text-muted-foreground">Carregando...</span>
    </div>
  </div>
);

// ============================================================================
// Cache de componentes lazy para evitar re-criação a cada render
// ============================================================================

const lazyComponentCache = new Map<string, React.LazyExoticComponent<React.ComponentType<any>>>();

function getLazyComponent(route: RouteDefinition): React.LazyExoticComponent<React.ComponentType<any>> {
  const key = route.path;
  if (!lazyComponentCache.has(key)) {
    lazyComponentCache.set(key, lazy(route.component));
  }
  return lazyComponentCache.get(key)!;
}

// ============================================================================
// Funções de wrapping por tipo de guard
// ============================================================================

function wrapWithGuard(
  element: React.ReactNode,
  guard: RouteDefinition['guard'],
  resourceKey?: string
): React.ReactNode {
  switch (guard) {
    case 'public':
      return element;

    case 'protected':
      return (
        <ProtectedRoute>
          <Layout>{element}</Layout>
        </ProtectedRoute>
      );

    case 'admin':
      return (
        <ProtectedAdminRoute>
          <Layout>{element}</Layout>
        </ProtectedAdminRoute>
      );

    case 'resource':
      return (
        <ProtectedRouteByResource resourceKey={resourceKey!}>
          <Layout>{element}</Layout>
        </ProtectedRouteByResource>
      );

    case 'smart':
      return (
        <ProtectedRoute>
          {element}
        </ProtectedRoute>
      );

    default:
      return element;
  }
}

// ============================================================================
// Componente principal de rotas
// ============================================================================

export function AppRoutes() {
  const routes = useMemo(
    () =>
      routeConfig.map((route) => {
        const LazyComponent = getLazyComponent(route);

        const element = wrapWithGuard(
          <Suspense fallback={<PageLoadingFallback />}>
            <LazyComponent />
          </Suspense>,
          route.guard,
          route.resourceKey
        );

        return <Route key={route.path} path={route.path} element={element} />;
      }),
    []
  );

  // Lazy load da página NotFound
  const LazyNotFound = useMemo(() => lazy(() => import('@/pages/NotFound')), []);

  return (
    <Routes>
      {routes}
      <Route
        path="*"
        element={
          <Suspense fallback={<PageLoadingFallback />}>
            <LazyNotFound />
          </Suspense>
        }
      />
    </Routes>
  );
}
