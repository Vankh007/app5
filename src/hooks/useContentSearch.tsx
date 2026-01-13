import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface ContentSearchResult {
  id: string;
  title: string;
  content_type: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string | null;
}

export function useContentSearch(searchTerm: string) {
  const { data: results, isLoading } = useQuery({
    queryKey: ['content-search', searchTerm],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2) return [];
      
      const { data, error } = await supabase
        .from('content')
        .select('id, title, content_type, poster_path, backdrop_path, overview')
        .ilike('title', `%${searchTerm}%`)
        .limit(10);
      
      if (error) throw error;
      return data as ContentSearchResult[];
    },
    enabled: searchTerm.length >= 2,
  });

  return {
    results: results || [],
    isLoading,
  };
}
