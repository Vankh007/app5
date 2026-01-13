import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StoredCastMember, StoredCastCredit } from "@/services/castService";
import CastMemberOverview from "./CastMemberOverview";
import CastMemberFilmography from "./CastMemberFilmography";
import CastMemberDetails from "./CastMemberDetails";

interface CastMemberDialogTabsProps {
  detailedCast: StoredCastMember | null;
  credits: StoredCastCredit[];
  movieCredits: StoredCastCredit[];
  tvCredits: StoredCastCredit[];
  isLoading: boolean;
  activeTab: string;
  onTabChange: (value: string) => void;
  isMobile: boolean;
}

const CastMemberDialogTabs = ({
  detailedCast,
  credits,
  movieCredits,
  tvCredits,
  isLoading,
  activeTab,
  onTabChange,
  isMobile
}: CastMemberDialogTabsProps) => {
  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col">
        <TabsList className="flex-shrink-0 w-full border-b border-border bg-transparent px-0.5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="filmography">Filmography</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>
        
        <div className="flex-1 min-h-0 overflow-hidden">
          <TabsContent value="overview" className="h-full overflow-auto p-2 m-0">
            <CastMemberOverview detailedCast={detailedCast} credits={credits} isLoading={isLoading} isMobile={isMobile} />
          </TabsContent>
          
          <TabsContent value="filmography" className="h-full overflow-hidden p-2 m-0">
            <CastMemberFilmography movieCredits={movieCredits} tvCredits={tvCredits} isMobile={isMobile} />
          </TabsContent>
          
          <TabsContent value="details" className="h-full overflow-auto p-2 m-0">
            <CastMemberDetails 
              castMember={{ id: String(detailedCast?.id || ''), actor_name: detailedCast?.name || '' }}
              tmdbPerson={detailedCast ? {
                id: detailedCast.id,
                name: detailedCast.name,
                biography: detailedCast.biography || '',
                birthday: detailedCast.birthday || null,
                deathday: null,
                place_of_birth: detailedCast.place_of_birth || null,
                profile_path: detailedCast.profile_path || null,
                known_for_department: detailedCast.known_for_department || 'Acting',
                gender: detailedCast.gender || 0,
                popularity: detailedCast.popularity || 0,
                also_known_as: [],
                homepage: detailedCast.homepage || null
              } : null}
              movieCredits={movieCredits.map(c => ({
                id: c.id,
                title: c.title,
                character: c.character_name || undefined,
                media_type: c.media_type as 'movie' | 'tv',
                poster_path: c.poster_path || null,
                release_date: c.release_date || undefined,
                vote_average: 0,
                overview: ''
              }))}
              tvCredits={tvCredits.map(c => ({
                id: c.id,
                name: c.title,
                character: c.character_name || undefined,
                media_type: c.media_type as 'movie' | 'tv',
                poster_path: c.poster_path || null,
                first_air_date: c.release_date || undefined,
                vote_average: 0,
                overview: ''
              }))}
              isLoading={false}
              isMobile={isMobile} 
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default CastMemberDialogTabs;