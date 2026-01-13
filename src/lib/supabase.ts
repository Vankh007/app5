// Re-export supabase client from the main integration file to avoid multiple GoTrueClient instances
import { supabase as mainClient } from '@/integrations/supabase/client';

// Export the client with looser typing for backward compatibility
export const supabase = mainClient as any;

// Type definitions for database tables (kept for backward compatibility)
export interface Content {
  id: string;
  title: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  type?: 'movie' | 'series';
  created_at?: string;
}

export interface Episode {
  id: string;
  show_id: string;
  title: string;
  episode_number: number;
  season_number?: number;
  overview?: string;
  still_path?: string;
  air_date?: string;
  duration?: string;
  description?: string;
  thumbnail?: string;
  created_at?: string;
  access_type?: 'free' | 'membership' | 'purchase';
}

export interface VideoSource {
  id: string;
  episode_id?: string;
  content_id?: string;
  url: string;
  source_type: string;
  quality?: string;
  quality_urls?: Record<string, string>;
  is_default?: boolean;
  name?: string;
  server_name?: string;
  version?: string;
  language?: string;
  permission?: 'web_and_mobile' | 'web_only' | 'mobile_only';
  created_at?: string;
}
