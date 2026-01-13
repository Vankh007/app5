import { useState, useEffect } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useContentSearch } from '@/hooks/useContentSearch';
import { FeaturedItem } from '@/hooks/useFeaturedContent';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Star, Upload, X, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeaturedDialogProps {
  item?: FeaturedItem;
  trigger?: React.ReactNode;
}

export function FeaturedDialog({ item, trigger }: FeaturedDialogProps) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    title: '',
    content_type: 'movie',
    content_id: '',
    section: 'home',
    position: 1,
    image_url: '',
    poster_path: '',
    backdrop_path: '',
    description: '',
    status: 'active',
  });

  const { results } = useContentSearch(searchTerm);

  useEffect(() => {
    if (item) {
      setFormData({
        title: item.title,
        content_type: item.content_type,
        content_id: item.content_id || '',
        section: item.section,
        position: item.position,
        image_url: item.image_url || '',
        poster_path: item.poster_path || '',
        backdrop_path: item.backdrop_path || '',
        description: item.description || '',
        status: item.status || 'active',
      });
    }
  }, [item]);

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (item) {
        const { error } = await supabase
          .from('slider_settings')
          .update(data)
          .eq('id', item.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('slider_settings')
          .insert([data]);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-content'] });
      toast.success(item ? 'Featured item updated' : 'Featured item created');
      setOpen(false);
      if (!item) {
        setFormData({
          title: '',
          content_type: 'movie',
          content_id: '',
          section: 'home',
          position: 1,
          image_url: '',
          poster_path: '',
          backdrop_path: '',
          description: '',
          status: 'active',
        });
      }
    },
    onError: (error) => {
      toast.error(item ? 'Failed to update featured item' : 'Failed to create featured item');
      console.error(error);
    }
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'image_url' | 'poster_path' | 'backdrop_path') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('featured-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('featured-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, [field]: publicUrl });
      toast.success('Image uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload image');
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  const handleContentSelect = (contentItem: any) => {
    setFormData({
      ...formData,
      title: contentItem.title,
      content_type: contentItem.content_type,
      content_id: contentItem.id,
      poster_path: contentItem.poster_path || formData.poster_path,
      backdrop_path: contentItem.backdrop_path || formData.backdrop_path,
      description: contentItem.overview || formData.description,
    });
    setSearchOpen(false);
    setSearchTerm('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Star className="h-4 w-4 mr-2" />
            Add Featured
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Featured Content' : 'Add Featured Content'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Content Search */}
          <div>
            <Label>Search Content (Optional)</Label>
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={searchOpen}
                  className="w-full justify-between"
                >
                  {formData.content_id ? formData.title : "Search for movies/series..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput 
                    placeholder="Search content..." 
                    value={searchTerm}
                    onValueChange={setSearchTerm}
                  />
                  <CommandList>
                    <CommandEmpty>No content found.</CommandEmpty>
                    <CommandGroup>
                      {results.map((contentItem) => (
                        <CommandItem
                          key={contentItem.id}
                          onSelect={() => handleContentSelect(contentItem)}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.content_id === contentItem.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex items-center gap-2">
                            {contentItem.poster_path && (
                              <img 
                                src={contentItem.poster_path} 
                                alt={contentItem.title}
                                className="w-8 h-12 object-cover rounded"
                              />
                            )}
                            <div>
                              <div className="font-medium">{contentItem.title}</div>
                              <div className="text-xs text-muted-foreground">{contentItem.content_type}</div>
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="content_type">Content Type</Label>
              <Select
                value={formData.content_type}
                onValueChange={(value) => setFormData({ ...formData, content_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="movie">Movie</SelectItem>
                  <SelectItem value="series">Series</SelectItem>
                  <SelectItem value="anime">Anime</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="section">Section</Label>
              <Select
                value={formData.section}
                onValueChange={(value) => setFormData({ ...formData, section: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="home">Home</SelectItem>
                  <SelectItem value="movies">Movies</SelectItem>
                  <SelectItem value="series">Series</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="position">Position</Label>
            <Input
              id="position"
              type="number"
              min="1"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: parseInt(e.target.value) })}
              required
            />
          </div>

          {/* Image Upload - Main Image */}
          <div>
            <Label>Main Image</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'image_url')}
                disabled={uploading}
                className="flex-1"
              />
              {formData.image_url && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFormData({ ...formData, image_url: '' })}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {formData.image_url && (
              <img src={formData.image_url} alt="Preview" className="mt-2 w-32 h-48 object-cover rounded" />
            )}
          </div>

          {/* Poster Upload */}
          <div>
            <Label>Poster Image</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'poster_path')}
                disabled={uploading}
                className="flex-1"
              />
              {formData.poster_path && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFormData({ ...formData, poster_path: '' })}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {formData.poster_path && (
              <img src={formData.poster_path} alt="Poster" className="mt-2 w-32 h-48 object-cover rounded" />
            )}
          </div>

          {/* Backdrop Upload */}
          <div>
            <Label>Backdrop Image</Label>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileUpload(e, 'backdrop_path')}
                disabled={uploading}
                className="flex-1"
              />
              {formData.backdrop_path && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setFormData({ ...formData, backdrop_path: '' })}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {formData.backdrop_path && (
              <img src={formData.backdrop_path} alt="Backdrop" className="mt-2 w-64 h-36 object-cover rounded" />
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending || uploading}>
              {mutation.isPending ? (item ? 'Updating...' : 'Creating...') : (item ? 'Update' : 'Create')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
