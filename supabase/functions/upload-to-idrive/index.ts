import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { S3Client, PutObjectCommand } from 'npm:@aws-sdk/client-s3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UploadRequest {
  fileName: string;
  fileData: string; // base64 encoded
  bucket: string;
  contentType?: string;
  storage?: 'storage1' | 'storage2';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { fileName, fileData, bucket, contentType, storage = 'storage1' }: UploadRequest = await req.json();

    // Get credentials from environment
    const endpoint = storage === 'storage1' 
      ? Deno.env.get('IDRIVE_E2_STORAGE1_ENDPOINT')
      : Deno.env.get('IDRIVE_E2_STORAGE2_ENDPOINT');
    
    const accessKeyId = storage === 'storage1'
      ? Deno.env.get('IDRIVE_E2_STORAGE1_ACCESS_KEY')
      : Deno.env.get('IDRIVE_E2_STORAGE2_ACCESS_KEY');
    
    const secretAccessKey = storage === 'storage1'
      ? Deno.env.get('IDRIVE_E2_STORAGE1_SECRET_KEY')
      : Deno.env.get('IDRIVE_E2_STORAGE2_SECRET_KEY');

    const region = storage === 'storage2'
      ? Deno.env.get('IDRIVE_E2_STORAGE2_REGION') || 'ap-southeast-1'
      : 'us-east-1';

    if (!endpoint || !accessKeyId || !secretAccessKey) {
      throw new Error('Storage credentials not configured');
    }

    // Create S3 client
    const s3Client = new S3Client({
      endpoint: `https://${endpoint}`,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    });

    // Decode base64 file data
    const binaryData = Uint8Array.from(atob(fileData), c => c.charCodeAt(0));

    // Upload to iDrive E2
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: fileName,
      Body: binaryData,
      ContentType: contentType || 'application/octet-stream',
    });

    await s3Client.send(command);

    const publicUrl = `https://${endpoint}/${bucket}/${fileName}`;

    return new Response(
      JSON.stringify({ 
        success: true, 
        url: publicUrl,
        key: fileName,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Upload error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
