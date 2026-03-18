
import React, { useEffect } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useCreateDiarioObra, useUpdateDiarioObra, useCondicoesClimaticas, useDiariosObra } from '@/hooks/useObra';

const rdoSchema = z.object({
  data: z.string().min(1, 'Data é obrigatória'),
  condicao_climatica_id: z.string().optional(),
  temperatura_aproximada: z.number().optional(),
  observacoes_gerais: z.string().optional(),
});

type RDOFormData = z.infer<typeof rdoSchema>;

interface RDOFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  obraAtual: string;
  editingRDOId?: string | null;
}

export const RDOFormModal: React.FC<RDOFormModalProps> = ({
  isOpen,
  onClose,
  obraAtual,
  editingRDOId,
}) => {
  const form = useForm<RDOFormData>({
    resolver: zodResolver(rdoSchema),
    defaultValues: {
      data: format(new Date(), 'yyyy-MM-dd'),
    },
  });

  const { data: condicoes } = useCondicoesClimaticas();
  const { data: rdos } = useDiariosObra(obraAtual);
  const createRDO = useCreateDiarioObra();
  const updateRDO = useUpdateDiarioObra();

  const editingRDO = editingRDOId ? rdos?.find(rdo => rdo.id === editingRDOId) : null;
  const isEditing = !!editingRDO;

  // Carregar dados para edição
  useEffect(() => {
    if (editingRDO) {
      form.reset({
        data: editingRDO.data,
        condicao_climatica_id: editingRDO.condicao_climatica_id || undefined,
        temperatura_aproximada: editingRDO.temperatura_aproximada || undefined,
        observacoes_gerais: editingRDO.observacoes_gerais || undefined,
      });
    } else {
      form.reset({
        data: format(new Date(), 'yyyy-MM-dd'),
      });
    }
  }, [editingRDO, form]);

  const onSubmit = async (data: RDOFormData) => {
    try {
      if (isEditing && editingRDO) {
        await updateRDO.mutateAsync({
          id: editingRDO.id,
          condicao_climatica_id: data.condicao_climatica_id || null,
          temperatura_aproximada: data.temperatura_aproximada || null,
          observacoes_gerais: data.observacoes_gerais || null,
          data: data.data,
        });
      } else {
        await createRDO.mutateAsync({
          of_number: obraAtual,
          data: data.data,
          condicao_climatica_id: data.condicao_climatica_id || null,
          temperatura_aproximada: data.temperatura_aproximada || null,
          hora_inicio: null,
          hora_fim: null,
          total_horas_trabalhadas: null,
          observacoes_gerais: data.observacoes_gerais || null,
          finalizado: false,
          sincronizado: false,
          usuario_rdo: null,
          usuario_nome: null, // Será preenchido automaticamente no hook
        });
      }
      form.reset();
      onClose();
    } catch (error) {
      console.error('Erro ao salvar RDO:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? `Editar RDO - ${obraAtual}` : `Novo RDO - ${obraAtual}`}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="data"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Data do RDO *</FormLabel>
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
                          date > new Date() || date < new Date("1900-01-01")
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="condicao_climatica_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Condição Climática</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {condicoes?.map((condicao) => (
                          <SelectItem key={condicao.id} value={condicao.id}>
                            <div className="flex items-center gap-2">
                              <span>
                                {condicao.icone === 'sun' && '☀️'}
                                {condicao.icone === 'cloud' && '☁️'}
                                {condicao.icone === 'cloud-rain' && '🌧️'}
                                {condicao.icone === 'wind' && '💨'}
                                {condicao.icone === 'cloud-drizzle' && '🌦️'}
                              </span>
                              {condicao.nome}
                            </div>
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
                name="temperatura_aproximada"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Temperatura (°C)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Ex: 25"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="observacoes_gerais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações Gerais</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre o dia de trabalho..."
                      {...field}
                      className="h-24"
                    />
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
                disabled={createRDO.isPending || updateRDO.isPending}
              >
                {createRDO.isPending || updateRDO.isPending 
                  ? (isEditing ? 'Salvando...' : 'Criando...') 
                  : (isEditing ? 'Salvar' : 'Criar RDO')
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
