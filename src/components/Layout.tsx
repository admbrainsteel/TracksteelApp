
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ApontamentoAutomaticoListener } from '@/components/expedicao/ApontamentoAutomaticoListener';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Zap } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  const navigate = useNavigate();

  const handleIrParaModoSmart = () => {
    try {
      localStorage.setItem('tracksteel_app_mode', 'smart');
    } catch {
      // ignore
    }
    navigate('/smart');
  };

  return (
    <SidebarProvider>
      <div className="min-h-[calc(100vh-var(--hub-banner-height,0px))] flex w-full">
        <AppSidebar />
        <main className="flex-1 overflow-hidden flex flex-col h-[calc(100vh-var(--hub-banner-height,0px))]">
          {/* Header fixo com SidebarTrigger, Modo Smart e ThemeToggle */}
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center">
              <SidebarTrigger />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleIrParaModoSmart}
                className="h-9 px-3 gap-2 font-semibold border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:text-amber-600 dark:hover:text-amber-300 transition-all rounded-full shadow-sm hover:shadow active:scale-95"
                title="Alternar para o Modo Smart (Chão de Fábrica Touch-First)"
              >
                <Zap className="h-4 w-4 fill-amber-500 text-amber-500 animate-pulse" />
                <span className="text-xs sm:text-sm font-bold tracking-wide">Modo Smart</span>
              </Button>
              <ThemeToggle />
            </div>
          </header>
          {/* Conteúdo principal */}
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
        {/* Listener global para apontamento automático */}
        <ApontamentoAutomaticoListener />
      </div>
    </SidebarProvider>
  );
};
