
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ThemeColors {
  background: string;
  foreground: string;
  primary: string;
  'primary-foreground': string;
  secondary: string;
  'secondary-foreground': string;
  accent: string;
  'accent-foreground': string;
  card: string;
  'card-foreground': string;
  border: string;
  input: string;
  ring: string;
}

export interface ThemeConfig {
  id: string;
  light_theme: ThemeColors;
  dark_theme: ThemeColors;
}

export const useThemeConfig = () => {
  const [themeConfig, setThemeConfig] = useState<ThemeConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchThemeConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('theme_config')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching theme config:', error);
        toast.error('Erro ao carregar configurações de tema');
        return;
      }

      if (data) {
        // Type cast the JSON data to our expected format
        const typedData: ThemeConfig = {
          id: data.id,
          light_theme: data.light_theme as unknown as ThemeColors,
          dark_theme: data.dark_theme as unknown as ThemeColors,
        };
        setThemeConfig(typedData);
        applyThemeToDocument(typedData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveThemeConfig = async (lightTheme: ThemeColors, darkTheme: ThemeColors) => {
    try {
      const { data, error } = await supabase
        .from('theme_config')
        .upsert({
          id: '00000000-0000-0000-0000-000000000001',
          light_theme: lightTheme as any,
          dark_theme: darkTheme as any,
        })
        .select()
        .single();

      if (error) {
        console.error('Error saving theme config:', error);
        toast.error('Erro ao salvar configurações de tema');
        return false;
      }

      if (data) {
        // Type cast the returned data
        const typedData: ThemeConfig = {
          id: data.id,
          light_theme: data.light_theme as unknown as ThemeColors,
          dark_theme: data.dark_theme as unknown as ThemeColors,
        };
        setThemeConfig(typedData);
        applyThemeToDocument(typedData);
        toast.success('Configurações de tema salvas com sucesso!');
        return true;
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao salvar configurações de tema');
      return false;
    }
    return false;
  };

  const applyThemeToDocument = (config: ThemeConfig) => {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    const theme = isDark ? config.dark_theme : config.light_theme;

    Object.entries(theme).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value);
    });
  };

  useEffect(() => {
    fetchThemeConfig();
  }, []);

  return {
    themeConfig,
    isLoading,
    saveThemeConfig,
    applyThemeToDocument,
  };
};
