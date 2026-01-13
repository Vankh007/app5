import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';

const TMDB_API_KEY = '5cfa727c2f549c594772a50e10e3f272';

interface UpcomingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: any;
}

export function UpcomingDialog({ open, onOpenChange, item }: UpcomingDialogProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [formData, setFormData] = useState({
    title: item?.title || '',
    poster_path: item?.poster_path || '',
    backdrop_path: item?.backdrop_path || '',
    release_date: item?.release_date?.split('T')[0] || '',
    description: item?.description || '',
    content_type: item?.content_type || 'movie',
    tmdb_id: item?.tmdb_id || null,
    is_featured: item?.is_featured || false,
    status: item?.status || 'upcoming',
    trailer_youtube_id: '',
    trailer_self_hosted: '',
  });

  // Load existing trailer data when editing
  const { data: existingTrailer } = useQuery({
    queryKey: ['trailer', item?.content_id],
    enabled: !!item?.content_id,
    queryFn: async () => {
      const { data } = await supabase
        .from('trailers')
        .select('*')
        .eq('content_id', item.content_id)
        .maybeSingle();
      
      if (data) {
        setFormData(prev => ({
          ...prev,
          trailer_youtube_id: data.youtube_id || '',
          trailer_self_hosted: data.self_hosted_url || '',
        }));
      }
      return data;
    },
  });

  const searchTMDB = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      );
      const data = await response.json();
      setSearchResults(data.results?.filter((r: any) => r.media_type === 'movie' || r.media_type === 'tv') || []);
    } catch (error) {
      toast.error('Failed to search TMDB');
    } finally {
      setIsSearching(false);
    }
  };

  const selectTMDBItem = async (result: any) => {
    // Fetch trailer from TMDB immediately
    const isTV = result.media_type === 'tv';
    const endpoint = isTV ? 'tv' : 'movie';
    let trailerYoutubeId = '';
    
    try {
      const videosRes = await fetch(`https://api.themoviedb.org/3/${endpoint}/${result.id}/videos?api_key=${TMDB_API_KEY}`);
      const videosData = await videosRes.json();
      const trailer = videosData.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || videosData.results?.[0];
      if (trailer?.site === 'YouTube') {
        trailerYoutubeId = trailer.key;
      }
    } catch (error) {
      console.error('Failed to fetch trailer:', error);
    }

    setFormData({
      ...formData,
      title: result.title || result.name,
      poster_path: result.poster_path ? `https://image.tmdb.org/t/p/original${result.poster_path}` : '',
      backdrop_path: result.backdrop_path ? `https://image.tmdb.org/t/p/original${result.backdrop_path}` : '',
      release_date: result.release_date || result.first_air_date || '',
      description: result.overview,
      content_type: result.media_type === 'tv' ? 'series' : 'movie',
      tmdb_id: result.id,
      is_featured: formData.is_featured,
      status: formData.status,
      trailer_youtube_id: trailerYoutubeId,
      trailer_self_hosted: formData.trailer_self_hosted,
    });
    setSearchResults([]);
    setSearchQuery('');
  };

  const importAdditionalData = async (contentId: string, tmdbId: number, contentType: string) => {
    try {
      const isTV = contentType === 'series';
      const endpoint = isTV ? 'tv' : 'movie';
      
      const [creditsRes, videosRes] = await Promise.all([
        fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/credits?api_key=${TMDB_API_KEY}`),
        fetch(`https://api.themoviedb.org/3/${endpoint}/${tmdbId}/videos?api_key=${TMDB_API_KEY}`)
      ]);

      const [creditsData, videosData] = await Promise.all([
        creditsRes.json(),
        videosRes.json()
      ]);

      // Import cast
      if (creditsData.cast?.length > 0) {
        for (const castMember of creditsData.cast.slice(0, 15)) {
          const { data: existing } = await supabase
            .from('cast_members')
            .select('id')
            .eq('tmdb_id', castMember.id)
            .maybeSingle();

          let castId = existing?.id;
          if (!existing) {
            const { data: newCast } = await supabase.from('cast_members').insert({
              tmdb_id: castMember.id,
              name: castMember.name,
              profile_path: castMember.profile_path ? `https://image.tmdb.org/t/p/original${castMember.profile_path}` : null,
              known_for_department: castMember.known_for_department,
              popularity: castMember.popularity,
              gender: castMember.gender,
            }).select().single();
            castId = newCast?.id;
          }

          if (castId) {
            await supabase.from('cast_credits').insert({
              cast_member_id: castId,
              tmdb_content_id: tmdbId,
              title: formData.title,
              character_name: castMember.character,
              media_type: isTV ? 'tv' : 'movie',
              poster_path: formData.poster_path,
            });
          }
        }
      }

      // Import trailer - now handled by form data
      // Keeping this for backward compatibility with auto-import
      if (!formData.trailer_youtube_id && !formData.trailer_self_hosted && videosData.results?.length > 0) {
        const trailer = videosData.results.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube') || videosData.results[0];
        if (trailer?.site === 'YouTube') {
          await supabase.from('trailers').delete().eq('content_id', contentId);
          await supabase.from('trailers').insert({
            content_id: contentId,
            youtube_id: trailer.key,
          });
        }
      }

      // Import seasons and episodes for series
      if (isTV) {
        const seriesRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}`);
        const seriesData = await seriesRes.json();

        if (seriesData.number_of_seasons) {
          for (let i = 1; i <= seriesData.number_of_seasons; i++) {
            const seasonRes = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${i}?api_key=${TMDB_API_KEY}`);
            const seasonData = await seasonRes.json();

            if (seasonData.success !== false) {
              const { data: existingSeason } = await supabase
                .from('seasons')
                .select('id')
                .eq('show_id', contentId)
                .eq('season_number', seasonData.season_number)
                .maybeSingle();

              let seasonId = existingSeason?.id;
              if (!existingSeason) {
                const { data: newSeason } = await supabase.from('seasons').insert({
                  show_id: contentId,
                  season_number: seasonData.season_number,
                  title: seasonData.name,
                  overview: seasonData.overview,
                  poster_path: seasonData.poster_path ? `https://image.tmdb.org/t/p/original${seasonData.poster_path}` : null,
                  tmdb_id: seasonData.id,
                }).select().single();
                seasonId = newSeason?.id;
              }

              if (seasonData.episodes && seasonId) {
                for (const ep of seasonData.episodes) {
                  const { data: existingEp } = await supabase
                    .from('episodes')
                    .select('id')
                    .eq('show_id', contentId)
                    .eq('season_id', seasonId)
                    .eq('episode_number', ep.episode_number)
                    .maybeSingle();

                  if (!existingEp) {
                    await supabase.from('episodes').insert({
                      show_id: contentId,
                      season_id: seasonId,
                      episode_number: ep.episode_number,
                      title: ep.name,
                      overview: ep.overview,
                      still_path: ep.still_path ? `https://image.tmdb.org/t/p/original${ep.still_path}` : null,
                      air_date: ep.air_date,
                      vote_average: ep.vote_average,
                      duration: ep.runtime,
                      tmdb_id: ep.id,
                    });
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error importing additional data:', error);
      throw error;
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (item) {
        const { error } = await supabase
          .from('upcoming_releases')
          .update(formData)
          .eq('id', item.id);
        if (error) throw error;

        // Update trailer if content is linked
        if (item.content_id && (formData.trailer_youtube_id || formData.trailer_self_hosted)) {
          await supabase.from('trailers').delete().eq('content_id', item.content_id);
          await supabase.from('trailers').insert({
            content_id: item.content_id,
            youtube_id: formData.trailer_youtube_id || null,
            self_hosted_url: formData.trailer_self_hosted || null,
          });
        }

        // Import additional data if TMDB ID exists and content is linked
        if (formData.tmdb_id && item.content_id) {
          await importAdditionalData(item.content_id, formData.tmdb_id, formData.content_type);
        }
      } else {
        // Create upcoming release
        const { data: upcoming, error: upcomingError } = await supabase
          .from('upcoming_releases')
          .insert(formData)
          .select()
          .single();
        if (upcomingError) throw upcomingError;

        // Create content entry
        if (formData.tmdb_id) {
          const { data: content, error: contentError } = await supabase
            .from('content')
            .insert({
              title: formData.title,
              poster_path: formData.poster_path,
              backdrop_path: formData.backdrop_path,
              overview: formData.description,
              release_date: formData.release_date,
              tmdb_id: formData.tmdb_id,
              content_type: formData.content_type,
            })
            .select()
            .single();
          
          if (contentError) throw contentError;

          // Link content to upcoming release
          await supabase
            .from('upcoming_releases')
            .update({ content_id: content.id })
            .eq('id', upcoming.id);

          // Save trailer data
          if (formData.trailer_youtube_id || formData.trailer_self_hosted) {
            await supabase.from('trailers').insert({
              content_id: content.id,
              youtube_id: formData.trailer_youtube_id || null,
              self_hosted_url: formData.trailer_self_hosted || null,
            });
          }

          // Import additional data
          if (content?.id) {
            await importAdditionalData(content.id, formData.tmdb_id, formData.content_type);
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(item ? 'Updated successfully' : 'Created successfully');
      queryClient.invalidateQueries({ queryKey: ['upcoming-releases'] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error('Failed to save: ' + error.message);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onContextMenu={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{item ? 'Edit' : 'Add'} Upcoming Release</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Search TMDB (optional)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Search movies or series..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchTMDB(e.target.value);
                }}
              />
              <Button variant="outline" size="icon" disabled={isSearching}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
            {searchResults.length > 0 && (
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex gap-3 p-3 hover:bg-muted cursor-pointer"
                    onClick={() => selectTMDBItem(result)}
                  >
                    {result.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${result.poster_path}`}
                        alt={result.title || result.name}
                        className="w-12 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <p className="font-medium">{result.title || result.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {result.media_type === 'tv' ? 'Series' : 'Movie'} • {result.release_date || result.first_air_date}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Content Type</Label>
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
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Release Date *</Label>
            <Input
              type="date"
              value={formData.release_date}
              onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter description"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label>Poster URL</Label>
            <Input
              value={formData.poster_path}
              onChange={(e) => setFormData({ ...formData, poster_path: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Backdrop URL</Label>
            <Input
              value={formData.backdrop_path}
              onChange={(e) => setFormData({ ...formData, backdrop_path: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="space-y-2">
            <Label>Trailer YouTube ID</Label>
            <Input
              value={formData.trailer_youtube_id}
              onChange={(e) => setFormData({ ...formData, trailer_youtube_id: e.target.value })}
              placeholder="e.g., dQw4w9WgXcQ (auto-filled from TMDB)"
            />
            <p className="text-xs text-muted-foreground">
              The YouTube video ID (e.g., from youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>)
            </p>
          </div>

          <div className="space-y-2">
            <Label>Trailer Self-Hosted URL (optional)</Label>
            <Input
              value={formData.trailer_self_hosted}
              onChange={(e) => setFormData({ ...formData, trailer_self_hosted: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.is_featured}
              onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
            />
            <Label>Featured</Label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!formData.title || !formData.release_date || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
