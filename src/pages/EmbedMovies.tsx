import { useParams, useSearchParams } from 'react-router-dom';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import VideoPlayer from '@/components/VideoPlayer';
import ContentAccessCheck from '@/components/ContentAccessCheck';
import { useContentData } from '@/hooks/useContentData';
import { useScreenOrientation } from '@/hooks/useScreenOrientation';
import { useMemo } from 'react';

const EmbedMovies = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  
  // Allow landscape orientation on embed player
  useScreenOrientation(true);
  
  const { content, videoSources, loading, error } = useContentData(id, 'movie');
  
  // Check for VK video URL passed as query param for dynamic embedding
  const vkVideoUrl = searchParams.get('vk_url');
  
  // If VK URL is provided, create a virtual video source
  const effectiveVideoSources = useMemo(() => {
    if (vkVideoUrl) {
      return [{
        id: 'vk-dynamic',
        content_id: id || '',
        url: decodeURIComponent(vkVideoUrl),
        source_type: 'iframe' as const,
        server_name: 'VK Video',
        is_default: true,
        quality: null,
        quality_urls: null,
        permission: 'web_and_mobile' as const,
        episode_id: null,
        headers: null,
        user_agent: null,
        display_order: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }];
    }
    return videoSources;
  }, [vkVideoUrl, videoSources, id]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-2xl font-bold mb-2">Content Not Found</h2>
          <p className="text-white/70">{error || 'The requested content could not be loaded.'}</p>
        </div>
      </div>
    );
  }

  // Determine access version and pricing
  const accessVersion = (content as any)?.access_type || 'membership';
  const contentPrice = Number((content as any)?.price ?? 0);

  return (
    <div className="w-full h-screen bg-black overflow-hidden">
      <AspectRatio ratio={16 / 9} className="bg-black h-full">
        <ContentAccessCheck
          contentId={content.id}
          contentType="movie"
          contentTitle={content.title}
          price={contentPrice}
          rentalPeriod={(content as any)?.purchase_period || 7}
          contentBackdrop={content?.backdrop_path}
          excludeFromPlan={(content as any)?.exclude_from_plan || false}
          version={accessVersion}
        >
          <VideoPlayer 
            videoSources={effectiveVideoSources}
            contentBackdrop={content?.backdrop_path}
            contentId={content?.id}
          />
        </ContentAccessCheck>
      </AspectRatio>
    </div>
  );
};

export default EmbedMovies;
