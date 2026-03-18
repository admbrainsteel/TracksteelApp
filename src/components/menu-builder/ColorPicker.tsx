
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface ColorPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onColorSelect: (color: string) => void;
}

const predefinedColors = [
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Índigo', value: '#6366f1' },
  { name: 'Roxo', value: '#8b5cf6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Amarelo', value: '#eab308' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Esmeralda', value: '#10b981' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Cinza', value: '#6b7280' },
];

export function ColorPicker({ isOpen, onClose, onColorSelect }: ColorPickerProps) {
  const handleColorSelect = (color: string) => {
    onColorSelect(color);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-card-foreground">Escolher Cor do Grupo</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-4 gap-3 p-4">
          {predefinedColors.map((color) => (
            <Button
              key={color.value}
              variant="outline"
              className="h-12 w-full p-0 border-border hover:border-accent-foreground transition-all relative group"
              style={{ backgroundColor: color.value }}
              onClick={() => handleColorSelect(color.value)}
            >
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded-md transition-colors" />
              <span className="relative text-white font-medium text-xs">
                {color.name}
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
