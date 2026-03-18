
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
import { Button } from '@/components/ui/button';
import { useUpdateContratoObra } from '@/hooks/useObra';
import { useUserRole } from '@/hooks/useUserRole';

const statusSchema = z.object({
  status: z.enum(['Aguardando Inicio', 'Ativo', 'Pausado', 'Concluído', 'Arquivada']),
});

type StatusFormData = z.infer<typeof statusSchema>;

interface StatusObraModalProps {
  isOpen: boolean;
  onClose: () => void;
  contratoId: string;
  currentStatus: string;
}

export const StatusObraModal: React.FC<StatusObraModalProps> = ({
  isOpen,
  onClose,
  contratoId,
  currentStatus,
}) => {
  const form = useForm<StatusFormData>({
    resolver: zodResolver(statusSchema),
    defaultValues: {
      status: currentStatus as any,
    },
  });

  const updateContrato = useUpdateContratoObra();
  const { isAdmin } = useUserRole();

  const onSubmit = async (data: StatusFormData) => {
    try {
      await updateContrato.mutateAsync({
        id: contratoId,
        status: data.status,
      });
      onClose();
    } catch (error) {
      console.error('Erro ao atualizar status da obra:', error);
    }
  };

  const statusOptions = [
    { value: 'Aguardando Inicio', label: 'Aguardando Início' },
    { value: 'Ativo', label: 'Em Andamento' },
    { value: 'Pausado', label: 'Pausada' },
    { value: 'Concluído', label: 'Concluída' },
  ];

  // Adicionar opção "Arquivada" apenas para admins
  if (isAdmin) {
    statusOptions.push({ value: 'Arquivada', label: 'Arquivada' });
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Alterar Status da Obra</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status da Obra</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
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
                disabled={updateContrato.isPending}
              >
                {updateContrato.isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
