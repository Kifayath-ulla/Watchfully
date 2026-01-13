import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type Theme = 'light' | 'dark';

export function useTheme() {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('theme') as Theme;
      if (stored) return stored;
    }
    return 'dark'; // Default to dark mode
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load theme from profile when user logs in
  useEffect(() => {
    const loadThemeFromProfile = async () => {
      if (!user) {
        setIsLoaded(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('theme_preference')
          .eq('id', user.id)
          .single();

        if (!error && data?.theme_preference) {
          setThemeState(data.theme_preference as Theme);
          localStorage.setItem('theme', data.theme_preference);
        }
      } catch (err) {
        console.error('Failed to load theme from profile:', err);
      } finally {
        setIsLoaded(true);
      }
    };

    loadThemeFromProfile();
  }, [user]);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    
    // Add transition class
    root.classList.add('theme-transition');
    
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    localStorage.setItem('theme', theme);
    
    // Remove transition class after animation completes
    const timeout = setTimeout(() => {
      root.classList.remove('theme-transition');
    }, 300);

    return () => clearTimeout(timeout);
  }, [theme]);

  // Save theme to profile when changed (only for logged-in users)
  const setTheme = useCallback(async (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);

    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({ theme_preference: newTheme })
          .eq('id', user.id);
      } catch (err) {
        console.error('Failed to save theme to profile:', err);
      }
    }
  }, [user]);

  const toggleTheme = useCallback(() => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [theme, setTheme]);

  return { theme, setTheme, toggleTheme, isLoaded };
}
