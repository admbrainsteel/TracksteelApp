
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useThemeConfig, ThemeColors } from '@/hooks/useThemeConfig';
import { ThemePreview } from '@/components/theme/ThemePreview';
import { PaletteSelector } from '@/components/theme/PaletteSelector';
import { lightPalettes, darkPalettes, ColorPalette } from '@/constants/themePalettes';
import { toast } from 'sonner';
import { Palette, Save, Loader2 } from 'lucide-react';

const ThemeCustomization = () => {
  const { themeConfig, isLoading, saveThemeConfig } = useThemeConfig();
  const [selectedLightPalette, setSelectedLightPalette] = useState<ColorPalette | null>(null);
  const [selectedDarkPalette, setSelectedDarkPalette] = useState<ColorPalette | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('light');

  useEffect(() => {
    if (themeConfig) {
      // Encontrar a paleta correspondente ao tema atual
      const currentLightPalette = lightPalettes.find(palette => 
        JSON.stringify(palette.colors) === JSON.stringify(themeConfig.light_theme)
      );
      const currentDarkPalette = darkPalettes.find(palette => 
        JSON.stringify(palette.colors) === JSON.stringify(themeConfig.dark_theme)
      );
      
      setSelectedLightPalette(currentLightPalette || lightPalettes[0]);
      setSelectedDarkPalette(currentDarkPalette || darkPalettes[0]);
    }
  }, [themeConfig]);

  const handleSaveChanges = async () => {
    if (!selectedLightPalette || !selectedDarkPalette) {
      toast.error('Selecione uma paleta para cada modo');
      return;
    }

    setIsSaving(true);
    try {
      const success = await saveThemeConfig(
        selectedLightPalette.colors,
        selectedDarkPalette.colors
      );
      
      if (success) {
        // Aplicar tema atual baseado no modo ativo
        const root = document.documentElement;
        const isDark = root.classList.contains('dark');
        const currentTheme = isDark ? selectedDarkPalette.colors : selectedLightPalette.colors;
        
        Object.entries(currentTheme).forEach(([key, value]) => {
          root.style.setProperty(`--${key}`, value);
        });
      }
    } catch (error) {
      console.error('Error saving theme:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Carregando configurações...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Palette className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Personalização de Tema</h1>
          <p className="text-muted-foreground">
            Customize as cores da aplicação para os modos claro e escuro
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="light">Tema Claro</TabsTrigger>
          <TabsTrigger value="dark">Tema Escuro</TabsTrigger>
        </TabsList>

        <TabsContent value="light" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Paletas Disponíveis - Modo Claro</CardTitle>
                <CardDescription>
                  Escolha uma paleta de cores para o tema claro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaletteSelector
                  palettes={lightPalettes}
                  selectedPalette={selectedLightPalette}
                  onSelectPalette={setSelectedLightPalette}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pré-visualização</CardTitle>
                <CardDescription>
                  Veja como ficará a interface com a paleta selecionada
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedLightPalette && (
                  <ThemePreview
                    colors={selectedLightPalette.colors}
                    title="Tema Claro"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="dark" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Paletas Disponíveis - Modo Escuro</CardTitle>
                <CardDescription>
                  Escolha uma paleta de cores para o tema escuro
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaletteSelector
                  palettes={darkPalettes}
                  selectedPalette={selectedDarkPalette}
                  onSelectPalette={setSelectedDarkPalette}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pré-visualização</CardTitle>
                <CardDescription>
                  Veja como ficará a interface com a paleta selecionada
                </CardDescription>
              </CardHeader>
              <CardContent>
                {selectedDarkPalette && (
                  <ThemePreview
                    colors={selectedDarkPalette.colors}
                    title="Tema Escuro"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button
          onClick={handleSaveChanges}
          disabled={isSaving || !selectedLightPalette || !selectedDarkPalette}
          className="min-w-[150px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ThemeCustomization;
