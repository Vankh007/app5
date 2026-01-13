import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';

interface SupportUsColors {
  buttonBg: string;
  buttonText: string;
  selectedBg: string;
  selectedText: string;
}

interface SupportUsSettings {
  enabled: boolean;
  countdownSeconds: number;
  checkpointStart: boolean;
  checkpoint50: boolean;
  checkpoint85: boolean;
  amounts: number[];
  colors: SupportUsColors;
}

const defaultColors: SupportUsColors = {
  buttonBg: '#FFFFFF',
  buttonText: '#0F172A',
  selectedBg: '#00BCD4',
  selectedText: '#FFFFFF',
};

const defaultSettings: SupportUsSettings = {
  enabled: true,
  countdownSeconds: 10,
  checkpointStart: true,
  checkpoint50: true,
  checkpoint85: true,
  amounts: [0.5, 1, 2, 5],
  colors: defaultColors
};

export const useSupportUsSettings = () => {
  const [settings, setSettings] = useState<SupportUsSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const { effectiveTheme } = useTheme();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'support_us_enabled',
            'support_us_countdown_seconds',
            'support_us_checkpoint_start',
            'support_us_checkpoint_50',
            'support_us_checkpoint_85',
            'support_us_amounts',
            'general_settings'
          ]);

        if (error) throw error;

        if (data && data.length > 0) {
          const newSettings: SupportUsSettings = { ...defaultSettings };
          
          data.forEach((row) => {
            if (row.setting_key === 'general_settings') {
              // Extract Support Us colors from general settings based on current theme
              const generalSettings = row.setting_value as any;
              const themeMode = effectiveTheme === 'dark' ? 'dark_mode' : 'light_mode';
              const themeColors = generalSettings?.[themeMode];
              
              if (themeColors) {
                newSettings.colors = {
                  buttonBg: themeColors.support_us_button_bg || defaultColors.buttonBg,
                  buttonText: themeColors.support_us_button_text || defaultColors.buttonText,
                  selectedBg: themeColors.support_us_selected_bg || defaultColors.selectedBg,
                  selectedText: themeColors.support_us_selected_text || defaultColors.selectedText,
                };
              }
              return;
            }
            
            const value = typeof row.setting_value === 'string' 
              ? row.setting_value 
              : JSON.stringify(row.setting_value);
            
            switch (row.setting_key) {
              case 'support_us_enabled':
                newSettings.enabled = value === 'true';
                break;
              case 'support_us_countdown_seconds':
                newSettings.countdownSeconds = parseInt(value) || 10;
                break;
              case 'support_us_checkpoint_start':
                newSettings.checkpointStart = value === 'true';
                break;
              case 'support_us_checkpoint_50':
                newSettings.checkpoint50 = value === 'true';
                break;
              case 'support_us_checkpoint_85':
                newSettings.checkpoint85 = value === 'true';
                break;
              case 'support_us_amounts':
                try {
                  newSettings.amounts = JSON.parse(value);
                } catch {
                  newSettings.amounts = [0.5, 1, 2, 5];
                }
                break;
            }
          });

          setSettings(newSettings);
        }
      } catch (error) {
        console.error('Error fetching support us settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [effectiveTheme]);

  return { settings, loading };
};