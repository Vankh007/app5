import React from "react";
import { User, Award, Star, Calendar, MapPin } from "lucide-react";
import { StoredCastMember, StoredCastCredit } from "@/services/castService";
import { formatDate, getAge } from "./utils";

interface CastMemberOverviewProps {
  detailedCast: StoredCastMember | null;
  credits: StoredCastCredit[];
  isLoading: boolean;
  isMobile: boolean;
}

const CastMemberOverview = ({
  detailedCast,
  credits,
  isLoading,
  isMobile
}: CastMemberOverviewProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {detailedCast && (
        <div className="bg-card/50 backdrop-blur-md rounded-xl p-4 border border-border">
          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-4 flex items-center gap-2`}>
            <User size={20} className="text-primary" />
            Personal Information
          </h3>
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
            {detailedCast.birthday && (
              <div className="flex items-center gap-3 p-3 bg-muted/20 backdrop-blur-sm rounded-lg border border-border/20">
                <Calendar size={16} className="text-blue-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Birthday</div>
                  <div className="font-semibold text-sm">{formatDate(detailedCast.birthday)}</div>
                  {getAge(detailedCast.birthday) && (
                    <div className="text-xs text-muted-foreground">({getAge(detailedCast.birthday)})</div>
                  )}
                </div>
              </div>
            )}
            
            {detailedCast.place_of_birth && (
              <div className="flex items-center gap-3 p-3 bg-muted/20 backdrop-blur-sm rounded-lg border border-border/20">
                <MapPin size={16} className="text-green-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Place of Birth</div>
                  <div className="font-semibold text-sm">{detailedCast.place_of_birth}</div>
                </div>
              </div>
            )}
            
            {detailedCast.known_for_department && (
              <div className="flex items-center gap-3 p-3 bg-muted/20 backdrop-blur-sm rounded-lg border border-border/20">
                <Star size={16} className="text-yellow-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Known For</div>
                  <div className="font-semibold text-sm">{detailedCast.known_for_department}</div>
                </div>
              </div>
            )}
            
            {detailedCast.popularity && (
              <div className="flex items-center gap-3 p-3 bg-muted/20 backdrop-blur-sm rounded-lg border border-border/20">
                <Award size={16} className="text-purple-400 flex-shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground">Popularity</div>
                  <div className="font-semibold text-sm">{Math.round(detailedCast.popularity)}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {detailedCast?.biography && (
        <div className="bg-card/50 backdrop-blur-md rounded-xl p-4 border border-border">
          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-3`}>Biography</h3>
          <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {detailedCast.biography}
          </p>
        </div>
      )}
    </div>
  );
};

export default CastMemberOverview;
