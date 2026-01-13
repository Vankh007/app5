import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Save, X, ArrowLeft, ExternalLink, Sun, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useSiteSettingsOptional } from '@/contexts/SiteSettingsContext';

interface ThemeColors {
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
  // Support Us colors
  support_us_button_bg: string;
  support_us_button_text: string;
  support_us_selected_bg: string;
  support_us_selected_text: string;
}

interface GeneralSettings {
  site_title: string;
  site_detail: string;
  currency: string;
  currency_symbol: string;
  timezone: string;
  // Theme colors
  light_mode: ThemeColors;
  dark_mode: ThemeColors;
  // Other settings
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
  // App Lock / Store URLs
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
  support_us_button_bg: '#FFFFFF',
  support_us_button_text: '#0F172A',
  support_us_selected_bg: '#00BCD4',
  support_us_selected_text: '#FFFFFF',
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
  support_us_button_bg: '#FFFFFF',
  support_us_button_text: '#0F172A',
  support_us_selected_bg: '#00BCD4',
  support_us_selected_text: '#FFFFFF',
};

const defaultSettings: GeneralSettings = {
  site_title: '',
  site_detail: '',
  currency: 'USD',
  currency_symbol: '$',
  timezone: 'UTC',
  light_mode: defaultLightColors,
  dark_mode: defaultDarkColors,
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
  // App Lock / Store URLs
  play_store_url: '',
  app_store_url: '',
  mobile_qr_url: '',
  web_browser_qr_url: '',
};

const timezones = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Asia/Phnom_Penh',
  'Australia/Sydney',
];

const currencyFormats = [
  { value: 'symbol_only', label: 'Show Symbol Only ($100)' },
  { value: 'text_only', label: 'Show Text Only (100 USD)' },
  { value: 'symbol_text', label: 'Show Currency Text and Symbol Both ($100 USD)' },
];

const itemsPerPageOptions = ['10', '20', '30', '50', '100'];

const fileUploadServers = [
  { value: 'current', label: 'Current Server' },
  { value: 'idrive_e2_1', label: 'iDrive E2 Storage 1' },
  { value: 'idrive_e2_2', label: 'iDrive E2 Storage 2' },
  { value: 'supabase', label: 'Supabase Storage' },
];

const pusherClusters = [
  { value: 'mt1', label: 'mt1 (N. Virginia)' },
  { value: 'us2', label: 'us2 (Ohio)' },
  { value: 'us3', label: 'us3 (Oregon)' },
  { value: 'eu', label: 'eu (Ireland)' },
  { value: 'ap1', label: 'ap1 (Singapore)' },
  { value: 'ap2', label: 'ap2 (Mumbai)' },
  { value: 'ap3', label: 'ap3 (Tokyo)' },
  { value: 'ap4', label: 'ap4 (Sydney)' },
  { value: 'sa1', label: 'sa1 (São Paulo)' },
];

// Color input component
const ColorInput = ({ 
  label, 
  value, 
  onChange, 
  id,
  placeholder 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  id: string;
  placeholder: string;
}) => {
  const safeValue = value || '#000000';
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <div
          className="w-12 h-10 rounded-lg border border-border cursor-pointer"
          style={{ backgroundColor: safeValue }}
          onClick={() => document.getElementById(id)?.click()}
        />
        <Input
          id={id}
          type="color"
          value={safeValue}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
        <Input
          value={safeValue.replace('#', '').toUpperCase()}
          onChange={(e) => onChange(`#${e.target.value}`)}
          placeholder={placeholder}
          className="flex-1"
        />
      </div>
    </div>
  );
};

// Color settings grid component for each theme mode
const ColorSettingsGrid = ({ 
  colors, 
  mode, 
  updateColor,
  idPrefix 
}: { 
  colors: ThemeColors; 
  mode: 'light_mode' | 'dark_mode'; 
  updateColor: (mode: 'light_mode' | 'dark_mode', key: keyof ThemeColors, value: string) => void;
  idPrefix: string;
}) => (
  <div className="space-y-6">
    {/* Row 1: Primary, Secondary, Button, Button Text */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <ColorInput
        label="Primary Color"
        value={colors.primary_color}
        onChange={(v) => updateColor(mode, 'primary_color', v)}
        id={`${idPrefix}_primary_color`}
        placeholder="D50055"
      />
      <ColorInput
        label="Secondary Color"
        value={colors.secondary_color}
        onChange={(v) => updateColor(mode, 'secondary_color', v)}
        id={`${idPrefix}_secondary_color`}
        placeholder="1B1B3F"
      />
      <ColorInput
        label="Button Color"
        value={colors.button_color}
        onChange={(v) => updateColor(mode, 'button_color', v)}
        id={`${idPrefix}_button_color`}
        placeholder="D50055"
      />
      <ColorInput
        label="Button Text Color"
        value={colors.button_text_color}
        onChange={(v) => updateColor(mode, 'button_text_color', v)}
        id={`${idPrefix}_button_text_color`}
        placeholder="FFFFFF"
      />
    </div>

    {/* Row 2: Ribbon, Text, Heading, Link */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <ColorInput
        label="Ribbon Color"
        value={colors.ribbon_color}
        onChange={(v) => updateColor(mode, 'ribbon_color', v)}
        id={`${idPrefix}_ribbon_color`}
        placeholder="FF6B00"
      />
      <ColorInput
        label="Text Color"
        value={colors.text_color}
        onChange={(v) => updateColor(mode, 'text_color', v)}
        id={`${idPrefix}_text_color`}
        placeholder="FFFFFF"
      />
      <ColorInput
        label="Heading Color"
        value={colors.heading_color}
        onChange={(v) => updateColor(mode, 'heading_color', v)}
        id={`${idPrefix}_heading_color`}
        placeholder="FFFFFF"
      />
      <ColorInput
        label="Link Color"
        value={colors.link_color}
        onChange={(v) => updateColor(mode, 'link_color', v)}
        id={`${idPrefix}_link_color`}
        placeholder="00ABD6"
      />
    </div>

    {/* Row 3: Accent, Background, Card Background, Border */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <ColorInput
        label="Accent Color"
        value={colors.accent_color}
        onChange={(v) => updateColor(mode, 'accent_color', v)}
        id={`${idPrefix}_accent_color`}
        placeholder="6366F1"
      />
      <ColorInput
        label="Background Color"
        value={colors.background_color}
        onChange={(v) => updateColor(mode, 'background_color', v)}
        id={`${idPrefix}_background_color`}
        placeholder="030303"
      />
      <ColorInput
        label="Card Background"
        value={colors.card_background_color}
        onChange={(v) => updateColor(mode, 'card_background_color', v)}
        id={`${idPrefix}_card_bg_color`}
        placeholder="1A1A2E"
      />
      <ColorInput
        label="Border Color"
        value={colors.border_color}
        onChange={(v) => updateColor(mode, 'border_color', v)}
        id={`${idPrefix}_border_color`}
        placeholder="2A2A4A"
      />
    </div>

    {/* Row 4: Muted */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <ColorInput
        label="Muted Text Color"
        value={colors.muted_color}
        onChange={(v) => updateColor(mode, 'muted_color', v)}
        id={`${idPrefix}_muted_color`}
        placeholder="6B7280"
      />
    </div>

    {/* Row 5: Support Us Colors */}
    <div className="mt-4 pt-4 border-t border-border">
      <h4 className="text-sm font-medium mb-4">Support Us Overlay Colors</h4>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ColorInput
          label="Amount Button BG"
          value={colors.support_us_button_bg}
          onChange={(v) => updateColor(mode, 'support_us_button_bg', v)}
          id={`${idPrefix}_support_us_button_bg`}
          placeholder="FFFFFF"
        />
        <ColorInput
          label="Amount Button Text"
          value={colors.support_us_button_text}
          onChange={(v) => updateColor(mode, 'support_us_button_text', v)}
          id={`${idPrefix}_support_us_button_text`}
          placeholder="0F172A"
        />
        <ColorInput
          label="Selected Amount BG"
          value={colors.support_us_selected_bg}
          onChange={(v) => updateColor(mode, 'support_us_selected_bg', v)}
          id={`${idPrefix}_support_us_selected_bg`}
          placeholder="00BCD4"
        />
        <ColorInput
          label="Selected Amount Text"
          value={colors.support_us_selected_text}
          onChange={(v) => updateColor(mode, 'support_us_selected_text', v)}
          id={`${idPrefix}_support_us_selected_text`}
          placeholder="FFFFFF"
        />
      </div>
    </div>
  </div>
);

export default function AdminSettingsGeneral() {
  const [settings, setSettings] = useState<GeneralSettings>(defaultSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [newGenre, setNewGenre] = useState('');
  const navigate = useNavigate();
  const siteSettingsContext = useSiteSettingsOptional();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .eq('setting_key', 'general_settings')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading settings:', error);
      }

      if (data?.setting_value) {
        const savedSettings = data.setting_value as unknown as GeneralSettings;
        setSettings({ ...defaultSettings, ...savedSettings });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // First check if record exists
      const { data: existing } = await supabase
        .from('site_settings')
        .select('id')
        .eq('setting_key', 'general_settings')
        .single();

      const settingsJson = JSON.parse(JSON.stringify(settings));

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('site_settings')
          .update({
            setting_value: settingsJson,
            updated_at: new Date().toISOString(),
          })
          .eq('setting_key', 'general_settings');
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('site_settings')
          .insert([{
            setting_key: 'general_settings',
            setting_value: settingsJson,
          }]);
        if (error) throw error;
      }
      
      // Refresh the global site settings context
      if (siteSettingsContext?.refreshSettings) {
        await siteSettingsContext.refreshSettings();
      }
      
      toast.success('Settings saved successfully! Changes applied to website.');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof GeneralSettings>(
    key: K,
    value: GeneralSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const updateThemeColor = (mode: 'light_mode' | 'dark_mode', key: keyof ThemeColors, value: string) => {
    setSettings(prev => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [key]: value
      }
    }));
  };

  const addGenre = () => {
    if (newGenre.trim() && !settings.default_genres.includes(newGenre.trim())) {
      updateSetting('default_genres', [...settings.default_genres, newGenre.trim()]);
      setNewGenre('');
    }
  };

  const removeGenre = (genre: string) => {
    updateSetting('default_genres', settings.default_genres.filter(g => g !== genre));
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/settings')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">General Setting</h1>
            <p className="text-muted-foreground">Configure the fundamental information of the site</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Site Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Row 1: Site Title, Site Detail */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="site_title">
                  Site Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="site_title"
                  value={settings.site_title}
                  onChange={(e) => updateSetting('site_title', e.target.value)}
                  placeholder="KHMERZOON"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="site_detail">
                  Site Detail (Browser Tab)
                </Label>
                <Input
                  id="site_detail"
                  value={settings.site_detail}
                  onChange={(e) => updateSetting('site_detail', e.target.value)}
                  placeholder="LAND OF RELAX"
                />
                <p className="text-xs text-muted-foreground">
                  Shows in browser tab as: {settings.site_title || 'Site Title'} - {settings.site_detail || 'Site Detail'}
                </p>
              </div>
            </div>

            {/* Row 2: Currency, Currency Symbol, Timezone */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              <div className="space-y-2">
                <Label htmlFor="currency">
                  Currency <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="currency"
                  value={settings.currency}
                  onChange={(e) => updateSetting('currency', e.target.value)}
                  placeholder="USD"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency_symbol">
                  Currency Symbol <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="currency_symbol"
                  value={settings.currency_symbol}
                  onChange={(e) => updateSetting('currency_symbol', e.target.value)}
                  placeholder="$"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone">
                  Timezone <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={settings.timezone}
                  onValueChange={(value) => updateSetting('timezone', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timezone" />
                  </SelectTrigger>
                  <SelectContent>
                    {timezones.map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 2: Currency Format, Items per page */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="items_per_page">
                  Items Per Page <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={settings.items_per_page.toString()}
                  onValueChange={(value) => updateSetting('items_per_page', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Items per page" />
                  </SelectTrigger>
                  <SelectContent>
                    {itemsPerPageOptions.map((option) => (
                      <SelectItem key={option} value={option}>{option} items per page</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency_display_format">
                  Currency Display Format
                </Label>
                <Select
                  value={settings.currency_display_format}
                  onValueChange={(value) => updateSetting('currency_display_format', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyFormats.map((format) => (
                      <SelectItem key={format.value} value={format.value}>
                        {format.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Row 3: File Upload, Video Skip Time, TMDB API Key, Genres */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="file_upload_server">File Upload Server</Label>
                <Select
                  value={settings.file_upload_server}
                  onValueChange={(value) => updateSetting('file_upload_server', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select server" />
                  </SelectTrigger>
                  <SelectContent>
                    {fileUploadServers.map((server) => (
                      <SelectItem key={server.value} value={server.value}>
                        {server.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="video_skip_time">Video Skip Time</Label>
                <div className="flex gap-2">
                  <Input
                    id="video_skip_time"
                    type="number"
                    value={settings.video_skip_time}
                    onChange={(e) => updateSetting('video_skip_time', parseInt(e.target.value) || 5)}
                    placeholder="5"
                    className="flex-1"
                  />
                  <div className="flex items-center px-3 bg-muted rounded-md border border-border">
                    <span className="text-sm text-muted-foreground">Seconds</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tmdb_api_key">TMDB API KEY</Label>
                <Input
                  id="tmdb_api_key"
                  value={settings.tmdb_api_key}
                  onChange={(e) => updateSetting('tmdb_api_key', e.target.value)}
                  placeholder="Enter TMDB API Key"
                  type="password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="genres">
                  Genres <span className="text-destructive">*</span>
                </Label>
                <div className="flex flex-wrap gap-2 p-2 min-h-10 rounded-md border border-border bg-background">
                  {settings.default_genres.map((genre) => (
                    <Badge key={genre} variant="secondary" className="flex items-center gap-1">
                      {genre}
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => removeGenre(genre)}
                      />
                    </Badge>
                  ))}
                  <Input
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGenre())}
                    placeholder="Add genre..."
                    className="flex-1 min-w-[100px] border-0 p-0 h-6 focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* App Store & QR Code URLs */}
        <Card>
          <CardHeader>
            <CardTitle>App Store & QR Code URLs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure the app store links and QR code URLs for the App Lock overlay that displays when content is restricted to mobile or web only.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="play_store_url">
                  Google Play Store URL
                </Label>
                <Input
                  id="play_store_url"
                  value={settings.play_store_url}
                  onChange={(e) => updateSetting('play_store_url', e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                />
                <p className="text-xs text-muted-foreground">
                  Link to your Android app on Google Play Store
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="app_store_url">
                  Apple App Store URL
                </Label>
                <Input
                  id="app_store_url"
                  value={settings.app_store_url}
                  onChange={(e) => updateSetting('app_store_url', e.target.value)}
                  placeholder="https://apps.apple.com/app/..."
                />
                <p className="text-xs text-muted-foreground">
                  Link to your iOS app on Apple App Store
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile_qr_url">
                  Mobile QR Code URL
                </Label>
                <Input
                  id="mobile_qr_url"
                  value={settings.mobile_qr_url}
                  onChange={(e) => updateSetting('mobile_qr_url', e.target.value)}
                  placeholder="https://onelink.to/yourapp or leave empty to use Play Store URL"
                />
                <p className="text-xs text-muted-foreground">
                  Custom URL for mobile QR code (e.g., smart link). Falls back to Play Store URL if empty.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="web_browser_qr_url">
                  Web Browser QR Code URL
                </Label>
                <Input
                  id="web_browser_qr_url"
                  value={settings.web_browser_qr_url}
                  onChange={(e) => updateSetting('web_browser_qr_url', e.target.value)}
                  placeholder="https://yoursite.com or leave empty to use current page URL"
                />
                <p className="text-xs text-muted-foreground">
                  URL for web-only content QR code. Falls back to current page URL if empty.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Color Configuration with Light/Dark Mode Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>Color Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="dark" className="w-full">
              <TabsList className="grid w-full max-w-md grid-cols-2 mb-6">
                <TabsTrigger value="light" className="flex items-center gap-2">
                  <Sun className="h-4 w-4" />
                  Light Mode
                </TabsTrigger>
                <TabsTrigger value="dark" className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Dark Mode
                </TabsTrigger>
              </TabsList>

              {/* Light Mode Colors */}
              <TabsContent value="light" className="space-y-6">
                <ColorSettingsGrid
                  colors={settings.light_mode}
                  mode="light_mode"
                  updateColor={updateThemeColor}
                  idPrefix="light"
                />
              </TabsContent>

              {/* Dark Mode Colors */}
              <TabsContent value="dark" className="space-y-6">
                <ColorSettingsGrid
                  colors={settings.dark_mode}
                  mode="dark_mode"
                  updateColor={updateThemeColor}
                  idPrefix="dark"
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Pusher Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Pusher Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pusher_app_id">
                  App ID <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pusher_app_id"
                  value={settings.pusher_app_id}
                  onChange={(e) => updateSetting('pusher_app_id', e.target.value)}
                  placeholder="1498855"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pusher_app_key">
                  App Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pusher_app_key"
                  value={settings.pusher_app_key}
                  onChange={(e) => updateSetting('pusher_app_key', e.target.value)}
                  placeholder="eda7073a2db44e878ec8"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pusher_app_secret">
                  App Secret Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pusher_app_secret"
                  type="password"
                  value={settings.pusher_app_secret}
                  onChange={(e) => updateSetting('pusher_app_secret', e.target.value)}
                  placeholder="108bd05bb0bdcb287e0f"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pusher_cluster">
                  Cluster <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={settings.pusher_cluster}
                  onValueChange={(value) => updateSetting('pusher_cluster', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cluster" />
                  </SelectTrigger>
                  <SelectContent>
                    {pusherClusters.map((cluster) => (
                      <SelectItem key={cluster.value} value={cluster.value}>
                        {cluster.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Socket Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle>Socket Configuration</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <a href="https://pusher.com/docs" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Documentation
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="socket_app_uri">
                  App URI <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="socket_app_uri"
                  value={settings.socket_app_uri}
                  onChange={(e) => updateSetting('socket_app_uri', e.target.value)}
                  placeholder="wss://your-domain.com/websocket"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Button 
          onClick={handleSave} 
          disabled={isSaving}
          className="w-full h-14 text-lg bg-destructive hover:bg-destructive/90"
          size="lg"
        >
          <Save className="h-5 w-5 mr-2" />
          {isSaving ? 'Saving...' : 'Submit'}
        </Button>
      </div>
    </AdminLayout>
  );
}
