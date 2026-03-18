import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PecaExpedida } from '@/hooks/usePecasExpedidas';

interface PecaSelectorProps {
  pecasDisponiveis: PecaExpedida[];
  onSelect: (peca: PecaExpedida, quantidade: number) => void;
  loading?: boolean;
}

export const PecaSelector: React.FC<PecaSelectorProps> = ({
  pecasDisponiveis,
  onSelect,
  loading = false
}) => {
  const [open, setOpen] = useState(false);
  const [selectedPeca, setSelectedPeca] = useState<PecaExpedida | null>(null);
  const [quantidade, setQuantidade] = useState<number>(1);

  const handlePecaSelect = (peca: PecaExpedida) => {
    setSelectedPeca(peca);
    setQuantidade(Math.min(1, peca.saldo_disponivel));
    setOpen(false);
  };

  const handleAddApontamento = () => {
    if (!selectedPeca || quantidade <= 0) return;
    
    onSelect(selectedPeca, quantidade);
    setSelectedPeca(null);
    setQuantidade(1);
  };

  const isValidQuantidade = selectedPeca 
    ? quantidade > 0 && quantidade <= selectedPeca.saldo_disponivel 
    : false;

  if (pecasDisponiveis.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">
          Nenhuma peça disponível para apontamento.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Verifique se há peças expedidas para esta OF que ainda não foram totalmente apontadas.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <h3 className="font-medium text-foreground">Adicionar Apontamento de Peça</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="peca-selector">Peça</Label>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="justify-between"
                disabled={loading}
              >
                {selectedPeca
                  ? `${selectedPeca.marca} (Saldo: ${selectedPeca.saldo_disponivel})`
                  : "Selecionar peça..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput placeholder="Buscar peça..." />
                <CommandEmpty>Nenhuma peça encontrada.</CommandEmpty>
                <CommandList>
                  <CommandGroup>
                    {pecasDisponiveis.map((peca) => (
                      <CommandItem
                        key={peca.id}
                        value={peca.marca}
                        onSelect={() => handlePecaSelect(peca)}
                        className="cursor-pointer"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedPeca?.id === peca.id ? "opacity-100" : "opacity-0"
                          )}
                        />
                        <div className="flex flex-col">
                          <span className="font-medium">{peca.marca}</span>
                          <span className="text-xs text-muted-foreground">
                            Expedido: {peca.quantidade_expedida} | 
                            Apontado: {peca.quantidade_ja_apontada} | 
                            Saldo: {peca.saldo_disponivel}
                          </span>
                          {peca.descricao && (
                            <span className="text-xs text-muted-foreground truncate">
                              {peca.descricao}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantidade">Quantidade</Label>
          <Input
            id="quantidade"
            type="number"
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            min={1}
            max={selectedPeca?.saldo_disponivel || 1}
            disabled={!selectedPeca || loading}
            className={cn(
              !isValidQuantidade && selectedPeca && "border-destructive"
            )}
          />
          {selectedPeca && (
            <p className="text-xs text-muted-foreground">
              Máximo: {selectedPeca.saldo_disponivel}
            </p>
          )}
        </div>
      </div>

      <Button
        onClick={handleAddApontamento}
        disabled={!selectedPeca || !isValidQuantidade || loading}
        className="w-full"
      >
        Adicionar Apontamento
      </Button>
    </div>
  );
};