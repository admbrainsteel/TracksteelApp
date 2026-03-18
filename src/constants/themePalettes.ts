
import { ThemeColors } from '@/hooks/useThemeConfig';

export interface ColorPalette {
  name: string;
  description: string;
  colors: ThemeColors;
  darkColors?: ThemeColors;
}

export const lightPalettes: ColorPalette[] = [
  {
    name: 'BSystem Light',
    description: 'Tema claro profissional inspirado no BSystem',
    colors: {
      background: '0 0% 100%',
      foreground: '222.2 84% 4.9%',
      primary: '221.2 83.2% 53.3%',
      'primary-foreground': '210 40% 98%',
      secondary: '210 40% 96%',
      'secondary-foreground': '222.2 84% 4.9%',
      accent: '210 40% 96%',
      'accent-foreground': '222.2 84% 4.9%',
      card: '0 0% 100%',
      'card-foreground': '222.2 84% 4.9%',
      border: '214.3 31.8% 91.4%',
      input: '214.3 31.8% 91.4%',
      ring: '221.2 83.2% 53.3%',
    },
    darkColors: {
      background: '218 25% 12%',
      foreground: '210 40% 98%',
      primary: '217 91% 60%',
      'primary-foreground': '210 40% 98%',
      secondary: '218 25% 20%',
      'secondary-foreground': '210 40% 98%',
      accent: '218 25% 20%',
      'accent-foreground': '210 40% 98%',
      card: '218 25% 16%',
      'card-foreground': '210 40% 98%',
      border: '215 27.9% 16.9%',
      input: '215 27.9% 16.9%',
      ring: '217 91% 60%',
    },
  },
  {
    name: 'Azul Claro',
    description: 'Tons de azul suaves para modo claro',
    colors: {
      background: '0 0% 100%',
      foreground: '222.2 84% 4.9%',
      primary: '221.2 83.2% 53.3%',
      'primary-foreground': '210 40% 98%',
      secondary: '220 14.3% 95.9%',
      'secondary-foreground': '220.9 39.3% 11%',
      accent: '220 14.3% 95.9%',
      'accent-foreground': '220.9 39.3% 11%',
      card: '0 0% 100%',
      'card-foreground': '222.2 84% 4.9%',
      border: '220 13% 91%',
      input: '220 13% 91%',
      ring: '221.2 83.2% 53.3%',
    },
    darkColors: {
      background: '218 25% 12%',
      foreground: '210 40% 98%',
      primary: '221.2 83.2% 53.3%',
      'primary-foreground': '210 40% 98%',
      secondary: '218 25% 20%',
      'secondary-foreground': '210 40% 98%',
      accent: '218 25% 20%',
      'accent-foreground': '210 40% 98%',
      card: '218 25% 16%',
      'card-foreground': '210 40% 98%',
      border: '215 27.9% 16.9%',
      input: '215 27.9% 16.9%',
      ring: '221.2 83.2% 53.3%',
    },
  },
  {
    name: 'Verde Suave',
    description: 'Verde suave para modo claro',
    colors: {
      background: '0 0% 100%',
      foreground: '222.2 84% 4.9%',
      primary: '142.1 76.2% 36.3%',
      'primary-foreground': '355.7 100% 97.3%',
      secondary: '210 40% 96%',
      'secondary-foreground': '222.2 84% 4.9%',
      accent: '210 40% 96%',
      'accent-foreground': '222.2 84% 4.9%',
      card: '0 0% 100%',
      'card-foreground': '222.2 84% 4.9%',
      border: '214.3 31.8% 91.4%',
      input: '214.3 31.8% 91.4%',
      ring: '142.1 76.2% 36.3%',
    },
    darkColors: {
      background: '218 25% 12%',
      foreground: '210 40% 98%',
      primary: '142.1 76.2% 36.3%',
      'primary-foreground': '210 40% 98%',
      secondary: '218 25% 20%',
      'secondary-foreground': '210 40% 98%',
      accent: '218 25% 20%',
      'accent-foreground': '210 40% 98%',
      card: '218 25% 16%',
      'card-foreground': '210 40% 98%',
      border: '215 27.9% 16.9%',
      input: '215 27.9% 16.9%',
      ring: '142.1 76.2% 36.3%',
    },
  },
  {
    name: 'Cinza Moderno',
    description: 'Tons de cinza claros e modernos',
    colors: {
      background: '0 0% 100%',
      foreground: '222.2 84% 4.9%',
      primary: '222.2 47.4% 11.2%',
      'primary-foreground': '210 40% 98%',
      secondary: '210 40% 96%',
      'secondary-foreground': '222.2 84% 4.9%',
      accent: '210 40% 96%',
      'accent-foreground': '222.2 84% 4.9%',
      card: '0 0% 100%',
      'card-foreground': '222.2 84% 4.9%',
      border: '214.3 31.8% 91.4%',
      input: '214.3 31.8% 91.4%',
      ring: '222.2 47.4% 11.2%',
    },
    darkColors: {
      background: '218 25% 12%',
      foreground: '210 40% 98%',
      primary: '217 91% 60%',
      'primary-foreground': '210 40% 98%',
      secondary: '218 25% 20%',
      'secondary-foreground': '210 40% 98%',
      accent: '218 25% 20%',
      'accent-foreground': '210 40% 98%',
      card: '218 25% 16%',
      'card-foreground': '210 40% 98%',
      border: '215 27.9% 16.9%',
      input: '215 27.9% 16.9%',
      ring: '217 91% 60%',
    },
  },
];

// Export combined palettes for easier usage
export const COLOR_PALETTES = lightPalettes;

// Keep the old exports for backward compatibility
export const darkPalettes: ColorPalette[] = lightPalettes;
