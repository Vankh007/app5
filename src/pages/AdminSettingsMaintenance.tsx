import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useMaintenanceMode } from '@/hooks/useMaintenanceMode';
import { ArrowLeft, Power, Wrench, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function AdminSettingsMaintenance() {
  const navigate = useNavigate();
  const { settings, isLoading, isMaintenanceEnabled, maintenanceMessage, updateSettings, isUpdating } = useMaintenanceMode();
  
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (settings) {
      setEnabled(settings.enabled);
      setMessage(settings.message || '');
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings({
      enabled,
      message
    });
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    // Immediately update when toggling
    updateSettings({
      enabled: checked,
      message
    });
  };

  if (isLoading) {
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
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/settings')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Maintenance Mode</h1>
            <p className="text-muted-foreground">Enable or disable the maintenance mode of the system</p>
          </div>
        </div>

        {/* Warning Banner when enabled */}
        {isMaintenanceEnabled && (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm text-destructive">
              Maintenance mode is currently <strong>ENABLED</strong>. Regular users cannot access the site.
            </p>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Toggle Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Power className="h-5 w-5" />
                Maintenance Status
              </CardTitle>
              <CardDescription>
                When enabled, only admins can access the site. All other users will see a maintenance page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="space-y-1">
                  <Label htmlFor="maintenance-toggle" className="text-base font-medium">
                    {enabled ? 'Maintenance Mode Active' : 'Site is Live'}
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    {enabled 
                      ? 'Users will see the maintenance page' 
                      : 'Users can access the site normally'}
                  </p>
                </div>
                <Switch
                  id="maintenance-toggle"
                  checked={enabled}
                  onCheckedChange={handleToggle}
                  disabled={isUpdating}
                />
              </div>

              <div className={`mt-4 flex items-center gap-2 text-sm ${enabled ? 'text-destructive' : 'text-green-500'}`}>
                <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-destructive animate-pulse' : 'bg-green-500'}`} />
                {enabled ? 'Maintenance mode is ON' : 'Site is fully operational'}
              </div>
            </CardContent>
          </Card>

          {/* Message Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance Message
              </CardTitle>
              <CardDescription>
                This message will be displayed to users when maintenance mode is enabled.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="We are currently performing scheduled maintenance. Please check back soon."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <Button 
                onClick={handleSave} 
                disabled={isUpdating}
                className="w-full"
              >
                {isUpdating ? 'Saving...' : 'Save Message'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Maintenance Page Preview</CardTitle>
            <CardDescription>
              This is how the maintenance page will appear to users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-background border border-border rounded-lg p-8">
              <div className="max-w-md mx-auto text-center space-y-6">
                {/* Animated Icon Preview */}
                <div className="relative mx-auto w-16 h-16">
                  <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping" />
                  <div className="relative flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full border-2 border-primary/30">
                    <Wrench className="w-8 h-8 text-primary" />
                  </div>
                </div>

                {/* Title Preview */}
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-foreground">
                    Under Maintenance
                  </h2>
                  <p className="text-muted-foreground">
                    We'll be back soon!
                  </p>
                </div>

                {/* Message Preview */}
                <div className="bg-card/50 backdrop-blur-sm rounded-xl p-4 border border-border">
                  <p className="text-sm text-muted-foreground">
                    {message || 'We are currently performing scheduled maintenance. Please check back soon.'}
                  </p>
                </div>

                {/* Decorative dots */}
                <div className="flex justify-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
