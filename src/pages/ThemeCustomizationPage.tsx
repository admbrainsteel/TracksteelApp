
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Palette, Save, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useThemeConfig, ThemeColors } from '@/hooks/useThemeConfig';
import { useIconStyle, IconStyleType } from '@/hooks/useIconStyle';
import { ThemePreview } from '@/components/theme/ThemePreview';
import { PaletteSelector } from '@/components/theme/PaletteSelector';
import { COLOR_PALETTES, ColorPalette } from '@/constants/themePalettes';

const ICON_STYLE_OPTIONS = [
  {
    value: 'white' as IconStyleType,
    label: 'Ícones Brancos',
    description: 'Ícones em cor branca padrão'
  },
  {
    value: 'themed' as IconStyleType,
    label: 'Ícones Temáticos',
    description: 'Ícones na cor da paleta selecionada'
  },
  {
    value: 'colorful' as IconStyleType,
    label: 'Ícones Coloridos',
    description: 'Ícones com cores individuais (recomendado)'
  }
];

const ThemeCustomizationPage = () => {
  const navigate = useNavigate();
  const { themeConfig, isLoading, saveThemeConfig } = useThemeConfig();
  const { iconStyle, setIconStyle } = useIconStyle();
  
  const [lightTheme, setLightTheme] = useState<ThemeColors | null>(null);
  const [darkTheme, setDarkTheme] = useState<ThemeColors | null>(null);
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (themeConfig) {
      setLightTheme(themeConfig.light_theme);
      setDarkTheme(themeConfig.dark_theme);
    }
  }, [themeConfig]);

  const handlePaletteSelect = (palette: ColorPalette) => {
    setSelectedPalette(palette);
    setLightTheme(palette.colors);
    setDarkTheme(palette.darkColors || palette.colors);
  };

  const handleSave = async () => {
    if (!lightTheme || !darkTheme) {
      toast.error('Por favor, selecione uma paleta de cores');
      return;
    }

    setIsSaving(true);
    try {
      const success = await saveThemeConfig(lightTheme, darkTheme);
      if (success) {
        toast.success('Personalizações salvas com sucesso!');
      }
    } catch (error) {
      console.error('Error saving theme:', error);
      toast.error('Erro ao salvar personalizações');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/configuracoes')}
            className="bg-card border-border text-foreground hover:bg-accent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Personalização de Tema</h1>
            <p className="text-muted-foreground">Customize as cores e ícones da aplicação</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Painel de Seleção */}
          <div className="space-y-6">
            {/* Seleção de Paleta de Cores */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Paleta de Cores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PaletteSelector
                  palettes={COLOR_PALETTES}
                  selectedPalette={selectedPalette}
                  onSelectPalette={handlePaletteSelect}
                />
              </CardContent>
            </Card>

            {/* Seleção de Estilo de Ícones */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Estilo dos Ícones
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={iconStyle} onValueChange={setIconStyle} className="space-y-4">
                  {ICON_STYLE_OPTIONS.map((option) => (
                    <div key={option.value} className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:border-accent transition-colors">
                      <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                      <div className="flex-1">
                        <Label htmlFor={option.value} className="text-foreground font-medium cursor-pointer">
                          {option.label}
                        </Label>
                        <p className="text-muted-foreground text-sm mt-1">{option.description}</p>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Botão Salvar */}
            <Button
              onClick={handleSave}
              disabled={isSaving || !lightTheme || !darkTheme}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Salvando...' : 'Salvar Personalizações'}
            </Button>
          </div>

          {/* Painel de Preview */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-foreground">Pré-visualização</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="light" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-muted">
                  <TabsTrigger value="light" className="text-foreground data-[state=active]:bg-background">
                    Tema Claro
                  </TabsTrigger>
                  <TabsTrigger value="dark" className="text-foreground data-[state=active]:bg-background">
                    Tema Escuro
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="light" className="mt-4">
                  {lightTheme && (
                    <ThemePreview colors={lightTheme} title="Claro" />
                  )}
                </TabsContent>
                
                <TabsContent value="dark" className="mt-4">
                  {darkTheme && (
                    <ThemePreview colors={darkTheme} title="Escuro" />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ThemeCustomizationPage;
