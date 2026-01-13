import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VKVideoInfo {
  ownerId: string;
  videoId: string;
  accessKey?: string;
  embedUrl?: string;
  playerUrl?: string;
  title?: string;
  duration?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { videoUrl } = await req.json();
    
    if (!videoUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing videoUrl parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing VK video URL:', videoUrl);

    // Parse VK video URL to extract owner_id and video_id
    // Supports formats:
    // - https://vk.com/video-123456789_456239017
    // - https://vkvideo.ru/video-123456789_456239017
    // - https://vk.com/video?z=video-123456789_456239017
    // - https://vk.com/video_ext.php?oid=-123456789&id=456239017
    
    let ownerId: string | null = null;
    let videoId: string | null = null;
    let existingAccessKey: string | null = null;

    // Check for video_ext.php format first
    const extMatch = videoUrl.match(/video_ext\.php\?.*oid=(-?\d+).*id=(\d+)/i);
    if (extMatch) {
      ownerId = extMatch[1];
      videoId = extMatch[2];
      // Extract existing hash if present
      const hashMatch = videoUrl.match(/[?&]hash=([a-f0-9]+)/i);
      if (hashMatch) {
        existingAccessKey = hashMatch[1];
      }
    }

    // Standard video URL format: vk.com/video-123_456 or vkvideo.ru/video-123_456
    if (!ownerId || !videoId) {
      const standardMatch = videoUrl.match(/(?:vk\.com|vk\.ru|vkvideo\.ru)\/video(-?\d+)_(\d+)/i);
      if (standardMatch) {
        ownerId = standardMatch[1];
        videoId = standardMatch[2];
      }
    }

    // Check for z=video format
    if (!ownerId || !videoId) {
      const zMatch = videoUrl.match(/video\?z=video(-?\d+)_(\d+)/i);
      if (zMatch) {
        ownerId = zMatch[1];
        videoId = zMatch[2];
      }
    }

    // Extract access_key from URL if present (format: video-123_456_accesskey)
    const accessKeyMatch = videoUrl.match(/video-?\d+_\d+_([a-f0-9]+)/i);
    if (accessKeyMatch) {
      existingAccessKey = accessKeyMatch[1];
    }

    // Also check for hash parameter in URL
    if (!existingAccessKey) {
      const hashParamMatch = videoUrl.match(/[?&]hash=([a-f0-9]+)/i);
      if (hashParamMatch) {
        existingAccessKey = hashParamMatch[1];
      }
    }

    if (!ownerId || !videoId) {
      console.error('Could not parse VK video URL:', videoUrl);
      return new Response(
        JSON.stringify({ error: 'Invalid VK video URL format', originalUrl: videoUrl }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Parsed video:', { ownerId, videoId, existingAccessKey });

    const VK_SERVICE_ACCESS_KEY = Deno.env.get('VK_SERVICE_ACCESS_KEY');
    
    if (!VK_SERVICE_ACCESS_KEY) {
      console.error('VK_SERVICE_ACCESS_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'VK API not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call VK API to get video info
    // The video.get method requires the video ID in format: owner_id_video_id or owner_id_video_id_access_key
    let videoIdentifier = `${ownerId}_${videoId}`;
    if (existingAccessKey) {
      videoIdentifier += `_${existingAccessKey}`;
    }

    const vkApiUrl = `https://api.vk.com/method/video.get?videos=${videoIdentifier}&access_token=${VK_SERVICE_ACCESS_KEY}&v=5.199`;
    
    console.log('Calling VK API for video:', videoIdentifier);

    const vkResponse = await fetch(vkApiUrl);
    const vkData = await vkResponse.json();

    console.log('VK API response:', JSON.stringify(vkData));

    if (vkData.error) {
      console.error('VK API error:', vkData.error);
      
      // If we have an existing access key, try to construct embed URL anyway
      if (existingAccessKey) {
        const embedUrl = `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hash=${existingAccessKey}&hd=2&autoplay=0`;
        console.log('Using fallback embed URL with existing hash:', embedUrl);
        
        return new Response(
          JSON.stringify({
            success: true,
            embedUrl,
            ownerId,
            videoId,
            accessKey: existingAccessKey,
            source: 'fallback'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: vkData.error.error_msg || 'VK API error',
          errorCode: vkData.error.error_code,
          hint: 'For "Anyone with the link" videos, make sure to include the access_key or hash in the URL'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videos = vkData.response?.items || [];
    
    if (videos.length === 0) {
      console.error('No videos found in VK response');
      
      // Fallback with existing access key
      if (existingAccessKey) {
        const embedUrl = `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hash=${existingAccessKey}&hd=2&autoplay=0`;
        return new Response(
          JSON.stringify({
            success: true,
            embedUrl,
            ownerId,
            videoId,
            accessKey: existingAccessKey,
            source: 'fallback'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Video not found or not accessible' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const video = videos[0];
    
    // Extract access_key from video response
    const accessKey = video.access_key || existingAccessKey;
    
    // Construct proper embed URL
    let embedUrl: string;
    
    if (video.player) {
      // Use the player URL from API if available
      embedUrl = video.player;
      // Ensure HTTPS
      embedUrl = embedUrl.replace(/^http:/, 'https:');
      // Add quality and autoplay params if not present
      if (!embedUrl.includes('hd=')) {
        embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'hd=2';
      }
      if (!embedUrl.includes('autoplay=')) {
        embedUrl += '&autoplay=0';
      }
    } else if (accessKey) {
      // Construct embed URL with access_key as hash
      embedUrl = `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hash=${accessKey}&hd=2&autoplay=0`;
    } else {
      // Public video without access_key
      embedUrl = `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hd=2&autoplay=0`;
    }

    console.log('Generated embed URL:', embedUrl);

    return new Response(
      JSON.stringify({
        success: true,
        embedUrl,
        ownerId,
        videoId,
        accessKey: accessKey || null,
        title: video.title || null,
        duration: video.duration || null,
        playerUrl: video.player || null,
        source: 'vk_api'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing VK video:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
