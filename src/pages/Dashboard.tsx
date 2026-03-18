
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarClock } from '@/components/dashboard/CalendarClock';
import { UserInfo } from '@/components/dashboard/UserInfo';
import { TaskTypeChart } from '@/components/dashboard/TaskTypeChart';
import { TaskStatusChart } from '@/components/dashboard/TaskStatusChart';
import { OnlineUsers } from '@/components/dashboard/OnlineUsers';
import NotificationsSugestoes from '@/components/dashboard/NotificationsSugestoes';
import { BeamsBackground } from '@/components/ui/beams-background';
import { Workflow, BarChart3, Settings, FileText, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <BeamsBackground intensity="subtle">
      <div className="w-full min-h-screen">
        <div className="container mx-auto p-4 space-y-6">
          {/* Header com informações do usuário e botão Fluxo do Sistema */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <p className="text-muted-foreground">Painel de controle e monitoramento avançado</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Card de usuários online */}
              <div className="w-full sm:w-auto">
                <OnlineUsers />
              </div>
              
              {/* Botão Fluxo do Sistema */}
              <Button
                onClick={() => navigate('/mapa-interativo')}
                className="bg-blue-100 hover:bg-blue-200 text-gray-800 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white gap-2 group relative"
                size="lg"
              >
                <Workflow className="w-5 h-5" />
                Fluxo do Sistema
                
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 right-0 px-3 py-2 bg-popover text-popover-foreground text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 w-48 text-left border border-border shadow-md">
                  Use o mapa interativo para
                  <br />
                  entender o fluxo do
                  <br />
                  sistema
                  <div className="absolute top-full right-6 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-popover"></div>
                </div>
              </Button>
            </div>
          </div>

          {/* Grid principal */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Coluna principal esquerda */}
            <div className="lg:col-span-3 space-y-6">
              {/* Cards de acesso rápido */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-green-50 dark:hover:bg-green-950 border-green-200 dark:border-green-800"
                  onClick={() => navigate('/cadastro-of')}
                >
                  <Settings className="w-6 h-6 text-green-600" />
                  <span className="text-xs text-center">Ficha Técnica da OF</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-950 border-blue-200 dark:border-blue-800"
                  onClick={() => navigate('/ofs')}
                >
                  <FileText className="w-6 h-6 text-blue-600" />
                  <span className="text-xs text-center">Painel das OFs</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-purple-50 dark:hover:bg-purple-950 border-purple-200 dark:border-purple-800"
                  onClick={() => navigate('/painel-industrial')}
                >
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                  <span className="text-xs text-center">Painel Industrial</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-orange-50 dark:hover:bg-orange-950 border-orange-200 dark:border-orange-800"
                  onClick={() => navigate('/obra')}
                >
                  <Settings className="w-6 h-6 text-orange-600" />
                  <span className="text-xs text-center">Painel de Obras</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-yellow-50 dark:hover:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
                  onClick={() => navigate('/estoque')}
                >
                  <Settings className="w-6 h-6 text-yellow-600" />
                  <span className="text-xs text-center">Estoque</span>
                </Button>

                <Button
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-950 border-red-200 dark:border-red-800"
                  onClick={() => navigate('/expedicao')}
                >
                  <Settings className="w-6 h-6 text-red-600" />
                  <span className="text-xs text-center">Expedição</span>
                </Button>
              </div>

              {/* Gráficos de tarefas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <TaskTypeChart />
                <TaskStatusChart />
              </div>
            </div>

            {/* Sidebar direita */}
            <div className="space-y-6">
              <UserInfo />
              <CalendarClock />
              <NotificationsSugestoes />
            </div>
          </div>
        </div>
      </div>
    </BeamsBackground>
  );
}
