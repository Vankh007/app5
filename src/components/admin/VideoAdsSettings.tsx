import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Video, 
  Loader2, 
  Save, 
  Plus, 
  Trash2, 
  Edit, 
  Play,
  Eye,
  MousePointer,
  Gift
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdMobRewardedSettings } from './AdMobRewardedSettings';

interface VideoAd {
  id: string;
  name: string;
  video_url: string;
  thumbnail_url: string | null;
  click_url: string | null;
  duration_seconds: number;
  skip_after_seconds: number;
  is_active: boolean;
  placement: string;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  impressions: number;
  clicks: number;
}

interface VideoAdSettings {
  enabled: boolean;
  preRoll: boolean;
  midRoll: boolean;
  midRollInterval: number;
  skipForPremium: boolean;
  frequencyCap: number;
}

export const VideoAdsSettings = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ads, setAds] = useState<VideoAd[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<VideoAd | null>(null);
  const [activeTab, setActiveTab] = useState('web-ads');
  const [settings, setSettings] = useState<VideoAdSettings>({
    enabled: false,
    preRoll: true,
    midRoll: false,
    midRollInterval: 300,
    skipForPremium: true,
    frequencyCap: 3,
  });

  const [formData, setFormData] = useState({
    name: '',
    video_url: '',
    thumbnail_url: '',
    click_url: '',
    duration_seconds: 15,
    skip_after_seconds: 5,
    placement: 'pre_roll',
    priority: 0,
    is_active: true,
  });

  // Fetch settings and ads
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch settings
        const { data: settingsData } = await supabase
          .from('site_settings')
          .select('setting_key, setting_value')
          .in('setting_key', [
            'video_ads_enabled',
            'video_ads_pre_roll',
            'video_ads_mid_roll',
            'video_ads_mid_roll_interval',
            'video_ads_skip_for_premium',
            'video_ads_frequency_cap',
          ]);

        if (settingsData) {
          const newSettings: Partial<VideoAdSettings> = {};
          settingsData.forEach((row) => {
            const value = typeof row.setting_value === 'string'
              ? row.setting_value
              : JSON.stringify(row.setting_value);

            switch (row.setting_key) {
              case 'video_ads_enabled':
                newSettings.enabled = value === 'true';
                break;
              case 'video_ads_pre_roll':
                newSettings.preRoll = value === 'true';
                break;
              case 'video_ads_mid_roll':
                newSettings.midRoll = value === 'true';
                break;
              case 'video_ads_mid_roll_interval':
                newSettings.midRollInterval = parseInt(value) || 300;
                break;
              case 'video_ads_skip_for_premium':
                newSettings.skipForPremium = value === 'true';
                break;
              case 'video_ads_frequency_cap':
                newSettings.frequencyCap = parseInt(value) || 3;
                break;
            }
          });
          setSettings(prev => ({ ...prev, ...newSettings }));
        }

        // Fetch ads
        const { data: adsData } = await supabase
          .from('video_ads')
          .select('*')
          .order('priority', { ascending: false });

        if (adsData) {
          setAds(adsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updates = [
        { setting_key: 'video_ads_enabled', setting_value: String(settings.enabled) },
        { setting_key: 'video_ads_pre_roll', setting_value: String(settings.preRoll) },
        { setting_key: 'video_ads_mid_roll', setting_value: String(settings.midRoll) },
        { setting_key: 'video_ads_mid_roll_interval', setting_value: String(settings.midRollInterval) },
        { setting_key: 'video_ads_skip_for_premium', setting_value: String(settings.skipForPremium) },
        { setting_key: 'video_ads_frequency_cap', setting_value: String(settings.frequencyCap) },
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
        description: 'Video ad settings have been updated.',
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

  const handleOpenDialog = (ad?: VideoAd) => {
    if (ad) {
      setEditingAd(ad);
      setFormData({
        name: ad.name,
        video_url: ad.video_url,
        thumbnail_url: ad.thumbnail_url || '',
        click_url: ad.click_url || '',
        duration_seconds: ad.duration_seconds,
        skip_after_seconds: ad.skip_after_seconds,
        placement: ad.placement,
        priority: ad.priority,
        is_active: ad.is_active,
      });
    } else {
      setEditingAd(null);
      setFormData({
        name: '',
        video_url: '',
        thumbnail_url: '',
        click_url: '',
        duration_seconds: 15,
        skip_after_seconds: 5,
        placement: 'pre_roll',
        priority: 0,
        is_active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSaveAd = async () => {
    try {
      if (editingAd) {
        const { error } = await supabase
          .from('video_ads')
          .update({
            ...formData,
            thumbnail_url: formData.thumbnail_url || null,
            click_url: formData.click_url || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingAd.id);

        if (error) throw error;

        setAds(prev => prev.map(a => 
          a.id === editingAd.id ? { ...a, ...formData } : a
        ));
      } else {
        const { data, error } = await supabase
          .from('video_ads')
          .insert({
            ...formData,
            thumbnail_url: formData.thumbnail_url || null,
            click_url: formData.click_url || null,
          })
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setAds(prev => [data, ...prev]);
        }
      }

      toast({
        title: editingAd ? 'Ad Updated' : 'Ad Created',
        description: `Video ad "${formData.name}" has been ${editingAd ? 'updated' : 'created'}.`,
      });
      setDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving ad:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save ad',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteAd = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;

    try {
      const { error } = await supabase
        .from('video_ads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAds(prev => prev.filter(a => a.id !== id));
      toast({
        title: 'Ad Deleted',
        description: 'Video ad has been deleted.',
      });
    } catch (error: any) {
      console.error('Error deleting ad:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete ad',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (ad: VideoAd) => {
    try {
      const { error } = await supabase
        .from('video_ads')
        .update({ is_active: !ad.is_active })
        .eq('id', ad.id);

      if (error) throw error;

      setAds(prev => prev.map(a => 
        a.id === ad.id ? { ...a, is_active: !a.is_active } : a
      ));
    } catch (error: any) {
      console.error('Error toggling ad:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update ad',
        variant: 'destructive'
      });
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
      {/* Tabs for Web Ads vs AdMob */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="web-ads" className="flex items-center gap-2">
            <Video className="w-4 h-4" />
            Web Video Ads
          </TabsTrigger>
          <TabsTrigger value="admob-rewarded" className="flex items-center gap-2">
            <Gift className="w-4 h-4" />
            AdMob Rewarded
          </TabsTrigger>
        </TabsList>

        {/* Web Video Ads Tab */}
        <TabsContent value="web-ads" className="mt-6">
      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="w-5 h-5 text-primary" />
            Video Ad Settings
          </CardTitle>
          <CardDescription>
            Configure video advertisements shown before and during video playback
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Enable Video Ads</Label>
              <p className="text-xs text-muted-foreground">
                Show video advertisements to users
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

          {/* Placement Settings */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Ad Placements</Label>
            
            <div className="space-y-3 ml-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Pre-roll Ads</Label>
                  <p className="text-xs text-muted-foreground">
                    Show ads before video starts
                  </p>
                </div>
                <Switch
                  checked={settings.preRoll}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, preRoll: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Mid-roll Ads</Label>
                  <p className="text-xs text-muted-foreground">
                    Show ads during video playback
                  </p>
                </div>
                <Switch
                  checked={settings.midRoll}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, midRoll: checked }))
                  }
                />
              </div>

              {settings.midRoll && (
                <div className="space-y-2 pl-4">
                  <Label>Mid-roll Interval (seconds)</Label>
                  <Input
                    type="number"
                    min={60}
                    max={1800}
                    value={settings.midRollInterval}
                    onChange={(e) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        midRollInterval: parseInt(e.target.value) || 300 
                      }))
                    }
                    className="w-32"
                  />
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Premium Settings */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Skip for Premium Users</Label>
              <p className="text-xs text-muted-foreground">
                Premium members can skip ads immediately
              </p>
            </div>
            <Switch
              checked={settings.skipForPremium}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, skipForPremium: checked }))
              }
            />
          </div>

          <Separator />

          {/* Frequency Cap */}
          <div className="space-y-2">
            <Label>Frequency Cap (ads per session)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={settings.frequencyCap}
              onChange={(e) => 
                setSettings(prev => ({ 
                  ...prev, 
                  frequencyCap: parseInt(e.target.value) || 3 
                }))
              }
              className="w-32"
            />
            <p className="text-xs text-muted-foreground">
              Maximum number of ads shown to a user per session
            </p>
          </div>

          <Button onClick={handleSaveSettings} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Settings
          </Button>
        </CardContent>
      </Card>

      {/* Video Ads List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Video Ads</CardTitle>
            <CardDescription>
              Manage your video advertisements
            </CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            Add Video Ad
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Placement</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Skip After</TableHead>
                <TableHead>Stats</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No video ads yet. Click "Add Video Ad" to create one.
                  </TableCell>
                </TableRow>
              ) : (
                ads.map((ad) => (
                  <TableRow key={ad.id}>
                    <TableCell className="font-medium">{ad.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {ad.placement.replace('_', '-')}
                      </Badge>
                    </TableCell>
                    <TableCell>{ad.duration_seconds}s</TableCell>
                    <TableCell>{ad.skip_after_seconds}s</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          {ad.impressions}
                        </span>
                        <span className="flex items-center gap-1">
                          <MousePointer className="w-3 h-3" />
                          {ad.clicks}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={ad.is_active}
                        onCheckedChange={() => handleToggleActive(ad)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(ad.video_url, '_blank')}
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(ad)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAd(ad.id)}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingAd ? 'Edit Video Ad' : 'Add Video Ad'}
            </DialogTitle>
            <DialogDescription>
              {editingAd 
                ? 'Update the video advertisement details' 
                : 'Create a new video advertisement'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Summer Sale Ad"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="video_url">Video URL *</Label>
              <Input
                id="video_url"
                value={formData.video_url}
                onChange={(e) => setFormData(prev => ({ ...prev, video_url: e.target.value }))}
                placeholder="https://example.com/ad.mp4"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
              <Input
                id="thumbnail_url"
                value={formData.thumbnail_url}
                onChange={(e) => setFormData(prev => ({ ...prev, thumbnail_url: e.target.value }))}
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="click_url">Click URL</Label>
              <Input
                id="click_url"
                value={formData.click_url}
                onChange={(e) => setFormData(prev => ({ ...prev, click_url: e.target.value }))}
                placeholder="https://example.com/landing-page"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (seconds)</Label>
                <Input
                  id="duration"
                  type="number"
                  min={5}
                  max={120}
                  value={formData.duration_seconds}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    duration_seconds: parseInt(e.target.value) || 15 
                  }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="skip_after">Skip After (seconds)</Label>
                <Input
                  id="skip_after"
                  type="number"
                  min={0}
                  max={30}
                  value={formData.skip_after_seconds}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    skip_after_seconds: parseInt(e.target.value) || 5 
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="placement">Placement</Label>
                <Select
                  value={formData.placement}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, placement: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pre_roll">Pre-roll</SelectItem>
                    <SelectItem value="mid_roll">Mid-roll</SelectItem>
                    <SelectItem value="post_roll">Post-roll</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.priority}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    priority: parseInt(e.target.value) || 0 
                  }))}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
              />
              <Label htmlFor="is_active">Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveAd}
              disabled={!formData.name || !formData.video_url}
            >
              {editingAd ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </TabsContent>

        {/* AdMob Rewarded Tab */}
        <TabsContent value="admob-rewarded" className="mt-6">
          <AdMobRewardedSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};
