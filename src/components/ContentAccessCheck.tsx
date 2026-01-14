import { useState, useEffect, ReactNode } from 'react';
import { Crown, Key } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useIsTablet } from '@/hooks/use-tablet';

interface ContentAccessCheckProps {
  contentId: string;
  episodeId?: string;
  contentType: 'movie' | 'series';
  contentTitle: string;
  price: number;
  rentalPeriod: number;
  contentBackdrop?: string;
  excludeFromPlan?: boolean;
  version?: string;
  onAccessGranted?: () => void;
  children: ReactNode;
}

const ContentAccessCheck = ({
  contentId,
  episodeId,
  contentType,
  contentTitle,
  price,
  rentalPeriod,
  contentBackdrop,
  excludeFromPlan = false,
  version,
  onAccessGranted,
  children
}: ContentAccessCheckProps) => {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();

  // Check user access
  useEffect(() => {
    checkAccess();
  }, [contentId, episodeId]);

  const checkAccess = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Explicit handling for guests (not logged in)
      if (!user) {
        // Check if content is free (explicitly marked as free or price is 0)
        const isFreeContent = version?.toLowerCase() === 'free' || 
                             (price === 0 && version?.toLowerCase() !== 'purchase' && version?.toLowerCase() !== 'membership');
        
        if (isFreeContent) {
          // For free content, grant access to everyone including guests
          setHasAccess(true);
          setLoading(false);
          onAccessGranted?.();
        } else {
          // For paid/restricted content, deny access and show overlay
          setHasAccess(false);
          setLoading(false);
        }
        return;
      }

      // Use the database function to check access
      const checkFunction = episodeId ? 'check_episode_access' : 'check_content_access';
      const checkId = episodeId || contentId;
      
      const params = episodeId 
        ? { episode_uuid: checkId }
        : { content_uuid: checkId };
      
      const { data, error } = await supabase.rpc(checkFunction, params as any);

      if (error) {
        console.error('Error checking access:', error);
        setHasAccess(false);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const accessData = data[0];
        setHasAccess(accessData.has_access);
        
        if (accessData.has_access) {
          onAccessGranted?.();
        }
      } else {
        setHasAccess(false);
      }
    } catch (error) {
      console.error('Error checking access:', error);
      setHasAccess(price === 0);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  // Lock screen overlay
  const backdropUrl = contentBackdrop?.startsWith('http') 
    ? contentBackdrop 
    : contentBackdrop 
      ? `https://image.tmdb.org/t/p/original${contentBackdrop}`
      : null;

  return (
    <div 
      className="w-full h-full relative flex flex-col items-center justify-center bg-black/90 overflow-hidden"
      style={{
        backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {/* Dark overlay - Responsive gradients */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/85 to-black/70" />

      {/* Content - Fully responsive layout with scale reduction and max-height */}
      <div className={`relative z-10 text-center w-full max-h-[85vh] overflow-y-auto ${
        isMobile 
          ? 'space-y-3 px-3 py-4 scale-[0.85]' 
          : isTablet 
            ? 'space-y-4 px-6 max-w-lg scale-[0.85]' 
            : 'space-y-5 px-5 max-w-md scale-[0.85]'
      }`}>
        {/* Title and Badge - Responsive typography */}
        <div className={isMobile ? 'space-y-1.5' : 'space-y-2'}>
          <div className="flex justify-center">
            <Badge 
              variant="outline" 
              className={`backdrop-blur-md font-semibold ${
                version?.toLowerCase() === 'purchase' || version?.toLowerCase() === 'rent'
                  ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-500'
                  : 'bg-red-500/20 border-red-500/50 text-red-500'
              } ${
                isMobile 
                  ? 'px-2.5 py-0.5 text-[10px]' 
                  : 'px-3 py-0.5 text-xs'
              }`}
            >
              {version?.toLowerCase() === 'purchase' || version?.toLowerCase() === 'rent' ? (
                <>
                  <Key className={`mr-1 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                  For Rent
                </>
              ) : (
                <>
                  <Crown className={`mr-1 ${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                  Premium Content
                </>
              )}
            </Badge>
          </div>
          
          <h2 className={`font-bold text-white ${
            isMobile 
              ? 'text-lg' 
              : isTablet 
                ? 'text-xl' 
                : 'text-2xl'
          }`}>
            {version?.toLowerCase() === 'purchase' || version?.toLowerCase() === 'rent'
              ? 'Content For Rent' 
              : 'Premium Content'}
          </h2>
          
          <p className={`text-gray-300 max-w-sm mx-auto ${
            isMobile 
              ? 'text-xs px-1' 
              : isTablet 
                ? 'text-sm' 
                : 'text-base'
          }`}>
            {(version?.toLowerCase() === 'purchase' || version?.toLowerCase() === 'rent') && excludeFromPlan
              ? 'This content requires a purchase to watch'
              : (version?.toLowerCase() === 'purchase' || version?.toLowerCase() === 'rent') && !excludeFromPlan
                ? 'This content requires a purchase or premium subscription'
                : 'Subscribe to unlock this premium content'
            }
          </p>
        </div>

        {/* Info text - Responsive sizing */}
        <p className={`text-gray-400 max-w-xs mx-auto ${
          isMobile 
            ? 'text-[10px] px-1 pt-0.5' 
            : 'text-xs'
        }`}>
          {(version?.toLowerCase() === 'purchase' || version?.toLowerCase() === 'rent') && excludeFromPlan
            ? 'This content is excluded from premium plans and requires purchase'
            : (version?.toLowerCase() === 'purchase' || version?.toLowerCase() === 'rent') && !excludeFromPlan
              ? 'Premium members have unlimited access'
              : 'Join our membership for unlimited access to all content'
          }
        </p>
      </div>
    </div>
  );
};

export default ContentAccessCheck;
