import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { useState } from 'react';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    toggleTheme();
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="h-9 w-9 relative overflow-hidden"
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${
          theme === 'dark'
            ? 'rotate-0 scale-100 opacity-100'
            : 'rotate-90 scale-0 opacity-0'
        } ${isAnimating ? 'animate-pulse' : ''}`}
      >
        <Sun className="h-4 w-4" />
      </div>
      <div
        className={`absolute inset-0 flex items-center justify-center transition-all duration-500 ease-out ${
          theme === 'light'
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        } ${isAnimating ? 'animate-pulse' : ''}`}
      >
        <Moon className="h-4 w-4" />
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
