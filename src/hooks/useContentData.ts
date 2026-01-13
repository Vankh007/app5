import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Season {
  id: string;
  show_id: string;
  season_number: number;
  title: string;
  poster_path?: string;
  overview?: string;
}

interface Episode {
  id: string;
  show_id: string;
  season_id: string;
  title: string;
  episode_number?: number;
  thumbnail?: string;
  still_path?: string;
  duration?: string;
  description?: string;
  version?: string;
  access_type?: 'free' | 'membership' | 'purchase';
  price?: number;
}

interface VideoSource {
  id: string;
  media_id?: string;
  episode_id?: string;
  source_type: string;
  url: string;
  quality?: string;
  language?: string;
  version?: string;
  quality_urls?: any;
  is_default?: boolean;
  name?: string;
  server_name?: string;
}

export interface Content {
  id: string;
  title: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  tmdb_id?: string | number;
  popularity?: number;
  created_at?: string;
  release_date?: string;
  version?: string;
  content_type?: string;
  access_type?: 'free' | 'membership' | 'purchase';
  exclude_from_plan?: boolean;
  price?: number;
  purchase_period?: number;
  cast_members?: string;
}

export const useContentData = (contentId: string | undefined, type: 'movie' | 'series') => {
  const [content, setContent] = useState<Content | null>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [videoSources, setVideoSources] = useState<VideoSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!contentId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // CRITICAL: Clear old data immediately to prevent stale state when switching content
        setContent(null);
        setSeasons([]);
        setEpisodes([]);
        setVideoSources([]);

        // First try to find content by tmdb_id if contentId is numeric
        let contentData = null;
        let contentError = null;

        // Check if contentId looks like a number (tmdb_id) or UUID
        const isNumeric = /^\d+$/.test(contentId);
        
        if (isNumeric) {
          // Try to find by tmdb_id - use limit(1) to handle duplicates gracefully
          const result = await supabase
            .from('content')
            .select('*')
            .eq('tmdb_id', contentId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          contentData = result.data;
          contentError = result.error;
        } else {
          // Try to find by UUID
          const result = await supabase
            .from('content')
            .select('*')
            .eq('id', contentId)
            .maybeSingle();
          contentData = result.data;
          contentError = result.error;
        }

        if (contentError) {
          console.error('Error fetching content:', contentError);
          setError('Failed to load content');
          setLoading(false);
          return;
        }

        if (!contentData) {
          setError('Content not found');
          setLoading(false);
          return;
        }

        setContent(contentData);

        // Fetch seasons and episodes if it's a series
        if (type === 'series' && contentData.id) {
          // Fetch seasons first
          const { data: seasonsData, error: seasonsError } = await supabase
            .from('seasons')
            .select('*')
            .eq('show_id', contentData.id)
            .order('season_number', { ascending: true });

          if (seasonsError) {
            console.error('Error fetching seasons:', seasonsError);
          } else {
            setSeasons(seasonsData || []);
          }

          // Fetch all episodes
          const { data: episodesData, error: episodesError } = await supabase
            .from('episodes')
            .select('*')
            .eq('show_id', contentData.id)
            .order('episode_number', { ascending: true });

          if (episodesError) {
            console.error('Error fetching episodes:', episodesError);
          } else {
            setEpisodes(episodesData || []);
            
            // For series, fetch video sources for all episodes
            if (episodesData && episodesData.length > 0) {
              const episodeIds = episodesData.map(ep => ep.id);
              const { data: sourcesData, error: sourcesError } = await supabase
                .from('video_sources')
                .select('*')
                .in('episode_id', episodeIds)
                .order('is_default', { ascending: false });

              if (sourcesError) {
                console.error('Error fetching video sources:', sourcesError);
              } else {
                setVideoSources(sourcesData || []);
              }
            }
          }
        } else if (type === 'movie' && contentData.id) {
          // For movies, fetch video sources by media_id
          const { data: sourcesData, error: sourcesError } = await supabase
            .from('video_sources')
            .select('*')
            .eq('media_id', contentData.id)
            .order('is_default', { ascending: false });

          if (sourcesError) {
            console.error('Error fetching video sources:', sourcesError);
          } else {
            setVideoSources(sourcesData || []);
          }
        }

      } catch (err) {
        console.error('Error fetching data:', err);
        setError('An error occurred while loading data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [contentId, type]);

  return { content, seasons, episodes, videoSources, loading, error };
};
