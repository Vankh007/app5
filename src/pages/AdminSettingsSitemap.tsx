import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  FileText, 
  Save, 
  RefreshCw, 
  Download, 
  Upload, 
  Copy, 
  Check, 
  Globe, 
  Calendar,
  Zap,
  Eye,
  Code2,
  Sparkles
} from 'lucide-react';

const defaultSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://yoursite.com/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://yoursite.com/movies</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://yoursite.com/series</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://yoursite.com/collections</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://yoursite.com/about</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://yoursite.com/contact</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://yoursite.com/privacy-policy</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>https://yoursite.com/terms-of-service</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`;

export default function AdminSettingsSitemap() {
  const [sitemapContent, setSitemapContent] = useState(defaultSitemap);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [urlCount, setUrlCount] = useState(0);

  useEffect(() => {
    loadSitemap();
  }, []);

  useEffect(() => {
    // Count URLs in sitemap
    const matches = sitemapContent.match(/<loc>/g);
    setUrlCount(matches ? matches.length : 0);
  }, [sitemapContent]);

  const loadSitemap = async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*')
        .eq('setting_key', 'sitemap_xml')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.setting_value) {
        const value = data.setting_value as { content?: string; updated_at?: string };
        setSitemapContent(value.content || defaultSitemap);
        setLastUpdated(value.updated_at || null);
      }
    } catch (error) {
      console.error('Error loading sitemap:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({
          setting_key: 'sitemap_xml',
          setting_value: {
            content: sitemapContent,
            updated_at: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'setting_key'
        });

      if (error) throw error;
      
      setLastUpdated(new Date().toISOString());
      toast.success('Sitemap saved successfully!');
    } catch (error) {
      console.error('Error saving sitemap:', error);
      toast.error('Failed to save sitemap');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(sitemapContent);
    setCopied(true);
    toast.success('Sitemap copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([sitemapContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sitemap.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Sitemap downloaded!');
  };

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setSitemapContent(content);
        toast.success('Sitemap file loaded!');
      };
      reader.readAsText(file);
    }
  };

  const handleReset = () => {
    setSitemapContent(defaultSitemap);
    toast.info('Sitemap reset to default template');
  };

  const handleAutoGenerate = async () => {
    try {
      // Fetch content from database
      const { data: content } = await supabase
        .from('content')
        .select('id, title, content_type, updated_at')
        .limit(100);

      const baseUrl = window.location.origin;
      const today = new Date().toISOString().split('T')[0];

      let generatedSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Homepage -->
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
  <!-- Main Pages -->
  <url>
    <loc>${baseUrl}/movies</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/series</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/collections</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/short</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>
  
  <!-- Static Pages -->
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>${baseUrl}/privacy-policy</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>
  <url>
    <loc>${baseUrl}/terms-of-service</loc>
    <lastmod>${today}</lastmod>
    <changefreq>yearly</changefreq>
    <priority>0.3</priority>
  </url>`;

      // Add content URLs
      if (content && content.length > 0) {
        generatedSitemap += `\n  \n  <!-- Content Pages -->`;
        content.forEach((item) => {
          const lastmod = item.updated_at ? new Date(item.updated_at).toISOString().split('T')[0] : today;
          generatedSitemap += `
  <url>
    <loc>${baseUrl}/watch/${item.id}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`;
        });
      }

      generatedSitemap += `\n</urlset>`;

      setSitemapContent(generatedSitemap);
      toast.success(`Sitemap auto-generated with ${(content?.length || 0) + 9} URLs!`);
    } catch (error) {
      console.error('Error generating sitemap:', error);
      toast.error('Failed to auto-generate sitemap');
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Sitemap XML</h1>
              <p className="text-muted-foreground text-sm">
                Manage your sitemap for better SEO performance
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoGenerate}
              className="gap-2"
            >
              <Sparkles className="h-4 w-4" />
              Auto Generate
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              <Save className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Sitemap'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Globe className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{urlCount}</p>
                  <p className="text-xs text-muted-foreground">Total URLs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Zap className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <Badge variant="secondary" className="bg-green-500/20 text-green-600 border-0">
                    Active
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">Status</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Calendar className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {lastUpdated 
                      ? new Date(lastUpdated).toLocaleDateString() 
                      : 'Never'}
                  </p>
                  <p className="text-xs text-muted-foreground">Last Updated</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <Code2 className="h-4 w-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {(sitemapContent.length / 1024).toFixed(1)} KB
                  </p>
                  <p className="text-xs text-muted-foreground">File Size</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Editor */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Code2 className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">XML Editor</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleCopy}
                      className="h-8 w-8"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleDownload}
                      className="h-8 w-8"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <label>
                      <input
                        type="file"
                        accept=".xml"
                        onChange={handleUpload}
                        className="hidden"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        asChild
                      >
                        <span>
                          <Upload className="h-4 w-4" />
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[500px] flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Textarea
                    value={sitemapContent}
                    onChange={(e) => setSitemapContent(e.target.value)}
                    className="min-h-[500px] font-mono text-sm bg-muted/30 border-border resize-none"
                    placeholder="Paste your sitemap XML here..."
                  />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Panel */}
          <div className="space-y-4">
            <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Quick Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Include all important pages for better indexing</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Set higher priority (0.8-1.0) for main pages</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Use correct changefreq based on update frequency</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Keep lastmod dates updated for accuracy</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-primary">•</span>
                  <span>Maximum 50,000 URLs per sitemap file</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Priority Levels</CardTitle>
                <CardDescription>Recommended priority values</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-red-500/10">
                  <span className="text-sm font-medium">Homepage</span>
                  <Badge className="bg-red-500 text-white">1.0</Badge>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-orange-500/10">
                  <span className="text-sm font-medium">Main Categories</span>
                  <Badge className="bg-orange-500 text-white">0.9</Badge>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-yellow-500/10">
                  <span className="text-sm font-medium">Content Pages</span>
                  <Badge className="bg-yellow-500 text-white">0.7</Badge>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-green-500/10">
                  <span className="text-sm font-medium">Static Pages</span>
                  <Badge className="bg-green-500 text-white">0.5</Badge>
                </div>
                <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-blue-500/10">
                  <span className="text-sm font-medium">Legal Pages</span>
                  <Badge className="bg-blue-500 text-white">0.3</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Change Frequency</CardTitle>
                <CardDescription>How often pages are updated</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="px-3 py-2 rounded-lg bg-muted/50">always</div>
                  <div className="px-3 py-2 rounded-lg bg-muted/50">hourly</div>
                  <div className="px-3 py-2 rounded-lg bg-muted/50">daily</div>
                  <div className="px-3 py-2 rounded-lg bg-muted/50">weekly</div>
                  <div className="px-3 py-2 rounded-lg bg-muted/50">monthly</div>
                  <div className="px-3 py-2 rounded-lg bg-muted/50">yearly</div>
                  <div className="px-3 py-2 rounded-lg bg-muted/50 col-span-2 text-center">never</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
