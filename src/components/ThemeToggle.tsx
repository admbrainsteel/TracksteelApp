
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    console.log('🎨 Current theme:', theme);
    const newTheme = theme === 'light' ? 'dark' : 'light';
    console.log('🎨 Switching to theme:', newTheme);
    setTheme(newTheme);
  };

  const isDark = theme === 'dark';

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="h-10 w-10 rounded-full bg-card hover:bg-accent hover:text-accent-foreground transition-colors shadow-sm border-border"
      aria-label={isDark ? "Mudar para modo claro" : "Mudar para modo escuro"}
    >
      {isDark ? (
        <Sun className="h-[1.2rem] w-[1.2rem] text-foreground transition-all" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] text-foreground transition-all" />
      )}
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
