import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Eye, FileText, Shield, Users, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface PolicySection {
  id: string;
  section_key: string;
  title: string | null;
  content: string | null;
  is_active: boolean;
}

const defaultPolicySections = [
  { key: 'privacy_policy', title: 'Privacy Policy', icon: Shield },
  { key: 'terms_of_service', title: 'Terms of Service', icon: FileText },
  { key: 'about_us', title: 'About Us', icon: Users },
  { key: 'contact', title: 'Contact Information', icon: Mail },
];

export default function AdminSettingsPolicy() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sections, setSections] = useState<Record<string, PolicySection>>({});
  const [activeTab, setActiveTab] = useState('privacy_policy');

  useEffect(() => {
    fetchPolicySections();
  }, []);

  const fetchPolicySections = async () => {
    try {
      const { data, error } = await supabase
        .from('content_sections')
        .select('*')
        .in('section_key', defaultPolicySections.map(s => s.key));

      if (error) throw error;

      const sectionsMap: Record<string, PolicySection> = {};
      
      // Initialize with defaults
      defaultPolicySections.forEach(section => {
        sectionsMap[section.key] = {
          id: '',
          section_key: section.key,
          title: section.title,
          content: '',
          is_active: true
        };
      });

      // Override with existing data
      data?.forEach(section => {
        sectionsMap[section.section_key] = section;
      });

      setSections(sectionsMap);
    } catch (error) {
      console.error('Error fetching policy sections:', error);
      toast({
        title: 'Error',
        description: 'Failed to load policy sections',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (sectionKey: string) => {
    setSaving(true);
    try {
      const section = sections[sectionKey];
      
      if (section.id) {
        // Update existing
        const { error } = await supabase
          .from('content_sections')
          .update({
            title: section.title,
            content: section.content,
            is_active: section.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', section.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('content_sections')
          .insert({
            section_key: sectionKey,
            title: section.title,
            content: section.content,
            is_active: section.is_active
          })
          .select()
          .single();

        if (error) throw error;
        
        setSections(prev => ({
          ...prev,
          [sectionKey]: { ...prev[sectionKey], id: data.id }
        }));
      }

      toast({
        title: 'Saved',
        description: `${section.title} has been updated successfully`
      });
    } catch (error) {
      console.error('Error saving section:', error);
      toast({
        title: 'Error',
        description: 'Failed to save changes',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const updateSection = (sectionKey: string, field: string, value: string | boolean) => {
    setSections(prev => ({
      ...prev,
      [sectionKey]: {
        ...prev[sectionKey],
        [field]: value
      }
    }));
  };

  const getPreviewUrl = (sectionKey: string) => {
    const urlMap: Record<string, string> = {
      privacy_policy: '/privacy-policy',
      terms_of_service: '/terms-of-service',
      about_us: '/about',
      contact: '/contact'
    };
    return urlMap[sectionKey] || '/';
  };

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
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Policy Pages</h1>
            <p className="text-muted-foreground">
              Manage your Privacy Policy, Terms of Service, About Us, and Contact pages
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 w-full max-w-2xl">
            {defaultPolicySections.map(section => (
              <TabsTrigger key={section.key} value={section.key} className="flex items-center gap-2">
                <section.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{section.title}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {defaultPolicySections.map(section => (
            <TabsContent key={section.key} value={section.key}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <section.icon className="h-5 w-5" />
                        {section.title}
                      </CardTitle>
                      <CardDescription>
                        Edit the content for your {section.title.toLowerCase()} page
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(getPreviewUrl(section.key), '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSave(section.key)}
                        disabled={saving}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`${section.key}-title`}>Page Title</Label>
                    <Input
                      id={`${section.key}-title`}
                      value={sections[section.key]?.title || ''}
                      onChange={(e) => updateSection(section.key, 'title', e.target.value)}
                      placeholder={`Enter ${section.title.toLowerCase()} title`}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor={`${section.key}-content`}>
                      Page Content (HTML supported)
                    </Label>
                    <Textarea
                      id={`${section.key}-content`}
                      value={sections[section.key]?.content || ''}
                      onChange={(e) => updateSection(section.key, 'content', e.target.value)}
                      placeholder={`Enter ${section.title.toLowerCase()} content...`}
                      rows={15}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      You can use HTML tags to format your content. Changes will be reflected on the public pages.
                    </p>
                  </div>

                  {section.key === 'contact' && (
                    <Card className="bg-muted/30">
                      <CardContent className="p-4">
                        <h4 className="font-medium mb-2">Contact Form Settings</h4>
                        <p className="text-sm text-muted-foreground">
                          The contact page includes a built-in form. Submitted messages will be sent to your configured email address.
                          You can customize the email in the Notification Settings.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        <Card className="bg-muted/30">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-2">Google AdSense Compliance</h3>
            <p className="text-sm text-muted-foreground mb-4">
              These policy pages are required for Google AdSense approval. Make sure each page contains:
            </p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li><strong>Privacy Policy:</strong> How you collect, use, and protect user data</li>
              <li><strong>Terms of Service:</strong> Rules and guidelines for using your website</li>
              <li><strong>About Us:</strong> Information about your company or organization</li>
              <li><strong>Contact:</strong> A way for users to reach you</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}