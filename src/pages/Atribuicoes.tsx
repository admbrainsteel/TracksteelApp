
import React from 'react';
import { StandardPageLayout } from '@/components/layout/StandardPageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AtribuicoesForm } from '@/components/atribuicoes/AtribuicoesForm';
import { AtribuicoesTable } from '@/components/atribuicoes/AtribuicoesTable';
import { useAtribuicoes } from '@/hooks/useAtribuicoes';
import { useMobileResponsive } from '@/hooks/useMobileResponsive';

function Atribuicoes() {
  const { canManage } = useAtribuicoes();
  const { isMobile } = useMobileResponsive();

  return (
    <StandardPageLayout 
      title="Atribuições"
      subtitle={canManage ? "Gerencie as atribuições de todos os usuários" : "Visualize suas atribuições"}
    >
      <div className="space-y-6">
        <Tabs defaultValue={canManage ? "cadastro" : "tabela"} className="w-full">
          <TabsList className={`grid w-full ${canManage ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {canManage && (
              <TabsTrigger value="cadastro" className={isMobile ? 'text-sm' : ''}>
                Cadastro
              </TabsTrigger>
            )}
            <TabsTrigger value="tabela" className={isMobile ? 'text-sm' : ''}>
              {canManage ? 'Tabela Geral' : 'Minhas Atribuições'}
            </TabsTrigger>
          </TabsList>

          {canManage && (
            <TabsContent value="cadastro" className="space-y-6">
              <AtribuicoesForm />
            </TabsContent>
          )}

          <TabsContent value="tabela" className="space-y-6">
            <AtribuicoesTable />
          </TabsContent>
        </Tabs>
      </div>
    </StandardPageLayout>
  );
}

export default Atribuicoes;
