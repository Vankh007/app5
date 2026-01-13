import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type Theme = 'light' | 'dark' | 'auto';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  effectiveTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme | null>(null);
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>('dark');
  const [isInitialized, setIsInitialized] = useState(false);

  // Fetch default theme from database on first load
  useEffect(() => {
    const initializeTheme = async () => {
      const storedTheme = localStorage.getItem('theme') as Theme;
      
      if (storedTheme) {
        // User has manually set a theme preference
        setThemeState(storedTheme);
      } else {
        // Fetch default from database for new visitors
        try {
          const { data } = await supabase
            .from('site_settings')
            .select('setting_value')
            .eq('setting_key', 'default_theme')
            .single();
          
          if (data) {
            const value = data.setting_value as { theme?: string };
            const dbTheme = value?.theme;
            if (dbTheme === 'light' || dbTheme === 'dark') {
              setThemeState(dbTheme);
            } else {
              // 'system' or any other value defaults to auto
              setThemeState('auto');
            }
          } else {
            setThemeState('auto');
          }
        } catch {
          setThemeState('auto');
        }
      }
      setIsInitialized(true);
    };

    initializeTheme();
  }, []);

  useEffect(() => {
    if (!theme) return;
    
    const root = window.document.documentElement;
    
    const getEffectiveTheme = (): 'light' | 'dark' => {
      if (theme === 'auto') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return theme;
    };

    const updateTheme = () => {
      const effective = getEffectiveTheme();
      setEffectiveTheme(effective);
      root.classList.remove('light', 'dark');
      root.classList.add(effective);
    };

    updateTheme();

    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => updateTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    localStorage.setItem('theme', newTheme);
    setThemeState(newTheme);
  };

  // Show nothing until theme is initialized to prevent flash
  if (!isInitialized) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme: theme || 'auto', setTheme, effectiveTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
