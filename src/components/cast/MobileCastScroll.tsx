import React, { useState } from "react";
import CastMemberDialog from "./CastMemberDialog";

interface MobileCastScrollProps {
  castWithProfiles: Array<{
    id: number;
    name: string;
    role: string;
    image: string;
    profile_path?: string | null;
  }>;
}

const MobileCastScroll = ({ castWithProfiles }: MobileCastScrollProps) => {
  const [selectedCastMember, setSelectedCastMember] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCastMemberClick = (castMember: any) => {
    setSelectedCastMember(castMember);
    setIsDialogOpen(true);
  };

  return (
    <div className="w-full px-4 py-3 border-b border-border">
      <h3 className="text-sm font-medium mb-2 text-foreground">Series Cast</h3>
      <div className="overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <div className="flex space-x-3 pb-2">
          {castWithProfiles.map(actor => (
            <div 
              key={actor.id} 
              className="flex-shrink-0 w-16 cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => handleCastMemberClick(actor)}
            >
              <div className="w-16 h-16 rounded-full overflow-hidden mb-1 border-2 border-border">
                {actor.image ? (
                  <img 
                    src={actor.image} 
                    alt={actor.name} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">{actor.name.substring(0, 1)}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-center truncate text-foreground">{actor.name}</p>
            </div>
          ))}
        </div>
      </div>

      <CastMemberDialog
        castMember={selectedCastMember}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </div>
  );
};

export default MobileCastScroll;
