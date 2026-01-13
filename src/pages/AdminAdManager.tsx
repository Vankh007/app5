import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Eye, EyeOff, BarChart3, Globe, Smartphone } from 'lucide-react';
import { AppAdsManager } from '@/components/admin/AppAdsManager';

interface Ad {
  id: string;
  name: string;
  placement: string;
  page_location: string;
  image_url: string | null;
  link_url: string | null;
  ad_code: string | null;
  is_active: boolean;
  priority: number;
  countdown_seconds: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

interface AdFormData {
  name: string;
  placement: string;
  page_location: string;
  image_url: string;
  link_url: string;
  ad_code: string;
  is_active: boolean;
  priority: number;
  countdown_seconds: number;
  start_date: string;
  end_date: string;
}

const AD_PLACEMENTS = [
  { value: 'banner', label: 'Banner Ad', description: 'Horizontal banner below sections' },
  { value: 'sidebar', label: 'Sidebar Ad', description: 'Vertical ad in sidebar' },
  { value: 'popup', label: 'Popup Ad', description: 'Modal popup with countdown' },
];

const PAGE_LOCATIONS = [
  { value: 'home_top_series', label: 'Home - Under Top TV Series', page: 'home' },
  { value: 'home_collections', label: 'Home - Under Collections', page: 'home' },
  { value: 'home_new_releases', label: 'Home - Under New Releases', page: 'home' },
  { value: 'watch_player', label: 'Watch - Under Player', page: 'watch' },
  { value: 'watch_sidebar', label: 'Watch - Sidebar', page: 'watch' },
  { value: 'watch_popup', label: 'Watch - Popup', page: 'watch' },
];

const defaultFormData: AdFormData = {
  name: '',
  placement: 'banner',
  page_location: 'home_top_series',
  image_url: '',
  link_url: '',
  ad_code: '',
  is_active: true,
  priority: 1,
  countdown_seconds: 5,
  start_date: '',
  end_date: '',
};

export default function AdminAdManager() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [formData, setFormData] = useState<AdFormData>(defaultFormData);
  const [activeTab, setActiveTab] = useState('all');
  const [mainTab, setMainTab] = useState('website');
  const { toast } = useToast();

  useEffect(() => {
    fetchAds();
  }, []);

  const fetchAds = async () => {
    try {
      const { data, error } = await supabase
        .from('ads')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAds(data || []);
    } catch (error) {
      console.error('Error fetching ads:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch ads',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const adData = {
        name: formData.name,
        placement: formData.placement,
        page_location: formData.page_location,
        image_url: formData.image_url || null,
        link_url: formData.link_url || null,
        ad_code: formData.ad_code || null,
        is_active: formData.is_active,
        priority: formData.priority,
        countdown_seconds: formData.placement === 'popup' ? formData.countdown_seconds : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      };

      if (editingAd) {
        const { error } = await supabase
          .from('ads')
          .update(adData)
          .eq('id', editingAd.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Ad updated successfully' });
      } else {
        const { error } = await supabase
          .from('ads')
          .insert(adData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Ad created successfully' });
      }

      setIsDialogOpen(false);
      setEditingAd(null);
      setFormData(defaultFormData);
      fetchAds();
    } catch (error) {
      console.error('Error saving ad:', error);
      toast({
        title: 'Error',
        description: 'Failed to save ad',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (ad: Ad) => {
    setEditingAd(ad);
    setFormData({
      name: ad.name,
      placement: ad.placement,
      page_location: ad.page_location,
      image_url: ad.image_url || '',
      link_url: ad.link_url || '',
      ad_code: ad.ad_code || '',
      is_active: ad.is_active,
      priority: ad.priority,
      countdown_seconds: ad.countdown_seconds || 5,
      start_date: ad.start_date?.split('T')[0] || '',
      end_date: ad.end_date?.split('T')[0] || '',
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this ad?')) return;

    try {
      const { error } = await supabase
        .from('ads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast({ title: 'Success', description: 'Ad deleted successfully' });
      fetchAds();
    } catch (error) {
      console.error('Error deleting ad:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete ad',
        variant: 'destructive',
      });
    }
  };

  const toggleAdStatus = async (ad: Ad) => {
    try {
      const { error } = await supabase
        .from('ads')
        .update({ is_active: !ad.is_active })
        .eq('id', ad.id);

      if (error) throw error;
      fetchAds();
    } catch (error) {
      console.error('Error toggling ad status:', error);
    }
  };

  const filteredAds = ads.filter(ad => {
    if (activeTab === 'all') return true;
    if (activeTab === 'home') return ad.page_location.startsWith('home');
    if (activeTab === 'watch') return ad.page_location.startsWith('watch');
    return true;
  });

  const getPlacementLabel = (placement: string) => {
    return AD_PLACEMENTS.find(p => p.value === placement)?.label || placement;
  };

  const getLocationLabel = (location: string) => {
    return PAGE_LOCATIONS.find(l => l.value === location)?.label || location;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ad Manager</h1>
            <p className="text-muted-foreground">Manage advertisements for website and mobile apps</p>
          </div>
        </div>

        {/* Main Tabs: Website / App */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="website" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Ads for Website
            </TabsTrigger>
            <TabsTrigger value="app" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Ads for App (AdMob)
            </TabsTrigger>
          </TabsList>

          <TabsContent value="website" className="space-y-6 mt-6">
            {/* Create Website Ad Button */}
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
                Create Ad
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingAd ? 'Edit Ad' : 'Create New Ad'}</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Ad Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Summer Sale Banner"
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
                    <Label>Placement Type *</Label>
                    <Select
                      value={formData.placement}
                      onValueChange={(value) => setFormData({ ...formData, placement: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AD_PLACEMENTS.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            <div>
                              <div>{p.label}</div>
                              <div className="text-xs text-muted-foreground">{p.description}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Page Location *</Label>
                    <Select
                      value={formData.page_location}
                      onValueChange={(value) => setFormData({ ...formData, page_location: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAGE_LOCATIONS.map((l) => (
                          <SelectItem key={l.value} value={l.value}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formData.placement === 'popup' && (
                  <div className="space-y-2">
                    <Label htmlFor="countdown">Countdown Seconds (before user can close)</Label>
                    <Input
                      id="countdown"
                      type="number"
                      min="1"
                      max="30"
                      value={formData.countdown_seconds}
                      onChange={(e) => setFormData({ ...formData, countdown_seconds: parseInt(e.target.value) || 5 })}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="image_url">Image URL</Label>
                  <Input
                    id="image_url"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://example.com/ad-image.jpg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="link_url">Click URL</Label>
                  <Input
                    id="link_url"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://example.com/landing-page"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ad_code">Custom Ad Code (HTML/JS)</Label>
                  <Textarea
                    id="ad_code"
                    value={formData.ad_code}
                    onChange={(e) => setFormData({ ...formData, ad_code: e.target.value })}
                    placeholder="<script>...</script> or custom HTML"
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty to use image. Use for Google Ads, affiliate codes, etc.
                  </p>
                </div>

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

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={!formData.name || !formData.placement}>
                  {editingAd ? 'Update' : 'Create'} Ad
                </Button>
              </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Ads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ads.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Ads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {ads.filter(a => a.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Home Page Ads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ads.filter(a => a.page_location.startsWith('home')).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Watch Page Ads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {ads.filter(a => a.page_location.startsWith('watch')).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ad Slots Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Ad Slot Locations
            </CardTitle>
            <CardDescription>Available ad placements on your platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Home Page</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Under "Top TV Series Today" section</li>
                  <li>• Under "Collections" section</li>
                  <li>• Under "New Releases" section</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-sm">Watch Page</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Under video player</li>
                  <li>• Sidebar (right column)</li>
                  <li>• Popup with countdown timer</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ads Table */}
        <Card>
          <CardHeader>
            <CardTitle>Advertisements</CardTitle>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All ({ads.length})</TabsTrigger>
                <TabsTrigger value="home">
                  Home ({ads.filter(a => a.page_location.startsWith('home')).length})
                </TabsTrigger>
                <TabsTrigger value="watch">
                  Watch ({ads.filter(a => a.page_location.startsWith('watch')).length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredAds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No ads found. Create your first ad to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Placement</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAds.map((ad) => (
                    <TableRow key={ad.id}>
                      <TableCell className="font-medium">{ad.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getPlacementLabel(ad.placement)}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {getLocationLabel(ad.page_location)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ad.is_active ? 'default' : 'secondary'}>
                          {ad.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{ad.priority}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => toggleAdStatus(ad)}
                            title={ad.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {ad.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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

          <TabsContent value="app" className="mt-6">
            <AppAdsManager />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
