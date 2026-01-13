import { supabase } from '@/integrations/supabase/client';

const IDRIVE_BUCKET = 'images';

interface UploadResult {
  posterUrl: string | null;
  backdropUrl: string | null;
}

/**
 * Downloads TMDB images and uploads them to iDrive E2 storage2
 * Returns the new iDrive URLs for poster and backdrop
 */
export async function uploadTmdbImagesToIdrive(
  tmdbId: number,
  posterPath: string | null,
  backdropPath: string | null,
  contentType: 'movie' | 'tv' = 'movie'
): Promise<UploadResult> {
  const results: UploadResult = {
    posterUrl: null,
    backdropUrl: null,
  };

  try {
    // Upload poster
    if (posterPath) {
      const posterFileName = `posters/${contentType}/${tmdbId}${posterPath}`;
      const posterTmdbUrl = `https://image.tmdb.org/t/p/original${posterPath}`;
      
      const posterResult = await uploadImageToIdrive(posterTmdbUrl, posterFileName);
      if (posterResult) {
        results.posterUrl = posterResult;
      }
    }

    // Upload backdrop
    if (backdropPath) {
      const backdropFileName = `backdrops/${contentType}/${tmdbId}${backdropPath}`;
      const backdropTmdbUrl = `https://image.tmdb.org/t/p/original${backdropPath}`;
      
      const backdropResult = await uploadImageToIdrive(backdropTmdbUrl, backdropFileName);
      if (backdropResult) {
        results.backdropUrl = backdropResult;
      }
    }
  } catch (error) {
    console.error('Error uploading TMDB images to iDrive:', error);
  }

  return results;
}

/**
 * Uploads a season poster to iDrive E2
 */
export async function uploadSeasonPosterToIdrive(
  tmdbId: number,
  seasonNumber: number,
  posterPath: string | null
): Promise<string | null> {
  if (!posterPath) return null;
  
  try {
    const fileName = `seasons/${tmdbId}/season_${seasonNumber}${posterPath}`;
    const tmdbUrl = `https://image.tmdb.org/t/p/original${posterPath}`;
    return await uploadImageToIdrive(tmdbUrl, fileName);
  } catch (error) {
    console.error('Error uploading season poster to iDrive:', error);
    return null;
  }
}

/**
 * Uploads an episode still to iDrive E2
 */
export async function uploadEpisodeStillToIdrive(
  tmdbId: number,
  seasonNumber: number,
  episodeNumber: number,
  stillPath: string | null
): Promise<string | null> {
  if (!stillPath) return null;
  
  try {
    const fileName = `episodes/${tmdbId}/s${seasonNumber}_e${episodeNumber}${stillPath}`;
    const tmdbUrl = `https://image.tmdb.org/t/p/original${stillPath}`;
    return await uploadImageToIdrive(tmdbUrl, fileName);
  } catch (error) {
    console.error('Error uploading episode still to iDrive:', error);
    return null;
  }
}

/**
 * Uploads a cast member profile image to iDrive E2
 */
export async function uploadCastProfileToIdrive(
  tmdbId: number,
  profilePath: string | null
): Promise<string | null> {
  if (!profilePath) return null;
  
  try {
    const fileName = `cast/${tmdbId}${profilePath}`;
    const tmdbUrl = `https://image.tmdb.org/t/p/original${profilePath}`;
    return await uploadImageToIdrive(tmdbUrl, fileName);
  } catch (error) {
    console.error('Error uploading cast profile to iDrive:', error);
    return null;
  }
}

/**
 * Core function to fetch an image from URL and upload to iDrive E2
 */
async function uploadImageToIdrive(
  imageUrl: string,
  fileName: string
): Promise<string | null> {
  try {
    // Call the edge function to handle the upload
    const { data, error } = await supabase.functions.invoke('upload-tmdb-image', {
      body: {
        imageUrl,
        fileName,
        bucket: IDRIVE_BUCKET,
      },
    });

    if (error) {
      console.error('Edge function error:', error);
      return null;
    }

    if (data?.success && data?.url) {
      return data.url;
    }

    return null;
  } catch (error) {
    console.error('Failed to upload image to iDrive:', error);
    return null;
  }
}
