
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Theme = 'dark' | 'light' | 'system';

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: 'light',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'light',
  storageKey = 'tracksteel-ui-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem(storageKey) as Theme;
    return stored || defaultTheme;
  });

  // Load theme configuration from database
  const loadThemeConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('theme_config')
        .select('*')
        .limit(1)
        .single();

      if (data && !error) {
        applyThemeColors(data);
      }
    } catch (error) {
      console.error('Error loading theme config:', error);
    }
  };

  const applyThemeColors = (config: any) => {
    const root = window.document.documentElement;
    const isDark = root.classList.contains('dark');
    const themeColors = isDark ? config.dark_theme : config.light_theme;

    if (themeColors) {
      Object.entries(themeColors).forEach(([key, value]) => {
        root.style.setProperty(`--${key}`, value as string);
      });
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove all theme classes first
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
    } else {
      // Apply the selected theme immediately
      root.classList.add(theme);
    }

    // Load custom theme colors after theme class is applied
    loadThemeConfig();
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
