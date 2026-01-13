import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import VideoPlayer from '@/components/VideoPlayer';
import ContentAccessCheck from '@/components/ContentAccessCheck';
import { useContentData } from '@/hooks/useContentData';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import { supabase } from '@/lib/supabase';

const EmbedSeries = () => {
  const { id, season, episode } = useParams<{ id: string; season: string; episode: string }>();
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string | undefined>();
  const [resolvedContentId, setResolvedContentId] = useState<string | null>(null);
  const [isResolvingTMDB, setIsResolvingTMDB] = useState(false);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  
  // Allow landscape orientation on embed player
  useScreenOrientation(true);
  
  // Resolve TMDB ID to UUID internally (without changing URL)
  useEffect(() => {
    const resolveTMDBId = async () => {
      if (!id) return;
      
      // Check if ID is numeric (TMDB ID)
      const isNumeric = /^\d+$/.test(id);
      if (!isNumeric) {
        // Already a UUID, use directly
        setResolvedContentId(id);
        setIsResolvingTMDB(false);
        return;
      }
      
      setIsResolvingTMDB(true);
      
      try {
        const tmdbId = parseInt(id);
        const { data, error } = await supabase
          .from('content')
          .select('id')
          .eq('tmdb_id', tmdbId)
          .eq('content_type', 'series')
          .maybeSingle();
        
        if (error) {
          console.error('Error resolving TMDB ID:', error);
          setIsResolvingTMDB(false);
          return;
        }
        
        if (data) {
          setResolvedContentId(data.id);
          setIsResolvingTMDB(false);
        } else {
          console.error('Content not found for TMDB ID:', tmdbId);
          setIsResolvingTMDB(false);
        }
      } catch (err) {
        console.error('Error resolving TMDB ID:', err);
        setIsResolvingTMDB(false);
      }
    };
    
    resolveTMDBId();
  }, [id]);
  
  const { content, seasons, episodes, videoSources, loading, error } = useContentData(resolvedContentId || id, 'series');

  // Set selected season based on URL params
  useEffect(() => {
    if (seasons.length > 0 && season && !selectedSeasonId) {
      const seasonNum = parseInt(season);
      const foundSeason = seasons.find(s => s.season_number === seasonNum);
      setSelectedSeasonId(foundSeason?.id || seasons[0].id);
    } else if (seasons.length > 0 && !selectedSeasonId) {
      setSelectedSeasonId(seasons[0].id);
    }
  }, [seasons, season, selectedSeasonId]);

  // Filter episodes by selected season
  const filteredEpisodes = selectedSeasonId 
    ? episodes.filter(ep => ep.season_id === selectedSeasonId)
    : episodes;

  // Set current episode based on URL params
  useEffect(() => {
    if (filteredEpisodes.length > 0 && episode) {
      const episodeNum = parseInt(episode);
      const foundEpisode = filteredEpisodes.find(ep => ep.episode_number === episodeNum);
      setCurrentEpisodeId(foundEpisode?.id || filteredEpisodes[0].id);
    }
  }, [filteredEpisodes, episode]);

  // Handle episode selection
  const handleEpisodeSelect = (episodeId: string) => {
    setCurrentEpisodeId(episodeId);
  };

  if (loading || isResolvingTMDB) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Content Not Found</h2>
          <p className="text-white/70">{error || 'The requested content could not be loaded.'}</p>
        </div>
      </div>
    );
  }

  // Filter video sources for the current episode only
  const currentEpisodeSources = currentEpisodeId 
    ? videoSources.filter(source => source.episode_id === currentEpisodeId)
    : [];

  // Get current episode for access check
  const currentEpisode = episodes.find(ep => ep.id === currentEpisodeId);
  
  // Use episode still_path for series, fallback to content backdrop_path
  const videoBackdrop = currentEpisode?.still_path || content?.backdrop_path;
  
  // Determine access version and pricing from current episode or content
  const accessVersion = (currentEpisode as any)?.access_type || 
                        (currentEpisode as any)?.version || 
                        (content as any)?.access_type || 
                        'free';
  
  const episodePrice = Number((currentEpisode as any)?.price ?? (content as any)?.price ?? 0);

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      <AspectRatio ratio={16 / 9} className="bg-black h-full">
        <ContentAccessCheck
          contentId={content.id}
          episodeId={currentEpisodeId}
          contentType="series"
          contentTitle={content.title}
          price={episodePrice}
          rentalPeriod={(content as any)?.purchase_period || 7}
          contentBackdrop={videoBackdrop}
          excludeFromPlan={(content as any)?.exclude_from_plan || false}
          version={accessVersion}
        >
          <VideoPlayer 
            videoSources={currentEpisodeSources}
            episodes={filteredEpisodes}
            currentEpisodeId={currentEpisodeId}
            onEpisodeSelect={handleEpisodeSelect}
            contentBackdrop={videoBackdrop}
            contentId={content?.id}
          />
        </ContentAccessCheck>
      </AspectRatio>
    </div>
  );
};

export default EmbedSeries;
