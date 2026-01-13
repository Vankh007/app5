import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { S3Client, PutObjectCommand, HeadObjectCommand } from 'npm:@aws-sdk/client-s3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  imageUrl: string;
  fileName: string;
  bucket: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { imageUrl, fileName, bucket }: UploadRequest = await req.json();

    if (!imageUrl || !fileName || !bucket) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get storage2 credentials from environment
    const endpoint = Deno.env.get('IDRIVE_E2_STORAGE2_ENDPOINT');
    const accessKeyId = Deno.env.get('IDRIVE_E2_STORAGE2_ACCESS_KEY');
    const secretAccessKey = Deno.env.get('IDRIVE_E2_STORAGE2_SECRET_KEY');
    const region = Deno.env.get('IDRIVE_E2_STORAGE2_REGION') || 'ap-southeast-1';

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error('Storage2 credentials not configured');
    }

    // Create S3 client for storage2
    const s3Client = new S3Client({
      endpoint: `https://${endpoint}`,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });

    // Check if image already exists
    try {
      await s3Client.send(new HeadObjectCommand({
        Bucket: bucket,
        Key: fileName,
      }));
      
      // Image already exists, return existing URL
      const existingUrl = `https://${endpoint}/${bucket}/${fileName}`;
      console.log(`Image already exists: ${existingUrl}`);
      return new Response(
        JSON.stringify({ success: true, url: existingUrl, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (headError) {
      // Image doesn't exist, need to download and upload
      console.log(`Downloading image from: ${imageUrl}`);
    }

    // Download image from TMDB
    const imageResponse = await fetch(imageUrl);
    
    if (!imageResponse.ok) {
      throw new Error(`Failed to download image: ${imageResponse.status}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Upload to iDrive E2 storage2
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: new Uint8Array(imageBuffer),
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000', // 1 year cache
    }));

    const publicUrl = `https://${endpoint}/${bucket}/${fileName}`;
    console.log(`Uploaded image to: ${publicUrl}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrl,
        cached: false,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
