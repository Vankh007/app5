import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Upload, X, AlertTriangle, Image as ImageIcon, Sun, Moon, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import logoLightNew from '@/assets/logo-light-new.png';
import logoRedLion from '@/assets/logo-red-lion.png';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';

interface LogoSettings {
  light_logo: string;
  dark_logo: string;
  favicon: string;
}

export default function AdminSettingsLogo() {
  const navigate = useNavigate();
  const { refreshSettings } = useSiteSettings();
  const lightLogoInputRef = useRef<HTMLInputElement>(null);
  const darkLogoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  
  const [lightLogoPreview, setLightLogoPreview] = useState<string | null>(null);
  const [darkLogoPreview, setDarkLogoPreview] = useState<string | null>(null);
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null);
  const [lightLogoFile, setLightLogoFile] = useState<File | null>(null);
  const [darkLogoFile, setDarkLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  // Default logos from assets
  const defaultLightLogo = logoLightNew;
  const defaultDarkLogo = logoRedLion;
  const defaultFavicon = logoRedLion;

  // Load existing logos from Supabase
  useEffect(() => {
    const loadLogos = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('site_settings')
          .select('setting_value')
          .eq('setting_key', 'site_logos')
          .maybeSingle();

        if (data?.setting_value) {
          const logos = data.setting_value as unknown as LogoSettings;
          setLightLogoPreview(logos.light_logo || defaultLightLogo);
          setDarkLogoPreview(logos.dark_logo || defaultDarkLogo);
          setFaviconPreview(logos.favicon || defaultFavicon);
        } else {
          setLightLogoPreview(defaultLightLogo);
          setDarkLogoPreview(defaultDarkLogo);
          setFaviconPreview(defaultFavicon);
        }
      } catch (error) {
        console.error('Error loading logos:', error);
        setLightLogoPreview(defaultLightLogo);
        setDarkLogoPreview(defaultDarkLogo);
        setFaviconPreview(defaultFavicon);
      } finally {
        setIsLoading(false);
      }
    };
    loadLogos();
  }, []);

  // Apply favicon dynamically
  useEffect(() => {
    if (faviconPreview) {
      const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = faviconPreview;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [faviconPreview]);

  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void,
    setPreview: (preview: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!['image/png', 'image/jpeg', 'image/jpg', 'image/x-icon', 'image/svg+xml'].includes(file.type)) {
        toast.error('Please upload a valid image file (PNG, JPG, JPEG, ICO, SVG)');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeFile = (
    setPreview: (preview: string | null) => void,
    setFile: (file: File | null) => void,
    inputRef: React.RefObject<HTMLInputElement>,
    defaultValue?: string
  ) => {
    setPreview(defaultValue || null);
    setFile(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const LOGO_BUCKET = 'featured-images';
  const LOGO_FOLDER = 'logos';

  const extractStorageObjectPathFromPublicUrl = (publicUrl?: string | null): string | null => {
    if (!publicUrl) return null;

    const clean = publicUrl.split('?')[0];
    const marker = `/storage/v1/object/public/${LOGO_BUCKET}/`;
    const idx = clean.indexOf(marker);
    if (idx === -1) return null;

    return clean.slice(idx + marker.length);
  };

  const uploadFileToStorage = async (file: File, prefix: string): Promise<string> => {
    const fileExt = file.name.split('.').pop() || 'png';
    const fileName = `${prefix}_${Date.now()}.${fileExt}`;
    const objectPath = `${LOGO_FOLDER}/${fileName}`;

    const { error } = await supabase.storage.from(LOGO_BUCKET).upload(objectPath, file, {
      cacheControl: '0',
      upsert: true,
    });

    if (error) throw error;

    const { data: urlData } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(objectPath);
    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!lightLogoFile && !darkLogoFile && !faviconFile) {
      toast.error('Please select at least one image to upload');
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current settings
      const { data: currentData } = await supabase
        .from('site_settings')
        .select('setting_value')
        .eq('setting_key', 'site_logos')
        .maybeSingle();

      const currentLogos: LogoSettings = (currentData?.setting_value as unknown as LogoSettings) || {
        light_logo: defaultLightLogo,
        dark_logo: defaultDarkLogo,
        favicon: defaultFavicon,
      };

      const oldLogos = { ...currentLogos };
      const pathsToDelete = new Set<string>();

      const queueOldFileDelete = (oldUrl?: string, newUrl?: string) => {
        if (!oldUrl || !newUrl) return;
        if (oldUrl === newUrl) return;

        const path = extractStorageObjectPathFromPublicUrl(oldUrl);
        if (path && path.startsWith('logos/')) pathsToDelete.add(path);
      };

      // Upload files to storage
      if (lightLogoFile) {
        setUploadingType('light');
        const url = await uploadFileToStorage(lightLogoFile, 'light_logo');
        queueOldFileDelete(oldLogos.light_logo, url);
        currentLogos.light_logo = url;
        setLightLogoPreview(url);
        setLightLogoFile(null);
      }

      if (darkLogoFile) {
        setUploadingType('dark');
        const url = await uploadFileToStorage(darkLogoFile, 'dark_logo');
        queueOldFileDelete(oldLogos.dark_logo, url);
        currentLogos.dark_logo = url;
        setDarkLogoPreview(url);
        setDarkLogoFile(null);
      }

      if (faviconFile) {
        setUploadingType('favicon');
        const url = await uploadFileToStorage(faviconFile, 'favicon');
        queueOldFileDelete(oldLogos.favicon, url);
        currentLogos.favicon = url;
        setFaviconPreview(url);
        setFaviconFile(null);
      }

      // Save to site_settings
      const { error } = await supabase
        .from('site_settings')
        .upsert(
          [
            {
              setting_key: 'site_logos',
              setting_value: JSON.parse(JSON.stringify(currentLogos)),
              description: 'Site logos for light/dark mode and favicon',
            },
          ],
          { onConflict: 'setting_key' }
        );

      if (error) throw error;

      // Refresh site settings immediately so all components update
      await refreshSettings();

      // Remove old logo files (so storage doesn't keep old versions)
      if (pathsToDelete.size > 0) {
        const { error: removeError } = await supabase.storage
          .from(LOGO_BUCKET)
          .remove(Array.from(pathsToDelete));

        if (removeError) {
          console.warn('Failed to delete old logo files:', removeError);
        }
      }

      toast.success('Logos updated successfully!');
    } catch (error) {
      console.error('Error saving logos:', error);
      toast.error('Failed to update logos');
    } finally {
      setIsSubmitting(false);
      setUploadingType(null);
    }
  };

  const LogoUploadCard = ({
    title,
    icon,
    preview,
    inputRef,
    onRemove,
    onChange,
    isUploading = false,
    acceptTypes = ".png,.jpg,.jpeg"
  }: {
    title: string;
    icon: React.ReactNode;
    preview: string | null;
    inputRef: React.RefObject<HTMLInputElement>;
    onRemove: () => void;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isUploading?: boolean;
    acceptTypes?: string;
  }) => (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div 
          className="relative w-full aspect-[3/1] bg-muted/30 rounded-lg border-2 border-dashed border-primary/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary hover:bg-muted/50 transition-all duration-300"
          onClick={() => !isUploading && inputRef.current?.click()}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Uploading...</span>
            </div>
          ) : preview ? (
            <>
              <img 
                src={preview} 
                alt={`${title} preview`} 
                className="max-w-full max-h-full object-contain p-4"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors z-10"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-2 text-muted-foreground text-sm bg-background/80 px-3 py-1 rounded-full">
                <Upload className="h-4 w-4" />
                <span>Click to change</span>
              </div>
            </>
          ) : (
            <div className="text-center p-6">
              <div className="w-24 h-24 mx-auto mb-4 bg-primary/10 rounded-lg flex items-center justify-center">
                <ImageIcon className="h-12 w-12 text-primary/40" />
              </div>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Upload className="h-5 w-5" />
                <span>Click to upload</span>
              </div>
            </div>
          )}
        </div>
        
        <Input
          ref={inputRef}
          type="file"
          accept={acceptTypes}
          onChange={onChange}
          className="hidden"
        />
        
        <p className="text-xs text-muted-foreground">
          Supported Files: <span className="text-primary font-medium">{acceptTypes.replace(/\./g, '').replace(/,/g, ', ')}</span>
        </p>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

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
            <h1 className="text-3xl font-bold tracking-tight text-primary">Logo & Favicon</h1>
            <p className="text-muted-foreground">Upload logos for light and dark mode, and your favicon</p>
          </div>
        </div>

        {/* Warning Alert */}
        <div className="flex items-start gap-3 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <p className="text-sm text-foreground">
            If the logo and favicon are not changed after you update from this page, please{' '}
            <button 
              onClick={() => window.location.reload()} 
              className="text-primary underline hover:no-underline font-medium"
            >
              clear the cache
            </button>{' '}
            from your browser. Logos are uploaded to storage and served via CDN for best performance.
          </p>
        </div>

        {/* Logo Upload Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Light Mode Logo */}
          <LogoUploadCard
            title="Logo (Light Mode)"
            icon={<Sun className="h-5 w-5 text-primary" />}
            preview={lightLogoPreview}
            inputRef={lightLogoInputRef}
            onRemove={() => removeFile(setLightLogoPreview, setLightLogoFile, lightLogoInputRef, defaultLightLogo)}
            onChange={(e) => handleFileChange(e, setLightLogoFile, setLightLogoPreview)}
            isUploading={uploadingType === 'light'}
          />

          {/* Dark Mode Logo */}
          <LogoUploadCard
            title="Logo (Dark Mode)"
            icon={<Moon className="h-5 w-5 text-primary" />}
            preview={darkLogoPreview}
            inputRef={darkLogoInputRef}
            onRemove={() => removeFile(setDarkLogoPreview, setDarkLogoFile, darkLogoInputRef, defaultDarkLogo)}
            onChange={(e) => handleFileChange(e, setDarkLogoFile, setDarkLogoPreview)}
            isUploading={uploadingType === 'dark'}
          />
        </div>

        {/* Favicon Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LogoUploadCard
            title="Favicon"
            icon={<ImageIcon className="h-5 w-5 text-primary" />}
            preview={faviconPreview}
            inputRef={faviconInputRef}
            onRemove={() => removeFile(setFaviconPreview, setFaviconFile, faviconInputRef, defaultFavicon)}
            onChange={(e) => handleFileChange(e, setFaviconFile, setFaviconPreview)}
            acceptTypes=".png,.jpg,.jpeg,.ico,.svg"
            isUploading={uploadingType === 'favicon'}
          />
        </div>

        {/* Submit Button */}
        <Button 
          onClick={handleSubmit}
          disabled={isSubmitting || (!lightLogoFile && !darkLogoFile && !faviconFile)}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Uploading...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </AdminLayout>
  );
}
