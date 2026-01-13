import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { S3Client, PutObjectCommand, HeadObjectCommand } from 'npm:@aws-sdk/client-s3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TMDB_BASE_URL = 'https://image.tmdb.org/t/p';
const CDN_BUCKET = 'images';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Expected path: /proxy-tmdb-image/{size}/{filename}
    // e.g., /proxy-tmdb-image/w500/z5NgNqn2jxCqETWuXwEePFIhlbK.jpg
    const size = pathParts[1] || 'w500';
    const filename = pathParts[2];
    
    if (!filename) {
      return new Response(
        JSON.stringify({ error: 'Filename required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const objectKey = `${size}/${filename}`;

    // Check if image already exists in E2
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: CDN_BUCKET,
        Key: objectKey,
      }));
      
      // Image exists, redirect to CDN
      const cdnUrl = `https://${cdnDomain}/${objectKey}`;
      return Response.redirect(cdnUrl, 302);
    } catch (headError) {
      // Image doesn't exist, need to fetch from TMDB and cache
      console.log(`Image not cached, fetching from TMDB: ${objectKey}`);
    }

    // Fetch image from TMDB
    const tmdbUrl = `${TMDB_BASE_URL}/${size}/${filename}`;
    console.log(`Fetching from TMDB: ${tmdbUrl}`);
    
    const tmdbResponse = await fetch(tmdbUrl);
    
    if (!tmdbResponse.ok) {
      return new Response(
        JSON.stringify({ error: 'Image not found on TMDB' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const imageBuffer = await tmdbResponse.arrayBuffer();
    const contentType = tmdbResponse.headers.get('content-type') || 'image/jpeg';

    // Upload to iDrive E2
    await s3Client.send(new PutObjectCommand({
      Bucket: CDN_BUCKET,
      Key: objectKey,
      Body: new Uint8Array(imageBuffer),
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 year cache
    }));

    console.log(`Cached image to E2: ${objectKey}`);

    // Return the image directly for first request
    return new Response(imageBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
