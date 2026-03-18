
import { ThemeColors } from '@/hooks/useThemeConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { InfoIcon } from 'lucide-react';

interface ThemePreviewProps {
  colors: ThemeColors;
  title: string;
}

export const ThemePreview = ({ colors, title }: ThemePreviewProps) => {
  const previewStyle = {
    '--background': colors.background,
    '--foreground': colors.foreground,
    '--primary': colors.primary,
    '--primary-foreground': colors['primary-foreground'],
    '--secondary': colors.secondary,
    '--secondary-foreground': colors['secondary-foreground'],
    '--accent': colors.accent,
    '--accent-foreground': colors['accent-foreground'],
    '--card': colors.card,
    '--card-foreground': colors['card-foreground'],
    '--border': colors.border,
    '--input': colors.input,
    '--ring': colors.ring,
  } as React.CSSProperties;

  return (
    <div
      className="p-4 rounded-lg border bg-background text-foreground transition-all duration-200"
      style={previewStyle}
    >
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Preview - {title}
          </h3>
        </div>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Cartão de Exemplo</CardTitle>
            <CardDescription className="text-muted-foreground">
              Este é um exemplo de como os cartões aparecem
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Primário
              </Button>
              <Button 
                variant="secondary" 
                className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Secundário
              </Button>
            </div>
            
            <Input 
              placeholder="Campo de entrada" 
              className="bg-background border-border text-foreground"
            />
            
            <div className="flex gap-2">
              <Badge className="bg-accent text-accent-foreground">Badge</Badge>
              <Badge variant="secondary">Status</Badge>
            </div>

            <Alert className="border-border bg-card">
              <InfoIcon className="h-4 w-4" />
              <AlertDescription className="text-card-foreground">
                Este é um alerta de exemplo mostrando como as cores se aplicam.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
