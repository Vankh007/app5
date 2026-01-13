import React, { useState } from "react";
import { Film, Tv, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { ScrollArea } from "@/components/ui/scroll-area";
import { StoredCastCredit } from "@/services/castService";
import { getImageUrl } from "./utils";

interface CastMemberFilmographyProps {
  movieCredits: StoredCastCredit[];
  tvCredits: StoredCastCredit[];
  isMobile: boolean;
}

const CastMemberFilmography = ({ movieCredits, tvCredits, isMobile }: CastMemberFilmographyProps) => {
  const [selectedType, setSelectedType] = useState<"all" | "movies" | "tv">("all");

  const filteredCredits = React.useMemo(() => {
    let allCredits = [...movieCredits, ...tvCredits];
    
    if (selectedType === "movies") {
      allCredits = movieCredits;
    } else if (selectedType === "tv") {
      allCredits = tvCredits;
    }
    
    return allCredits.sort((a, b) => {
      if (!a.release_date) return 1;
      if (!b.release_date) return -1;
      return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
    });
  }, [movieCredits, tvCredits, selectedType]);

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="bg-card/50 backdrop-blur-sm rounded-xl p-3 border border-border flex-shrink-0">
        <div className="flex gap-2">
            <button
              onClick={() => setSelectedType("all")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all text-sm ${
                selectedType === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              All ({movieCredits.length + tvCredits.length})
            </button>
            <button
              onClick={() => setSelectedType("movies")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 text-sm ${
                selectedType === "movies"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Film size={14} />
              Movies ({movieCredits.length})
            </button>
            <button
              onClick={() => setSelectedType("tv")}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 text-sm ${
                selectedType === "tv"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              <Tv size={14} />
              TV ({tvCredits.length})
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <ScrollArea className="h-full">
          <div className="pr-3">
            {filteredCredits.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="text-lg mb-2">No results found</div>
                <div className="text-sm">Try adjusting your search or filters</div>
              </div>
            ) : (
              <div className={`grid ${isMobile ? 'grid-cols-3' : 'grid-cols-5'} gap-3`}>
                {filteredCredits.map((credit) => (
                  <div 
                    key={credit.id} 
                    className="bg-card/50 backdrop-blur-sm rounded-xl hover:bg-card/80 transition-all duration-300 border border-border group cursor-pointer overflow-hidden hover:scale-105"
                  >
                    <div className="aspect-[2/3.45] w-full rounded-t-xl overflow-hidden bg-muted shadow-lg relative">
                      {credit.poster_path ? (
                        <img 
                          src={getImageUrl(credit.poster_path)} 
                          alt={credit.title}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          {credit.media_type === 'movie' ? (
                            <Film size={32} className="text-muted-foreground" />
                          ) : (
                            <Tv size={32} className="text-muted-foreground" />
                          )}
                        </div>
                      )}
                      <Badge 
                        variant="outline" 
                        className={`absolute top-2 right-2 text-xs ${
                          credit.media_type === 'movie' 
                            ? 'border-blue-500 text-blue-400 bg-blue-950/80' 
                            : 'border-purple-500 text-purple-400 bg-purple-950/80'
                        }`}
                      >
                        {credit.media_type === 'movie' ? (
                          <>
                            <Film size={10} className="mr-1" />
                            Movie
                          </>
                        ) : (
                          <>
                            <Tv size={10} className="mr-1" />
                            TV
                          </>
                        )}
                      </Badge>
                    </div>
                    
                    <div className="p-3">
                      <h4 className="font-bold group-hover:text-primary transition-colors text-sm mb-1 line-clamp-2">
                        {credit.title}
                      </h4>
                      
                      {credit.character_name && (
                        <p className="text-muted-foreground text-xs mb-2 line-clamp-1">
                          as <span className="font-medium">{credit.character_name}</span>
                        </p>
                      )}
                      
                      {credit.release_date && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar size={12} />
                          {new Date(credit.release_date).getFullYear()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default CastMemberFilmography;
