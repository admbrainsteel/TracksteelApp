import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/hooks/useTheme'
import { Toaster } from '@/components/ui/sonner'

import { AuthProvider } from './hooks/useAuth'
import { IconStyleProvider } from './hooks/useIconStyle'
import { AppLabelsProvider } from './contexts/AppLabelsContext'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppRoutes } from './components/AppRoutes'

import './index.css'

// ============================================================================
// Configuração do React Query com retry inteligente
// ============================================================================

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 1000 * 60 * 5, // 5 minutos
      gcTime: 1000 * 60 * 10,   // 10 minutos de garbage collection
      refetchOnWindowFocus: false,
    },
  },
})

// ============================================================================
// Render da aplicação
// ============================================================================

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <IconStyleProvider>
            <AppLabelsProvider>
              <ThemeProvider defaultTheme="system">
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
                <Toaster />
              </ThemeProvider>
            </AppLabelsProvider>
          </IconStyleProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
