
import React from 'react';
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
import { useCreateContratoObra, useOFsDisponiveis } from '@/hooks/useObra';

const contratoSchema = z.object({
  of_number: z.string().min(1, 'OF é obrigatória'),
  nome_obra: z.string().optional(),
  cliente: z.string().optional(),
  data_inicio_contratual: z.string().optional(),
  data_termino_prevista: z.string().optional(),
  status: z.enum(['Ativo', 'Pausado', 'Concluído']).default('Ativo'),
});

type ContratoFormData = z.infer<typeof contratoSchema>;

interface ContratoObraModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContratoObraModal: React.FC<ContratoObraModalProps> = ({
  isOpen,
  onClose,
}) => {
  const form = useForm<ContratoFormData>({
    resolver: zodResolver(contratoSchema),
    defaultValues: {
      status: 'Ativo',
    },
  });

  const { data: ofsDisponiveis, isLoading: isLoadingOFs } = useOFsDisponiveis();
  const createContrato = useCreateContratoObra();

  const onSubmit = async (data: ContratoFormData) => {
    const ofSelecionada = ofsDisponiveis?.find(of => of.num_of === data.of_number);
    
    const contratoData = {
      of_number: data.of_number,
      nome_obra: data.nome_obra || ofSelecionada?.descritivo || null,
      cliente: data.cliente || null,
      data_inicio_contratual: data.data_inicio_contratual || null,
      data_termino_prevista: data.data_termino_prevista || ofSelecionada?.data_prazo || null,
      status: data.status as 'Ativo' | 'Pausado' | 'Concluído',
    };

    try {
      await createContrato.mutateAsync(contratoData);
      form.reset();
      onClose();
    } catch (error) {
      console.error('Erro ao criar contrato:', error);
    }
  };

  const handleOFChange = (ofNumber: string) => {
    const ofSelecionada = ofsDisponiveis?.find(of => of.num_of === ofNumber);
    if (ofSelecionada) {
      form.setValue('nome_obra', ofSelecionada.descritivo || '');
      form.setValue('data_termino_prevista', ofSelecionada.data_prazo || '');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nova Obra</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="of_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ordem de Fabricação *</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleOFChange(value);
                    }}
                    value={field.value}
                    disabled={isLoadingOFs}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingOFs ? "Carregando..." : "Selecione uma OF"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {ofsDisponiveis?.map((of) => (
                        <SelectItem key={of.num_of} value={of.num_of}>
                          {of.num_of} - {of.descritivo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nome_obra"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da Obra</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome da obra" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cliente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome do cliente" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_inicio_contratual"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Início</FormLabel>
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
                          disabled={(date) =>
                            date < new Date("1900-01-01")
                          }
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
                name="data_termino_prevista"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Data de Término</FormLabel>
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
                          disabled={(date) =>
                            date < new Date("1900-01-01")
                          }
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

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Pausado">Pausado</SelectItem>
                      <SelectItem value="Concluído">Concluído</SelectItem>
                    </SelectContent>
                  </Select>
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
                disabled={createContrato.isPending}
              >
                {createContrato.isPending ? 'Criando...' : 'Criar Obra'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
