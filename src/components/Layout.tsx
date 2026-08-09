
import React from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { ApontamentoAutomaticoListener } from '@/components/expedicao/ApontamentoAutomaticoListener';
import { ThemeToggle } from '@/components/ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Header fixo com SidebarTrigger e ThemeToggle */}
          <header className="h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center">
              <SidebarTrigger />
            </div>
            <ThemeToggle />
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
