import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Code, FileCode } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function AdminSettingsScripts() {
  const navigate = useNavigate();
  const [headerScripts, setHeaderScripts] = useState('');
  const [footerScripts, setFooterScripts] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchScripts();
  }, []);

  const fetchScripts = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('setting_key, setting_value')
        .in('setting_key', ['header_scripts', 'footer_scripts']);

      if (error) throw error;

      data?.forEach((setting) => {
        if (setting.setting_key === 'header_scripts') {
          setHeaderScripts((setting.setting_value as { content?: string })?.content || '');
        } else if (setting.setting_key === 'footer_scripts') {
          setFooterScripts((setting.setting_value as { content?: string })?.content || '');
        }
      });
    } catch (error) {
      console.error('Error fetching scripts:', error);
      toast.error('Failed to load scripts');
    } finally {
      setIsLoading(false);
    }
  };

  const saveScripts = async () => {
    setIsSaving(true);
    try {
      // Upsert header scripts
      const { error: headerError } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'header_scripts',
          setting_value: { content: headerScripts },
          description: 'Custom scripts to be injected in the <head> section'
        }, { onConflict: 'setting_key' });

      if (headerError) throw headerError;

      // Upsert footer scripts
      const { error: footerError } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'footer_scripts',
          setting_value: { content: footerScripts },
          description: 'Custom scripts to be injected before </body>'
        }, { onConflict: 'setting_key' });

      if (footerError) throw footerError;

      toast.success('Scripts saved successfully');
    } catch (error) {
      console.error('Error saving scripts:', error);
      toast.error('Failed to save scripts');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/admin/settings')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Header & Footer Scripts</h1>
              <p className="text-muted-foreground">
                Add custom scripts like Google AdSense, Analytics, or verification codes
              </p>
            </div>
          </div>
          <Button onClick={saveScripts} disabled={isSaving || isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        <div className="grid gap-6">
          {/* Header Scripts */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Code className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Header Scripts</CardTitle>
                  <CardDescription>
                    Scripts added here will be injected into the &lt;head&gt; section of every page.
                    Perfect for Google AdSense verification, meta tags, or analytics.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={`<!-- Example: Google AdSense verification -->
<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>

<!-- Example: Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>`}
                value={headerScripts}
                onChange={(e) => setHeaderScripts(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Include complete &lt;script&gt; tags or &lt;meta&gt; tags
              </p>
            </CardContent>
          </Card>

          {/* Footer Scripts */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileCode className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Footer Scripts</CardTitle>
                  <CardDescription>
                    Scripts added here will be injected just before the &lt;/body&gt; tag.
                    Useful for tracking scripts, chat widgets, or other third-party integrations.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder={`<!-- Example: Chat widget -->
<script>
  // Your chat widget code here
</script>

<!-- Example: Facebook Pixel -->
<script>
  // Facebook tracking code
</script>`}
                value={footerScripts}
                onChange={(e) => setFooterScripts(e.target.value)}
                className="min-h-[200px] font-mono text-sm"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-2">
                Include complete &lt;script&gt; tags
              </p>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <div className="text-amber-500">⚠️</div>
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Important Notes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Only add scripts from trusted sources</li>
                    <li>Invalid scripts may break your site functionality</li>
                    <li>Changes will take effect after page refresh</li>
                    <li>Test thoroughly after adding new scripts</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
