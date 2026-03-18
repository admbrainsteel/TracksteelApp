
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info } from 'lucide-react';
import { ConflitoPeca } from '@/hooks/useApontamentoAutomaticoRomaneio';

interface ConflitoApontamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflitos: ConflitoPeca[];
  onConfirmar: (resolucao: 'somar' | 'substituir' | 'cancelar') => void;
  numeroRomaneio: string;
  loading?: boolean;
}

export const ConflitoApontamentoModal = ({ 
  isOpen, 
  onClose, 
  conflitos, 
  onConfirmar, 
  numeroRomaneio,
  loading = false 
}: ConflitoApontamentoModalProps) => {
  const [resolucao, setResolucao] = useState<'somar' | 'substituir' | 'cancelar'>('somar');

  const handleConfirmar = () => {
    onConfirmar(resolucao);
  };

  const handleCancelar = () => {
    onConfirmar('cancelar');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-yellow-600">
            <AlertTriangle className="w-5 h-5" />
            Conflito de Apontamentos - Romaneio {numeroRomaneio}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Info className="w-4 h-4" />
            <AlertDescription>
              Foram encontradas peças que já possuem apontamentos no processo "Montagem". 
              Como deseja proceder?
            </AlertDescription>
          </Alert>

          {/* Lista de conflitos */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Peças com conflitos:</h3>
            {conflitos.map((conflito, index) => (
              <div key={index} className="border rounded-lg p-3 bg-yellow-50">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{conflito.marca}</div>
                  {conflito.fase && (
                    <Badge variant="outline" className="text-xs">
                      {conflito.fase}
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  <div>Quantidade já apontada: <span className="font-medium">{conflito.quantidade_existente}</span></div>
                  <div>Quantidade no romaneio: <span className="font-medium">{conflito.quantidade_romaneio}</span></div>
                </div>
              </div>
            ))}
          </div>

          {/* Opções de resolução */}
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Como resolver os conflitos:</h3>
            <RadioGroup value={resolucao} onValueChange={(value) => setResolucao(value as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="somar" id="somar" />
                <Label htmlFor="somar" className="text-sm">
                  <div className="font-medium">Somar quantidades</div>
                  <div className="text-xs text-muted-foreground">
                    Adicionar as quantidades do romaneio às já existentes
                  </div>
                </Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="substituir" id="substituir" />
                <Label htmlFor="substituir" className="text-sm">
                  <div className="font-medium">Substituir apontamentos</div>
                  <div className="text-xs text-muted-foreground">
                    Remover apontamentos existentes e usar apenas as quantidades do romaneio
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={handleCancelar}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirmar}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? 'Processando...' : 'Confirmar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
