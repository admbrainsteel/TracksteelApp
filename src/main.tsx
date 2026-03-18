
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@/hooks/useTheme'
import { Toaster } from '@/components/ui/sonner'

import { Layout } from './components/Layout'
import { AuthProvider } from './hooks/useAuth'
import { IconStyleProvider } from './hooks/useIconStyle'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute'
import { ProtectedRouteByResource } from './components/ProtectedRouteByResource'
import { ErrorBoundary } from './components/ErrorBoundary'

import {
  Auth,
  Dashboard,
  CadastroOF,
  CadastroPecas,
  SeletorOF,
  CadastroPecasFiltrado,
  Equipamentos,
  Estoque,
  OrdensFabricacao,
  OFsConcluidas,
  CronogramaOF,
  Producao,
  DiarioProducao,
  ApontamentoProducao,
  DashboardProducao,
  Expedicao,
  Obra,
  ObraConfiguracoes,
  Tarefas,
  TarefasHistorico,
  Sistema,
  Configuracoes,
  Admin,
  UserManagement,
  ThemeCustomizationPage,
  NotFound,
  Catalogos,
  BibliotecaFerramentas,
  BibliotecaNormas,
  BibliotecaReferencias,
  Sugestoes,
  ConversoresDados,
  PlanejamentoProducao,
  PainelIndustrial,
  PrioridadesFabricacao,
  MapaInterativo,
  Atribuicoes,
  VerInconsistencias,
  SolicitacaoCompras
} from './pages'

import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: 1000,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <IconStyleProvider>
            <ThemeProvider defaultTheme="system">
              <BrowserRouter>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  
                  {/* Dashboard */}
                  <Route path="/" element={
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute>
                      <Layout>
                        <Dashboard />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  {/* Cadastro */}
                  <Route path="/cadastro-of" element={
                    <ProtectedRouteByResource resourceKey="cadastro-of">
                      <Layout>
                        <CadastroOF />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  <Route path="/seletor-of" element={
                    <ProtectedRouteByResource resourceKey="cadastro-pecas">
                      <Layout>
                        <SeletorOF />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  <Route path="/cadastro-pecas/:ofNumber" element={
                    <ProtectedRouteByResource resourceKey="cadastro-pecas">
                      <Layout>
                        <CadastroPecasFiltrado />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  
                  {/* Equipamentos */}
                  <Route path="/equipamentos" element={
                    <ProtectedRouteByResource resourceKey="equipamentos">
                      <Layout>
                        <Equipamentos />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  
                  {/* Ferramentas */}
                  <Route path="/ferramentas/conversores" element={
                    <ProtectedRouteByResource resourceKey="ferramentas-conversores">
                      <Layout>
                        <ConversoresDados />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  <Route path="/ferramentas/inconsistencias" element={
                    <ProtectedRouteByResource resourceKey="ferramentas-inconsistencias">
                      <Layout>
                        <VerInconsistencias />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  
                  {/* Estoque */}
                  <Route path="/estoque" element={
                    <ProtectedRouteByResource resourceKey="estoque">
                      <Layout>
                        <Estoque />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  <Route path="/estoque/solicitacao-compras" element={
                    <ProtectedRouteByResource resourceKey="estoque-solicitacao-compras">
                      <Layout>
                        <SolicitacaoCompras />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  
                  {/* OFs */}
                  <Route path="/ofs" element={
                    <ProtectedRouteByResource resourceKey="ofs-lista">
                      <Layout>
                        <OrdensFabricacao />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  <Route path="/ofs/cronograma" element={
                    <ProtectedRouteByResource resourceKey="ofs-cronograma">
                      <Layout>
                        <CronogramaOF />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  <Route path="/cadastro/ofs-concluidas" element={
                    <ProtectedRouteByResource resourceKey="ofs-concluidas">
                      <Layout>
                        <OFsConcluidas />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  
                  {/* Produção */}
                  <Route path="/producao" element={
                    <ProtectedRouteByResource resourceKey="producao-visao">
                      <Layout>
                        <Producao />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  <Route path="/diario-producao" element={
                    <ProtectedRouteByResource resourceKey="diario-producao">
                      <Layout>
                        <DiarioProducao />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  <Route path="/apontamento-producao" element={
                    <ProtectedRouteByResource resourceKey="producao-apontamento">
                      <Layout>
                        <ApontamentoProducao />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  <Route path="/dashboard-producao" element={
                    <ProtectedRouteByResource resourceKey="producao-dashboard">
                      <Layout>
                        <DashboardProducao />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  
                  {/* Painel Industrial */}
                  <Route path="/painel-industrial" element={
                    <ProtectedRouteByResource resourceKey="painel-industrial">
                      <Layout>
                        <PainelIndustrial />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  
                  {/* Expedição */}
                  <Route path="/expedicao" element={
                    <ProtectedRouteByResource resourceKey="expedicao">
                      <Layout>
                        <Expedicao />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  
                  {/* Obra */}
                  <Route path="/obra" element={
                    <ProtectedRouteByResource resourceKey="obra-dashboard">
                      <Layout>
                        <Obra />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  <Route path="/obra/configuracoes" element={
                    <ProtectedRouteByResource resourceKey="obra-configuracoes">
                      <Layout>
                        <ObraConfiguracoes />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  
                  {/* Tarefas */}
                  <Route path="/tarefas" element={
                    <ProtectedRouteByResource resourceKey="tarefas-lista">
                      <Layout>
                        <Tarefas />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  <Route path="/tarefas/historico" element={
                    <ProtectedRouteByResource resourceKey="tarefas-historico">
                      <Layout>
                        <TarefasHistorico />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  
                  {/* Biblioteca */}
                  <Route path="/biblioteca/catalogos" element={
                    <ProtectedRouteByResource resourceKey="biblioteca-catalogos">
                      <Layout>
                        <Catalogos />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  <Route path="/biblioteca/normas" element={
                    <ProtectedRouteByResource resourceKey="biblioteca-normas">
                      <Layout>
                        <BibliotecaNormas />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  <Route path="/biblioteca/referencias" element={
                    <ProtectedRouteByResource resourceKey="biblioteca-referencias">
                      <Layout>
                        <BibliotecaReferencias />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  
                  {/* Sistema */}
                  <Route path="/sistema" element={
                    <ProtectedRouteByResource resourceKey="sistema">
                      <Layout>
                        <Sistema />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  
                  {/* Sugestões */}
                  <Route path="/sugestoes" element={
                    <ProtectedRouteByResource resourceKey="sugestoes">
                      <Layout>
                        <Sugestoes />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  
                  {/* Configurações */}
                  <Route path="/configuracoes" element={
                    <ProtectedRouteByResource resourceKey="configuracoes-gerais">
                      <Layout>
                        <Configuracoes />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  <Route path="/admin/theme-customization" element={
                    <ProtectedRouteByResource resourceKey="theme-customization">
                      <Layout>
                        <ThemeCustomizationPage />
                      </Layout>
                    </ProtectedRouteByResource>
                  } />
                  
                  {/* Admin */}
                  <Route path="/admin" element={
                    <ProtectedAdminRoute>
                      <Layout>
                        <Admin />
                      </Layout>
                    </ProtectedAdminRoute>
                  } />
                  <Route path="/user-management" element={
                    <ProtectedAdminRoute>
                      <Layout>
                        <UserManagement />
                      </Layout>
                    </ProtectedAdminRoute>
                  } />
                  <Route path="/mapa-interativo" element={
                    <ProtectedAdminRoute>
                      <Layout>
                        <MapaInterativo />
                      </Layout>
                    </ProtectedAdminRoute>
                  } />
                  <Route path="/atribuicoes" element={
                    <ProtectedAdminRoute>
                      <Layout>
                        <Atribuicoes />
                      </Layout>
                    </ProtectedAdminRoute>
                  } />
                  <Route path="/prioridades-fabricacao" element={
                    <ProtectedRoute>
                      <Layout>
                        <PrioridadesFabricacao />
                      </Layout>
                    </ProtectedRoute>
                  } />
                  
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
              <Toaster />
            </ThemeProvider>
          </IconStyleProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
