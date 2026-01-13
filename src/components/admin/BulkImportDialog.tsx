import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { 
  uploadTmdbImagesToIdrive, 
  uploadSeasonPosterToIdrive, 
  uploadEpisodeStillToIdrive,
  uploadCastProfileToIdrive 
} from '@/lib/tmdbImageUpload';

const TMDB_API_KEY = '5cfa727c2f549c594772a50e10e3f272';

interface BulkImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'series' | 'movies';
}

export function BulkImportDialog({ open, onOpenChange, type }: BulkImportDialogProps) {
  const [tmdbIds, setTmdbIds] = useState('');
  const [progress, setProgress] = useState(0);
  const [currentItem, setCurrentItem] = useState('');
  const [uploadToIdrive, setUploadToIdrive] = useState(true);
  const [skippedItems, setSkippedItems] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async () => {
      const ids = tmdbIds.split('\n').filter(id => id.trim());
      const results = [];
      const total = ids.length;
      
      for (let i = 0; i < ids.length; i++) {
        const tmdbId = ids[i].trim();
        const baseProgress = Math.round(((i + 0.1) / total) * 100);
        setProgress(Math.min(baseProgress, 99));
        setCurrentItem(`Importing ${tmdbId}...`);
        
        try {
          // Fetch content from TMDB
          const contentResponse = await fetch(
            `https://api.themoviedb.org/3/${type === 'series' ? 'tv' : 'movie'}/${tmdbId}?api_key=${TMDB_API_KEY}`
          );
          
          if (!contentResponse.ok) {
            throw new Error(`TMDB API returned ${contentResponse.status} for ID ${tmdbId}`);
          }
          
          const contentData = await contentResponse.json();
          
          if (contentData.success === false) {
            throw new Error(contentData.status_message || 'TMDB API error');
          }
          
          // Upload poster and backdrop to iDrive E2 if enabled
          let finalPosterPath = contentData.poster_path 
            ? `https://image.tmdb.org/t/p/original${contentData.poster_path}`
            : null;
          let finalBackdropPath = contentData.backdrop_path
            ? `https://image.tmdb.org/t/p/original${contentData.backdrop_path}`
            : null;
            
          if (uploadToIdrive) {
            setCurrentItem(`Uploading images for ${contentData.name || contentData.title}...`);
            const { posterUrl, backdropUrl } = await uploadTmdbImagesToIdrive(
              parseInt(tmdbId),
              contentData.poster_path,
              contentData.backdrop_path,
              type === 'series' ? 'tv' : 'movie'
            );
            
            if (posterUrl) finalPosterPath = posterUrl;
            if (backdropUrl) finalBackdropPath = backdropUrl;
          }
          
          // Fetch cast data from TMDB
          const creditsResponse = await fetch(
            `https://api.themoviedb.org/3/${type === 'series' ? 'tv' : 'movie'}/${tmdbId}/credits?api_key=${TMDB_API_KEY}`
          );
          const creditsData = await creditsResponse.json();
          
          // Fetch trailer data from TMDB
          const videosResponse = await fetch(
            `https://api.themoviedb.org/3/${type === 'series' ? 'tv' : 'movie'}/${tmdbId}/videos?api_key=${TMDB_API_KEY}`
          );
          const videosData = await videosResponse.json();
          
          // For series, also fetch seasons
          let seasonsData = null;
          if (type === 'series' && contentData.number_of_seasons) {
            seasonsData = [];
            for (let j = 1; j <= contentData.number_of_seasons; j++) {
              const seasonResponse = await fetch(
                `https://api.themoviedb.org/3/tv/${tmdbId}/season/${j}?api_key=${TMDB_API_KEY}`
              );
              const seasonData = await seasonResponse.json();
              if (seasonData.success !== false) {
                seasonsData.push(seasonData);
              }
            }
          }
          
          // Check if content already exists
          const { data: existingContent } = await supabase
            .from('content')
            .select('id')
            .eq('tmdb_id', parseInt(tmdbId))
            .eq('content_type', type === 'series' ? 'series' : 'movie')
            .limit(1)
            .maybeSingle();
          
          let contentId = existingContent?.id;
            
          if (!existingContent) {
            const { data: insertedContent, error: contentError } = await supabase
              .from('content')
              .insert({
                title: contentData.name || contentData.title,
                overview: contentData.overview,
                poster_path: finalPosterPath,
                backdrop_path: finalBackdropPath,
                tmdb_id: parseInt(tmdbId),
                content_type: type === 'series' ? 'series' : 'movie',
                release_date: contentData.release_date || contentData.first_air_date,
                popularity: contentData.popularity,
                tagline: contentData.tagline,
                status: contentData.status,
                genre: contentData.genres?.map((g: any) => g.name).join(', '),
                release_year: (contentData.release_date || contentData.first_air_date)?.split('-')[0],
                seasons: contentData.number_of_seasons,
              })
              .select()
              .single();
            
            if (contentError) {
              console.error('Content insert error:', contentError);
              throw new Error(`Failed to insert content: ${contentError.message}`);
            }
            contentId = insertedContent.id;
          } else {
            // Update existing content with new image URLs
            const { error: updateError } = await supabase
              .from('content')
              .update({
                title: contentData.name || contentData.title,
                overview: contentData.overview,
                poster_path: finalPosterPath,
                backdrop_path: finalBackdropPath,
                popularity: contentData.popularity,
                tagline: contentData.tagline,
                status: contentData.status,
                genre: contentData.genres?.map((g: any) => g.name).join(', '),
                seasons: contentData.number_of_seasons,
              })
              .eq('id', contentId);
              
            if (updateError) {
              console.error('Content update error:', updateError);
              throw new Error(`Failed to update content: ${updateError.message}`);
            }
          }
          
          // Import trailer if available
          if (contentId && videosData.results && videosData.results.length > 0) {
            const trailer = videosData.results.find((v: any) => 
              v.type === 'Trailer' && v.site === 'YouTube'
            ) || videosData.results[0];
            
            if (trailer && trailer.site === 'YouTube') {
              await supabase
                .from('trailers')
                .delete()
                .eq('content_id', contentId);
              
              const { error: trailerError } = await supabase
                .from('trailers')
                .insert({
                  content_id: contentId,
                  youtube_id: trailer.key,
                });
                
              if (trailerError) {
                console.error('Trailer insert error:', trailerError);
              }
            }
          }
          
          setProgress(Math.min(Math.round(((i + 0.3) / total) * 100), 99));
          
          // Import seasons and episodes for series
          if (type === 'series' && seasonsData && contentId) {
            for (const seasonData of seasonsData) {
              setCurrentItem(`Processing season ${seasonData.season_number}...`);
              
              // Upload season poster to iDrive if enabled
              let finalSeasonPoster = seasonData.poster_path 
                ? `https://image.tmdb.org/t/p/original${seasonData.poster_path}`
                : null;
                
              if (uploadToIdrive && seasonData.poster_path) {
                const seasonPosterUrl = await uploadSeasonPosterToIdrive(
                  parseInt(tmdbId),
                  seasonData.season_number,
                  seasonData.poster_path
                );
                if (seasonPosterUrl) finalSeasonPoster = seasonPosterUrl;
              }
              
              const { data: existingSeason } = await supabase
                .from('seasons')
                .select('id')
                .eq('show_id', contentId)
                .eq('season_number', seasonData.season_number)
                .maybeSingle();
              
              let seasonId = existingSeason?.id;
              
              if (!existingSeason) {
                const { data: newSeason } = await supabase
                  .from('seasons')
                  .insert({
                    show_id: contentId,
                    season_number: seasonData.season_number,
                    title: seasonData.name,
                    overview: seasonData.overview,
                    poster_path: finalSeasonPoster,
                    tmdb_id: seasonData.id,
                  })
                  .select()
                  .single();
                
                seasonId = newSeason?.id;
              } else {
                // Update existing season with new image
                await supabase
                  .from('seasons')
                  .update({ poster_path: finalSeasonPoster })
                  .eq('id', seasonId);
              }
              
              // Import episodes
              if (seasonData.episodes && seasonId) {
                for (const episodeData of seasonData.episodes) {
                  // Upload episode still to iDrive if enabled
                  let finalStillPath = episodeData.still_path
                    ? `https://image.tmdb.org/t/p/original${episodeData.still_path}`
                    : null;
                    
                  if (uploadToIdrive && episodeData.still_path) {
                    const episodeStillUrl = await uploadEpisodeStillToIdrive(
                      parseInt(tmdbId),
                      seasonData.season_number,
                      episodeData.episode_number,
                      episodeData.still_path
                    );
                    if (episodeStillUrl) finalStillPath = episodeStillUrl;
                  }
                  
                  const { data: existingEpisode } = await supabase
                    .from('episodes')
                    .select('id')
                    .eq('show_id', contentId)
                    .eq('season_id', seasonId)
                    .eq('episode_number', episodeData.episode_number)
                    .maybeSingle();
                  
                  if (!existingEpisode) {
                    await supabase
                      .from('episodes')
                      .insert({
                        show_id: contentId,
                        season_id: seasonId,
                        episode_number: episodeData.episode_number,
                        title: episodeData.name,
                        overview: episodeData.overview,
                        still_path: finalStillPath,
                        air_date: episodeData.air_date,
                        vote_average: episodeData.vote_average,
                        duration: episodeData.runtime,
                        tmdb_id: episodeData.id,
                      });
                  } else {
                    // Update existing episode with new image
                    await supabase
                      .from('episodes')
                      .update({ still_path: finalStillPath })
                      .eq('id', existingEpisode.id);
                  }
                }
              }
            }
          }
          
          setProgress(Math.min(Math.round(((i + 0.6) / total) * 100), 99));
          
          // Import cast members
          if (creditsData.cast && creditsData.cast.length > 0 && contentId) {
            setCurrentItem(`Uploading cast images...`);
            
            for (const castMember of creditsData.cast.slice(0, 15)) {
              try {
                // Check if cast member already exists
                const { data: existingCast } = await supabase
                  .from('cast_members')
                  .select('id')
                  .eq('tmdb_id', castMember.id)
                  .maybeSingle();
                
                let castMemberId = existingCast?.id;
                
                if (!existingCast) {
                  // Upload cast profile image to iDrive if enabled
                  let finalProfilePath = castMember.profile_path
                    ? `https://image.tmdb.org/t/p/original${castMember.profile_path}`
                    : null;
                    
                  if (uploadToIdrive && castMember.profile_path) {
                    const castProfileUrl = await uploadCastProfileToIdrive(
                      castMember.id,
                      castMember.profile_path
                    );
                    if (castProfileUrl) finalProfilePath = castProfileUrl;
                  }
                  
                  const { data: newCast, error: castError } = await supabase
                    .from('cast_members')
                    .insert({
                      tmdb_id: castMember.id,
                      name: castMember.name,
                      profile_path: finalProfilePath,
                      known_for_department: castMember.known_for_department,
                      popularity: castMember.popularity,
                      gender: castMember.gender,
                    })
                    .select()
                    .single();
                  
                  if (castError) {
                    console.error('Cast member insert error:', castError);
                    continue;
                  }
                  castMemberId = newCast?.id;
                }
                
                // Insert cast credit
                if (castMemberId) {
                  const { error: creditError } = await supabase
                    .from('cast_credits')
                    .insert({
                      cast_member_id: castMemberId,
                      tmdb_content_id: parseInt(tmdbId),
                      title: contentData.name || contentData.title,
                      character_name: castMember.character,
                      media_type: type === 'series' ? 'tv' : 'movie',
                      release_date: contentData.release_date || contentData.first_air_date,
                      poster_path: finalPosterPath,
                    });
                    
                  if (creditError) {
                    console.error('Cast credit insert error:', creditError);
                  }
                }
              } catch (castError) {
                console.error('Error processing cast member:', castError);
              }
            }
          }
          
          setProgress(Math.min(Math.round(((i + 1) / total) * 100), 99));
          
          results.push({ id: tmdbId, success: true });
        } catch (error) {
          console.error('Import error for TMDB ID', tmdbId, ':', error);
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.push({ id: tmdbId, success: false, error: errorMessage });
          toast.error(`Failed to import ${tmdbId}: ${errorMessage}`);
        }
      }
      
      setProgress(100);
      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success).length;
      queryClient.invalidateQueries({ queryKey: ['admin-series'] });
      queryClient.invalidateQueries({ queryKey: ['admin-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin-casters'] });
      toast.success(`Imported ${successful}/${results.length} items with images saved to iDrive E2`);
      setProgress(0);
      setCurrentItem('');
      onOpenChange(false);
      setTmdbIds('');
    },
    onError: () => {
      toast.error('Failed to import items');
      setProgress(0);
      setCurrentItem('');
    },
  });
  
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setTmdbIds(text);
      toast.success('Pasted from clipboard');
    } catch (err) {
      toast.error('Failed to paste from clipboard');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Bulk Import {type === 'series' ? 'TV Shows' : 'Movies'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>TMDB IDs (one per line)</Label>
            <Textarea
              placeholder={`12345\n67890\n11111`}
              value={tmdbIds}
              onChange={(e) => setTmdbIds(e.target.value)}
              onContextMenu={(e) => {
                e.preventDefault();
                handlePaste();
              }}
              className="h-48 font-mono"
            />
            <div className="flex items-center gap-2 mt-3">
              <Checkbox 
                id="uploadToIdrive" 
                checked={uploadToIdrive}
                onCheckedChange={(checked) => setUploadToIdrive(checked === true)}
              />
              <Label htmlFor="uploadToIdrive" className="text-sm font-normal cursor-pointer">
                Save images to iDrive E2
              </Label>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Enter TMDB IDs, one per line. {uploadToIdrive ? 'Images will be saved to iDrive E2.' : 'Images will use TMDB URLs.'}
            </p>
          </div>
          
          {importMutation.isPending && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{currentItem}</span>
                <span className="font-medium">{progress}%</span>
              </div>
              <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
          
          <Button 
            className="w-full" 
            onClick={() => importMutation.mutate()}
            disabled={importMutation.isPending || !tmdbIds.trim()}
          >
            {importMutation.isPending ? 'Importing...' : `Import ${type === 'series' ? 'Shows' : 'Movies'}`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
