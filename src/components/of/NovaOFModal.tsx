
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useNovaOF } from '@/hooks/useNovaOF';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

const novaOFSchema = z.object({
  ficha_tecnica_id: z.string().min(1, 'Ficha técnica é obrigatória'),
  data_abertura: z.string().optional(),
  data_prazo: z.string().optional(),
  data_termino_prev: z.string().optional(),
  peso_total: z.number().optional(),
  gestor: z.string().optional(),
  prioridade: z.string(),
  nivel_qualidade: z.string(),
  criterio_qualidade: z.string().optional(),
  tratamento_final: z.string().optional(),
  local_uf: z.string().optional(),
});

type NovaOFFormData = z.infer<typeof novaOFSchema>;

interface NovaOFModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const NovaOFModal: React.FC<NovaOFModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const form = useForm<NovaOFFormData>({
    resolver: zodResolver(novaOFSchema),
    defaultValues: {
      ficha_tecnica_id: '',
      data_abertura: new Date().toISOString().split('T')[0],
      prioridade: 'Normal',
      nivel_qualidade: 'Normal',
      tratamento_final: 'Pintura',
    },
  });

  const { loading, fichasTecnicas, buscarFichasTecnicas, criarNovaOF } = useNovaOF();
  const [fichaSelecionada, setFichaSelecionada] = useState<any>(null);

  useEffect(() => {
    if (isOpen) {
      buscarFichasTecnicas();
    }
  }, [isOpen]);

  const onSubmit = async (data: NovaOFFormData) => {
    if (!fichaSelecionada) {
      form.setError('ficha_tecnica_id', { message: 'Selecione uma ficha técnica' });
      return;
    }

    const novaOFData = {
      of_number: fichaSelecionada.of_number,
      descritivo: fichaSelecionada.descritivo,
      data_abertura: data.data_abertura || new Date().toISOString().split('T')[0],
      data_prazo: data.data_prazo || fichaSelecionada.data_termino_prev,
      data_termino_prev: fichaSelecionada.data_termino_prev,
      peso_total: fichaSelecionada.peso_total || 0,
      gestor: fichaSelecionada.gestor,
      prioridade: data.prioridade,
      nivel_qualidade: data.nivel_qualidade,
      criterio_qualidade: data.criterio_qualidade,
      tratamento_final: data.tratamento_final,
      local_uf: data.local_uf,
      status: 'ativa',
      ficha_tecnica_id: data.ficha_tecnica_id,
    };

    const success = await criarNovaOF(novaOFData);
    if (success) {
      form.reset();
      setFichaSelecionada(null);
      onClose();
      onSuccess?.();
    }
  };

  const handleFichaTecnicaChange = (fichaId: string) => {
    const ficha = fichasTecnicas.find(f => f.id === fichaId);
    setFichaSelecionada(ficha);
    
    if (ficha) {
      form.setValue('data_prazo', ficha.data_termino_prev || '');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Ordem de Fabricação</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="ficha_tecnica_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ficha Técnica *</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleFichaTecnicaChange(value);
                    }}
                    value={field.value}
                    disabled={loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={loading ? "Carregando..." : "Selecione uma ficha técnica"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {fichasTecnicas.map((ficha) => (
                        <SelectItem key={ficha.id} value={ficha.id}>
                          {ficha.of_number} - {ficha.descritivo} ({ficha.cliente})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {fichaSelecionada && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <h4 className="font-medium mb-2">Dados da Ficha Técnica Selecionada:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><strong>OF:</strong> {fichaSelecionada.of_number}</div>
                  <div><strong>Cliente:</strong> {fichaSelecionada.cliente}</div>
                  <div><strong>Descritivo:</strong> {fichaSelecionada.descritivo}</div>
                  <div><strong>Peso Total:</strong> {fichaSelecionada.peso_total}kg</div>
                  <div><strong>Gestor:</strong> {fichaSelecionada.gestor}</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_abertura"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Abertura</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_prazo"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Prazo</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "PPP", { locale: ptBR })
                            ) : (
                              <span>Selecione uma data</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                          disabled={(date) => date < new Date("1900-01-01")}
                          initialFocus
                          locale={ptBR}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a prioridade" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Urgente">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nivel_qualidade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de Qualidade</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o nível" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Normal">Normal</SelectItem>
                        <SelectItem value="Especial">Especial</SelectItem>
                        <SelectItem value="Severa">Severa</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="criterio_qualidade"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Critério de Qualidade</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Especifique os critérios de qualidade" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tratamento_final"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Tratamento Final</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={
                        field.value?.toLowerCase().includes('galv')
                          ? 'Galvanizado'
                          : (field.value || 'Pintura')
                      }
                      className="flex items-center gap-6 pt-1.5"
                    >
                      <div className="flex items-center space-x-2 cursor-pointer">
                        <RadioGroupItem value="Pintura" id="nova-trat-pintura" />
                        <Label htmlFor="nova-trat-pintura" className="cursor-pointer font-normal text-sm">Pintura</Label>
                      </div>
                      <div className="flex items-center space-x-2 cursor-pointer">
                        <RadioGroupItem value="Galvanizado" id="nova-trat-galvanizado" />
                        <Label htmlFor="nova-trat-galvanizado" className="cursor-pointer font-normal text-sm">Galvanizado</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="local_uf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Local/UF</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ex: São Paulo/SP" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
              >
                {loading ? 'Criando...' : 'Criar OF'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
