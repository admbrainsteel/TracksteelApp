
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Edit3, Save, X } from 'lucide-react';
import { toast } from 'sonner';

interface BatchEditButtonProps {
  selectedPecas: Set<string>;
  onBatchUpdate: (updates: BatchUpdateData) => Promise<void>;
  disabled?: boolean;
}

interface BatchUpdateData {
  peso_unitario?: number;
  observacoes?: string;
  material?: string;
  perfil_principal?: string;
  tem_componentes?: boolean;
}

export const BatchEditButton: React.FC<BatchEditButtonProps> = ({
  selectedPecas,
  onBatchUpdate,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updates, setUpdates] = useState<BatchUpdateData>({});
  const [componentesState, setComponentesState] = useState<'sem' | 'com' | null>(null);

  const handleUpdate = async () => {
    if (Object.keys(updates).length === 0) {
      toast.error('Selecione pelo menos um campo para atualizar');
      return;
    }

    setIsUpdating(true);
    try {
      await onBatchUpdate(updates);
      toast.success(`${selectedPecas.size} peças atualizadas com sucesso!`);
      setIsOpen(false);
      setUpdates({});
      setComponentesState(null);
    } catch (error) {
      toast.error('Erro ao atualizar peças');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setUpdates({});
    setComponentesState(null);
  };

  const handleSemComponentesChange = (checked: boolean) => {
    if (checked) {
      setComponentesState('sem');
      setUpdates(prev => ({ ...prev, tem_componentes: false }));
    } else {
      setComponentesState(null);
      const newUpdates = { ...updates };
      delete newUpdates.tem_componentes;
      setUpdates(newUpdates);
    }
  };

  const handleComComponentesChange = (checked: boolean) => {
    if (checked) {
      setComponentesState('com');
      setUpdates(prev => ({ ...prev, tem_componentes: true }));
    } else {
      setComponentesState(null);
      const newUpdates = { ...updates };
      delete newUpdates.tem_componentes;
      setUpdates(newUpdates);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || selectedPecas.size === 0}
          className="h-8 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
        >
          <Edit3 className="h-4 w-4 mr-2" />
          Editar Lote ({selectedPecas.size})
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="h-5 w-5" />
            Editar Peças em Lote
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Atualizando {selectedPecas.size} peças selecionadas
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="material">Material</Label>
              <Input
                id="material"
                placeholder="Deixe em branco para não alterar"
                value={updates.material || ''}
                onChange={(e) => setUpdates(prev => ({ 
                  ...prev, 
                  material: e.target.value || undefined 
                }))}
              />
            </div>

            <div>
              <Label htmlFor="perfil_principal">Perfil Principal</Label>
              <Input
                id="perfil_principal"
                placeholder="Deixe em branco para não alterar"
                value={updates.perfil_principal || ''}
                onChange={(e) => setUpdates(prev => ({ 
                  ...prev, 
                  perfil_principal: e.target.value || undefined 
                }))}
              />
            </div>

            <div>
              <Label htmlFor="peso_unitario">Peso Unitário (kg)</Label>
              <Input
                id="peso_unitario"
                type="number"
                step="0.01"
                placeholder="Deixe em branco para não alterar"
                value={updates.peso_unitario || ''}
                onChange={(e) => setUpdates(prev => ({ 
                  ...prev, 
                  peso_unitario: e.target.value ? parseFloat(e.target.value) : undefined 
                }))}
              />
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                placeholder="Deixe em branco para não alterar"
                value={updates.observacoes || ''}
                onChange={(e) => setUpdates(prev => ({ 
                  ...prev, 
                  observacoes: e.target.value || undefined 
                }))}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sem_componentes"
                checked={componentesState === 'sem'}
                onCheckedChange={handleSemComponentesChange}
              />
              <Label htmlFor="sem_componentes" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Sem Componentes
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="com_componentes"
                checked={componentesState === 'com'}
                onCheckedChange={handleComComponentesChange}
              />
              <Label htmlFor="com_componentes" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Com Componentes
              </Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose} disabled={isUpdating}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Atualizar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
