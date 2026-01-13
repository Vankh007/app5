import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Gift, Loader2, Save, Smartphone, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface AdMobRewardedSettings {
  enabled: boolean;
  appId: string;
  adUnitId: string;
  checkpointStart: boolean;
  checkpoint40: boolean;
  checkpoint85: boolean;
}

export const AdMobRewardedSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AdMobRewardedSettings>({
    enabled: false,
    appId: '',
    adUnitId: '',
    checkpointStart: true,
    checkpoint40: false,
    checkpoint85: false,
  });

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'admob_rewarded_enabled',
            'admob_rewarded_app_id',
            'admob_rewarded_ad_unit_id',
            'admob_rewarded_checkpoint_start',
            'admob_rewarded_checkpoint_40',
            'admob_rewarded_checkpoint_85',
          ]);

        if (error) throw error;

        if (data) {
          const newSettings: Partial<AdMobRewardedSettings> = {};
          data.forEach((row) => {
            const value = typeof row.setting_value === 'string'
              ? row.setting_value
              : JSON.stringify(row.setting_value);

            switch (row.setting_key) {
              case 'admob_rewarded_enabled':
                newSettings.enabled = value === 'true';
                break;
              case 'admob_rewarded_app_id':
                newSettings.appId = value;
                break;
              case 'admob_rewarded_ad_unit_id':
                newSettings.adUnitId = value;
                break;
              case 'admob_rewarded_checkpoint_start':
                newSettings.checkpointStart = value === 'true';
                break;
              case 'admob_rewarded_checkpoint_40':
                newSettings.checkpoint40 = value === 'true';
                break;
              case 'admob_rewarded_checkpoint_85':
                newSettings.checkpoint85 = value === 'true';
                break;
            }
          });
          setSettings(prev => ({ ...prev, ...newSettings }));
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
      const updates = [
        { setting_key: 'admob_rewarded_enabled', setting_value: String(settings.enabled) },
        { setting_key: 'admob_rewarded_app_id', setting_value: settings.appId },
        { setting_key: 'admob_rewarded_ad_unit_id', setting_value: settings.adUnitId },
        { setting_key: 'admob_rewarded_checkpoint_start', setting_value: String(settings.checkpointStart) },
        { setting_key: 'admob_rewarded_checkpoint_40', setting_value: String(settings.checkpoint40) },
        { setting_key: 'admob_rewarded_checkpoint_85', setting_value: String(settings.checkpoint85) },
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
        description: 'AdMob Rewarded settings have been updated.',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          AdMob Rewarded ads are shown only on native mobile apps (Android/iOS) to free users.
          Subscribers and users who purchased/rented content will not see these ads.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            AdMob Rewarded Ads
            <Badge variant="outline" className="ml-2">
              <Smartphone className="w-3 h-3 mr-1" />
              Native App Only
            </Badge>
          </CardTitle>
          <CardDescription>
            Configure rewarded video ads shown after Support Us overlay on native mobile apps.
            These ads appear at specific video progress checkpoints.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable AdMob Rewarded Ads</Label>
              <p className="text-xs text-muted-foreground">
                Show rewarded ads to free users on native mobile apps
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) =>
                setSettings(prev => ({ ...prev, enabled: checked }))
              }
            />
          </div>

          <Separator />

          {/* AdMob Configuration */}
          <div className="space-y-4">
            <Label className="text-base font-medium">AdMob Configuration</Label>
            <p className="text-xs text-muted-foreground">
              Enter your AdMob App ID and Rewarded Ad Unit ID from your AdMob console
            </p>

            <div className="space-y-4 ml-4">
              <div className="space-y-2">
                <Label htmlFor="app_id">App ID</Label>
                <Input
                  id="app_id"
                  value={settings.appId}
                  onChange={(e) =>
                    setSettings(prev => ({ ...prev, appId: e.target.value }))
                  }
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX"
                  disabled={!settings.enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Your AdMob App ID (e.g., ca-app-pub-5699578431552008~3848955446)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ad_unit_id">Rewarded Ad Unit ID</Label>
                <Input
                  id="ad_unit_id"
                  value={settings.adUnitId}
                  onChange={(e) =>
                    setSettings(prev => ({ ...prev, adUnitId: e.target.value }))
                  }
                  placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX"
                  disabled={!settings.enabled}
                />
                <p className="text-xs text-muted-foreground">
                  Your Rewarded Ad Unit ID (e.g., ca-app-pub-5699578431552008/4589167951)
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Checkpoints */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Ad Display Checkpoints</Label>
            <p className="text-xs text-muted-foreground">
              Choose when to show rewarded ads during video playback (after Support Us overlay)
            </p>

            <div className="space-y-3 ml-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label>Start of Video</Label>
                    <Badge variant="secondary" className="text-xs">After Support Us</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Show rewarded ad when user first plays the video, after Support Us overlay
                  </p>
                </div>
                <Switch
                  checked={settings.checkpointStart}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({ ...prev, checkpointStart: checked }))
                  }
                  disabled={!settings.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label>At 40% Progress</Label>
                    <Badge variant="secondary" className="text-xs">Mid-video</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Show rewarded ad when video reaches 40% completion
                  </p>
                </div>
                <Switch
                  checked={settings.checkpoint40}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({ ...prev, checkpoint40: checked }))
                  }
                  disabled={!settings.enabled}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label>At 85% Progress</Label>
                    <Badge variant="secondary" className="text-xs">Near end</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Show rewarded ad when video reaches 85% completion
                  </p>
                </div>
                <Switch
                  checked={settings.checkpoint85}
                  onCheckedChange={(checked) =>
                    setSettings(prev => ({ ...prev, checkpoint85: checked }))
                  }
                  disabled={!settings.enabled}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Who sees ads */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Target Audience</Label>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="default">Shows Ads</Badge>
                <span className="text-muted-foreground">Free plan users on native app</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">No Ads</Badge>
                <span className="text-muted-foreground">Subscribers (VIP members)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">No Ads</Badge>
                <span className="text-muted-foreground">Users who purchased/rented content</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Badge variant="outline">No Ads</Badge>
                <span className="text-muted-foreground">Web browser users (not native app)</span>
              </div>
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
