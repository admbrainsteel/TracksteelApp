
import { ColorPalette } from '@/constants/themePalettes';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface PaletteSelectorProps {
  palettes: ColorPalette[];
  selectedPalette: ColorPalette | null;
  onSelectPalette: (palette: ColorPalette) => void;
}

export const PaletteSelector = ({ 
  palettes, 
  selectedPalette, 
  onSelectPalette 
}: PaletteSelectorProps) => {
  return (
    <div className="grid grid-cols-1 gap-4">
      {palettes.map((palette) => (
        <Card
          key={palette.name}
          className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
            selectedPalette?.name === palette.name
              ? 'ring-2 ring-primary shadow-md'
              : 'hover:ring-1 hover:ring-border'
          }`}
          onClick={() => onSelectPalette(palette)}
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="font-semibold text-sm">{palette.name}</h4>
                <p className="text-xs text-muted-foreground">{palette.description}</p>
              </div>
              {selectedPalette?.name === palette.name && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </div>
            
            <div className="flex gap-1 mb-2">
              {Object.entries(palette.colors).slice(0, 6).map(([key, value]) => (
                <div
                  key={key}
                  className="w-6 h-6 rounded-sm border border-gray-200"
                  style={{ backgroundColor: `hsl(${value})` }}
                  title={key}
                />
              ))}
            </div>
            
            <Button
              variant={selectedPalette?.name === palette.name ? "default" : "outline"}
              size="sm"
              className="w-full"
              onClick={(e) => {
                e.stopPropagation();
                onSelectPalette(palette);
              }}
            >
              {selectedPalette?.name === palette.name ? 'Selecionado' : 'Selecionar'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
