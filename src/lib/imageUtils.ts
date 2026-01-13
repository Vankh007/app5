/**
 * Centralized image URL utilities for KHMERZOON
 * All TMDB images are served through our CDN (khmerzoon.biz) for AdSense compliance
 */

// CDN base URL for cached images
export const CDN_BASE_URL = 'https://cdn.khmerzoon.biz';

// Original TMDB base URLs (for reference/fallback)
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

// Image size presets
export type ImageSize = 'w185' | 'w200' | 'w300' | 'w500' | 'w780' | 'original';

/**
 * Extract the filename from a TMDB path or full URL
 * e.g., "/z5NgNqn2jxCqETWuXwEePFIhlbK.jpg" -> "z5NgNqn2jxCqETWuXwEePFIhlbK.jpg"
 */
export const extractFilename = (path: string): string => {
  if (!path) return '';
  
  // If it's already our CDN URL, extract filename
  if (path.startsWith(CDN_BASE_URL)) {
    return path.replace(CDN_BASE_URL + '/', '');
  }
  
  // If it's a TMDB URL, extract the filename
  const tmdbMatch = path.match(/image\.tmdb\.org\/t\/p\/[^/]+\/(.+)$/);
  if (tmdbMatch) return tmdbMatch[1];
  
  // If it's a relative path starting with /
  if (path.startsWith('/')) return path.substring(1);
  
  return path;
};

/**
 * Get the CDN URL for an image
 * Converts TMDB paths to our CDN URLs
 */
export const getCdnImageUrl = (
  path?: string | null, 
  size: ImageSize = 'w500'
): string => {
  if (!path) return '';
  
  // If it's already a full URL (not TMDB), return as-is
  if (path.startsWith('http') && !path.includes('image.tmdb.org')) {
    return path;
  }
  
  // If it's already our CDN URL, return as-is
  if (path.startsWith(CDN_BASE_URL)) {
    return path;
  }
  
  // Extract filename and construct CDN URL
  const filename = extractFilename(path);
  if (!filename) return '';
  
  // For now, we'll use TMDB as fallback until images are cached
  // The proxy edge function will handle caching on first request
  return `${CDN_BASE_URL}/${size}/${filename}`;
};

/**
 * Get TMDB URL directly (for fetching/caching purposes)
 */
export const getTmdbImageUrl = (
  path?: string | null,
  size: ImageSize = 'w500'
): string => {
  if (!path) return '';
  
  // If it's already a full URL, return as-is
  if (path.startsWith('http')) return path;
  
  // If it starts with /, it's a TMDB path
  if (path.startsWith('/')) {
    return `${TMDB_IMAGE_BASE}/${size}${path}`;
  }
  
  return `${TMDB_IMAGE_BASE}/${size}/${path}`;
};

/**
 * Get the best available image URL for content
 * Prioritizes: thumbnail_url > poster_path > backdrop_path
 */
export const getContentImageUrl = (
  content: {
    thumbnail_url?: string | null;
    poster_path?: string | null;
    backdrop_path?: string | null;
  },
  size: ImageSize = 'w500'
): string | null => {
  if (content.thumbnail_url) return content.thumbnail_url;
  if (content.poster_path) return getCdnImageUrl(content.poster_path, size);
  if (content.backdrop_path) return getCdnImageUrl(content.backdrop_path, size);
  return null;
};

/**
 * Get poster URL specifically
 */
export const getPosterUrl = (
  posterPath?: string | null,
  size: ImageSize = 'w500'
): string => {
  return getCdnImageUrl(posterPath, size);
};

/**
 * Get backdrop/banner URL specifically
 */
export const getBackdropUrl = (
  backdropPath?: string | null,
  size: ImageSize = 'original'
): string => {
  return getCdnImageUrl(backdropPath, size);
};

/**
 * Get cast/profile image URL
 */
export const getProfileUrl = (
  profilePath?: string | null,
  size: ImageSize = 'w200'
): string => {
  return getCdnImageUrl(profilePath, size);
};
