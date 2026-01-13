import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCastMemberWithCredits } from "@/services/castService";
import { StoredCastMember, StoredCastCredit } from "@/services/castService";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsTablet } from "@/hooks/use-tablet";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import CastMemberProfile from "./CastMemberProfile";
import CastMemberDialogTabs from "./CastMemberDialogTabs";

interface CastMember {
  id: number;
  name: string;
  role: string;
  image: string;
  profile_path?: string | null;
}

interface CastMemberDialogProps {
  castMember: CastMember | null;
  isOpen: boolean;
  onClose: () => void;
}

const CastMemberDialog = ({ castMember, isOpen, onClose }: CastMemberDialogProps) => {
  const [detailedCast, setDetailedCast] = useState<StoredCastMember | null>(null);
  const [credits, setCredits] = useState<StoredCastCredit[]>([]);
  const [movieCredits, setMovieCredits] = useState<StoredCastCredit[]>([]);
  const [tvCredits, setTvCredits] = useState<StoredCastCredit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isCompact = isMobile || isTablet;

  useEffect(() => {
    if (castMember && isOpen) {
      loadCastMemberData();
    }
  }, [castMember, isOpen]);

  const loadCastMemberData = async () => {
    if (!castMember) return;
    
    setIsLoading(true);
    try {
      const { castMember: detailsResult, credits: creditsResult } = await getCastMemberWithCredits(castMember.id);

      setDetailedCast(detailsResult);
      setCredits(creditsResult);
      
      const movies = creditsResult.filter(credit => credit.media_type === 'movie');
      const tvShows = creditsResult.filter(credit => credit.media_type === 'tv');
      
      setMovieCredits(movies);
      setTvCredits(tvShows);
    } catch (error) {
      console.error('Error loading cast member data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
  };

  const handleShare = () => {
    if (navigator.share && castMember) {
      navigator.share({
        title: `${castMember.name} - Cast Member`,
        text: `Check out ${castMember.name} who plays ${castMember.role}`,
        url: window.location.href,
      });
    } else if (castMember) {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (!castMember) return null;

  // Convert CastMember to format expected by CastMemberProfile
  const profileCastMember = {
    id: String(castMember.id),
    actor_name: castMember.name,
    character_name: castMember.role,
    profile_url: castMember.image || castMember.profile_path
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        hideCloseButton
        className={`${
          isCompact 
            ? 'w-[90vw] max-w-md h-[80vh] max-h-[80vh]' 
            : 'max-w-4xl h-[90vh]'
        } bg-background border-border flex flex-col z-[70] rounded-lg overflow-hidden`}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Cast Member Details</DialogTitle>
        </DialogHeader>
        
        {/* Close Button - Always visible */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="absolute top-2 right-2 z-[100] h-8 w-8 rounded-full bg-destructive hover:bg-destructive/80 text-destructive-foreground shadow-lg"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <div className={`flex-shrink-0 bg-gradient-to-b from-card/80 to-background border-b border-border ${isCompact ? 'p-3 pt-10 pr-12' : 'p-4 pt-12 pr-14'}`}>
          <CastMemberProfile
            castMember={profileCastMember}
            isFollowing={isFollowing}
            isMobile={isCompact}
            onFollow={handleFollow}
            onShare={handleShare}
          />
        </div>
        
        <div className="flex-1 min-h-0 overflow-hidden">
          <CastMemberDialogTabs
            detailedCast={detailedCast}
            credits={credits}
            movieCredits={movieCredits}
            tvCredits={tvCredits}
            isLoading={isLoading}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isMobile={isCompact}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CastMemberDialog;
