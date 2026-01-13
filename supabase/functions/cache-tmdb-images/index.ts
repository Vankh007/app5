import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { S3Client, PutObjectCommand, HeadObjectCommand } from 'npm:@aws-sdk/client-s3';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TMDB_BASE_URL = 'https://image.tmdb.org/t/p';
const CDN_BUCKET = 'images';

interface CacheRequest {
  contentIds?: string[];
  cacheAll?: boolean;
  sizes?: string[];
}

interface CacheResult {
  success: boolean;
  cached: number;
  skipped: number;
  failed: number;
  details: { path: string; status: 'cached' | 'skipped' | 'failed'; error?: string }[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { contentIds, cacheAll = false, sizes = ['w500', 'original'] }: CacheRequest = await req.json();

    // Get iDrive E2 credentials
    const endpoint = Deno.env.get('IDRIVE_E2_STORAGE1_ENDPOINT');
    const accessKeyId = Deno.env.get('IDRIVE_E2_STORAGE1_ACCESS_KEY');
    const secretAccessKey = Deno.env.get('IDRIVE_E2_STORAGE1_SECRET_KEY');
    const cdnDomain = Deno.env.get('CDN_DOMAIN') || 'cdn.khmerzoon.biz';

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error('Storage credentials not configured');
    }

    const s3Client = new S3Client({
      endpoint: `https://${endpoint}`,
      region: 'us-east-1',
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });

    // Fetch content from database
    let query = supabase
      .from('content')
      .select('id, poster_path, backdrop_path')
      .not('poster_path', 'is', null);

    if (!cacheAll && contentIds && contentIds.length > 0) {
      query = query.in('id', contentIds);
    }

    const { data: contents, error: dbError } = await query.limit(100);

    if (dbError) throw dbError;

    const result: CacheResult = {
      success: true,
      cached: 0,
      skipped: 0,
      failed: 0,
      details: [],
    };

    // Process each content item
    for (const content of contents || []) {
      const imagePaths = [content.poster_path, content.backdrop_path].filter(Boolean);

      for (const path of imagePaths) {
        if (!path || path.startsWith('http') && !path.includes('image.tmdb.org')) {
          result.skipped++;
          continue;
        }

        // Extract filename from path
        const filename = path.startsWith('/') ? path.substring(1) : path;

        for (const size of sizes) {
          const objectKey = `${size}/${filename}`;

          try {
            // Check if already cached
            try {
              await s3Client.send(new HeadObjectCommand({
                Bucket: CDN_BUCKET,
                Key: objectKey,
              }));
              result.skipped++;
              result.details.push({ path: objectKey, status: 'skipped' });
              continue;
            } catch {
              // Not cached, proceed to fetch
            }

            // Fetch from TMDB
            const tmdbUrl = `${TMDB_BASE_URL}/${size}/${filename}`;
            const tmdbResponse = await fetch(tmdbUrl);

            if (!tmdbResponse.ok) {
              result.failed++;
              result.details.push({ 
                path: objectKey, 
                status: 'failed', 
                error: `TMDB returned ${tmdbResponse.status}` 
              });
              continue;
            }

            const imageBuffer = await tmdbResponse.arrayBuffer();
            const contentType = tmdbResponse.headers.get('content-type') || 'image/jpeg';

            // Upload to iDrive E2
            await s3Client.send(new PutObjectCommand({
              Bucket: CDN_BUCKET,
              Key: objectKey,
              Body: new Uint8Array(imageBuffer),
              ContentType: contentType,
              CacheControl: 'public, max-age=31536000',
            }));

            // Update content record with CDN URL
            const cdnUrl = `https://${cdnDomain}/${objectKey}`;
            
            if (path === content.poster_path && size === 'w500') {
              await supabase
                .from('content')
                .update({ poster_path: cdnUrl })
                .eq('id', content.id);
            }
            if (path === content.backdrop_path && size === 'original') {
              await supabase
                .from('content')
                .update({ backdrop_path: cdnUrl })
                .eq('id', content.id);
            }

            result.cached++;
            result.details.push({ path: objectKey, status: 'cached' });

            // Rate limit to avoid overwhelming TMDB
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            result.failed++;
            result.details.push({ 
              path: objectKey, 
              status: 'failed', 
              error: error instanceof Error ? error.message : 'Unknown error' 
            });
          }
        }
      }
    }

    console.log(`Cache complete: ${result.cached} cached, ${result.skipped} skipped, ${result.failed} failed`);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cache error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
