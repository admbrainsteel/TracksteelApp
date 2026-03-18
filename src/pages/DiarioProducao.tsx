import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Save, X, Camera, Upload, FileText, Trash2, Edit, Eye, Printer } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDiarioProducao, type RecursoProducao, type ApontamentoDiarioRecurso, type LoteSoldaDiario } from '@/hooks/useDiarioProducao';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useFichaTecnica } from '@/hooks/useFichaTecnica';

interface DiarioData {
  id?: string;
  data: string;
  tecnico: string;
  turno: string;
  ofs: string[];
  apontamentos: { [ofId: string]: { [recursoId: string]: { inicio: number; meio: number; fim: number; segundo: number } } };
  lotesSolda: { [ofId: string]: string };
  ocorrencias: string[];
  observacoes: string;
  fotos: File[];
}

const DiarioProducao = () => {
  const [activeTab, setActiveTab] = useState('diario');
  const [selectedOF, setSelectedOF] = useState('');
  const [showOFModal, setShowOFModal] = useState(false);
  const [viewDiario, setViewDiario] = useState(null);
  
  const { profile: userProfile } = useUserProfile();
  const { fichasTecnicas, isLoadingFichas } = useFichaTecnica();
  const { 
    diarios, 
    recursos, 
    ocorrencias, 
    isLoadingRecursos, 
    isLoadingOcorrencias,
    salvarDiario,
    salvarApontamentos,
    salvarLotesSolda,
    salvarOcorrenciasDiario,
    deletarDiario
  } = useDiarioProducao();

  const [currentDiario, setCurrentDiario] = useState<DiarioData>({
    data: new Date().toISOString().split('T')[0],
    tecnico: userProfile?.full_name || 'Técnico',
    turno: '',
    ofs: [],
    apontamentos: {},
    lotesSolda: {},
    ocorrencias: [],
    observacoes: '',
    fotos: []
  });

  // Atualizar nome do técnico quando perfil carrega
  useEffect(() => {
    if (userProfile?.full_name) {
      setCurrentDiario(prev => ({
        ...prev,
        tecnico: userProfile.full_name
      }));
    }
  }, [userProfile]);

  const adicionarOF = () => {
    if (selectedOF && !currentDiario.ofs.includes(selectedOF)) {
      setCurrentDiario(prev => {
        const newApontamentos = { ...prev.apontamentos };
        const newLotesSolda = { ...prev.lotesSolda };
        
        if (recursos) {
          newApontamentos[selectedOF] = recursos.reduce((acc, recurso) => ({
            ...acc,
            [recurso.id]: { inicio: 0, meio: 0, fim: 0, segundo: 0 }
          }), {});
        }
        
        newLotesSolda[selectedOF] = '';
        
        return {
          ...prev,
          ofs: [...prev.ofs, selectedOF],
          apontamentos: newApontamentos,
          lotesSolda: newLotesSolda
        };
      });
      setSelectedOF('');
      setShowOFModal(false);
    }
  };

  const removerOF = (ofId: string) => {
    setCurrentDiario(prev => {
      const newApontamentos = { ...prev.apontamentos };
      const newLotesSolda = { ...prev.lotesSolda };
      delete newApontamentos[ofId];
      delete newLotesSolda[ofId];
      
      return {
        ...prev,
        ofs: prev.ofs.filter(id => id !== ofId),
        apontamentos: newApontamentos,
        lotesSolda: newLotesSolda
      };
    });
  };

  const atualizarApontamento = (ofId: string, recursoId: string, periodo: 'inicio' | 'meio' | 'fim' | 'segundo', valor: number) => {
    setCurrentDiario(prev => ({
      ...prev,
      apontamentos: {
        ...prev.apontamentos,
        [ofId]: {
          ...prev.apontamentos[ofId],
          [recursoId]: {
            ...prev.apontamentos[ofId][recursoId],
            [periodo]: valor
          }
        }
      }
    }));
  };

  const salvarDiarioCompleto = async () => {
    try {
      // 1. Salvar o diário principal
      const diarioSalvo = await salvarDiario.mutateAsync({
        data: currentDiario.data,
        tecnico_responsavel: currentDiario.tecnico,
        turno: currentDiario.turno,
        observacoes_gerais: currentDiario.observacoes,
        fotos_urls: [], // TODO: implementar upload de fotos
        finalizado: false
      });

      if (diarioSalvo?.id) {
        // 2. Salvar apontamentos de recursos
        const apontamentosParaSalvar: ApontamentoDiarioRecurso[] = [];
        Object.entries(currentDiario.apontamentos).forEach(([ofId, recursosData]) => {
          Object.entries(recursosData).forEach(([recursoId, quantidades]) => {
            apontamentosParaSalvar.push({
              diario_id: diarioSalvo.id,
              of_number: ofId,
              recurso_id: recursoId,
              qtd_inicio: quantidades.inicio,
              qtd_meio: quantidades.meio,
              qtd_fim: quantidades.fim,
              qtd_segundo_turno: quantidades.segundo
            });
          });
        });

        if (apontamentosParaSalvar.length > 0) {
          await salvarApontamentos.mutateAsync(apontamentosParaSalvar);
        }

        // 3. Salvar lotes de solda
        const lotesParaSalvar: LoteSoldaDiario[] = Object.entries(currentDiario.lotesSolda)
          .filter(([, lote]) => lote.trim() !== '')
          .map(([ofId, lote]) => ({
            diario_id: diarioSalvo.id,
            of_number: ofId,
            lote_solda: lote
          }));

        if (lotesParaSalvar.length > 0) {
          await salvarLotesSolda.mutateAsync(lotesParaSalvar);
        }

        // 4. Salvar ocorrências
        if (currentDiario.ocorrencias.length > 0 && ocorrencias) {
          const ocorrenciaIds = ocorrencias
            .filter(oc => currentDiario.ocorrencias.includes(oc.descricao))
            .map(oc => oc.id);

          if (ocorrenciaIds.length > 0) {
            await salvarOcorrenciasDiario.mutateAsync({
              diario_id: diarioSalvo.id,
              ocorrencia_ids: ocorrenciaIds
            });
          }
        }

        // Limpar formulário
        setCurrentDiario({
          data: new Date().toISOString().split('T')[0],
          tecnico: userProfile?.full_name || 'Técnico',
          turno: '',
          ofs: [],
          apontamentos: {},
          lotesSolda: {},
          ocorrencias: [],
          observacoes: '',
          fotos: []
        });

        setActiveTab('historico');
      }
    } catch (error) {
      console.error('Erro ao salvar diário completo:', error);
    }
  };

  const getFichaTecnicaByOF = (ofNumber: string) => {
    return fichasTecnicas?.find(ficha => ficha.of_number === ofNumber);
  };

  const getOFDisplayName = (ofNumber: string) => {
    const ficha = getFichaTecnicaByOF(ofNumber);
    return ficha ? `${ofNumber}: ${ficha.descricao_resumida || 'Sem descrição'}` : ofNumber;
  };

  // Filtrar OFs disponíveis que não foram ainda adicionadas
  const ofsDisponiveis = fichasTecnicas?.filter(ficha => 
    ficha.of_number && !currentDiario.ofs.includes(ficha.of_number)
  ) || [];

  if (isLoadingRecursos || isLoadingOcorrencias || isLoadingFichas) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-2 md:p-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">Diário de Produção</h1>
        <p className="text-sm md:text-base text-muted-foreground">Registro de uso de recursos em Ordens de Fabricação</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="diario">Novo Diário</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
        </TabsList>

        {/* ABA NOVO DIÁRIO */}
        <TabsContent value="diario" className="space-y-6">
          <Card className="card-mobile">
            <CardHeader className="card-header-mobile">
              <CardTitle className="text-lg md:text-xl text-foreground">Informações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="card-content-mobile space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="data">Data</Label>
                  <Input
                    id="data"
                    type="date"
                    value={currentDiario.data}
                    onChange={(e) => setCurrentDiario(prev => ({ ...prev, data: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="tecnico">Técnico Responsável</Label>
                  <Input
                    id="tecnico"
                    value={currentDiario.tecnico}
                    onChange={(e) => setCurrentDiario(prev => ({ ...prev, tecnico: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="turno">Turno</Label>
                  <Select value={currentDiario.turno} onValueChange={(value) => setCurrentDiario(prev => ({ ...prev, turno: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o turno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-manha">1º Turno - Manhã</SelectItem>
                      <SelectItem value="1-tarde">1º Turno - Tarde</SelectItem>
                      <SelectItem value="2-turno">2º Turno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* APONTAMENTO POR OF */}
          <Card className="card-mobile">
            <CardHeader className="card-header-mobile">
              <CardTitle className="text-lg md:text-xl text-foreground flex items-center justify-between">
                Apontamento de Recursos por OF
                <Dialog open={showOFModal} onOpenChange={setShowOFModal}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      Adicionar OF
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Selecionar OF</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {ofsDisponiveis.length === 0 ? (
                        <p className="text-center text-muted-foreground py-4">
                          Nenhuma OF disponível para seleção
                        </p>
                      ) : (
                        <Select value={selectedOF} onValueChange={setSelectedOF}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma OF" />
                          </SelectTrigger>
                          <SelectContent>
                            {ofsDisponiveis.map(ficha => (
                              <SelectItem key={ficha.of_number} value={ficha.of_number}>
                                {getOFDisplayName(ficha.of_number)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <div className="flex gap-2">
                        <Button 
                          onClick={adicionarOF} 
                          className="flex-1"
                          disabled={!selectedOF || ofsDisponiveis.length === 0}
                        >
                          Adicionar
                        </Button>
                        <Button variant="outline" onClick={() => setShowOFModal(false)} className="flex-1">Cancelar</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent className="card-content-mobile space-y-6">
              {currentDiario.ofs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma OF adicionada. Clique em "Adicionar OF" para começar.</p>
              ) : (
                currentDiario.ofs.map(ofId => (
                  <div key={ofId} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-lg">
                        <Badge variant="outline" className="mr-2">{ofId}</Badge>
                        {getFichaTecnicaByOF(ofId)?.descricao_resumida || 'Sem descrição'}
                      </h3>
                      <Button variant="ghost" size="sm" onClick={() => removerOF(ofId)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Tabela de Recursos */}
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300 text-sm">
                        <thead>
                          <tr className="bg-muted">
                            <th className="border border-gray-300 p-2 text-left">Recurso</th>
                            <th className="border border-gray-300 p-2 text-center">Início</th>
                            <th className="border border-gray-300 p-2 text-center">Meio-dia</th>
                            <th className="border border-gray-300 p-2 text-center">Fim</th>
                            <th className="border border-gray-300 p-2 text-center">2º Turno</th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* Máquinas */}
                          <tr>
                            <td colSpan={5} className="border border-gray-300 p-2 bg-slate-100 font-semibold">Máquinas</td>
                          </tr>
                          {recursos?.filter(r => r.tipo === 'maquina').map(recurso => (
                            <tr key={recurso.id}>
                              <td className="border border-gray-300 p-2">{recurso.nome}</td>
                              <td className="border border-gray-300 p-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={currentDiario.apontamentos[ofId]?.[recurso.id]?.inicio || 0}
                                  onChange={(e) => atualizarApontamento(ofId, recurso.id, 'inicio', parseInt(e.target.value) || 0)}
                                  className="w-full h-8"
                                />
                              </td>
                              <td className="border border-gray-300 p-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={currentDiario.apontamentos[ofId]?.[recurso.id]?.meio || 0}
                                  onChange={(e) => atualizarApontamento(ofId, recurso.id, 'meio', parseInt(e.target.value) || 0)}
                                  className="w-full h-8"
                                />
                              </td>
                              <td className="border border-gray-300 p-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={currentDiario.apontamentos[ofId]?.[recurso.id]?.fim || 0}
                                  onChange={(e) => atualizarApontamento(ofId, recurso.id, 'fim', parseInt(e.target.value) || 0)}
                                  className="w-full h-8"
                                />
                              </td>
                              <td className="border border-gray-300 p-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={currentDiario.apontamentos[ofId]?.[recurso.id]?.segundo || 0}
                                  onChange={(e) => atualizarApontamento(ofId, recurso.id, 'segundo', parseInt(e.target.value) || 0)}
                                  className="w-full h-8"
                                />
                              </td>
                            </tr>
                          ))}
                          
                          {/* Operários */}
                          <tr>
                            <td colSpan={5} className="border border-gray-300 p-2 bg-slate-100 font-semibold">Operários</td>
                          </tr>
                          {recursos?.filter(r => r.tipo === 'operario').map(recurso => (
                            <tr key={recurso.id}>
                              <td className="border border-gray-300 p-2">{recurso.nome}</td>
                              <td className="border border-gray-300 p-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={currentDiario.apontamentos[ofId]?.[recurso.id]?.inicio || 0}
                                  onChange={(e) => atualizarApontamento(ofId, recurso.id, 'inicio', parseInt(e.target.value) || 0)}
                                  className="w-full h-8"
                                />
                              </td>
                              <td className="border border-gray-300 p-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={currentDiario.apontamentos[ofId]?.[recurso.id]?.meio || 0}
                                  onChange={(e) => atualizarApontamento(ofId, recurso.id, 'meio', parseInt(e.target.value) || 0)}
                                  className="w-full h-8"
                                />
                              </td>
                              <td className="border border-gray-300 p-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={currentDiario.apontamentos[ofId]?.[recurso.id]?.fim || 0}
                                  onChange={(e) => atualizarApontamento(ofId, recurso.id, 'fim', parseInt(e.target.value) || 0)}
                                  className="w-full h-8"
                                />
                              </td>
                              <td className="border border-gray-300 p-1">
                                <Input
                                  type="number"
                                  min="0"
                                  value={currentDiario.apontamentos[ofId]?.[recurso.id]?.segundo || 0}
                                  onChange={(e) => atualizarApontamento(ofId, recurso.id, 'segundo', parseInt(e.target.value) || 0)}
                                  className="w-full h-8"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Lote de Solda */}
                    <div>
                      <Label htmlFor={`lote-${ofId}`}>Lote de Insumo de Solda Utilizado</Label>
                      <Input
                        id={`lote-${ofId}`}
                        value={currentDiario.lotesSolda[ofId] || ''}
                        onChange={(e) => setCurrentDiario(prev => ({
                          ...prev,
                          lotesSolda: { ...prev.lotesSolda, [ofId]: e.target.value }
                        }))}
                        placeholder="Ex: LOTE-SOLDA-XYZ-001"
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* OCORRÊNCIAS E OBSERVAÇÕES */}
          <Card className="card-mobile">
            <CardHeader className="card-header-mobile">
              <CardTitle className="text-lg md:text-xl text-foreground">Ocorrências e Observações Gerais</CardTitle>
            </CardHeader>
            <CardContent className="card-content-mobile space-y-6">
              <div>
                <Label className="text-base font-medium mb-3 block">Ocorrências de Improdutividade</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {ocorrencias?.map((ocorrencia) => (
                    <div key={ocorrencia.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`ocorrencia-${ocorrencia.id}`}
                        checked={currentDiario.ocorrencias.includes(ocorrencia.descricao)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setCurrentDiario(prev => ({
                              ...prev,
                              ocorrencias: [...prev.ocorrencias, ocorrencia.descricao]
                            }));
                          } else {
                            setCurrentDiario(prev => ({
                              ...prev,
                              ocorrencias: prev.ocorrencias.filter(o => o !== ocorrencia.descricao)
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`ocorrencia-${ocorrencia.id}`} className="text-sm">{ocorrencia.descricao}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="observacoes">Observações Gerais</Label>
                <Textarea
                  id="observacoes"
                  value={currentDiario.observacoes}
                  onChange={(e) => setCurrentDiario(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Descreva qualquer situação não prevista, problemas encontrados ou informações relevantes sobre o dia de produção..."
                  rows={4}
                />
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">Anexar Fotos</Label>
                <div className="flex gap-3">
                  <Button variant="outline" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    Upload de Arquivo
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    Tirar Foto
                  </Button>
                </div>
                {currentDiario.fotos.length > 0 && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    {currentDiario.fotos.length} foto(s) anexada(s)
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button 
                  onClick={salvarDiarioCompleto} 
                  className="flex items-center gap-2"
                  disabled={salvarDiario.isPending}
                >
                  <Save className="h-4 w-4" />
                  {salvarDiario.isPending ? 'Salvando...' : 'Salvar Diário'}
                </Button>
                <Button variant="outline" onClick={() => setCurrentDiario({
                  data: new Date().toISOString().split('T')[0],
                  tecnico: userProfile?.full_name || 'Técnico',
                  turno: '',
                  ofs: [],
                  apontamentos: {},
                  lotesSolda: {},
                  ocorrencias: [],
                  observacoes: '',
                  fotos: []
                })}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA HISTÓRICO */}
        <TabsContent value="historico" className="space-y-4">
          <Card className="card-mobile">
            <CardHeader className="card-header-mobile">
              <CardTitle className="text-lg md:text-xl text-foreground">Histórico de Diários</CardTitle>
            </CardHeader>
            <CardContent className="card-content-mobile">
              {!diarios || diarios.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum diário salvo ainda.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Data</th>
                        <th className="text-left p-2">Turno</th>
                        <th className="text-left p-2">Técnico</th>
                        <th className="text-center p-2">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {diarios.map((diario) => (
                        <tr key={diario.id} className="border-b">
                          <td className="p-2">{new Date(diario.data).toLocaleDateString('pt-BR')}</td>
                          <td className="p-2">{diario.turno}</td>
                          <td className="p-2">{diario.tecnico_responsavel}</td>
                          <td className="p-2">
                            <div className="flex gap-1 justify-center">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => diario.id && deletarDiario.mutate(diario.id)}
                                disabled={deletarDiario.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA DASHBOARD */}
        <TabsContent value="dashboard" className="space-y-4">
          <Card className="card-mobile">
            <CardHeader className="card-header-mobile">
              <CardTitle className="text-lg md:text-xl text-foreground">Dashboard e Relatórios</CardTitle>
            </CardHeader>
            <CardContent className="card-content-mobile">
              <p className="text-center text-muted-foreground py-8">Dashboard em desenvolvimento...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DiarioProducao;
