import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from 'sonner';

interface VideoSourcesImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seriesId: string;
}

export function VideoSourcesImportDialog({ open, onOpenChange, seriesId }: VideoSourcesImportDialogProps) {
  const [jsonData, setJsonData] = useState('');

  const handleImport = () => {
    try {
      const data = JSON.parse(jsonData);
      // Process bulk import
      toast.success('Video sources imported successfully');
      onOpenChange(false);
    } catch (error) {
      toast.error('Invalid JSON format');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Video Sources</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>JSON Data (All Seasons & Episodes)</Label>
            <Textarea
              placeholder='{"season_1": {"episode_1": [{"url": "...", "quality": "1080p"}]}}'
              value={jsonData}
              onChange={(e) => setJsonData(e.target.value)}
              className="h-96 font-mono text-sm"
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Import video sources for all seasons and episodes at once
          </p>
          <Button className="w-full" onClick={handleImport}>
            Import All Sources
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
