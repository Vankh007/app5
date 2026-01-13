import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ThemeColors {
  primary_color: string;
  secondary_color: string;
  button_color: string;
  button_text_color: string;
  ribbon_color: string;
  text_color: string;
  heading_color: string;
  link_color: string;
  accent_color: string;
  background_color: string;
  card_background_color: string;
  border_color: string;
  muted_color: string;
}

export interface LogoSettings {
  light_logo: string;
  dark_logo: string;
  favicon: string;
}

export interface SiteSettings {
  site_title: string;
  site_detail: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  light_mode: ThemeColors;
  dark_mode: ThemeColors;
  logos: LogoSettings;
  currency_format: string;
  items_per_page: number;
  currency_display_format: string;
  file_upload_server: string;
  video_skip_time: number;
  tmdb_api_key: string;
  default_genres: string[];
  pusher_app_id: string;
  pusher_app_key: string;
  pusher_app_secret: string;
  pusher_cluster: string;
  socket_app_uri: string;
  play_store_url: string;
  app_store_url: string;
  mobile_qr_url: string;
  web_browser_qr_url: string;
}

const defaultLightColors: ThemeColors = {
  primary_color: '#D50055',
  secondary_color: '#F1F5F9',
  button_color: '#D50055',
  button_text_color: '#FFFFFF',
  ribbon_color: '#FF6B00',
  text_color: '#0F172A',
  heading_color: '#0F172A',
  link_color: '#0078D4',
  accent_color: '#6366F1',
  background_color: '#FFFFFF',
  card_background_color: '#FFFFFF',
  border_color: '#E2E8F0',
  muted_color: '#64748B',
};

const defaultDarkColors: ThemeColors = {
  primary_color: '#D50055',
  secondary_color: '#1B1B3F',
  button_color: '#D50055',
  button_text_color: '#FFFFFF',
  ribbon_color: '#FF6B00',
  text_color: '#FFFFFF',
  heading_color: '#FFFFFF',
  link_color: '#00ABD6',
  accent_color: '#6366F1',
  background_color: '#030303',
  card_background_color: '#1A1A2E',
  border_color: '#2A2A4A',
  muted_color: '#6B7280',
};

const defaultLogos: LogoSettings = {
  light_logo: '',
  dark_logo: '',
  favicon: '',
};

const defaultSettings: SiteSettings = {
  site_title: 'Streaming App',
  site_detail: '',
  currency: 'USD',
  currency_symbol: '$',
  timezone: 'UTC',
  light_mode: defaultLightColors,
  dark_mode: defaultDarkColors,
  logos: defaultLogos,
  currency_format: '20',
  items_per_page: 20,
  currency_display_format: 'symbol_text',
  file_upload_server: 'current',
  video_skip_time: 5,
  tmdb_api_key: '',
  default_genres: [],
  pusher_app_id: '',
  pusher_app_key: '',
  pusher_app_secret: '',
  pusher_cluster: 'ap2',
  socket_app_uri: '',
  play_store_url: '',
  app_store_url: '',
  mobile_qr_url: '',
  web_browser_qr_url: '',
};

interface SiteSettingsContextType {
  settings: SiteSettings;
  logos: LogoSettings;
  isLoading: boolean;
  refreshSettings: () => Promise<void>;
  formatCurrency: (amount: number) => string;
}

const SiteSettingsContext = createContext<SiteSettingsContextType | undefined>(undefined);

// Helper to convert hex to HSL
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  // Remove the hash if present
  hex = hex.replace(/^#/, '');
  
  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [logos, setLogos] = useState<LogoSettings>(defaultLogos);
  const [isLoading, setIsLoading] = useState(true);

  const applyColorSettings = useCallback((loadedSettings: SiteSettings) => {
    try {
      const root = document.documentElement;
      const isDarkMode = root.classList.contains('dark');
      const colors = isDarkMode ? loadedSettings.dark_mode : loadedSettings.light_mode;
      
      // Helper to apply a hex color as HSL CSS variable
      const applyHexColor = (hex: string, cssVar: string) => {
        if (hex && hex.startsWith('#')) {
          const hsl = hexToHSL(hex);
          root.style.setProperty(cssVar, `${hsl.h} ${hsl.s}% ${hsl.l}%`);
        }
      };
      
      // Apply colors from the current theme mode
      applyHexColor(colors.primary_color, '--primary');
      applyHexColor(colors.primary_color, '--ring');
      applyHexColor(colors.primary_color, '--destructive');
      applyHexColor(colors.secondary_color, '--secondary');
      applyHexColor(colors.button_color, '--button');
      applyHexColor(colors.button_text_color, '--button-foreground');
      applyHexColor(colors.ribbon_color, '--ribbon');
      applyHexColor(colors.text_color, '--foreground');
      applyHexColor(colors.heading_color, '--heading');
      applyHexColor(colors.link_color, '--link');
      applyHexColor(colors.accent_color, '--accent');
      applyHexColor(colors.background_color, '--background');
      applyHexColor(colors.card_background_color, '--card');
      applyHexColor(colors.border_color, '--border');
      applyHexColor(colors.muted_color, '--muted');
      applyHexColor(colors.muted_color, '--muted-foreground');
      
    } catch (error) {
      console.error('Error applying color settings:', error);
    }
  }, []);

  const applySiteTitle = useCallback((title: string, detail?: string) => {
    if (title) {
      const fullTitle = detail ? `${title} - ${detail}` : title;
      document.title = fullTitle;
      // Update meta tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', fullTitle);
      }
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load general settings and logos in parallel
      const [settingsResult, logosResult] = await Promise.all([
        supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', 'general_settings')
          .maybeSingle(),
        supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', 'site_logos')
          .maybeSingle()
      ]);

      if (settingsResult.error) {
        console.error('Error loading site settings:', settingsResult.error);
      }

      if (settingsResult.data?.setting_value) {
        const loadedSettings = { ...defaultSettings, ...(settingsResult.data.setting_value as unknown as Partial<SiteSettings>) };
        setSettings(loadedSettings);
        
        // Apply settings to the website
        applyColorSettings(loadedSettings);
        applySiteTitle(loadedSettings.site_title, loadedSettings.site_detail);
      }

      // Load logos
      if (logosResult.data?.setting_value) {
        const loadedLogos = logosResult.data.setting_value as unknown as LogoSettings;
        setLogos(loadedLogos);
        
        // Apply favicon with cache-bust to force browser refresh
        if (loadedLogos.favicon) {
          const cacheBuster = `?v=${Date.now()}`;
          const faviconUrl = loadedLogos.favicon + cacheBuster;

          const links = document.querySelectorAll<HTMLLinkElement>(
            'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[rel*="icon"]'
          );

          links.forEach((link) => {
            link.href = faviconUrl;
          });

          // Ensure at least one standard favicon link exists
          if (!document.querySelector('link[rel="icon"]')) {
            const link = document.createElement('link');
            link.rel = 'icon';
            link.href = faviconUrl;
            document.head.appendChild(link);
          }

          if (!document.querySelector('link[rel="shortcut icon"]')) {
            const link = document.createElement('link');
            link.rel = 'shortcut icon';
            link.href = faviconUrl;
            document.head.appendChild(link);
          }
        }
      }
    } catch (error) {
      console.error('Error loading site settings:', error);
    } finally {
      setIsLoading(false);
    }
  }, [applyColorSettings, applySiteTitle]);

  useEffect(() => {
    loadSettings();

    // Subscribe to changes in site_settings (both general and logos)
    const channel = supabase
      .channel('site-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_settings',
        },
        (payload) => {
          // Reload when any site settings change
          loadSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadSettings]);

  // Re-apply color settings when theme class changes (light/dark)
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          applyColorSettings(settings);
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [settings, applyColorSettings]);

  const formatCurrency = useCallback((amount: number): string => {
    const { currency, currency_symbol, currency_display_format } = settings;
    
    switch (currency_display_format) {
      case 'symbol_only':
        return `${currency_symbol}${amount.toFixed(2)}`;
      case 'text_only':
        return `${amount.toFixed(2)} ${currency}`;
      case 'symbol_text':
      default:
        return `${currency_symbol}${amount.toFixed(2)} ${currency}`;
    }
  }, [settings]);

  const refreshSettings = useCallback(async () => {
    await loadSettings();
  }, [loadSettings]);

  return (
    <SiteSettingsContext.Provider value={{ settings, logos, isLoading, refreshSettings, formatCurrency }}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);
  if (context === undefined) {
    throw new Error('useSiteSettings must be used within a SiteSettingsProvider');
  }
  return context;
}

// Export a hook for optional usage (won't throw if not in provider)
export function useSiteSettingsOptional() {
  return useContext(SiteSettingsContext);
}
