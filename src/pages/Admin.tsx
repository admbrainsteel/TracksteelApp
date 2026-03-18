
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Key, Code, Database, Settings, HardDrive, Play } from 'lucide-react';
import { ApiKeysManager } from '@/components/admin/ApiKeysManager';
import { JsonCodesManager } from '@/components/admin/JsonCodesManager';
import { FunctionsManager } from '@/components/users/FunctionsManager';
import { PrivilegesManager } from '@/components/users/PrivilegesManager';
import BackupManager from '@/components/admin/BackupManager';
import { ApontamentoMassa } from '@/components/admin/ApontamentoMassa';
import { useUserManagement } from '@/hooks/useUserManagement';

const Admin = () => {
  const { 
    functions, 
    privileges,
    createFunction,
    updateFunction,
    deleteFunction,
    createPrivilege: createPrivilegeBase,
    updatePrivilege: updatePrivilegeBase,
    deletePrivilege
  } = useUserManagement();

  // Wrapper functions to match expected signatures
  const createPrivilege = async (data: { name: string; description?: string; permissions: Record<string, boolean> }): Promise<void> => {
    await createPrivilegeBase(data);
  };

  const updatePrivilege = async (id: string, data: { name: string; description?: string; permissions: Record<string, boolean> }): Promise<void> => {
    await updatePrivilegeBase(id, data);
  };

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Administração</h1>
        <p className="text-sm md:text-base text-muted-foreground">Configurações avançadas do sistema</p>
      </div>

      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-7 bg-muted h-auto p-1">
          <TabsTrigger 
            value="api-keys" 
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
          >
            <Key className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">API Keys</span>
            <span className="sm:hidden">Keys</span>
          </TabsTrigger>
          <TabsTrigger 
            value="json-codes" 
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
          >
            <Code className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">JSON Codes</span>
            <span className="sm:hidden">JSON</span>
          </TabsTrigger>
          <TabsTrigger 
            value="functions" 
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
          >
            <Settings className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Funções</span>
            <span className="sm:hidden">Func</span>
          </TabsTrigger>
          <TabsTrigger 
            value="privileges" 
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
          >
            <Shield className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Privilégios</span>
            <span className="sm:hidden">Priv</span>
          </TabsTrigger>
          <TabsTrigger 
            value="apontamento-massa" 
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
          >
            <Play className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Apontamento Massa</span>
            <span className="sm:hidden">Massa</span>
          </TabsTrigger>
          <TabsTrigger 
            value="backup" 
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
          >
            <HardDrive className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Backup</span>
            <span className="sm:hidden">Backup</span>
          </TabsTrigger>
          <TabsTrigger 
            value="database" 
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
          >
            <Database className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Database</span>
            <span className="sm:hidden">DB</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-4 mt-4">
          <Card className="card-mobile">
            <CardHeader className="card-header-mobile">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Key className="h-4 w-4 md:h-5 md:w-5" />
                Gerenciar API Keys
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-mobile">
              <ApiKeysManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="json-codes" className="space-y-4 mt-4">
          <Card className="card-mobile">
            <CardHeader className="card-header-mobile">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Code className="h-4 w-4 md:h-5 md:w-5" />
                Gerenciar JSON Codes
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-mobile">
              <JsonCodesManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="functions" className="space-y-4 mt-4">
          <Card className="card-mobile">
            <CardHeader className="card-header-mobile">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Settings className="h-4 w-4 md:h-5 md:w-5" />
                Gerenciar Funções
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-mobile">
              <FunctionsManager
                functions={functions}
                onCreate={createFunction}
                onUpdate={updateFunction}
                onDelete={deleteFunction}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privileges" className="space-y-4 mt-4">
          <Card className="card-mobile">
            <CardHeader className="card-header-mobile">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Shield className="h-4 w-4 md:h-5 md:w-5" />
                Gerenciar Privilégios
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-mobile">
              <PrivilegesManager
                privileges={privileges}
                onCreate={createPrivilege}
                onUpdate={updatePrivilege}
                onDelete={deletePrivilege}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="apontamento-massa" className="space-y-4 mt-4">
          <ApontamentoMassa />
        </TabsContent>

        <TabsContent value="backup" className="space-y-4 mt-4">
          <Card className="card-mobile">
            <CardHeader className="card-header-mobile">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <HardDrive className="h-4 w-4 md:h-5 md:w-5" />
                Gerenciar Backup
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-mobile">
              <BackupManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="database" className="space-y-4 mt-4">
          <Card className="card-mobile">
            <CardHeader className="card-header-mobile">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Database className="h-4 w-4 md:h-5 md:w-5" />
                Configurações do Database
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-mobile">
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <Database className="mx-auto h-8 w-8 md:h-12 md:w-12 mb-4 opacity-50" />
                <p className="text-sm md:text-base">Configurações do database estarão disponíveis em breve</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Admin;
