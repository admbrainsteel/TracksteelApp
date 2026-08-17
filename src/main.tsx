import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/hooks/useTheme'
import { Toaster } from '@/components/ui/sonner'

import { AuthProvider } from './hooks/useAuth'
import { IconStyleProvider } from './hooks/useIconStyle'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AppRoutes } from './components/AppRoutes'
import { LogtoProvider, LogtoConfig } from '@logto/react'

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

const config: LogtoConfig = {
  endpoint: 'https://logto-bzlued1boxl3t8ewsyn99an9.187.77.227.172.sslip.io',
  appId: '4qun0u1tfce1fdn3pxrgq',
};

// ============================================================================
// Render da aplicação
// ============================================================================

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LogtoProvider config={config}>
          <AuthProvider>
            <IconStyleProvider>
              <ThemeProvider defaultTheme="system">
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
                <Toaster />
              </ThemeProvider>
            </IconStyleProvider>
          </AuthProvider>
        </LogtoProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
