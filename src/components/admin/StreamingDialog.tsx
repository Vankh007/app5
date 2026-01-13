import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface StreamingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: any;
}

export function StreamingDialog({ open, onOpenChange, channel }: StreamingDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    stream_url: '',
    logo_url: '',
    category: '',
    description: '',
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    if (channel) {
      setFormData({
        name: channel.name || '',
        stream_url: channel.stream_url || '',
        logo_url: channel.logo_url || '',
        category: channel.category || '',
        description: channel.description || '',
      });
    } else {
      setFormData({
        name: '',
        stream_url: '',
        logo_url: '',
        category: '',
        description: '',
      });
    }
  }, [channel]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (channel) {
        const { error } = await supabase
          .from('streaming_channels')
          .update(formData)
          .eq('id', channel.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('streaming_channels')
          .insert(formData);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['streaming_channels'] });
      toast.success(channel ? 'Channel updated' : 'Channel created');
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to save channel');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{channel ? 'Edit Channel' : 'Create Channel'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[500px] overflow-y-auto">
          <div>
            <Label>Channel Name</Label>
            <Input
              placeholder="Enter channel name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div>
            <Label>Stream URL</Label>
            <Input
              placeholder="https://example.com/stream.m3u8"
              value={formData.stream_url}
              onChange={(e) => setFormData({ ...formData, stream_url: e.target.value })}
            />
          </div>
          <div>
            <Label>Logo URL</Label>
            <Input
              placeholder="https://example.com/logo.png"
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
            />
          </div>
          <div>
            <Label>Category</Label>
            <Input
              placeholder="Enter category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              placeholder="Enter description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
          <Button 
            className="w-full" 
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? 'Saving...' : 'Save Channel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
