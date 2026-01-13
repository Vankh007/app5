import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useContentSearch } from '@/hooks/useContentSearch';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, Upload, X, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminFeaturedEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploading, setUploading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

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
    detail_endpoint: '',
    watch_endpoint: '',
    trailer_youtube_id: '',
    trailer_self_hosted: '',
  });

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { results, isLoading: isSearching } = useContentSearch(debouncedSearch);

  // Fetch existing data if editing
  const { data: existingItem, isLoading } = useQuery({
    queryKey: ['featured-item', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('slider_settings')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: isEditMode,
  });

  useEffect(() => {
    if (existingItem) {
      setFormData({
        title: existingItem.title || '',
        content_type: existingItem.content_type || 'movie',
        content_id: existingItem.content_id || '',
        section: existingItem.section || 'home',
        position: existingItem.position || 1,
        image_url: existingItem.image_url || '',
        poster_path: existingItem.poster_path || '',
        backdrop_path: existingItem.backdrop_path || '',
        description: existingItem.description || '',
        status: existingItem.status || 'active',
        detail_endpoint: existingItem.detail_endpoint || '',
        watch_endpoint: existingItem.watch_endpoint || '',
        trailer_youtube_id: (existingItem as any).trailer_youtube_id || '',
        trailer_self_hosted: (existingItem as any).trailer_self_hosted || '',
      });
    }
  }, [existingItem]);

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (isEditMode) {
        const { error } = await supabase
          .from('slider_settings')
          .update(data)
          .eq('id', id);
        
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
      toast.success(isEditMode ? 'Featured item updated' : 'Featured item created');
      navigate('/admin/featured');
    },
    onError: (error) => {
      toast.error(isEditMode ? 'Failed to update featured item' : 'Failed to create featured item');
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

  const handleContentSelect = async (contentItem: any) => {
    // Fetch trailer data for the selected content
    let trailerYoutubeId = '';
    let trailerSelfHosted = '';
    
    try {
      const { data: trailerData } = await supabase
        .from('trailers')
        .select('youtube_id, self_hosted_url')
        .eq('content_id', contentItem.id)
        .single();
      
      if (trailerData) {
        trailerYoutubeId = trailerData.youtube_id || '';
        trailerSelfHosted = trailerData.self_hosted_url || '';
      }
    } catch (error) {
      console.log('No trailer found for this content');
    }

    setFormData({
      ...formData,
      title: contentItem.title,
      content_type: contentItem.content_type,
      content_id: contentItem.id,
      poster_path: contentItem.poster_path || formData.poster_path,
      backdrop_path: contentItem.backdrop_path || formData.backdrop_path,
      description: contentItem.overview || formData.description,
      trailer_youtube_id: trailerYoutubeId,
      trailer_self_hosted: trailerSelfHosted,
    });
    setSearchOpen(false);
    setSearchTerm('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/featured')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isEditMode ? 'Edit Featured Content' : 'Add Featured Content'}
            </h1>
            <p className="text-muted-foreground">
              {isEditMode ? 'Update featured content details' : 'Create a new featured content item'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content Search */}
          <Card>
            <CardHeader>
              <CardTitle>Link to Content (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
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
                <PopoverContent className="w-[600px] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput 
                      placeholder="Search content..." 
                      value={searchTerm}
                      onValueChange={setSearchTerm}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {isSearching ? 'Searching...' : searchTerm.length < 2 ? 'Type at least 2 characters to search' : 'No content found.'}
                      </CommandEmpty>
                      <CommandGroup>
                        {results.map((contentItem) => (
                          <CommandItem
                            key={contentItem.id}
                            value={contentItem.id}
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
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
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
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main Image */}
              <div>
                <Label>Main Image</Label>
                <div className="space-y-2">
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
                  <Input
                    placeholder="Or enter image URL"
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  />
                  {formData.image_url && (
                    <img src={formData.image_url} alt="Preview" className="w-32 h-48 object-cover rounded border" />
                  )}
                </div>
              </div>

              {/* Poster */}
              <div>
                <Label>Poster Image</Label>
                <div className="space-y-2">
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
                  <Input
                    placeholder="Or enter poster URL"
                    value={formData.poster_path}
                    onChange={(e) => setFormData({ ...formData, poster_path: e.target.value })}
                  />
                  {formData.poster_path && (
                    <img src={formData.poster_path} alt="Poster" className="w-32 h-48 object-cover rounded border" />
                  )}
                </div>
              </div>

              {/* Backdrop */}
              <div>
                <Label>Backdrop Image</Label>
                <div className="space-y-2">
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
                  <Input
                    placeholder="Or enter backdrop URL"
                    value={formData.backdrop_path}
                    onChange={(e) => setFormData({ ...formData, backdrop_path: e.target.value })}
                  />
                  {formData.backdrop_path && (
                    <img src={formData.backdrop_path} alt="Backdrop" className="w-64 h-36 object-cover rounded border" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trailers */}
          <Card>
            <CardHeader>
              <CardTitle>Trailer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="trailer_youtube_id">YouTube Video ID</Label>
                <Input
                  id="trailer_youtube_id"
                  placeholder="dQw4w9WgXcQ"
                  value={formData.trailer_youtube_id}
                  onChange={(e) => setFormData({ ...formData, trailer_youtube_id: e.target.value })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the YouTube video ID (the part after v= in the URL)
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <div>
                <Label htmlFor="trailer_self_hosted">Self-Hosted Trailer URL</Label>
                <Input
                  id="trailer_self_hosted"
                  placeholder="https://example.com/trailer.mp4"
                  value={formData.trailer_self_hosted}
                  onChange={(e) => setFormData({ ...formData, trailer_self_hosted: e.target.value })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Direct link to a self-hosted video file
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Endpoints */}
          <Card>
            <CardHeader>
              <CardTitle>Links & Endpoints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="detail_endpoint">Detail Page URL</Label>
                <Input
                  id="detail_endpoint"
                  placeholder="/watch/movie/123"
                  value={formData.detail_endpoint}
                  onChange={(e) => setFormData({ ...formData, detail_endpoint: e.target.value })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Link to the content detail page
                </p>
              </div>

              <div>
                <Label htmlFor="watch_endpoint">Watch Page URL</Label>
                <Input
                  id="watch_endpoint"
                  placeholder="/watch/movie/123"
                  value={formData.watch_endpoint}
                  onChange={(e) => setFormData({ ...formData, watch_endpoint: e.target.value })}
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Direct link to start watching
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate('/admin/featured')}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveMutation.isPending || uploading}>
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Featured Item' : 'Create Featured Item'
              )}
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
