
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Users, Cloud, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { 
  useRecursosObra, 
  useCondicoesClimaticas, 
  useMotivosImprodutivos, 
  useCreateRecursoObra,
  useCreateMotivoImprodutivo,
  useUpdateMotivoImprodutivo,
  useDeleteMotivoImprodutivo
} from '@/hooks/useObra';
import { toast } from 'sonner';

export const CadastrosObra: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Cadastros Gerais para RDO</h2>
        <p className="text-sm text-muted-foreground">Gerencie os cadastros auxiliares do módulo de obra</p>
      </div>

      <Tabs defaultValue="recursos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="recursos" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Recursos de Obra
          </TabsTrigger>
          <TabsTrigger value="clima" className="flex items-center gap-2">
            <Cloud className="w-4 h-4" />
            Condições Climáticas
          </TabsTrigger>
          <TabsTrigger value="motivos" className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Motivos Improdutivos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recursos">
          <RecursosObraTab />
        </TabsContent>

        <TabsContent value="clima">
          <CondicoesClimaticasTab />
        </TabsContent>

        <TabsContent value="motivos">
          <MotivosImprodutivoTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

const RecursosObraTab: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [novoRecurso, setNovoRecurso] = useState({
    tipo_recurso: '',
    nome_recurso: '',
    descricao: '',
  });

  const { data: recursos, isLoading } = useRecursosObra();
  const createRecurso = useCreateRecursoObra();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!novoRecurso.tipo_recurso || !novoRecurso.nome_recurso) {
      toast.error('Tipo e nome do recurso são obrigatórios');
      return;
    }

    try {
      await createRecurso.mutateAsync(novoRecurso);
      setNovoRecurso({ tipo_recurso: '', nome_recurso: '', descricao: '' });
      setIsAdding(false);
    } catch (error) {
      console.error('Erro ao criar recurso:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Recursos de Obra</h3>
        <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Recurso
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>Novo Recurso de Obra</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tipo de Recurso *</label>
                  <Select 
                    value={novoRecurso.tipo_recurso} 
                    onValueChange={(value) => setNovoRecurso(prev => ({ ...prev, tipo_recurso: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mão de Obra">Mão de Obra</SelectItem>
                      <SelectItem value="Equipamento">Equipamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Nome do Recurso *</label>
                  <Input
                    value={novoRecurso.nome_recurso}
                    onChange={(e) => setNovoRecurso(prev => ({ ...prev, nome_recurso: e.target.value }))}
                    placeholder="Ex: Montador, Guindaste 50t"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={novoRecurso.descricao}
                  onChange={(e) => setNovoRecurso(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição opcional do recurso"
                  className="h-20"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAdding(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createRecurso.isPending}>
                  {createRecurso.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {recursos?.map((recurso) => (
          <Card key={recurso.id} className="py-2">
            <CardContent className="p-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{recurso.nome_recurso}</h4>
                    <Badge variant="secondary" className="text-xs">{recurso.tipo_recurso}</Badge>
                  </div>
                  {recurso.descricao && (
                    <p className="text-xs text-muted-foreground">{recurso.descricao}</p>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!recursos || recursos.length === 0) && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold text-card-foreground mb-2">Nenhum recurso cadastrado</h3>
              <p className="text-muted-foreground text-sm max-w-md mb-4">
                Cadastre recursos como mão de obra e equipamentos para usar nos RDOs.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

const CondicoesClimaticasTab: React.FC = () => {
  const { data: condicoes, isLoading } = useCondicoesClimaticas();

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Condições Climáticas</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {condicoes?.map((condicao) => (
          <Card key={condicao.id} className="py-2">
            <CardContent className="p-3 text-center">
              <div className="space-y-2">
                <div className="text-xl">
                  {condicao.icone === 'sun' && '☀️'}
                  {condicao.icone === 'cloud' && '☁️'}
                  {condicao.icone === 'cloud-rain' && '🌧️'}
                  {condicao.icone === 'wind' && '💨'}
                  {condicao.icone === 'cloud-drizzle' && '🌦️'}
                </div>
                <h4 className="font-medium text-sm">{condicao.nome}</h4>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

const MotivosImprodutivoTab: React.FC = () => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingMotivo, setEditingMotivo] = useState<string | null>(null);
  const [novoMotivo, setNovoMotivo] = useState({
    motivo: '',
    descricao: '',
    categoria: 'Empresa Montadora' as 'Cliente' | 'Empresa Montadora' | 'Contratada' | 'Terceiros Indiretos',
  });

  const { data: motivos, isLoading } = useMotivosImprodutivos();
  const createMotivo = useCreateMotivoImprodutivo();
  const updateMotivo = useUpdateMotivoImprodutivo();
  const deleteMotivo = useDeleteMotivoImprodutivo();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!novoMotivo.motivo) {
      toast.error('O motivo é obrigatório');
      return;
    }

    try {
      if (editingMotivo) {
        await updateMotivo.mutateAsync({ id: editingMotivo, ...novoMotivo });
        setEditingMotivo(null);
      } else {
        await createMotivo.mutateAsync(novoMotivo);
      }
      setNovoMotivo({ motivo: '', descricao: '', categoria: 'Empresa Montadora' });
      setIsAdding(false);
    } catch (error) {
      console.error('Erro ao salvar motivo:', error);
    }
  };

  const handleEdit = (motivo: any) => {
    setNovoMotivo({
      motivo: motivo.motivo,
      descricao: motivo.descricao || '',
      categoria: motivo.categoria,
    });
    setEditingMotivo(motivo.id);
    setIsAdding(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente remover este motivo improdutivo?')) {
      await deleteMotivo.mutateAsync(id);
    }
  };

  const motivosPorCategoria = motivos?.reduce((acc, motivo) => {
    if (!acc[motivo.categoria]) {
      acc[motivo.categoria] = [];
    }
    acc[motivo.categoria].push(motivo);
    return acc;
  }, {} as Record<string, typeof motivos>) || {};

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Motivos Improdutivos</h3>
        <Button onClick={() => setIsAdding(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Motivo
        </Button>
      </div>

      {isAdding && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>{editingMotivo ? 'Editar Motivo' : 'Novo Motivo Improdutivo'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Motivo *</label>
                  <Input
                    value={novoMotivo.motivo}
                    onChange={(e) => setNovoMotivo(prev => ({ ...prev, motivo: e.target.value }))}
                    placeholder="Ex: Chuva, Falta de Material"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Categoria *</label>
                  <Select 
                    value={novoMotivo.categoria} 
                    onValueChange={(value: any) => setNovoMotivo(prev => ({ ...prev, categoria: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cliente">Cliente</SelectItem>
                      <SelectItem value="Empresa Montadora">Empresa Montadora</SelectItem>
                      <SelectItem value="Contratada">Contratada</SelectItem>
                      <SelectItem value="Terceiros Indiretos">Terceiros Indiretos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Descrição</label>
                <Textarea
                  value={novoMotivo.descricao}
                  onChange={(e) => setNovoMotivo(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Descrição detalhada do motivo"
                  className="h-20"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsAdding(false);
                    setEditingMotivo(null);
                    setNovoMotivo({ motivo: '', descricao: '', categoria: 'Empresa Montadora' });
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMotivo.isPending || updateMotivo.isPending}>
                  {createMotivo.isPending || updateMotivo.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        {Object.entries(motivosPorCategoria).map(([categoria, motivosCategoria]) => (
          <div key={categoria}>
            <h4 className="font-medium text-sm mb-2 text-muted-foreground">{categoria}</h4>
            <div className="grid gap-2">
              {motivosCategoria?.map((motivo) => (
                <Card key={motivo.id} className="py-1">
                  <CardContent className="p-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <h5 className="font-medium text-sm">{motivo.motivo}</h5>
                        {motivo.descricao && (
                          <p className="text-xs text-muted-foreground">{motivo.descricao}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0"
                          onClick={() => handleEdit(motivo)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-7 w-7 p-0 text-destructive"
                          onClick={() => handleDelete(motivo.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {(!motivos || motivos.length === 0) && !isLoading && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8 text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-lg font-semibold text-card-foreground mb-2">Nenhum motivo cadastrado</h3>
              <p className="text-muted-foreground text-sm max-w-md mb-4">
                Cadastre motivos improdutivos para classificar paradas de trabalho nos RDOs.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
