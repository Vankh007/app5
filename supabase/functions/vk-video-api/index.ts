import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    let ownerId: string | null = null;
    let videoId: string | null = null;
    let existingAccessKey: string | null = null;

    // Check for video_ext.php format first
    const extMatch = videoUrl.match(/video_ext\.php\?.*oid=(-?\d+).*id=(\d+)/i);
    if (extMatch) {
      ownerId = extMatch[1];
      videoId = extMatch[2];
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

    // Try VK's oembed API first - it works for public videos without authentication
    const videoFullId = `${ownerId}_${videoId}`;
    const oembedUrl = `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hd=2&autoplay=0`;
    
    // Try fetching the video page to extract the hash/access_key
    try {
      const vkVideoPageUrl = `https://vk.com/video${videoFullId}`;
      console.log('Fetching VK video page:', vkVideoPageUrl);
      
      const pageResponse = await fetch(vkVideoPageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      });
      
      if (pageResponse.ok) {
        const pageHtml = await pageResponse.text();
        
        // Try to extract the embed hash from the page
        // Look for patterns like: "hash":"abc123" or hash=abc123
        const hashPatterns = [
          /\\"hash\\":\\"([a-f0-9]+)\\"/i,
          /"hash":"([a-f0-9]+)"/i,
          /hash=([a-f0-9]+)/i,
          /video_ext\.php[^"]*hash=([a-f0-9]+)/i,
          /embed\/video\d+_\d+_([a-f0-9]+)/i,
        ];
        
        for (const pattern of hashPatterns) {
          const match = pageHtml.match(pattern);
          if (match && match[1]) {
            existingAccessKey = match[1];
            console.log('Found hash from page:', existingAccessKey);
            break;
          }
        }
        
        // Also try to find the player embed URL directly
        const playerUrlMatch = pageHtml.match(/https:\/\/vk\.com\/video_ext\.php\?oid=-?\d+&id=\d+&hash=[a-f0-9]+/i);
        if (playerUrlMatch) {
          const extractedUrl = playerUrlMatch[0];
          console.log('Found embed URL directly:', extractedUrl);
          return new Response(
            JSON.stringify({
              success: true,
              embedUrl: extractedUrl + '&hd=2&autoplay=0',
              ownerId,
              videoId,
              accessKey: existingAccessKey,
              source: 'page_scrape'
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    } catch (pageError) {
      console.log('Could not fetch video page:', pageError);
    }

    // If we have an access key (from URL or scraped), construct embed URL
    if (existingAccessKey) {
      const embedUrl = `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hash=${existingAccessKey}&hd=2&autoplay=0`;
      console.log('Using embed URL with hash:', embedUrl);
      
      return new Response(
        JSON.stringify({
          success: true,
          embedUrl,
          ownerId,
          videoId,
          accessKey: existingAccessKey,
          source: 'url_hash'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try VK API as fallback
    const VK_SERVICE_ACCESS_KEY = Deno.env.get('VK_SERVICE_ACCESS_KEY');
    
    if (VK_SERVICE_ACCESS_KEY) {
      try {
        let videoIdentifier = videoFullId;
        const vkApiUrl = `https://api.vk.com/method/video.get?videos=${videoIdentifier}&access_token=${VK_SERVICE_ACCESS_KEY}&v=5.199`;
        
        console.log('Calling VK API for video:', videoIdentifier);

        const vkResponse = await fetch(vkApiUrl);
        const vkData = await vkResponse.json();

        console.log('VK API response:', JSON.stringify(vkData));

        if (!vkData.error && vkData.response?.items?.length > 0) {
          const video = vkData.response.items[0];
          const accessKey = video.access_key;
          
          let embedUrl: string;
          
          if (video.player) {
            embedUrl = video.player.replace(/^http:/, 'https:');
            if (!embedUrl.includes('hd=')) {
              embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'hd=2';
            }
            if (!embedUrl.includes('autoplay=')) {
              embedUrl += '&autoplay=0';
            }
          } else if (accessKey) {
            embedUrl = `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hash=${accessKey}&hd=2&autoplay=0`;
          } else {
            embedUrl = `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hd=2&autoplay=0`;
          }

          console.log('Generated embed URL from API:', embedUrl);

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
        }
      } catch (apiError) {
        console.log('VK API error:', apiError);
      }
    }

    // Final fallback: return embed URL without hash (may not work for private videos)
    const fallbackEmbedUrl = `https://vk.com/video_ext.php?oid=${ownerId}&id=${videoId}&hd=2&autoplay=0`;
    console.log('Using fallback embed URL (no hash):', fallbackEmbedUrl);
    
    return new Response(
      JSON.stringify({
        success: true,
        embedUrl: fallbackEmbedUrl,
        ownerId,
        videoId,
        accessKey: null,
        source: 'fallback',
        warning: 'No hash found - video may not play if it requires access key'
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
