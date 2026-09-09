import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Save, X, AlertTriangle, Loader2 } from 'lucide-react';
import { RomaneioExpedicao } from '@/hooks/useRomaneios';
import { toast } from 'sonner';
import { validarRomaneioParaEntrega } from '@/utils/validacaoRomaneio';
import { PendenciasProducaoModal, ItemPendenciaProducao } from './PendenciasProducaoModal';

interface RomaneioFormProps {
  romaneio?: RomaneioExpedicao;
  ofNumbers: string[];
  selectedOF?: string;
  onSave: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function RomaneioForm({ romaneio, ofNumbers, selectedOF, onSave, onCancel, loading, isOpen, onClose }: RomaneioFormProps) {
  // Helper function to format date for input (YYYY-MM-DD)
  const formatDateForInput = (date: string | Date | undefined | null) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
  };

  // Helper function to get current date in local timezone
  const getCurrentLocalDate = () => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    of_number: romaneio?.of_number || selectedOF || '',
    data_romaneio: romaneio?.data_romaneio ? formatDateForInput(romaneio.data_romaneio) : getCurrentLocalDate(),
    data_criacao: romaneio?.data_criacao ? formatDateForInput(romaneio.data_criacao) : getCurrentLocalDate(),
    revisao: romaneio?.revisao ?? 0,
    motivo_revisao: romaneio?.motivo_revisao || '',
    data_prevista_entrega: romaneio?.data_prevista_entrega ? formatDateForInput(romaneio.data_prevista_entrega) : '',
    prioridade: (romaneio?.prioridade as 'Normal' | 'Urgente') || 'Normal',
    status: (romaneio?.status as 'Em planejamento' | 'Entregue' | 'Conferido em Obra') || 'Em planejamento',
    observacoes: romaneio?.observacoes || '',
    peso_total_romaneio: romaneio?.peso_total_romaneio || 0,
    previsao_kg: romaneio?.previsao_kg || 0,
    maior_dimensao: romaneio?.maior_dimensao || '',
    tipo_transporte: romaneio?.tipo_transporte || 'carro' as 'carro' | 'utilitario' | 'caminho_pequeno' | 'caminhao_trucado' | 'caminhao_munck' | 'carreta_12m' | 'carreta_15m' | 'especial',
    frete_tipo: (romaneio?.frete_tipo as 'terceiros' | 'proprio') || 'terceiros',
    nome_motorista: romaneio?.nome_motorista || ''
  });

  // Sincronizar os dados do formulário sempre que o modal abrir ou o romaneio selecionado mudar
  useEffect(() => {
    if (isOpen) {
      if (romaneio) {
        setFormData({
          of_number: romaneio.of_number || '',
          data_romaneio: romaneio.data_romaneio ? formatDateForInput(romaneio.data_romaneio) : getCurrentLocalDate(),
          data_criacao: romaneio.data_criacao ? formatDateForInput(romaneio.data_criacao) : getCurrentLocalDate(),
          revisao: romaneio.revisao ?? 0,
          motivo_revisao: romaneio.motivo_revisao || '',
          data_prevista_entrega: romaneio.data_prevista_entrega ? formatDateForInput(romaneio.data_prevista_entrega) : '',
          prioridade: (romaneio.prioridade as 'Normal' | 'Urgente') || 'Normal',
          status: (romaneio.status as 'Em planejamento' | 'Entregue' | 'Conferido em Obra') || 'Em planejamento',
          observacoes: romaneio.observacoes || '',
          peso_total_romaneio: romaneio.peso_total_romaneio || 0,
          previsao_kg: romaneio.previsao_kg || 0,
          maior_dimensao: romaneio.maior_dimensao || '',
          tipo_transporte: romaneio.tipo_transporte || 'carro',
          frete_tipo: (romaneio.frete_tipo as 'terceiros' | 'proprio') || 'terceiros',
          nome_motorista: romaneio.nome_motorista || ''
        });
      } else {
        setFormData({
          of_number: selectedOF || '',
          data_romaneio: getCurrentLocalDate(),
          data_criacao: getCurrentLocalDate(),
          revisao: 0,
          motivo_revisao: '',
          data_prevista_entrega: '',
          prioridade: 'Normal',
          status: 'Em planejamento',
          observacoes: '',
          peso_total_romaneio: 0,
          previsao_kg: 0,
          maior_dimensao: '',
          tipo_transporte: 'carro',
          frete_tipo: 'terceiros',
          nome_motorista: ''
        });
      }
    }
  }, [isOpen, romaneio, selectedOF]);

  // Lista consolidada de OFs garantindo que a OF do romaneio atual sempre apareça no Select
  const availableOFs = useMemo(() => {
    const list = [...(ofNumbers || [])];
    if (romaneio?.of_number && !list.includes(romaneio.of_number)) {
      list.unshift(romaneio.of_number);
    }
    if (selectedOF && !list.includes(selectedOF)) {
      list.unshift(selectedOF);
    }
    if (formData.of_number && !list.includes(formData.of_number)) {
      list.unshift(formData.of_number);
    }
    return Array.from(new Set(list)).filter(Boolean);
  }, [ofNumbers, romaneio?.of_number, selectedOF, formData.of_number]);

  // Estados para controle de validação de entrega
  const [validandoEntrega, setValidandoEntrega] = useState(false);
  const [modalPendenciasAberto, setModalPendenciasAberto] = useState(false);
  const [pendenciasEncontradas, setPendenciasEncontradas] = useState<ItemPendenciaProducao[]>([]);
  const [mensagemBloqueio, setMensagemBloqueio] = useState<string | undefined>(undefined);

  const handleStatusChange = async (novoStatus: any) => {
    if (novoStatus === 'Entregue') {
      if (!romaneio?.id) {
        toast.warning('Novo romaneio deve ser criado como "Em planejamento"', {
          description: 'Cadastre o romaneio primeiro, adicione as peças e confirme os apontamentos de produção antes de marcá-lo como entregue.'
        });
        setFormData(prev => ({ ...prev, status: 'Em planejamento' }));
        return;
      }

      setValidandoEntrega(true);
      const resultado = await validarRomaneioParaEntrega(romaneio.id, formData.of_number || romaneio.of_number);
      setValidandoEntrega(false);

      if (!resultado.valido) {
        setPendenciasEncontradas(resultado.pendencias || []);
        setMensagemBloqueio(resultado.mensagem);
        setModalPendenciasAberto(true);
        // Não altera o status para Entregue, mantém o anterior
        return;
      }
    }

    setFormData(prev => ({ ...prev, status: novoStatus }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.status === 'Entregue') {
      if (!romaneio?.id) {
        toast.error('Não é possível criar um novo romaneio diretamente como "Entregue".');
        setFormData(prev => ({ ...prev, status: 'Em planejamento' }));
        return;
      }

      setValidandoEntrega(true);
      const resultado = await validarRomaneioParaEntrega(romaneio.id, formData.of_number || romaneio.of_number);
      setValidandoEntrega(false);

      if (!resultado.valido) {
        setPendenciasEncontradas(resultado.pendencias || []);
        setMensagemBloqueio(resultado.mensagem);
        setModalPendenciasAberto(true);
        toast.error('Não é possível definir como "Entregue": existem pendências na produção.');
        return;
      }
    }

    console.log('💾 Salvando romaneio com dados:', formData);

    const dataToSave = {
      ...formData,
      nome_motorista: formData.nome_motorista.trim() || 'sem_definição',
      revisao: parseInt(formData.revisao.toString()) || 0
    };

    onSave(dataToSave);
  };

  const handleCancel = () => {
    onCancel();
    onClose();
  };

  const statusOptions = [
    'Em planejamento',
    'Entregue',
    'Conferido em Obra'
  ];

  const transporteOptions = [
    { value: 'carro', label: 'Carro' },
    { value: 'utilitario', label: 'Utilitário' },
    { value: 'caminho_pequeno', label: 'Caminhão Pequeno' },
    { value: 'caminhao_trucado', label: 'Caminhão Trucado' },
    { value: 'caminhao_munck', label: 'Caminhão Munck' },
    { value: 'carreta_12m', label: 'Carreta 12m' },
    { value: 'carreta_15m', label: 'Carreta 15m' },
    { value: 'especial', label: 'Especial' }
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        {/* hideClose suprime o botão 'X' redundante no canto superior direito */}
        <DialogContent hideClose className="max-w-4xl max-h-[90vh] overflow-hidden [&>button.absolute]:hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold">
                {romaneio ? 'Editar Romaneio' : 'Novo Romaneio'}
              </DialogTitle>
              <Button variant="outline" onClick={handleCancel} size="sm">
                <X className="h-4 w-4 mr-2" />
                Fechar
              </Button>
            </div>
          </DialogHeader>
          
          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Seção: Dados Básicos */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Dados Básicos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="of_number">Ordem de Fabricação *</Label>
                    <Select 
                      value={formData.of_number} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, of_number: value }))}
                      disabled={!!romaneio || !!selectedOF}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecionar OF" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableOFs.length === 0 ? (
                          <SelectItem value="" disabled>
                            Nenhuma OF disponível
                          </SelectItem>
                        ) : (
                          availableOFs.map((ofNumber) => (
                            <SelectItem key={ofNumber} value={ofNumber}>
                              {ofNumber}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {availableOFs.length === 0 && (
                      <p className="text-xs text-muted-foreground">
                        Nenhuma OF encontrada. Verifique suas permissões ou contate o administrador.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_criacao">Data de Criação *</Label>
                    <Input
                      id="data_criacao"
                      type="date"
                      value={formData.data_criacao}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_criacao: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_romaneio">Data do Romaneio</Label>
                    <Input
                      id="data_romaneio"
                      type="date"
                      value={formData.data_romaneio}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_romaneio: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="revisao">Revisão</Label>
                    <Input
                      id="revisao"
                      type="number"
                      min="0"
                      value={formData.revisao}
                      onChange={(e) => setFormData(prev => ({ ...prev, revisao: parseInt(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="data_prevista_entrega">Data Prevista de Entrega</Label>
                    <Input
                      id="data_prevista_entrega"
                      type="date"
                      value={formData.data_prevista_entrega}
                      onChange={(e) => setFormData(prev => ({ ...prev, data_prevista_entrega: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="prioridade">Prioridade</Label>
                    <Select 
                      value={formData.prioridade} 
                      onValueChange={(value: 'Normal' | 'Urgente') => setFormData(prev => ({ ...prev, prioridade: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={handleStatusChange}
                      disabled={validandoEntrega}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Badge de Alerta */}
                <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-400 mt-4">
                  <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <AlertDescription className="text-orange-800 dark:text-orange-200 font-medium">
                    QUANDO O STATUS PASSAR PARA "ENTREGUE" AS PEÇAS SERÃO APONTADAS AUTOMATICAMENTE NO PROCESSO DE EXPEDIÇÃO (DESDE QUE TODOS OS PROCESSOS ANTERIORES ESTEJAM CONCLUÍDOS)
                  </AlertDescription>
                </Alert>
              </div>

              {/* Seção: Dados de Transporte */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Dados de Transporte</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="previsao_kg">Previsão de Kg</Label>
                    <Input
                      id="previsao_kg"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.previsao_kg}
                      onChange={(e) => setFormData(prev => ({ ...prev, previsao_kg: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maior_dimensao">Maior Dimensão</Label>
                    <Input
                      id="maior_dimensao"
                      value={formData.maior_dimensao}
                      onChange={(e) => setFormData(prev => ({ ...prev, maior_dimensao: e.target.value }))}
                      placeholder="Ex: 12m x 2m x 3m"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tipo_transporte">Tipo de Transporte</Label>
                    <Select 
                      value={formData.tipo_transporte} 
                      onValueChange={(value: any) => setFormData(prev => ({ ...prev, tipo_transporte: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {transporteOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="frete_tipo">Tipo de Frete</Label>
                    <Select 
                      value={formData.frete_tipo} 
                      onValueChange={(value: 'terceiros' | 'proprio') => setFormData(prev => ({ ...prev, frete_tipo: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="terceiros">Terceiros</SelectItem>
                        <SelectItem value="proprio">Próprio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="nome_motorista">Nome do Motorista</Label>
                    <Input
                      id="nome_motorista"
                      value={formData.nome_motorista}
                      onChange={(e) => setFormData(prev => ({ ...prev, nome_motorista: e.target.value }))}
                      placeholder="Nome completo do motorista (opcional)"
                    />
                    <p className="text-xs text-muted-foreground">
                      Se não preenchido, será definido automaticamente como "sem_definição"
                    </p>
                  </div>
                </div>
              </div>

              {/* Seção: Observações */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground border-b pb-2">Observações</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="motivo_revisao">Motivo da Revisão</Label>
                    <Textarea
                      id="motivo_revisao"
                      value={formData.motivo_revisao}
                      onChange={(e) => setFormData(prev => ({ ...prev, motivo_revisao: e.target.value }))}
                      placeholder="Descreva o motivo da revisão..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observacoes">Observações Gerais</Label>
                    <Textarea
                      id="observacoes"
                      value={formData.observacoes}
                      onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                      placeholder="Observações do romaneio..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading || validandoEntrega || !formData.of_number}>
                  {validandoEntrega ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validando processos...
                    </>
                  ) : loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de bloqueio/alerta caso existam peças pendentes */}
      <PendenciasProducaoModal
        isOpen={modalPendenciasAberto}
        onClose={() => {
          setModalPendenciasAberto(false);
          setFormData(prev => ({
            ...prev,
            status: (romaneio?.status as any) || 'Em planejamento'
          }));
        }}
        pendencias={pendenciasEncontradas}
        numeroRomaneio={romaneio?.numero_romaneio}
        mensagemSemItens={mensagemBloqueio}
      />
    </>
  );
}
