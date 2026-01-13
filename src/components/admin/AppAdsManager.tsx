import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Eye, EyeOff, Smartphone, Settings, TestTube } from 'lucide-react';
import type { Json } from '@/integrations/supabase/types';

interface AppAd {
  id: string;
  name: string;
  ad_type: string;
  ad_unit_id: string;
  platform: string;
  placement: string;
  is_active: boolean;
  is_test_mode: boolean;
  priority: number;
  frequency_cap: number | null;
  show_after_seconds: number | null;
  reward_amount: number | null;
  reward_type: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface AppAdFormData {
  name: string;
  ad_type: string;
  ad_unit_id: string;
  platform: string;
  placement: string;
  is_active: boolean;
  is_test_mode: boolean;
  priority: number;
  frequency_cap: number;
  show_after_seconds: number;
  reward_amount: number;
  reward_type: string;
  start_date: string;
  end_date: string;
}

interface AdSettings {
  [key: string]: {
    setting_value: Record<string, unknown>;
  };
}

const AD_TYPES = [
  { value: 'banner', label: 'Banner Ad', description: 'Small ad at top/bottom of screen' },
  { value: 'interstitial', label: 'Interstitial Ad', description: 'Full screen ad between content' },
  { value: 'rewarded', label: 'Rewarded Ad', description: 'User watches ad for rewards' },
  { value: 'native', label: 'Native Ad', description: 'Customized ad matching app design' },
  { value: 'app_open', label: 'App Open Ad', description: 'Shows when app opens/resumes' },
];

const PLATFORMS = [
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
  { value: 'both', label: 'Both Platforms' },
];

const APP_PLACEMENTS = [
  { value: 'home_banner', label: 'Home Screen Banner' },
  { value: 'watch_top_banner', label: 'Watch Screen Top Banner (Above Player)' },
  { value: 'watch_bottom_banner', label: 'Watch Screen Bottom Banner (Under Player)' },
  { value: 'watch_banner', label: 'Watch Screen Banner' },
  { value: 'watch_cast_tabs_banner', label: 'Watch Screen (Between Cast & Tabs)' },
  { value: 'episode_interstitial', label: 'Between Episodes' },
  { value: 'app_open', label: 'App Open/Resume' },
  { value: 'search_banner', label: 'Search Screen Banner' },
  { value: 'details_banner', label: 'Content Details Banner' },
  { value: 'reward_unlock', label: 'Reward to Unlock Content' },
  { value: 'reward_coins', label: 'Reward for In-App Coins' },
  { value: 'native_feed', label: 'Native in Content Feed' },
  { value: 'exit_interstitial', label: 'On App Exit' },
];

const TEST_AD_UNITS = {
  android: {
    banner: 'ca-app-pub-3940256099942544/6300978111',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    native: 'ca-app-pub-3940256099942544/2247696110',
    app_open: 'ca-app-pub-3940256099942544/9257395921',
  },
  ios: {
    banner: 'ca-app-pub-3940256099942544/2934735716',
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    rewarded: 'ca-app-pub-3940256099942544/1712485313',
    native: 'ca-app-pub-3940256099942544/3986624511',
    app_open: 'ca-app-pub-3940256099942544/5575463023',
  },
};

const defaultFormData: AppAdFormData = {
  name: '',
  ad_type: 'banner',
  ad_unit_id: '',
  platform: 'both',
  placement: 'home_banner',
  is_active: true,
  is_test_mode: true,
  priority: 1,
  frequency_cap: 0,
  show_after_seconds: 0,
  reward_amount: 0,
  reward_type: '',
  start_date: '',
  end_date: '',
};

export function AppAdsManager() {
  const [appAds, setAppAds] = useState<AppAd[]>([]);
  const [settings, setSettings] = useState<AdSettings>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AppAd | null>(null);
  const [formData, setFormData] = useState<AppAdFormData>(defaultFormData);
  const [activeSubTab, setActiveSubTab] = useState('ads');
  const { toast } = useToast();

  useEffect(() => {
    fetchAppAds();
    fetchSettings();
  }, []);

  const fetchAppAds = async () => {
    try {
      const { data, error } = await supabase
        .from('app_ads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppAds(data || []);
    } catch (error) {
      console.error('Error fetching app ads:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch app ads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_ad_settings')
        .select('*');

      if (error) throw error;
      
      const settingsMap: AdSettings = {};
      data?.forEach((s) => {
        settingsMap[s.setting_key] = { setting_value: s.setting_value as Record<string, unknown> };
      });
      setSettings(settingsMap);
    } catch (error) {
      console.error('Error fetching settings:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const adData = {
        name: formData.name,
        ad_type: formData.ad_type,
        ad_unit_id: formData.ad_unit_id,
        platform: formData.platform,
        placement: formData.placement,
        is_active: formData.is_active,
        is_test_mode: formData.is_test_mode,
        priority: formData.priority,
        frequency_cap: formData.frequency_cap || null,
        show_after_seconds: formData.show_after_seconds || null,
        reward_amount: formData.ad_type === 'rewarded' ? formData.reward_amount : null,
        reward_type: formData.ad_type === 'rewarded' ? formData.reward_type : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      };

      if (editingAd) {
        const { error } = await supabase
          .from('app_ads')
          .update(adData)
          .eq('id', editingAd.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'App ad updated successfully' });
      } else {
        const { error } = await supabase
          .from('app_ads')
          .insert(adData);

        if (error) throw error;
        toast({ title: 'Success', description: 'App ad created successfully' });
      }

      setIsDialogOpen(false);
      setEditingAd(null);
      setFormData(defaultFormData);
      fetchAppAds();
    } catch (error) {
      console.error('Error saving app ad:', error);
      toast({
        title: 'Error',
        description: 'Failed to save app ad',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (ad: AppAd) => {
    setEditingAd(ad);
    setFormData({
      name: ad.name,
      ad_type: ad.ad_type,
      ad_unit_id: ad.ad_unit_id,
      platform: ad.platform,
      placement: ad.placement,
      is_active: ad.is_active,
      is_test_mode: ad.is_test_mode,
      priority: ad.priority,
      frequency_cap: ad.frequency_cap || 0,
      show_after_seconds: ad.show_after_seconds || 0,
      reward_amount: ad.reward_amount || 0,
      reward_type: ad.reward_type || '',
      start_date: ad.start_date?.split('T')[0] || '',
      end_date: ad.end_date?.split('T')[0] || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this app ad?')) return;

    try {
      const { error } = await supabase
        .from('app_ads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'App ad deleted successfully' });
      fetchAppAds();
    } catch (error) {
      console.error('Error deleting app ad:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete app ad',
        variant: 'destructive',
      });
    }
  };

  const toggleAdStatus = async (ad: AppAd) => {
    try {
      const { error } = await supabase
        .from('app_ads')
        .update({ is_active: !ad.is_active })
        .eq('id', ad.id);

      if (error) throw error;
      fetchAppAds();
    } catch (error) {
      console.error('Error toggling ad status:', error);
    }
  };

  const updateSetting = async (key: string, value: Record<string, unknown>) => {
    try {
      // Use upsert to handle both insert and update cases
      const { error } = await supabase
        .from('app_ad_settings')
        .upsert({
          setting_key: key,
          setting_value: value as Json,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'setting_key',
        });

      if (error) throw error;
      fetchSettings();
      toast({ title: 'Success', description: 'Setting updated' });
    } catch (error) {
      console.error('Error updating setting:', error);
      toast({ title: 'Error', description: 'Failed to update setting', variant: 'destructive' });
    }
  };

  const fillTestAdUnit = () => {
    const platform = formData.platform === 'both' ? 'android' : formData.platform;
    const testUnit = TEST_AD_UNITS[platform as keyof typeof TEST_AD_UNITS][formData.ad_type as keyof typeof TEST_AD_UNITS['android']];
    setFormData({ ...formData, ad_unit_id: testUnit, is_test_mode: true });
  };

  const getAdTypeLabel = (type: string) => AD_TYPES.find(t => t.value === type)?.label || type;
  const getPlacementLabel = (placement: string) => APP_PLACEMENTS.find(p => p.value === placement)?.label || placement;
  const getPlatformLabel = (platform: string) => PLATFORMS.find(p => p.value === platform)?.label || platform;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total App Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appAds.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {appAds.filter(a => a.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Test Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-500">
              {appAds.filter(a => a.is_test_mode).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Android</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appAds.filter(a => a.platform === 'android' || a.platform === 'both').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">iOS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appAds.filter(a => a.platform === 'ios' || a.platform === 'both').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sub Tabs */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <TabsList>
          <TabsTrigger value="ads">Ad Units</TabsTrigger>
          <TabsTrigger value="settings">AdMob Settings</TabsTrigger>
          <TabsTrigger value="guide">Integration Guide</TabsTrigger>
        </TabsList>

        <TabsContent value="ads" className="space-y-4">
          {/* Create Button */}
          <div className="flex justify-end">
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingAd(null);
                setFormData(defaultFormData);
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create App Ad
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingAd ? 'Edit App Ad' : 'Create New App Ad'}</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Ad Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Home Banner Android"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Input
                        id="priority"
                        type="number"
                        min="1"
                        max="100"
                        value={formData.priority}
                        onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Ad Type *</Label>
                      <Select
                        value={formData.ad_type}
                        onValueChange={(value) => setFormData({ ...formData, ad_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {AD_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              <div>
                                <div>{t.label}</div>
                                <div className="text-xs text-muted-foreground">{t.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Platform *</Label>
                      <Select
                        value={formData.platform}
                        onValueChange={(value) => setFormData({ ...formData, platform: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PLATFORMS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Placement *</Label>
                    <Select
                      value={formData.placement}
                      onValueChange={(value) => setFormData({ ...formData, placement: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {APP_PLACEMENTS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="ad_unit_id">AdMob Ad Unit ID *</Label>
                      <Button type="button" variant="outline" size="sm" onClick={fillTestAdUnit}>
                        <TestTube className="h-3 w-3 mr-1" />
                        Fill Test ID
                      </Button>
                    </div>
                    <Input
                      id="ad_unit_id"
                      value={formData.ad_unit_id}
                      onChange={(e) => setFormData({ ...formData, ad_unit_id: e.target.value })}
                      placeholder="ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY"
                    />
                    <p className="text-xs text-muted-foreground">
                      Get this from your AdMob console. Use test IDs during development.
                    </p>
                  </div>

                  {formData.ad_type === 'rewarded' && (
                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="reward_amount">Reward Amount</Label>
                        <Input
                          id="reward_amount"
                          type="number"
                          min="1"
                          value={formData.reward_amount}
                          onChange={(e) => setFormData({ ...formData, reward_amount: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reward_type">Reward Type</Label>
                        <Input
                          id="reward_type"
                          value={formData.reward_type}
                          onChange={(e) => setFormData({ ...formData, reward_type: e.target.value })}
                          placeholder="e.g., coins, unlocks, etc."
                        />
                      </div>
                    </div>
                  )}

                  {(formData.ad_type === 'interstitial' || formData.ad_type === 'app_open') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="frequency_cap">Frequency Cap (per session)</Label>
                        <Input
                          id="frequency_cap"
                          type="number"
                          min="0"
                          value={formData.frequency_cap}
                          onChange={(e) => setFormData({ ...formData, frequency_cap: parseInt(e.target.value) || 0 })}
                          placeholder="0 = unlimited"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="show_after_seconds">Show After (seconds)</Label>
                        <Input
                          id="show_after_seconds"
                          type="number"
                          min="0"
                          value={formData.show_after_seconds}
                          onChange={(e) => setFormData({ ...formData, show_after_seconds: parseInt(e.target.value) || 0 })}
                          placeholder="Delay before showing"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date (optional)</Label>
                      <Input
                        id="start_date"
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date (optional)</Label>
                      <Input
                        id="end_date"
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <Label htmlFor="is_active">Active</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="is_test_mode"
                        checked={formData.is_test_mode}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_test_mode: checked })}
                      />
                      <Label htmlFor="is_test_mode" className="text-yellow-600">Test Mode</Label>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={!formData.name || !formData.ad_unit_id}>
                    {editingAd ? 'Update' : 'Create'} App Ad
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Ads Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                App Ad Units
              </CardTitle>
              <CardDescription>Manage AdMob ads for your native Android/iOS apps</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : appAds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No app ads configured. Create your first ad unit to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Placement</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appAds.map((ad) => (
                      <TableRow key={ad.id}>
                        <TableCell className="font-medium">{ad.name}</TableCell>
                        <TableCell>{getAdTypeLabel(ad.ad_type)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{getPlatformLabel(ad.platform)}</Badge>
                        </TableCell>
                        <TableCell>{getPlacementLabel(ad.placement)}</TableCell>
                        <TableCell>
                          <Badge variant={ad.is_active ? "default" : "secondary"}>
                            {ad.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {ad.is_test_mode ? (
                            <Badge variant="outline" className="border-yellow-500 text-yellow-600">
                              <TestTube className="h-3 w-3 mr-1" />
                              Test
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-500">
                              Production
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleAdStatus(ad)}
                            >
                              {ad.is_active ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(ad)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(ad.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <AdMobSettings settings={settings} updateSetting={updateSetting} />
        </TabsContent>

        <TabsContent value="guide" className="space-y-4">
          <AdMobIntegrationGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdMobSettings({ settings, updateSetting }: { settings: AdSettings; updateSetting: (key: string, value: Record<string, unknown>) => void }) {
  const globalSettings = settings['global_settings']?.setting_value || {};
  const bannerSettings = settings['banner_settings']?.setting_value || {};
  const interstitialSettings = settings['interstitial_settings']?.setting_value || {};
  const rewardedSettings = settings['rewarded_settings']?.setting_value || {};

  return (
    <div className="space-y-6">
      {/* App IDs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            AdMob App IDs
          </CardTitle>
          <CardDescription>Configure your AdMob application IDs for each platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Android App ID</Label>
              <Input
                defaultValue={(settings['admob_android_app_id']?.setting_value as { app_id?: string })?.app_id || ''}
                placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"
                onBlur={(e) => updateSetting('admob_android_app_id', { app_id: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>iOS App ID</Label>
              <Input
                defaultValue={(settings['admob_ios_app_id']?.setting_value as { app_id?: string })?.app_id || ''}
                placeholder="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"
                onBlur={(e) => updateSetting('admob_ios_app_id', { app_id: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Global Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Ads</Label>
              <p className="text-sm text-muted-foreground">Master switch for all app ads</p>
            </div>
            <Switch
              checked={(globalSettings as { enabled?: boolean }).enabled !== false}
              onCheckedChange={(checked) => updateSetting('global_settings', { ...globalSettings, enabled: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Test Mode (Global)</Label>
              <p className="text-sm text-muted-foreground">Force test ads on all placements</p>
            </div>
            <Switch
              checked={(globalSettings as { test_mode?: boolean }).test_mode === true}
              onCheckedChange={(checked) => updateSetting('global_settings', { ...globalSettings, test_mode: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Personalized Ads</Label>
              <p className="text-sm text-muted-foreground">Show personalized ads based on user data</p>
            </div>
            <Switch
              checked={(globalSettings as { personalized_ads?: boolean }).personalized_ads !== false}
              onCheckedChange={(checked) => updateSetting('global_settings', { ...globalSettings, personalized_ads: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Child-Directed Treatment</Label>
              <p className="text-sm text-muted-foreground">COPPA compliance for children's apps</p>
            </div>
            <Switch
              checked={(globalSettings as { child_directed?: boolean }).child_directed === true}
              onCheckedChange={(checked) => updateSetting('global_settings', { ...globalSettings, child_directed: checked })}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Ad Content Rating</Label>
            <Select
              defaultValue={(globalSettings as { max_ad_content_rating?: string }).max_ad_content_rating || 'G'}
              onValueChange={(value) => updateSetting('global_settings', { ...globalSettings, max_ad_content_rating: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="G">G - General Audiences</SelectItem>
                <SelectItem value="PG">PG - Parental Guidance</SelectItem>
                <SelectItem value="T">T - Teen</SelectItem>
                <SelectItem value="MA">MA - Mature Audiences</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Banner Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Banner Ad Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Adaptive Banner</Label>
              <p className="text-sm text-muted-foreground">Auto-size banner based on device width</p>
            </div>
            <Switch
              checked={(bannerSettings as { adaptive_banner?: boolean }).adaptive_banner !== false}
              onCheckedChange={(checked) => updateSetting('banner_settings', { ...bannerSettings, adaptive_banner: checked })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Refresh Rate (seconds)</Label>
              <Input
                type="number"
                min="30"
                max="300"
                defaultValue={(bannerSettings as { refresh_rate_seconds?: number }).refresh_rate_seconds || 60}
                onBlur={(e) => updateSetting('banner_settings', { ...bannerSettings, refresh_rate_seconds: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Anchor Position</Label>
              <Select
                defaultValue={(bannerSettings as { anchor_position?: string }).anchor_position || 'bottom'}
                onValueChange={(value) => updateSetting('banner_settings', { ...bannerSettings, anchor_position: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">Top</SelectItem>
                  <SelectItem value="bottom">Bottom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interstitial Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Interstitial Ad Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Show on App Start</Label>
              <p className="text-sm text-muted-foreground">Display interstitial when app opens</p>
            </div>
            <Switch
              checked={(interstitialSettings as { show_on_app_start?: boolean }).show_on_app_start === true}
              onCheckedChange={(checked) => updateSetting('interstitial_settings', { ...interstitialSettings, show_on_app_start: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Between Episodes</Label>
              <p className="text-sm text-muted-foreground">Display interstitial when switching episodes</p>
            </div>
            <Switch
              checked={(interstitialSettings as { show_between_episodes?: boolean }).show_between_episodes !== false}
              onCheckedChange={(checked) => updateSetting('interstitial_settings', { ...interstitialSettings, show_between_episodes: checked })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cooldown (seconds)</Label>
              <Input
                type="number"
                min="0"
                defaultValue={(interstitialSettings as { cooldown_seconds?: number }).cooldown_seconds || 60}
                onBlur={(e) => updateSetting('interstitial_settings', { ...interstitialSettings, cooldown_seconds: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Per Session</Label>
              <Input
                type="number"
                min="0"
                defaultValue={(interstitialSettings as { max_per_session?: number }).max_per_session || 5}
                onBlur={(e) => updateSetting('interstitial_settings', { ...interstitialSettings, max_per_session: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rewarded Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Rewarded Ad Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Require Video Complete</Label>
              <p className="text-sm text-muted-foreground">User must watch entire video for reward</p>
            </div>
            <Switch
              checked={(rewardedSettings as { video_complete_required?: boolean }).video_complete_required !== false}
              onCheckedChange={(checked) => updateSetting('rewarded_settings', { ...rewardedSettings, video_complete_required: checked })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reward Multiplier</Label>
              <Input
                type="number"
                min="1"
                defaultValue={(rewardedSettings as { reward_multiplier?: number }).reward_multiplier || 1}
                onBlur={(e) => updateSetting('rewarded_settings', { ...rewardedSettings, reward_multiplier: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Per Day</Label>
              <Input
                type="number"
                min="0"
                defaultValue={(rewardedSettings as { max_per_day?: number }).max_per_day || 10}
                onBlur={(e) => updateSetting('rewarded_settings', { ...rewardedSettings, max_per_day: parseInt(e.target.value) })}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdMobIntegrationGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>AdMob Integration Guide</CardTitle>
        <CardDescription>Follow these steps to integrate AdMob into your native Android app</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">1. Install Capacitor AdMob Plugin</h3>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`npm install @capacitor-community/admob
npx cap sync`}
          </pre>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">2. Android Configuration</h3>
          <p className="text-sm text-muted-foreground">Add your AdMob App ID to <code>android/app/src/main/AndroidManifest.xml</code>:</p>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`<manifest>
  <application>
    <!-- Add inside <application> tag -->
    <meta-data
      android:name="com.google.android.gms.ads.APPLICATION_ID"
      android:value="ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY"/>
  </application>
</manifest>`}
          </pre>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">3. iOS Configuration</h3>
          <p className="text-sm text-muted-foreground">Add your AdMob App ID to <code>ios/App/App/Info.plist</code>:</p>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`<key>GADApplicationIdentifier</key>
<string>ca-app-pub-XXXXXXXXXXXXXXXX~YYYYYYYYYY</string>`}
          </pre>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">4. Initialize AdMob in Your App</h3>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`import { AdMob } from '@capacitor-community/admob';

// Initialize AdMob (call once at app startup)
await AdMob.initialize({
  requestTrackingAuthorization: true, // iOS only
  testingDevices: ['YOUR_TEST_DEVICE_ID'],
  initializeForTesting: false, // Set true for test ads
});`}
          </pre>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">5. Show Banner Ad</h3>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`import { AdMob, BannerAdSize, BannerAdPosition } from '@capacitor-community/admob';

await AdMob.showBanner({
  adId: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
  adSize: BannerAdSize.ADAPTIVE_BANNER,
  position: BannerAdPosition.BOTTOM_CENTER,
  margin: 0,
});`}
          </pre>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">6. Show Interstitial Ad</h3>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`import { AdMob, AdOptions } from '@capacitor-community/admob';

const options: AdOptions = {
  adId: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
};

await AdMob.prepareInterstitial(options);
await AdMob.showInterstitial();`}
          </pre>
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">7. Show Rewarded Ad</h3>
          <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
{`import { AdMob, RewardAdOptions } from '@capacitor-community/admob';

const options: RewardAdOptions = {
  adId: 'ca-app-pub-XXXXXXXXXXXXXXXX/YYYYYYYYYY',
};

await AdMob.prepareRewardVideoAd(options);
const result = await AdMob.showRewardVideoAd();

if (result.type === 'earned') {
  // User earned the reward
  console.log('Reward earned:', result.amount, result.type);
}`}
          </pre>
        </div>

        <div className="p-4 bg-yellow-500/10 border border-yellow-500/50 rounded-lg">
          <h4 className="font-semibold text-yellow-600">⚠️ Testing Tips</h4>
          <ul className="text-sm mt-2 space-y-1 text-muted-foreground">
            <li>• Always use test ad unit IDs during development</li>
            <li>• Add your device as a test device in AdMob console</li>
            <li>• Never click your own production ads</li>
            <li>• Test on real devices, not just simulators</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

export default AppAdsManager;
