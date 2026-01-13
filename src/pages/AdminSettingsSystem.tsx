import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, Settings, Loader2, Save, Video, Smartphone, QrCode } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { VideoAdsSettings } from '@/components/admin/VideoAdsSettings';
import QRCode from 'react-qr-code';

interface SupportUsSettings {
  enabled: boolean;
  countdownSeconds: number;
  checkpointStart: boolean;
  checkpoint50: boolean;
  checkpoint85: boolean;
  amounts: number[];
}

interface AppStoreSettings {
  play_store_url: string;
  app_store_url: string;
  mobile_qr_url: string;
  web_browser_qr_url: string;
}

const AdminSettingsSystem = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingAppStore, setSavingAppStore] = useState(false);
  const [supportUsSettings, setSupportUsSettings] = useState<SupportUsSettings>({
    enabled: true,
    countdownSeconds: 10,
    checkpointStart: true,
    checkpoint50: true,
    checkpoint85: true,
    amounts: [0.5, 1, 2, 5]
  });
  const [amountsString, setAmountsString] = useState('0.5, 1, 2, 5');
  const [appStoreSettings, setAppStoreSettings] = useState<AppStoreSettings>({
    play_store_url: '',
    app_store_url: '',
    mobile_qr_url: '',
    web_browser_qr_url: ''
  });

  // Fetch settings on mount
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

        if (data) {
          const settings: Partial<SupportUsSettings> = {};
          data.forEach((row) => {
            const value = typeof row.setting_value === 'string' 
              ? row.setting_value 
              : JSON.stringify(row.setting_value);
            
            switch (row.setting_key) {
              case 'support_us_enabled':
                settings.enabled = value === 'true';
                break;
              case 'support_us_countdown_seconds':
                settings.countdownSeconds = parseInt(value) || 10;
                break;
              case 'support_us_checkpoint_start':
                settings.checkpointStart = value === 'true';
                break;
              case 'support_us_checkpoint_50':
                settings.checkpoint50 = value === 'true';
                break;
              case 'support_us_checkpoint_85':
                settings.checkpoint85 = value === 'true';
                break;
                case 'support_us_amounts':
                try {
                  settings.amounts = JSON.parse(value);
                  setAmountsString(settings.amounts?.join(', ') || '0.5, 1, 2, 5');
                } catch {
                  settings.amounts = [0.5, 1, 2, 5];
                }
                break;
              case 'general_settings':
                try {
                  const generalSettings = typeof row.setting_value === 'object' 
                    ? row.setting_value as Record<string, unknown>
                    : JSON.parse(value);
                  setAppStoreSettings({
                    play_store_url: (generalSettings.play_store_url as string) || '',
                    app_store_url: (generalSettings.app_store_url as string) || '',
                    mobile_qr_url: (generalSettings.mobile_qr_url as string) || '',
                    web_browser_qr_url: (generalSettings.web_browser_qr_url as string) || ''
                  });
                } catch {
                  // Ignore parse errors
                }
                break;
            }
          });

          setSupportUsSettings(prev => ({ ...prev, ...settings }));
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Parse amounts from string
      const amounts = amountsString
        .split(',')
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n) && n > 0);

      const updates = [
        { setting_key: 'support_us_enabled', setting_value: String(supportUsSettings.enabled) },
        { setting_key: 'support_us_countdown_seconds', setting_value: String(supportUsSettings.countdownSeconds) },
        { setting_key: 'support_us_checkpoint_start', setting_value: String(supportUsSettings.checkpointStart) },
        { setting_key: 'support_us_checkpoint_50', setting_value: String(supportUsSettings.checkpoint50) },
        { setting_key: 'support_us_checkpoint_85', setting_value: String(supportUsSettings.checkpoint85) },
        { setting_key: 'support_us_amounts', setting_value: JSON.stringify(amounts) }
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('site_settings')
          .upsert(
            { 
              setting_key: update.setting_key, 
              setting_value: update.setting_value,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'setting_key' }
          );
        if (error) throw error;
      }

      toast({
        title: 'Settings Saved',
        description: 'Support Us settings have been updated successfully.',
      });
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAppStore = async () => {
    setSavingAppStore(true);
    try {
      // First fetch current general_settings
      const { data: currentData } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'general_settings')
        .maybeSingle();

      // Merge app store URLs with existing settings
      const currentSettings = (typeof currentData?.setting_value === 'object' && currentData?.setting_value !== null) 
        ? currentData.setting_value as Record<string, unknown>
        : {};
      const updatedSettings = {
        ...currentSettings,
        play_store_url: appStoreSettings.play_store_url,
        app_store_url: appStoreSettings.app_store_url,
        mobile_qr_url: appStoreSettings.mobile_qr_url,
        web_browser_qr_url: appStoreSettings.web_browser_qr_url
      };

      const { error } = await supabase
        .from('site_settings')
        .upsert(
          { 
            setting_key: 'general_settings', 
            setting_value: updatedSettings,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'setting_key' }
        );

      if (error) throw error;

      toast({
        title: 'Settings Saved',
        description: 'App Store URLs have been updated successfully.',
      });
    } catch (error: any) {
      console.error('Error saving app store settings:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save app store settings',
        variant: 'destructive'
      });
    } finally {
      setSavingAppStore(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-6 h-6" />
            System Settings
          </h1>
          <p className="text-muted-foreground text-sm">
            Configure video player and system features
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="support-us" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="support-us" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Support Us
            </TabsTrigger>
            <TabsTrigger value="video-ads" className="flex items-center gap-2">
              <Video className="w-4 h-4" />
              Video Ads
            </TabsTrigger>
            <TabsTrigger value="app-store" className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" />
              App Store
            </TabsTrigger>
          </TabsList>

          {/* Support Us Tab */}
          <TabsContent value="support-us" className="mt-6">
            <div className="flex justify-end mb-4">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Support Us Overlay
                </CardTitle>
                <CardDescription>
                  Configure the Support Us overlay shown during video playback
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Enable/Disable */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Support Us Overlay</Label>
                    <p className="text-xs text-muted-foreground">
                      Show the support overlay during video playback
                    </p>
                  </div>
                  <Switch
                    checked={supportUsSettings.enabled}
                    onCheckedChange={(checked) => 
                      setSupportUsSettings(prev => ({ ...prev, enabled: checked }))
                    }
                  />
                </div>

                <Separator />

                {/* Countdown Seconds */}
                <div className="space-y-2">
                  <Label htmlFor="countdown">Auto-dismiss Countdown (seconds)</Label>
                  <Input
                    id="countdown"
                    type="number"
                    min={5}
                    max={60}
                    value={supportUsSettings.countdownSeconds}
                    onChange={(e) => 
                      setSupportUsSettings(prev => ({ 
                        ...prev, 
                        countdownSeconds: parseInt(e.target.value) || 10 
                      }))
                    }
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Time before the overlay auto-dismisses if user doesn't skip
                  </p>
                </div>

                <Separator />

                {/* Checkpoints */}
                <div className="space-y-4">
                  <Label className="text-base font-medium">Display Checkpoints</Label>
                  <p className="text-xs text-muted-foreground">
                    Choose when to show the Support Us overlay during video playback
                  </p>

                  <div className="space-y-3 ml-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>On Video Start</Label>
                        <p className="text-xs text-muted-foreground">
                          Show when user first plays the video
                        </p>
                      </div>
                      <Switch
                        checked={supportUsSettings.checkpointStart}
                        onCheckedChange={(checked) => 
                          setSupportUsSettings(prev => ({ ...prev, checkpointStart: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>At 50% Progress</Label>
                        <p className="text-xs text-muted-foreground">
                          Show when video reaches 50% completion
                        </p>
                      </div>
                      <Switch
                        checked={supportUsSettings.checkpoint50}
                        onCheckedChange={(checked) => 
                          setSupportUsSettings(prev => ({ ...prev, checkpoint50: checked }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>At 85% Progress</Label>
                        <p className="text-xs text-muted-foreground">
                          Show when video reaches 85% completion
                        </p>
                      </div>
                      <Switch
                        checked={supportUsSettings.checkpoint85}
                        onCheckedChange={(checked) => 
                          setSupportUsSettings(prev => ({ ...prev, checkpoint85: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Support Amounts */}
                <div className="space-y-2">
                  <Label htmlFor="amounts">Support Amounts ($)</Label>
                  <Input
                    id="amounts"
                    value={amountsString}
                    onChange={(e) => setAmountsString(e.target.value)}
                    placeholder="0.5, 1, 2, 5"
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated list of support amounts (e.g., 0.5, 1, 2, 5)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video Ads Tab */}
          <TabsContent value="video-ads" className="mt-6">
            <VideoAdsSettings />
          </TabsContent>

          {/* App Store Tab */}
          <TabsContent value="app-store" className="mt-6">
            <div className="flex justify-end mb-4">
              <Button onClick={handleSaveAppStore} disabled={savingAppStore}>
                {savingAppStore ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Changes
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-500" />
                  Mobile App Store Links
                </CardTitle>
                <CardDescription>
                  Configure the app store URLs displayed when content is mobile-only. These links appear in the lock overlay with QR codes for easy download.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Play Store URL */}
                <div className="space-y-2">
                  <Label htmlFor="play_store_url">Google Play Store URL</Label>
                  <Input
                    id="play_store_url"
                    type="url"
                    value={appStoreSettings.play_store_url}
                    onChange={(e) => 
                      setAppStoreSettings(prev => ({ ...prev, play_store_url: e.target.value }))
                    }
                    placeholder="https://play.google.com/store/apps/details?id=your.app.id"
                  />
                  <p className="text-xs text-muted-foreground">
                    The Google Play Store URL for your Android app
                  </p>
                </div>

                <Separator />

                {/* App Store URL */}
                <div className="space-y-2">
                  <Label htmlFor="app_store_url">Apple App Store URL</Label>
                  <Input
                    id="app_store_url"
                    type="url"
                    value={appStoreSettings.app_store_url}
                    onChange={(e) => 
                      setAppStoreSettings(prev => ({ ...prev, app_store_url: e.target.value }))
                    }
                    placeholder="https://apps.apple.com/app/your-app-name/id123456789"
                  />
                  <p className="text-xs text-muted-foreground">
                    The Apple App Store URL for your iOS app
                  </p>
                </div>

                <Separator />

                {/* Mobile QR URL */}
                <div className="space-y-2">
                  <Label htmlFor="mobile_qr_url" className="flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    QR Code URL (Mobile Only Overlay)
                  </Label>
                  <Input
                    id="mobile_qr_url"
                    type="url"
                    value={appStoreSettings.mobile_qr_url}
                    onChange={(e) => 
                      setAppStoreSettings(prev => ({ ...prev, mobile_qr_url: e.target.value }))
                    }
                    placeholder="https://example.com/download or leave empty to use Play Store URL"
                  />
                  <p className="text-xs text-muted-foreground">
                    Custom URL for the QR code shown in the "Mobile App Only" lock overlay. If empty, the Play Store URL will be used.
                  </p>
                </div>

                <Separator />

                {/* Web Browser Only QR URL */}
                <div className="space-y-2">
                  <Label htmlFor="web_browser_qr_url" className="flex items-center gap-2">
                    <QrCode className="w-4 h-4" />
                    QR Code URL (Web Browser Only Overlay)
                  </Label>
                  <Input
                    id="web_browser_qr_url"
                    type="url"
                    value={appStoreSettings.web_browser_qr_url}
                    onChange={(e) => 
                      setAppStoreSettings(prev => ({ ...prev, web_browser_qr_url: e.target.value }))
                    }
                    placeholder="https://yourwebsite.com or leave empty for current page URL"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL for the QR code shown in the "Web Browser Only" lock overlay (for native app users). If empty, the current page URL will be used.
                  </p>
                </div>

                <Separator />

                {/* QR Code Previews */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Mobile App Only QR Preview */}
                  {(appStoreSettings.mobile_qr_url || appStoreSettings.play_store_url || appStoreSettings.app_store_url) && (
                    <div className="space-y-3">
                      <Label className="text-green-600">Mobile App Only - QR Preview</Label>
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-lg border border-green-200">
                          <QRCode 
                            value={appStoreSettings.mobile_qr_url || appStoreSettings.play_store_url || appStoreSettings.app_store_url} 
                            size={100}
                            level="M"
                          />
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <p>Shown to web browser users to download the app.</p>
                          <p className="mt-1 font-mono text-xs break-all">
                            {appStoreSettings.mobile_qr_url || appStoreSettings.play_store_url || appStoreSettings.app_store_url}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Web Browser Only QR Preview */}
                  <div className="space-y-3">
                    <Label className="text-blue-600">Web Browser Only - QR Preview</Label>
                    <div className="flex items-center gap-4">
                      <div className="bg-white p-3 rounded-lg border border-blue-200">
                        <QRCode 
                          value={appStoreSettings.web_browser_qr_url || 'https://yourwebsite.com'} 
                          size={100}
                          level="M"
                        />
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <p>Shown to native app users to open in browser.</p>
                        <p className="mt-1 font-mono text-xs break-all">
                          {appStoreSettings.web_browser_qr_url || '(Current page URL)'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    <strong>Note:</strong> These QR codes are used in lock overlays when content is platform-restricted. "Mobile App Only" shows to web users, "Web Browser Only" shows to native app users.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsSystem;