import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ArrowLeft, Sun, Moon, Monitor, Check } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useTheme } from '@/contexts/ThemeContext';

type ThemeMode = 'light' | 'dark' | 'system';

export default function AdminSettingsTemplates() {
  const navigate = useNavigate();
  const { setTheme } = useTheme();
  const [defaultTheme, setDefaultTheme] = useState<ThemeMode>('system');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', 'default_theme')
          .single();

        if (data && !error) {
          const value = data.setting_value as { theme?: ThemeMode };
          if (value?.theme) {
            setDefaultTheme(value.theme);
          }
        }
      } catch (error) {
        console.error('Error loading theme settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await supabase.from('site_settings').upsert({
        setting_key: 'default_theme',
        setting_value: { theme: defaultTheme },
        description: 'Default theme mode for the site'
      }, { onConflict: 'setting_key' });

      // Apply theme immediately - clear localStorage and set new theme
      localStorage.removeItem('theme');
      const themeToApply = defaultTheme === 'system' ? 'auto' : defaultTheme;
      setTheme(themeToApply);

      toast.success('Template settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const themeOptions = [
    {
      value: 'light' as ThemeMode,
      label: 'Light Mode',
      description: 'Always display the site in light theme',
      icon: Sun,
      preview: 'bg-white border-gray-200'
    },
    {
      value: 'dark' as ThemeMode,
      label: 'Dark Mode',
      description: 'Always display the site in dark theme',
      icon: Moon,
      preview: 'bg-gray-900 border-gray-700'
    },
    {
      value: 'system' as ThemeMode,
      label: 'System Default',
      description: 'Follow the user\'s system preference',
      icon: Monitor,
      preview: 'bg-gradient-to-r from-white to-gray-900 border-gray-400'
    }
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/settings')}
            className="hover:bg-primary/10"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary">Manage Templates</h1>
            <p className="text-muted-foreground">Configure the frontend template settings</p>
          </div>
        </div>

        {/* Default Theme Setting */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="text-xl">Default Theme Mode</CardTitle>
            <CardDescription>
              Choose the default theme that visitors will see when they first visit your site
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <RadioGroup
                value={defaultTheme}
                onValueChange={(value) => setDefaultTheme(value as ThemeMode)}
                className="grid grid-cols-1 md:grid-cols-3 gap-4"
              >
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = defaultTheme === option.value;
                  
                  return (
                    <Label
                      key={option.value}
                      htmlFor={option.value}
                      className={`relative flex flex-col items-center p-6 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <RadioGroupItem
                        value={option.value}
                        id={option.value}
                        className="sr-only"
                      />
                      
                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}

                      {/* Preview box */}
                      <div className={`w-16 h-12 rounded-lg border-2 mb-4 ${option.preview}`} />

                      {/* Icon */}
                      <div className={`p-3 rounded-full mb-3 ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Icon className="h-6 w-6" />
                      </div>

                      {/* Label */}
                      <span className="font-semibold text-foreground">{option.label}</span>
                      <span className="text-xs text-muted-foreground text-center mt-1">
                        {option.description}
                      </span>
                    </Label>
                  );
                })}
              </RadioGroup>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="border-border bg-muted/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Monitor className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">How it works:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>Light Mode:</strong> Site will always load in light theme for new visitors</li>
                  <li><strong>Dark Mode:</strong> Site will always load in dark theme for new visitors</li>
                  <li><strong>System Default:</strong> Site will respect the visitor's device/browser preference</li>
                </ul>
                <p className="mt-2">Users can still switch themes manually using the theme toggle.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || isLoading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg"
        >
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </AdminLayout>
  );
}
