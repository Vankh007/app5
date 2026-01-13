import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY');
const CONSUMET_API = (Deno.env.get('CONSUMET_API_BASE_URL') ?? 'https://animeapi-xi-kohl.vercel.app').replace(/\/+$/, '');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ConsumetAttempt = {
  url: string;
  status: number;
  contentType: string;
  bodySnippet: string;
};

async function fetchConsumetJson(urls: string[]) {
  const attempts: ConsumetAttempt[] = [];

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: 'application/json',
          'user-agent': 'Lovable/1.0',
        },
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (response.ok && contentType.includes('application/json')) {
        const json = await response.json();
        return { ok: true as const, json, url };
      }

      const bodySnippet = (await response.text()).slice(0, 200);
      attempts.push({ url, status: response.status, contentType, bodySnippet });
    } catch (e) {
      attempts.push({
        url,
        status: 0,
        contentType: 'fetch_error',
        bodySnippet: String(e).slice(0, 200),
      });
    }
  }

  return { ok: false as const, attempts };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, query, tmdb_id, episode_id, provider } = await req.json();

    if (action === 'search') {
      // Trim the query to remove leading/trailing spaces
      const trimmedQuery = query?.trim() || '';
      
      // Search TMDB for anime/donghua (TV shows - no language restriction to include Chinese donghua)
      const searchUrl = `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(trimmedQuery)}`;
      console.log(`TMDB search URL: ${searchUrl.replace(TMDB_API_KEY || '', '[HIDDEN]')}`);
      
      const response = await fetch(searchUrl);
      const data = await response.json();
      
      // Log if there's an error from TMDB
      if (data.status_code || data.status_message) {
        console.error(`TMDB API error: ${data.status_message} (code: ${data.status_code})`);
      }
      
      // Filter results to only include animation genre (genre id 16)
      const animationResults = data.results?.filter((item: any) => 
        item.genre_ids?.includes(16)
      ) || [];
      
      console.log(`TMDB search for "${trimmedQuery}" returned ${animationResults.length} animation results (${data.results?.length || 0} total)`);
      
      return new Response(JSON.stringify({
        results: animationResults.map((item: any) => ({
          id: item.id,
          title: item.name,
          original_title: item.original_name,
          overview: item.overview,
          poster_path: item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : null,
          backdrop_path: item.backdrop_path ? `https://image.tmdb.org/t/p/original${item.backdrop_path}` : null,
          release_date: item.first_air_date,
          popularity: item.popularity,
          vote_average: item.vote_average,
        })) || []
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'details') {
      // Get full anime details from TMDB
      const detailsUrl = `https://api.themoviedb.org/3/tv/${tmdb_id}?api_key=${TMDB_API_KEY}&append_to_response=credits,keywords,external_ids`;
      const response = await fetch(detailsUrl);
      const data = await response.json();
      
      console.log(`TMDB details for ${tmdb_id}: ${data.name}`);
      
      // Get seasons info
      const seasons = data.seasons?.filter((s: any) => s.season_number > 0) || [];
      
      return new Response(JSON.stringify({
        id: data.id,
        title: data.name,
        original_title: data.original_name,
        overview: data.overview,
        tagline: data.tagline,
        poster_path: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
        backdrop_path: data.backdrop_path ? `https://image.tmdb.org/t/p/original${data.backdrop_path}` : null,
        release_date: data.first_air_date,
        status: data.status,
        popularity: data.popularity,
        vote_average: data.vote_average,
        genres: data.genres?.map((g: any) => g.name) || [],
        seasons: seasons.map((s: any) => ({
          id: s.id,
          season_number: s.season_number,
          name: s.name,
          episode_count: s.episode_count,
          poster_path: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null,
        })),
        cast: data.credits?.cast?.slice(0, 10).map((c: any) => ({
          id: c.id,
          name: c.name,
          character: c.character,
          profile_path: c.profile_path ? `https://image.tmdb.org/t/p/w185${c.profile_path}` : null,
        })) || [],
        external_ids: data.external_ids,
        number_of_seasons: data.number_of_seasons,
        number_of_episodes: data.number_of_episodes,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'season') {
      // Get season episodes from TMDB
      const seasonUrl = `https://api.themoviedb.org/3/tv/${tmdb_id}/season/${episode_id}?api_key=${TMDB_API_KEY}`;
      const response = await fetch(seasonUrl);
      const data = await response.json();
      
      console.log(`TMDB season ${episode_id} for ${tmdb_id}: ${data.episodes?.length || 0} episodes`);
      
      return new Response(JSON.stringify({
        season_number: data.season_number,
        name: data.name,
        overview: data.overview,
        poster_path: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : null,
        episodes: data.episodes?.map((ep: any) => ({
          id: ep.id,
          episode_number: ep.episode_number,
          name: ep.name,
          overview: ep.overview,
          air_date: ep.air_date,
          still_path: ep.still_path ? `https://image.tmdb.org/t/p/w500${ep.still_path}` : null,
          vote_average: ep.vote_average,
          runtime: ep.runtime,
        })) || [],
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'consumet_search') {
      // Search Consumet for anime to get streaming IDs
      const encodedQuery = encodeURIComponent(query);

      // Try multiple providers as fallback
      const urls = [
        `${CONSUMET_API}/meta/anilist/${encodedQuery}`,
        `${CONSUMET_API}/anime/gogoanime/${encodedQuery}`,
        `${CONSUMET_API}/anime/zoro/${encodedQuery}`,
        `${CONSUMET_API}/anime/9anime/${encodedQuery}`,
        `${CONSUMET_API}/anime/animefox/${encodedQuery}`,
        `${CONSUMET_API}/anime/animepahe/${encodedQuery}`,
        `${CONSUMET_API}/anime/bilibili/${encodedQuery}`,
        `${CONSUMET_API}/anime/marin/${encodedQuery}`,
        `${CONSUMET_API}/anime/enime/${encodedQuery}`,
      ];

      console.log(`Consumet search candidates: ${urls.join(' | ')}`);

      const result = await fetchConsumetJson(urls);
      if (!result.ok) {
        console.error(`Consumet search failed`, result.attempts);
        return new Response(
          JSON.stringify({
            provider: 'unknown',
            results: [],
            error: 'Consumet API request failed',
            debug: { attempts: result.attempts },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const data = result.json;
      // Extract provider name from successful URL
      const providerMatch = result.url.match(/\/(anime|meta)\/([^/]+)\//);
      const detectedProvider = providerMatch ? providerMatch[2] : 'unknown';
      console.log(`Consumet search succeeded via ${result.url} (provider: ${detectedProvider}), found ${data.results?.length || 0} results`);

      return new Response(
        JSON.stringify({
          provider: detectedProvider,
          results: data.results || [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (action === 'consumet_info') {
      // Get anime info from Consumet including episodes
      // Try multiple providers as fallback
      const urls = [
        `${CONSUMET_API}/meta/anilist/info/${episode_id}`,
        `${CONSUMET_API}/anime/gogoanime/info/${episode_id}`,
        `${CONSUMET_API}/anime/zoro/info/${episode_id}`,
        `${CONSUMET_API}/anime/9anime/info/${episode_id}`,
        `${CONSUMET_API}/anime/animefox/info/${episode_id}`,
        `${CONSUMET_API}/anime/animepahe/info/${episode_id}`,
        `${CONSUMET_API}/anime/bilibili/info/${episode_id}`,
        `${CONSUMET_API}/anime/marin/info/${episode_id}`,
        `${CONSUMET_API}/anime/enime/info/${episode_id}`,
      ];

      console.log(`Consumet info candidates: ${urls.join(' | ')}`);

      const result = await fetchConsumetJson(urls);
      if (!result.ok) {
        console.error(`Consumet info failed`, result.attempts);
        return new Response(
          JSON.stringify({
            error: 'Consumet API request failed',
            debug: { attempts: result.attempts },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      console.log(`Consumet info succeeded via ${result.url}`);

      return new Response(JSON.stringify(result.json), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'consumet_sources') {
      // Get streaming sources for an episode
      // Try multiple providers as fallback
      const urls = [
        `${CONSUMET_API}/meta/anilist/watch/${episode_id}`,
        `${CONSUMET_API}/anime/gogoanime/watch/${episode_id}`,
        `${CONSUMET_API}/anime/zoro/watch/${episode_id}`,
        `${CONSUMET_API}/anime/9anime/watch/${episode_id}`,
        `${CONSUMET_API}/anime/animefox/watch/${episode_id}`,
        `${CONSUMET_API}/anime/animepahe/watch/${episode_id}`,
        `${CONSUMET_API}/anime/bilibili/watch/${episode_id}`,
        `${CONSUMET_API}/anime/marin/watch/${episode_id}`,
        `${CONSUMET_API}/anime/enime/watch/${episode_id}`,
      ];

      console.log(`Consumet sources candidates: ${urls.join(' | ')}`);

      const result = await fetchConsumetJson(urls);
      if (!result.ok) {
        console.error(`Consumet sources failed`, result.attempts);
        return new Response(
          JSON.stringify({
            sources: [],
            error: 'Consumet API request failed',
            debug: { attempts: result.attempts },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      const data = result.json;
      console.log(`Consumet sources succeeded via ${result.url}, found ${data.sources?.length || 0} sources`);

      return new Response(
        JSON.stringify({
          sources: data.sources || [],
          headers: data.headers || {},
          download: data.download,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in anime-api function:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
