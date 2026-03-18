import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  DiarioObraRDO,
  useCondicoesClimaticas,
  useCreateDiarioObra,
  useUpdateDiarioObra,
  useCheckExistingRDO,
} from '@/hooks/useObra';
import { usePecasExpedidas } from '@/hooks/usePecasExpedidas';
import {
  useApontamentosPecaObra,
  useCreateApontamentoPeca,
  useUpdateApontamentoPeca,
  useDeleteApontamentoPeca,
  NovoApontamentoPeca,
} from '@/hooks/useApontamentosPecaObra';
import {
  useRecursosObra,
  useMotivosImprodutivos,
} from '@/hooks/useObra';
import {
  useApontamentosRecursosObra,
  useCreateApontamentoRecurso,
  useDeleteApontamentoRecurso,
} from '@/hooks/useRDORecursos';
import {
  useApontamentosImprodutivos,
  useCreateApontamentoImprodutivo,
  useDeleteApontamentoImprodutivo,
} from '@/hooks/useRDOImprodutivos';
import { PecaSelector } from './PecaSelector';
import { ApontamentoPecasList } from './ApontamentoPecasList';
import { RecursoSelector } from './RecursoSelector';
import { RecursosList } from './RecursosList';
import { ImprodutivosSelector } from './ImprodutivosSelector';
import { ImproduitvosList } from './ImproditivosList';

interface RDOWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  obraAtual: string;
  rdoParaEdicao?: DiarioObraRDO | null;
}

type WizardStep = 'info' | 'pecas' | 'resumo';

export const RDOWizardModal: React.FC<RDOWizardModalProps> = ({
  isOpen,
  onClose,
  obraAtual,
  rdoParaEdicao
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('info');
  const [formData, setFormData] = useState({
    data: new Date(),
    condicao_climatica_id: '',
    temperatura_aproximada: '',
    hora_inicio: '',
    hora_fim: '',
    observacoes_gerais: '',
  });

  const { data: condicoesClimaticas } = useCondicoesClimaticas();
  const { data: recursosObra } = useRecursosObra();
  const { data: motivosImprodutivos } = useMotivosImprodutivos();
  const { data: pecasExpedidas = [], isLoading: loadingPecas } = usePecasExpedidas(obraAtual);
  const createRDO = useCreateDiarioObra();
  const updateRDO = useUpdateDiarioObra();
  const checkExistingRDO = useCheckExistingRDO();

  // Estados para peças, recursos e improdutivos (só carrega quando necessário)
  const [rdoId, setRdoId] = useState<string | null>(rdoParaEdicao?.id || null);
  const { data: apontamentosPecas = [], refetch: refetchApontamentos } = useApontamentosPecaObra(rdoId);
  const { data: apontamentosRecursos = [], refetch: refetchRecursos } = useApontamentosRecursosObra(rdoId);
  const { data: apontamentosImprodutivos = [], refetch: refetchImprodutivos } = useApontamentosImprodutivos(rdoId);
  
  const createApontamento = useCreateApontamentoPeca();
  const updateApontamento = useUpdateApontamentoPeca();
  const deleteApontamento = useDeleteApontamentoPeca();
  
  const createRecurso = useCreateApontamentoRecurso();
  const deleteRecurso = useDeleteApontamentoRecurso();
  
  const createImprodutivo = useCreateApontamentoImprodutivo();
  const deleteImprodutivo = useDeleteApontamentoImprodutivo();

  const [editingApontamento, setEditingApontamento] = useState<any>(null);

  useEffect(() => {
    if (rdoParaEdicao) {
      setFormData({
        data: new Date(rdoParaEdicao.data),
        condicao_climatica_id: rdoParaEdicao.condicao_climatica_id || '',
        temperatura_aproximada: rdoParaEdicao.temperatura_aproximada?.toString() || '',
        hora_inicio: rdoParaEdicao.hora_inicio || '',
        hora_fim: rdoParaEdicao.hora_fim || '',
        observacoes_gerais: rdoParaEdicao.observacoes_gerais || '',
      });
      setRdoId(rdoParaEdicao.id);
    } else {
      setFormData({
        data: new Date(),
        condicao_climatica_id: '',
        temperatura_aproximada: '',
        hora_inicio: '',
        hora_fim: '',
        observacoes_gerais: '',
      });
      setRdoId(null);
    }
  }, [rdoParaEdicao, isOpen]);

  const steps = [
    { id: 'info' as WizardStep, title: 'Informações Gerais', description: 'Dados básicos, recursos e tempos improdutivos' },
    { id: 'pecas' as WizardStep, title: 'Apontamento de Peças', description: 'Registro de peças montadas' },
    { id: 'resumo' as WizardStep, title: 'Resumo', description: 'Confirmação dos dados' }
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  const handleNextStep = () => {
    if (currentStep === 'info') {
      // Validar e salvar RDO se necessário
      handleSaveRDO().then(() => {
        setCurrentStep('pecas');
      });
    } else if (currentStep === 'pecas') {
      setCurrentStep('resumo');
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 'pecas') {
      setCurrentStep('info');
    } else if (currentStep === 'resumo') {
      setCurrentStep('pecas');
    }
  };

  const handleSaveRDO = async () => {
    try {
        // Calculate total work hours
        let totalHours = null;
        if (formData.hora_inicio && formData.hora_fim) {
          const inicio = new Date(`2000-01-01T${formData.hora_inicio}`);
          const fim = new Date(`2000-01-01T${formData.hora_fim}`);
          if (fim > inicio) {
            totalHours = (fim.getTime() - inicio.getTime()) / (1000 * 60 * 60);
          }
        }

        const rdoData = {
          of_number: obraAtual,
          data: format(formData.data, 'yyyy-MM-dd'),
          condicao_climatica_id: formData.condicao_climatica_id || null,
          temperatura_aproximada: formData.temperatura_aproximada ? parseInt(formData.temperatura_aproximada) : null,
          hora_inicio: formData.hora_inicio || null,
          hora_fim: formData.hora_fim || null,
          total_horas_trabalhadas: totalHours,
          observacoes_gerais: formData.observacoes_gerais,
          finalizado: false,
          sincronizado: false,
          usuario_rdo: null,
          usuario_nome: null,
        };

      if (rdoParaEdicao && rdoId) {
        // Editando RDO existente
        const resultado = await updateRDO.mutateAsync({ id: rdoId, ...rdoData });
        setRdoId(resultado.id);
      } else {
        // Verificar se já existe RDO para esta OF e data
        const existingRDO = await checkExistingRDO.mutateAsync({
          ofNumber: obraAtual,
          data: format(formData.data, 'yyyy-MM-dd')
        });

        if (existingRDO) {
          // Se já existe, atualizar o existente
          const resultado = await updateRDO.mutateAsync({ id: existingRDO.id, ...rdoData });
          setRdoId(existingRDO.id);
        } else {
          // Se não existe, criar novo
          const resultado = await createRDO.mutateAsync(rdoData);
          setRdoId(resultado.id);
        }
      }
    } catch (error) {
      console.error('Erro detalhado:', error);
      toast.error('Erro ao salvar RDO');
      throw error;
    }
  };

  const handleAddRecurso = async (recursoId: string, horasTrabalhadas: number) => {
    if (!rdoId) return;

    try {
      await createRecurso.mutateAsync({
        rdo_id: rdoId,
        recurso_id: recursoId,
        horas_trabalhadas: horasTrabalhadas
      });
      refetchRecursos();
    } catch (error) {
      console.error('Erro ao adicionar recurso:', error);
    }
  };

  const handleDeleteRecurso = async (id: string) => {
    try {
      await deleteRecurso.mutateAsync(id);
      refetchRecursos();
    } catch (error) {
      console.error('Erro ao deletar recurso:', error);
    }
  };

  const handleDeleteImprodutivo = async (id: string) => {
    try {
      await deleteImprodutivo.mutateAsync(id);
      refetchImprodutivos();
    } catch (error) {
      console.error('Erro ao deletar tempo improdutivo:', error);
    }
  };

  const handleAddImprodutivo = async (motivoId: string, horaInicio: string, horaFim: string, descricao?: string) => {
    if (!rdoId) return;

    try {
      await createImprodutivo.mutateAsync({
        rdo_id: rdoId,
        motivo_id: motivoId,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        descricao
      });
      refetchImprodutivos();
    } catch (error) {
      console.error('Erro ao adicionar tempo improdutivo:', error);
    }
  };

  const handleAddApontamento = async (peca: any, quantidade: number) => {
    if (!rdoId) return;

    try {
      const novoApontamento: NovoApontamentoPeca = {
        rdo_id: rdoId,
        marca_peca: peca.marca,
        quantidade
      };

      await createApontamento.mutateAsync(novoApontamento);
      refetchApontamentos();
    } catch (error) {
      console.error('Erro ao adicionar apontamento:', error);
    }
  };

  const handleEditApontamento = (apontamento: any) => {
    setEditingApontamento(apontamento);
  };

  const handleDeleteApontamento = async (id: string) => {
    try {
      await deleteApontamento.mutateAsync(id);
      refetchApontamentos();
    } catch (error) {
      console.error('Erro ao deletar apontamento:', error);
    }
  };

  const handleFinalize = async () => {
    try {
      if (rdoId) {
        await updateRDO.mutateAsync({ 
          id: rdoId, 
          finalizado: true,
          sincronizado: true 
        });
      }
      onClose();
    } catch (error) {
      toast.error('Erro ao finalizar RDO');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'info':
        return (
          <div className="space-y-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data do RDO</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !formData.data && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.data ? format(formData.data, "PPP", { locale: ptBR }) : "Selecionar data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.data}
                          onSelect={(date) => date && setFormData(prev => ({ ...prev, data: date }))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>Condição Climática</Label>
                    <Select
                      value={formData.condicao_climatica_id}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, condicao_climatica_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar condição" />
                      </SelectTrigger>
                      <SelectContent>
                        {condicoesClimaticas?.map((condicao) => (
                          <SelectItem key={condicao.id} value={condicao.id}>
                            {condicao.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Hora de Início</Label>
                    <Input
                      type="time"
                      value={formData.hora_inicio}
                      onChange={(e) => setFormData(prev => ({ ...prev, hora_inicio: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Hora de Fim</Label>
                    <Input
                      type="time"
                      value={formData.hora_fim}
                      onChange={(e) => setFormData(prev => ({ ...prev, hora_fim: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <Label>Observações Gerais</Label>
                  <Textarea
                    value={formData.observacoes_gerais}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes_gerais: e.target.value }))}
                    placeholder="Descreva observações importantes sobre o dia..."
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recursos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RecursoSelector
                recursos={recursosObra || []}
                onSelect={handleAddRecurso}
                loading={createRecurso.isPending}
              />
              <RecursosList
                recursos={apontamentosRecursos}
                onDelete={handleDeleteRecurso}
                loading={deleteRecurso.isPending}
              />
            </div>

            {/* Tempos Improdutivos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <ImprodutivosSelector
                motivos={motivosImprodutivos || []}
                onSelect={handleAddImprodutivo}
                loading={createImprodutivo.isPending}
              />
              <ImproduitvosList
                improdutivos={apontamentosImprodutivos}
                onDelete={handleDeleteImprodutivo}
                loading={deleteImprodutivo.isPending}
              />
            </div>
          </div>
        );

      case 'pecas':
        const pecasComSaldo = pecasExpedidas.filter(p => p.saldo_disponivel > 0);
        
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Total Expedido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {pecasExpedidas.reduce((acc, p) => acc + p.quantidade_expedida, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">peças</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Total Apontado</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {pecasExpedidas.reduce((acc, p) => acc + p.quantidade_ja_apontada, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">peças</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Saldo Disponível</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {pecasExpedidas.reduce((acc, p) => acc + p.saldo_disponivel, 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">peças</p>
                </CardContent>
              </Card>
            </div>

            <PecaSelector
              pecasDisponiveis={pecasComSaldo}
              onSelect={handleAddApontamento}
              loading={createApontamento.isPending || loadingPecas}
            />

            <ApontamentoPecasList
              apontamentos={apontamentosPecas}
              pecasExpedidas={pecasExpedidas}
              onEdit={handleEditApontamento}
              onDelete={handleDeleteApontamento}
              loading={deleteApontamento.isPending}
            />
          </div>
        );

      case 'resumo':
        return (
          <div className="space-y-6">
            {/* Resumo com Recursos e Improdutivos */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo Completo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Data</Label>
                    <p className="font-medium">{format(formData.data, "PPP", { locale: ptBR })}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Horário de Trabalho</Label>
                    <p className="font-medium">
                      {formData.hora_inicio && formData.hora_fim 
                        ? `${formData.hora_inicio} - ${formData.hora_fim}` 
                        : 'Não informado'}
                    </p>
                  </div>
                </div>
                
                {/* Resumo de recursos e improdutivos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="font-medium">Recursos: {apontamentosRecursos.length}</p>
                    <p className="text-muted-foreground">
                      {apontamentosRecursos.reduce((acc, r) => acc + r.horas_trabalhadas, 0)}h total
                    </p>
                  </div>
                  <div className="p-3 bg-muted/30 rounded">
                    <p className="font-medium">Tempos Improdutivos: {apontamentosImprodutivos.length}</p>
                  </div>
                </div>
                
                {formData.observacoes_gerais && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Observações</Label>
                    <p className="text-sm">{formData.observacoes_gerais}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo de Peças</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <div className="text-3xl font-bold text-primary mb-2">
                    {apontamentosPecas.reduce((acc, a) => acc + a.quantidade, 0)}
                  </div>
                  <p className="text-muted-foreground">Total de peças apontadas hoje</p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {rdoParaEdicao ? 'Editar RDO' : 'Novo RDO'} - OF {obraAtual}
          </DialogTitle>
          <DialogDescription>
            {steps[currentStepIndex]?.description}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-6">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                index <= currentStepIndex 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}>
                {index + 1}
              </div>
              <div className="ml-2 hidden sm:block">
                <p className="text-sm font-medium">{step.title}</p>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-8 sm:w-12 h-0.5 mx-2",
                  index < currentStepIndex ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6">
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {currentStepIndex < steps.length - 1 ? (
              <Button
                onClick={handleNextStep}
                disabled={createRDO.isPending || updateRDO.isPending || checkExistingRDO.isPending}
              >
                {(createRDO.isPending || updateRDO.isPending || checkExistingRDO.isPending) ? 'Salvando...' : 'Próximo'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleFinalize}
                disabled={updateRDO.isPending}
              >
                {rdoParaEdicao ? 'Atualizar RDO' : 'Finalizar RDO'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};