
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Search, Download, Filter, Truck } from 'lucide-react';
import { useOFsConcluidas } from '@/hooks/useOFsConcluidas';
import { OFConcluidaCard } from '@/components/of/OFConcluidaCard';
import { toast } from 'sonner';

const OFsConcluidas = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('concluidas');
  const { 
    ofsConcluidas, 
    ofsEntregues, 
    entregarOF, 
    reverterEntregueParaConcluida,
    reverterConcluidaParaAtiva,
    loading 
  } = useOFsConcluidas();

  const handleEntregarOF = async (of: any) => {
    try {
      await entregarOF(of.id);
      toast.success('OF marcada como entregue com sucesso!');
    } catch (error) {
      toast.error('Erro ao marcar OF como entregue');
    }
  };

  const handleReverterEntregue = async (of: any) => {
    try {
      await reverterEntregueParaConcluida(of.id);
      toast.success('OF revertida para concluída com sucesso!');
    } catch (error) {
      toast.error('Erro ao reverter OF entregue');
    }
  };

  const handleReverterConcluida = async (of: any) => {
    try {
      await reverterConcluidaParaAtiva(of.id);
      toast.success('OF reativada com sucesso!');
    } catch (error) {
      toast.error('Erro ao reativar OF');
    }
  };

  const filterOFs = (ofs: any[]) => {
    if (!searchTerm) return ofs;
    return ofs.filter(of => 
      of.num_of.toLowerCase().includes(searchTerm.toLowerCase()) ||
      of.descritivo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const filteredOfsConcluidas = filterOFs(ofsConcluidas);
  const filteredOfsEntregues = filterOFs(ofsEntregues);

  if (loading) {
    return (
      <div className="space-y-4 md:space-y-6 p-2 md:p-0">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-slate-400 mt-2 text-sm">Carregando OFs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">OFs Concluídas</h1>
          <p className="text-sm md:text-base text-muted-foreground">Histórico de ordens de fabricação finalizadas</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button 
            variant="outline"
            className="mobile-full-width text-xs md:text-sm"
          >
            <Download className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Exportar
          </Button>
          <Button 
            variant="outline"
            className="mobile-full-width text-xs md:text-sm"
          >
            <Filter className="w-3 h-3 md:w-4 md:h-4 mr-2" />
            Filtrar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 bg-muted h-auto p-1">
          <TabsTrigger 
            value="concluidas" 
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
          >
            <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Concluídas ({filteredOfsConcluidas.length})</span>
            <span className="sm:hidden">Concl ({filteredOfsConcluidas.length})</span>
          </TabsTrigger>
          <TabsTrigger 
            value="entregues" 
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
          >
            <Truck className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Entregues ({filteredOfsEntregues.length})</span>
            <span className="sm:hidden">Entr ({filteredOfsEntregues.length})</span>
          </TabsTrigger>
          <TabsTrigger 
            value="relatorios" 
            className="flex items-center gap-1 md:gap-2 text-xs md:text-sm p-2 md:p-3"
          >
            <Download className="h-3 w-3 md:h-4 md:w-4" />
            <span className="hidden sm:inline">Relatórios</span>
            <span className="sm:hidden">Rel</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="concluidas" className="space-y-4 mt-4">
          <Card className="card-mobile">
            <CardHeader className="card-header-mobile">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
                OFs Concluídas
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-mobile space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3 sm:w-4 sm:h-4" />
                  <Input
                    placeholder="Buscar OFs concluídas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 sm:pl-10 text-xs sm:text-sm"
                  />
                </div>
              </div>
              
              {filteredOfsConcluidas.length === 0 ? (
                <div className="text-center py-6 md:py-8 text-muted-foreground">
                  <CheckCircle className="mx-auto h-8 w-8 md:h-12 md:w-12 mb-4 opacity-50" />
                  <p className="text-sm md:text-base">
                    {searchTerm ? 'Nenhuma OF concluída encontrada com esse termo' : 'Nenhuma OF concluída encontrada'}
                  </p>
                  <p className="text-xs md:text-sm mt-2">As OFs finalizadas aparecerão aqui</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 lg:gap-6">
                  {filteredOfsConcluidas.map((of) => (
                     <OFConcluidaCard 
                      key={of.id}
                      of={of}
                      onEntregar={handleEntregarOF}
                      onReverterConcluida={handleReverterConcluida}
                      showEntregarButton={true}
                      showAdminButtons={true}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="entregues" className="space-y-4 mt-4">
          <Card className="card-mobile">
            <CardHeader className="card-header-mobile">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Truck className="h-4 w-4 md:h-5 md:w-5" />
                OFs Entregues
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-mobile space-y-4">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-3 h-3 sm:w-4 sm:h-4" />
                  <Input
                    placeholder="Buscar OFs entregues..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 sm:pl-10 text-xs sm:text-sm"
                  />
                </div>
              </div>

              {filteredOfsEntregues.length === 0 ? (
                <div className="text-center py-6 md:py-8 text-muted-foreground">
                  <Truck className="mx-auto h-8 w-8 md:h-12 md:w-12 mb-4 opacity-50" />
                  <p className="text-sm md:text-base">
                    {searchTerm ? 'Nenhuma OF entregue encontrada com esse termo' : 'Nenhuma OF entregue encontrada'}
                  </p>
                  <p className="text-xs md:text-sm mt-2">As OFs entregues aparecerão aqui</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:gap-4 lg:gap-6">
                  {filteredOfsEntregues.map((of) => (
                     <OFConcluidaCard 
                      key={of.id}
                      of={of}
                      onReverterEntregue={handleReverterEntregue}
                      showEntregarButton={false}
                      showAdminButtons={true}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-4 mt-4">
          <Card className="card-mobile">
            <CardHeader className="card-header-mobile">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Download className="h-4 w-4 md:h-5 md:w-5" />
                Relatórios de OFs Concluídas
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-mobile">
              <div className="text-center py-6 md:py-8 text-muted-foreground">
                <Download className="mx-auto h-8 w-8 md:h-12 md:w-12 mb-4 opacity-50" />
                <p className="text-sm md:text-base">Relatórios em desenvolvimento</p>
                <p className="text-xs md:text-sm mt-2">Em breve você poderá gerar relatórios detalhados</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OFsConcluidas;
