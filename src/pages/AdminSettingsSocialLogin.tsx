import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Save, ExternalLink, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Json } from '@/integrations/supabase/types';

interface SocialLoginSettings {
  google: {
    enabled: boolean;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
    authorizedOrigin: string;
  };
}

const defaultSettings: SocialLoginSettings = {
  google: {
    enabled: true,
    clientId: '',
    clientSecret: '',
    redirectUri: '',
    authorizedOrigin: '',
  }
};

export default function AdminSettingsSocialLogin() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SocialLoginSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'social_login_settings')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.setting_value) {
        const value = data.setting_value as unknown as SocialLoginSettings;
        if (value.google) {
          setSettings(value);
        }
      }
    } catch (error: any) {
      console.error('Error fetching social login settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const settingData = {
        setting_key: 'social_login_settings',
        setting_value: settings as unknown as Json,
        description: 'Social login provider configurations'
      };

      const { error } = await supabase
        .from('site_settings')
        .upsert(settingData, { onConflict: 'setting_key' });

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Social login settings have been updated. Remember to also configure these in your Supabase Dashboard.',
      });
    } catch (error: any) {
      toast({
        title: 'Error saving settings',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateGoogleSetting = (key: keyof SocialLoginSettings['google'], value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      google: {
        ...prev.google,
        [key]: value
      }
    }));
  };

  const supabaseCallbackUrl = `https://eoidzprqsvimgtwegowv.supabase.co/auth/v1/callback`;

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/settings')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Social Login Settings</h1>
            <p className="text-muted-foreground">Configure OAuth providers for social login</p>
          </div>
        </div>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Important Configuration Step</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              After saving these settings here, you must also configure them in your{' '}
              <a 
                href="https://supabase.com/dashboard/project/eoidzprqsvimgtwegowv/auth/providers" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline inline-flex items-center gap-1"
              >
                Supabase Dashboard <ExternalLink className="h-3 w-3" />
              </a>
            </p>
            <p className="text-sm">
              Go to Authentication → Providers → Google and enter the Client ID and Client Secret.
            </p>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-background rounded-lg border">
                  <svg className="h-6 w-6" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                </div>
                <div>
                  <CardTitle>Google OAuth</CardTitle>
                  <CardDescription>Sign in with Google configuration</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="google-enabled">Enabled</Label>
                <Switch
                  id="google-enabled"
                  checked={settings.google.enabled}
                  onCheckedChange={(checked) => updateGoogleSetting('enabled', checked)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="client-id">Client ID</Label>
                <Input
                  id="client-id"
                  value={settings.google.clientId}
                  onChange={(e) => updateGoogleSetting('clientId', e.target.value)}
                  placeholder="Your Google Client ID"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-secret">Client Secret</Label>
                <Input
                  id="client-secret"
                  type="password"
                  value={settings.google.clientSecret}
                  onChange={(e) => updateGoogleSetting('clientSecret', e.target.value)}
                  placeholder="Your Google Client Secret"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="authorized-origin">Authorized JavaScript Origin</Label>
                <Input
                  id="authorized-origin"
                  value={settings.google.authorizedOrigin}
                  onChange={(e) => updateGoogleSetting('authorizedOrigin', e.target.value)}
                  placeholder="https://yourdomain.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="redirect-uri">Redirect URI (for reference)</Label>
                <Input
                  id="redirect-uri"
                  value={settings.google.redirectUri}
                  onChange={(e) => updateGoogleSetting('redirectUri', e.target.value)}
                  placeholder="https://yourdomain.com/api/auth/google/callback"
                />
              </div>
            </div>

            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p className="text-sm font-medium">Supabase Callback URL</p>
              <p className="text-xs text-muted-foreground">
                Use this URL in your Google Cloud Console as the Authorized Redirect URI:
              </p>
              <code className="block p-2 bg-background rounded text-xs break-all">
                {supabaseCallbackUrl}
              </code>
            </div>

            <div className="p-4 border rounded-lg space-y-3">
              <p className="text-sm font-medium">Setup Instructions</p>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud Console</a></li>
                <li>Create or select a project</li>
                <li>Go to "APIs & Services" → "Credentials"</li>
                <li>Create OAuth 2.0 Client ID credentials</li>
                <li>Add your authorized JavaScript origins</li>
                <li>Add the Supabase callback URL as an authorized redirect URI</li>
                <li>Copy the Client ID and Client Secret here</li>
                <li>Configure the same credentials in your Supabase Dashboard</li>
              </ol>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
