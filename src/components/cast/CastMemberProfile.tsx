import React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { User, Heart, Share2, Loader2 } from "lucide-react";
import { getImageUrl } from "./utils";

interface CastMember {
  id: string;
  actor_name: string;
  character_name?: string;
  profile_url?: string;
}

interface CastMemberProfileProps {
  castMember: CastMember;
  isFollowing: boolean;
  isMobile: boolean;
  onFollow: () => void;
  onShare: () => void;
  isFollowLoading?: boolean;
}

const CastMemberProfile = ({
  castMember,
  isFollowing,
  isMobile,
  onFollow,
  onShare,
  isFollowLoading = false
}: CastMemberProfileProps) => {
  return (
    <div className="bg-transparent">
      <div className={`flex ${isMobile ? 'flex-col items-center gap-4' : 'items-start gap-6'}`}>
        {/* Profile Image */}
        <div className={`
          ${isMobile ? 'w-28 h-36' : 'w-36 h-44'} 
          rounded-xl overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 
          shadow-xl flex-shrink-0 border-2 border-gray-600/50 relative group
        `}>
          {getImageUrl(castMember.profile_url) ? (
            <img 
              src={getImageUrl(castMember.profile_url)!} 
              alt={castMember.actor_name} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
              <Avatar className={`${isMobile ? 'h-14 w-14' : 'h-18 w-18'}`}>
                <AvatarFallback className="bg-gray-600 text-white">
                  <User size={isMobile ? 18 : 22} />
                </AvatarFallback>
              </Avatar>
            </div>
          )}
        </div>
        
        {/* Info Section */}
        <div className={`flex-1 ${isMobile ? 'text-center w-full' : ''}`}>
          <div className="bg-transparent">
            <h1 className={`${isMobile ? 'text-2xl' : 'text-3xl'} font-bold mb-2 text-white`}>
              {castMember.actor_name}
            </h1>
            {castMember.character_name && (
              <p className={`${isMobile ? 'text-lg' : 'text-xl'} text-cyan-400 mb-3 font-medium`}>
                as {castMember.character_name}
              </p>
            )}
            
            {/* Action Buttons */}
            <div className={`flex gap-3 mt-4 ${isMobile ? 'justify-center' : ''}`}>
              <Button
                variant={isFollowing ? "secondary" : "default"}
                size="sm"
                onClick={onFollow}
                disabled={isFollowLoading}
                className="gap-2"
              >
                {isFollowLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Heart size={16} className={isFollowing ? "fill-current" : ""} />
                )}
                {isFollowing ? "Following" : "Follow"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onShare}
                className="gap-2 border-gray-600 text-black bg-white hover:bg-gray-100"
              >
                <Share2 size={16} />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CastMemberProfile;