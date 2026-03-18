
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings } from 'lucide-react';
import { CadastrosObra } from '@/components/obra/CadastrosObra';
import { useIsMobile } from '@/hooks/use-mobile';
import { usePermissionControl } from '@/hooks/usePermissionControl';
import { Card, CardContent } from '@/components/ui/card';

const ObraConfiguracoes = () => {
  const isMobile = useIsMobile();
  const { canAdmin } = usePermissionControl();

  if (!canAdmin()) {
    return (
      <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
        <div className="space-y-1 sm:space-y-2">
          <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
            Configurações da Obra
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Gerencie os cadastros e configurações relacionadas às obras
          </p>
        </div>

        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              Você não tem permissão para acessar as configurações da obra.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-4 lg:p-6">
      <div className="space-y-1 sm:space-y-2">
        <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8" />
          Configurações da Obra
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Gerencie os cadastros e configurações relacionadas às obras
        </p>
      </div>

      <div className="space-y-4">
        <CadastrosObra />
      </div>
    </div>
  );
};

export default ObraConfiguracoes;
