
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
import { Textarea } from '@/components/ui/textarea';
import { OrdemFabricacao } from '@/hooks/useOFs';

const editOFSchema = z.object({
  descritivo: z.string().optional(),
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

type EditOFFormData = z.infer<typeof editOFSchema>;

interface EditOFModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  ordem: OrdemFabricacao | null;
  onUpdate: (id: string, data: Partial<OrdemFabricacao>) => Promise<void>;
}

export const EditOFModal: React.FC<EditOFModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  ordem,
  onUpdate,
}) => {
  const [loading, setLoading] = useState(false);

  const form = useForm<EditOFFormData>({
    resolver: zodResolver(editOFSchema),
    defaultValues: {
      descritivo: '',
      prioridade: 'Normal',
      nivel_qualidade: 'Normal',
    },
  });

  useEffect(() => {
    if (ordem && isOpen) {
      form.reset({
        descritivo: ordem.descritivo || '',
        data_abertura: ordem.data_abertura || '',
        data_prazo: ordem.data_prazo || '',
        data_termino_prev: ordem.data_termino_prev || '',
        peso_total: ordem.peso_total || 0,
        gestor: ordem.gestor || '',
        prioridade: ordem.prioridade || 'Normal',
        nivel_qualidade: ordem.nivel_qualidade || 'Normal',
        criterio_qualidade: ordem.criterio_qualidade || '',
        tratamento_final: ordem.tratamento_final || '',
        local_uf: ordem.local_uf || '',
      });
    }
  }, [ordem, isOpen, form]);

  const onSubmit = async (data: EditOFFormData) => {
    if (!ordem) return;
    
    setLoading(true);
    try {
      await onUpdate(ordem.id, data);
      onClose();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao atualizar OF:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!ordem) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Ordem de Fabricação - {ordem.num_of}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="descritivo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descritivo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Descrição da OF" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
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
                              format(new Date(field.value), "dd/MM/yyyy")
                            ) : (
                              <span>Selecione</span>
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
                              format(new Date(field.value), "dd/MM/yyyy")
                            ) : (
                              <span>Selecione</span>
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
                name="data_termino_prev"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Prazo Término (Prev)</FormLabel>
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
                              format(new Date(field.value), "dd/MM/yyyy")
                            ) : (
                              <span>Selecione</span>
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

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="peso_total"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Peso Total (kg)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        placeholder="0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prioridade"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
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
              name="gestor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Gestor</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome do gestor responsável" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="tratamento_final"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tratamento Final</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ex: Pintura, Galvanização, etc." />
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
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={loading}
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
