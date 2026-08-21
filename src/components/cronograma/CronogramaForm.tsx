import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarIcon, Save, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { CronogramaOf, ProcessoCronograma } from '@/types/cronograma';
import { useCronogramaOperations } from '@/hooks/useCronogramaOperations';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CronogramaFormProps {
  cronograma?: CronogramaOf | null;
  onClose: () => void;
  isOpen: boolean;
  onSaveSuccess?: () => void;
}

const processosDefault = [
  'Detalhamento',
  'Fabricação',
  'Pint/Galv',
  'Instalação',
  'Aceite/DB'
];

interface OFOption {
  id: string;
  num_of: string;
  descritivo: string;
}

interface GestorOption {
  id: string;
  full_name: string;
  email: string;
}

export const CronogramaForm: React.FC<CronogramaFormProps> = ({ cronograma, onClose, isOpen, onSaveSuccess }) => {
  const { saveCronograma, getCronogramaPorOf } = useCronogramaOperations();
  const [formData, setFormData] = useState({
    of_id: '',
    gestor_id: '',
    revisao: 1,
    processos: processosDefault.map((nome, index) => ({
      nome_processo: nome,
      data_inicio: '',
      data_fim: '',
      ordem: index + 1
    })) as ProcessoCronograma[]
  });

  const [ofs, setOfs] = useState<OFOption[]>([]);
  const [gestores, setGestores] = useState<GestorOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadOfs();
      loadGestores();
    }
  }, [isOpen]);

  useEffect(() => {
    if (cronograma) {
      console.log('Carregando cronograma para edição:', cronograma);
      setFormData({
        of_id: cronograma.of_id,
        gestor_id: cronograma.gestor_id,
        revisao: cronograma.revisao,
        processos: cronograma.processos.length > 0 ? cronograma.processos.map(p => ({
          id: p.id,
          nome_processo: p.nome_processo,
          data_inicio: p.data_inicio,
          data_fim: p.data_fim,
          ordem: p.ordem
        })) : processosDefault.map((nome, index) => ({
          nome_processo: nome,
          data_inicio: '',
          data_fim: '',
          ordem: index + 1
        }))
      });
    }
  }, [cronograma]);

  const loadOfs = async () => {
    try {
      const { data, error } = await supabase
        .from('ordens_fabricacao')
        .select('id, num_of, descritivo')
        .order('num_of');
      
      if (error) throw error;
      setOfs(data || []);
    } catch (error) {
      console.error('Erro ao carregar OFs:', error);
    }
  };

  const loadGestores = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .not('full_name', 'is', null)
        .order('full_name');
      
      if (error) throw error;
      setGestores(data || []);
    } catch (error) {
      console.error('Erro ao carregar gestores:', error);
    }
  };

  const handleOfChange = async (ofId: string) => {
    console.log('OF selecionada:', ofId);
    setFormData(prev => ({ ...prev, of_id: ofId }));
    
    // Verificar se já existe cronograma para esta OF
    const cronogramaExistente = await getCronogramaPorOf(ofId);
    console.log('Cronograma existente encontrado:', cronogramaExistente);
    
    if (cronogramaExistente) {
      // Carregar dados do cronograma existente
      setFormData({
        of_id: ofId,
        gestor_id: cronogramaExistente.gestor_id,
        revisao: cronogramaExistente.revisao,
        processos: cronogramaExistente.processos.length > 0 ? cronogramaExistente.processos.map(p => ({
          id: p.id,
          nome_processo: p.nome_processo,
          data_inicio: p.data_inicio,
          data_fim: p.data_fim,
          ordem: p.ordem
        })) : processosDefault.map((nome, index) => ({
          nome_processo: nome,
          data_inicio: '',
          data_fim: '',
          ordem: index + 1
        }))
      });
      toast.info('Cronograma existente carregado para edição');
    } else {
      // Resetar para valores padrão se não houver cronograma
      setFormData(prev => ({
        ...prev,
        gestor_id: '',
        revisao: 1,
        processos: processosDefault.map((nome, index) => ({
          nome_processo: nome,
          data_inicio: '',
          data_fim: '',
          ordem: index + 1
        }))
      }));
    }
  };

  const handleProcessoChange = (index: number, field: keyof ProcessoCronograma, value: string) => {
    const newProcessos = [...formData.processos];
    newProcessos[index] = { ...newProcessos[index], [field]: value };
    setFormData({ ...formData, processos: newProcessos });
  };

  const addProcesso = () => {
    const newProcesso: ProcessoCronograma = {
      nome_processo: '',
      data_inicio: '',
      data_fim: '',
      ordem: formData.processos.length + 1
    };
    setFormData({
      ...formData,
      processos: [...formData.processos, newProcesso]
    });
  };

  const removeProcesso = (index: number) => {
    const newProcessos = formData.processos.filter((_, i) => i !== index);
    // Reordenar
    newProcessos.forEach((processo, i) => {
      processo.ordem = i + 1;
    });
    setFormData({ ...formData, processos: newProcessos });
  };

  const moveProcessoUp = (index: number) => {
    if (index === 0) return;
    
    const newProcessos = [...formData.processos];
    [newProcessos[index], newProcessos[index - 1]] = [newProcessos[index - 1], newProcessos[index]];
    
    // Atualizar ordem
    newProcessos.forEach((processo, i) => {
      processo.ordem = i + 1;
    });
    
    setFormData({ ...formData, processos: newProcessos });
  };

  const moveProcessoDown = (index: number) => {
    if (index === formData.processos.length - 1) return;
    
    const newProcessos = [...formData.processos];
    [newProcessos[index], newProcessos[index + 1]] = [newProcessos[index + 1], newProcessos[index]];
    
    // Atualizar ordem
    newProcessos.forEach((processo, i) => {
      processo.ordem = i + 1;
    });
    
    setFormData({ ...formData, processos: newProcessos });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.of_id || !formData.gestor_id) {
      toast.error('Por favor, selecione a OF e o gestor responsável');
      return;
    }

    if (formData.processos.some(p => !p.nome_processo || !p.data_inicio || !p.data_fim)) {
      toast.error('Por favor, preencha todos os campos dos processos');
      return;
    }

    setLoading(true);
    const success = await saveCronograma({
      ...formData,
      id: cronograma?.id
    });
    setLoading(false);
    
    if (success) {
      if (onSaveSuccess) {
        onSaveSuccess();
      }
      onClose();
    }
  };

  const DatePicker = ({ date, onDateChange, placeholder }: { 
    date: string; 
    onDateChange: (date: string) => void; 
    placeholder: string;
  }) => {
    const [selectedDate, setSelectedDate] = useState<Date | undefined>(
      date ? new Date(date + 'T12:00:00') : undefined
    );

    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100",
              !selectedDate && "text-gray-500 dark:text-gray-400"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ptBR }) : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              if (date) {
                setSelectedDate(date);
                onDateChange(format(date, 'yyyy-MM-dd'));
              }
            }}
            initialFocus
            className="pointer-events-auto p-3"
          />
        </PopoverContent>
      </Popover>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {cronograma ? 'Editar Cronograma' : 'Novo Cronograma'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="of_id">Ordem de Fabricação *</Label>
              <Select 
                value={formData.of_id} 
                onValueChange={handleOfChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a OF" />
                </SelectTrigger>
                <SelectContent>
                  {ofs.map((of) => (
                    <SelectItem key={of.id} value={of.id}>
                      {of.num_of} - {of.descritivo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gestor_id">Gestor Responsável *</Label>
              <Select 
                value={formData.gestor_id} 
                onValueChange={(value) => setFormData({ ...formData, gestor_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o gestor" />
                </SelectTrigger>
                <SelectContent>
                  {gestores.map((gestor) => (
                    <SelectItem key={gestor.id} value={gestor.id}>
                      {gestor.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Processos do Cronograma</h3>
              <Button type="button" onClick={addProcesso} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Processo
              </Button>
            </div>

            <div className="space-y-4">
              {formData.processos.map((processo, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Controles de ordenação */}
                    <div className="flex flex-col gap-1 mt-6">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => moveProcessoUp(index)}
                        disabled={index === 0}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => moveProcessoDown(index)}
                        disabled={index === formData.processos.length - 1}
                        className="h-8 w-8 p-0"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Número de ordem */}
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full mt-6">
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-300">
                        {index + 1}
                      </span>
                    </div>

                    {/* Campos do processo */}
                    <div className="flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                          <Label>Nome do Processo *</Label>
                          <Input
                            value={processo.nome_processo}
                            onChange={(e) => handleProcessoChange(index, 'nome_processo', e.target.value)}
                            placeholder="Ex: Detalhamento"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Data de Início *</Label>
                          <DatePicker
                            date={processo.data_inicio}
                            onDateChange={(date) => handleProcessoChange(index, 'data_inicio', date)}
                            placeholder="Selecionar data"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Data de Fim *</Label>
                          <DatePicker
                            date={processo.data_fim}
                            onDateChange={(date) => handleProcessoChange(index, 'data_fim', date)}
                            placeholder="Selecionar data"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Botão de remoção */}
                    <div className="mt-6">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeProcesso(index)}
                        disabled={formData.processos.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Salvando...' : 'Salvar Cronograma'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
