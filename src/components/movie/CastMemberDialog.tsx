import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useIsMobile } from "@/hooks/use-mobile";
import { useIsTablet } from "@/hooks/use-tablet";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { 
  X, User, Heart, Share2, Loader2, Calendar, MapPin, Star, 
  Film, Tv, Users, Clock, Award, Globe, ExternalLink
} from "lucide-react";


interface CastMember {
  id?: string;
  actor_name: string;
  character_name?: string;
  profile_url?: string;
  tmdb_id?: number;
}

interface TMDBPerson {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  gender: number;
  popularity: number;
  homepage: string | null;
}

interface CastCredit {
  id: string;
  title: string;
  character_name?: string;
  media_type: 'movie' | 'tv';
  poster_path?: string;
  release_date?: string;
  tmdb_id?: number;
}

interface CastMemberDialogProps {
  castMember: CastMember | null;
  isOpen: boolean;
  onClose: () => void;
  castType?: 'movie' | 'series';
}

const getImageUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `https://image.tmdb.org/t/p/w500${path}`;
};

const formatDate = (dateString: string | null): string => {
  if (!dateString) return 'Unknown';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getAge = (birthday: string | null): string => {
  if (!birthday) return '';
  const birthDate = new Date(birthday);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return `${age - 1} years old`;
  }
  return `${age} years old`;
};

const getGenderLabel = (gender: number | null): string => {
  switch (gender) {
    case 1: return 'Female';
    case 2: return 'Male';
    case 3: return 'Non-binary';
    default: return 'Not specified';
  }
};

const CastMemberDialog = ({ castMember, isOpen, onClose, castType }: CastMemberDialogProps) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [personData, setPersonData] = useState<TMDBPerson | null>(null);
  const [credits, setCredits] = useState<CastCredit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<"all" | "movies" | "tv">("all");
  
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isCompact = isMobile || isTablet;
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const movieCredits = credits.filter(c => c.media_type === 'movie');
  const tvCredits = credits.filter(c => c.media_type === 'tv');

  const filteredCredits = React.useMemo(() => {
    let result = [...credits];
    if (selectedType === "movies") result = movieCredits;
    else if (selectedType === "tv") result = tvCredits;
    return result.sort((a, b) => {
      if (!a.release_date) return 1;
      if (!b.release_date) return -1;
      return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
    });
  }, [credits, selectedType, movieCredits, tvCredits]);

  useEffect(() => {
    if (castMember && isOpen) {
      fetchCastData();
    }
  }, [castMember, isOpen]);

  const fetchCastData = async () => {
    if (!castMember) return;
    setIsLoading(true);
    
    const TMDB_API_KEY = '5cfa727c2f549c594772a50e10e3f272';
    
    try {
      let tmdbId: number | null = castMember.tmdb_id || null;
      
      // If no tmdb_id, check local database first for the tmdb_id
      if (!tmdbId) {
        const { data: storedMember } = await supabase
          .from('cast_members')
          .select('tmdb_id')
          .eq('name', castMember.actor_name)
          .maybeSingle();
        
        if (storedMember?.tmdb_id) {
          tmdbId = storedMember.tmdb_id;
        }
      }
      
      // If still no tmdb_id, search TMDB by name
      if (!tmdbId) {
        const searchRes = await fetch(
          `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(castMember.actor_name)}`
        );
        
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          if (searchData.results && searchData.results.length > 0) {
            tmdbId = searchData.results[0].id;
          }
        }
      }
      
      // Now fetch full person details and credits from TMDB
      if (tmdbId) {
        // Fetch detailed person info from TMDB
        const personRes = await fetch(
          `https://api.themoviedb.org/3/person/${tmdbId}?api_key=${TMDB_API_KEY}`
        );
        
        if (personRes.ok) {
          const personData = await personRes.json();
          setPersonData({
            id: personData.id,
            name: personData.name,
            biography: personData.biography || '',
            birthday: personData.birthday,
            place_of_birth: personData.place_of_birth,
            profile_path: personData.profile_path,
            known_for_department: personData.known_for_department || 'Acting',
            gender: personData.gender || 0,
            popularity: personData.popularity || 0,
            homepage: personData.homepage
          });
        }
        
        // Fetch credits from TMDB
        const creditsRes = await fetch(
          `https://api.themoviedb.org/3/person/${tmdbId}/combined_credits?api_key=${TMDB_API_KEY}`
        );
        
        if (creditsRes.ok) {
          const creditsData = await creditsRes.json();
          if (creditsData.cast) {
            setCredits(creditsData.cast.slice(0, 50).map((c: any) => ({
              id: c.id.toString(),
              title: c.title || c.name,
              character_name: c.character,
              media_type: c.media_type,
              poster_path: c.poster_path,
              release_date: c.release_date || c.first_air_date,
              tmdb_id: c.id
            })));
          }
        }
      }
    } catch (error) {
      console.error('Error fetching cast data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFollow = () => {
    if (!user?.id) {
      toast({ title: "Login Required", description: "Please login to follow cast members", variant: "destructive" });
      return;
    }
    setIsFollowLoading(true);
    setTimeout(() => {
      setIsFollowing(!isFollowing);
      toast({ title: isFollowing ? "Unfollowed" : "Following", description: `You ${isFollowing ? 'unfollowed' : 'are now following'} ${castMember?.actor_name}` });
      setIsFollowLoading(false);
    }, 300);
  };

  const handleCreditClick = async (credit: CastCredit) => {
    const tmdbId = credit.tmdb_id || parseInt(credit.id);
    if (!tmdbId) return;

    // Check if content exists in database
    const { data: existingContent } = await supabase
      .from('content')
      .select('id, content_type, tmdb_id')
      .eq('tmdb_id', tmdbId)
      .maybeSingle();

    if (existingContent) {
      if (existingContent.content_type === 'series' || credit.media_type === 'tv') {
        // Navigate to first episode of first season for series
        navigate(`/watch/series/${existingContent.tmdb_id}/1/1`);
      } else {
        navigate(`/watch/movie/${existingContent.tmdb_id}`);
      }
      onClose();
    } else {
      // Content not in database - show toast
      toast({
        title: "Content Not Available",
        description: "This title is not available in our library yet.",
        variant: "destructive"
      });
    }
  };

  const handleShare = () => {
    if (navigator.share && castMember) {
      navigator.share({
        title: `${castMember.actor_name} - Cast Member`,
        text: `Check out ${castMember.actor_name}${castMember.character_name ? ` who plays ${castMember.character_name}` : ''}`,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({ title: "Link Copied", description: "Link copied to clipboard" });
    }
  };

  if (!castMember) return null;


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className={`${
          isCompact 
            ? 'w-[90vw] max-w-md h-[80vh] max-h-[80vh] p-0' 
            : 'max-w-4xl h-[90vh]'
        } bg-background/40 backdrop-blur-sm text-foreground overflow-hidden flex flex-col z-[70] rounded-lg [&>button.absolute]:hidden`}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Cast Member Details</DialogTitle>
        </DialogHeader>
        
        {/* Close Button - Always visible */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-[100] h-9 w-9 rounded-full bg-destructive flex items-center justify-center shadow-lg hover:bg-destructive/90 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-destructive-foreground" />
        </button>
        
        {/* Profile Header */}
        <div className={`flex-shrink-0 bg-gradient-to-b from-card/80 to-background border-b border-border ${isCompact ? 'pt-10' : ''}`}>
          <div className={`${isCompact ? 'p-3 pr-12' : 'p-6 pr-14'}`}>
            <div className={`flex ${isCompact ? 'flex-row items-start gap-3' : 'items-start gap-6'}`}>
              {/* Profile Image */}
              <div className={`${isCompact ? 'w-20 h-28' : 'w-36 h-44'} rounded-xl overflow-hidden bg-gradient-to-br from-muted to-muted/50 shadow-xl flex-shrink-0 border border-border`}>
                {getImageUrl(castMember.profile_url) ? (
                  <img src={getImageUrl(castMember.profile_url)} alt={castMember.actor_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Avatar className="h-12 w-12"><AvatarFallback className="bg-muted"><User size={20} /></AvatarFallback></Avatar>
                  </div>
                )}
              </div>
              
              {/* Info */}
              <div className={`flex-1 ${isCompact ? 'text-left' : ''}`}>
                <h1 className={`${isCompact ? 'text-lg' : 'text-3xl'} font-bold mb-1`}>{castMember.actor_name}</h1>
                {castMember.character_name && (
                  <p className={`${isCompact ? 'text-sm' : 'text-xl'} text-primary mb-2 font-medium`}>as {castMember.character_name}</p>
                )}
                <div className={`flex gap-2 mt-2 ${isCompact ? 'flex-wrap' : ''}`}>
                  <Button variant={isFollowing ? "secondary" : "default"} size={isCompact ? "sm" : "default"} onClick={handleFollow} disabled={isFollowLoading} className="gap-1.5 text-xs">
                    {isFollowLoading ? <Loader2 size={14} className="animate-spin" /> : <Heart size={14} className={isFollowing ? "fill-current" : ""} />}
                    {isFollowing ? "Following" : "Follow"}
                  </Button>
                  <Button variant="outline" size={isCompact ? "sm" : "default"} onClick={handleShare} className="gap-1.5 text-xs">
                    <Share2 size={14} />Share
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="flex-shrink-0 w-full bg-muted/50 border-b border-border rounded-none h-10 grid grid-cols-3 gap-1 px-2">
              <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs">Overview</TabsTrigger>
              <TabsTrigger value="filmography" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs">Filmography</TabsTrigger>
              <TabsTrigger value="details" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-md text-xs">Details</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-hidden">
              {/* Overview Tab */}
              <TabsContent value="overview" className="h-full m-0 p-3 overflow-y-auto">
                {isLoading ? (
                  <div className="space-y-3">
                    <div className="bg-card/50 rounded-xl p-3 border border-border">
                      <div className="h-5 w-40 bg-muted rounded animate-pulse mb-3" />
                      <div className="grid grid-cols-1 gap-2">
                        {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted rounded animate-pulse" />)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-card/50 rounded-xl p-3 border border-border">
                      <h3 className="text-base font-bold mb-3 flex items-center gap-2"><User size={16} className="text-primary" />Personal Information</h3>
                      <div className={`grid ${isCompact ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-3'}`}>
                        {personData?.birthday && (
                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border">
                            <Calendar size={14} className="text-blue-400 flex-shrink-0" />
                            <div><div className="text-xs text-muted-foreground">Birthday</div><div className="font-medium text-sm">{formatDate(personData.birthday)}</div>{getAge(personData.birthday) && <div className="text-xs text-muted-foreground">({getAge(personData.birthday)})</div>}</div>
                          </div>
                        )}
                        {personData?.place_of_birth && (
                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border">
                            <MapPin size={14} className="text-green-400 flex-shrink-0" />
                            <div><div className="text-xs text-muted-foreground">Place of Birth</div><div className="font-medium text-xs">{personData.place_of_birth}</div></div>
                          </div>
                        )}
                        {personData?.known_for_department && (
                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border">
                            <Star size={14} className="text-yellow-400 flex-shrink-0" />
                            <div><div className="text-xs text-muted-foreground">Known For</div><div className="font-medium text-sm">{personData.known_for_department}</div></div>
                          </div>
                        )}
                      </div>
                    </div>
                    {personData?.biography && (
                      <div className="bg-card/50 rounded-xl p-3 border border-border">
                        <h3 className="text-base font-bold mb-2">Biography</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{personData.biography}</p>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
              
              {/* Filmography Tab */}
              <TabsContent value="filmography" className="h-full m-0 p-3 overflow-hidden flex flex-col">
                <div className="bg-card/50 rounded-xl p-2 border border-border mb-3 flex-shrink-0">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setSelectedType("all")} className={`px-2 py-1 text-xs rounded-md ${selectedType === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>All ({credits.length})</button>
                    <button onClick={() => setSelectedType("movies")} className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 ${selectedType === "movies" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><Film size={10} />Movies ({movieCredits.length})</button>
                    <button onClick={() => setSelectedType("tv")} className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 ${selectedType === "tv" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><Tv size={10} />TV ({tvCredits.length})</button>
                  </div>
                </div>
                <ScrollArea className="flex-1">
                  <div className={`grid ${isMobile ? 'grid-cols-3 gap-2' : isTablet ? 'grid-cols-5 gap-2' : 'grid-cols-8 gap-3'} pb-4`}>
                    {filteredCredits.map((credit) => (
                      <div 
                        key={credit.id} 
                        onClick={() => handleCreditClick(credit)}
                        className="bg-card/50 rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <div className="aspect-[2/3] bg-muted relative">
                          {credit.poster_path ? (
                            <img src={getImageUrl(credit.poster_path)} alt={credit.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">{credit.media_type === 'movie' ? <Film size={20} className="text-muted-foreground" /> : <Tv size={20} className="text-muted-foreground" />}</div>
                          )}
                          <Badge className={`absolute top-1 right-1 text-[10px] px-1 py-0 ${credit.media_type === 'movie' ? 'bg-blue-500/80' : 'bg-purple-500/80'}`}>{credit.media_type === 'movie' ? 'Movie' : 'TV'}</Badge>
                        </div>
                        <div className="p-1.5">
                          <h4 className="text-xs font-semibold line-clamp-1">{credit.title}</h4>
                          {credit.character_name && <p className="text-[10px] text-muted-foreground line-clamp-1">as {credit.character_name}</p>}
                          {credit.release_date && <div className="flex items-center gap-1 mt-0.5"><Calendar size={10} className="text-muted-foreground" /><span className="text-[10px] text-muted-foreground">{new Date(credit.release_date).getFullYear()}</span></div>}
                        </div>
                      </div>
                    ))}
                  </div>
                  {filteredCredits.length === 0 && <div className="text-center py-6 text-muted-foreground text-sm">No credits found</div>}
                </ScrollArea>
              </TabsContent>
              
              {/* Details Tab */}
              <TabsContent value="details" className="h-full m-0 p-3 overflow-y-auto">
                {isLoading ? (
                  <div className="space-y-3"><div className="h-24 bg-muted rounded animate-pulse" /></div>
                ) : personData ? (
                  <div className="space-y-3">
                    <div className="bg-card/50 rounded-xl p-3 border border-border">
                      <h3 className="text-base font-bold mb-3 flex items-center gap-2"><Users size={16} className="text-primary" />Personal Information</h3>
                      <div className={`grid ${isCompact ? 'grid-cols-1 gap-2' : 'grid-cols-2 gap-3'}`}>
                        {personData.known_for_department && (
                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border"><Award size={14} className="text-yellow-400 flex-shrink-0" /><div><span className="text-muted-foreground text-xs block">Known For</span><p className="font-medium text-sm">{personData.known_for_department}</p></div></div>
                        )}
                        {personData.birthday && (
                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border"><Calendar size={14} className="text-blue-400 flex-shrink-0" /><div><span className="text-muted-foreground text-xs block">Birthday</span><p className="font-medium text-sm">{formatDate(personData.birthday)}</p>{getAge(personData.birthday) && <p className="text-xs text-muted-foreground">({getAge(personData.birthday)})</p>}</div></div>
                        )}
                        {personData.place_of_birth && (
                          <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border"><MapPin size={14} className="text-green-400 flex-shrink-0" /><div><span className="text-muted-foreground text-xs block">Place of Birth</span><p className="font-medium text-xs">{personData.place_of_birth}</p></div></div>
                        )}
                        <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border border-border"><User size={14} className="text-purple-400 flex-shrink-0" /><div><span className="text-muted-foreground text-xs block">Gender</span><p className="font-medium text-sm">{getGenderLabel(personData.gender)}</p></div></div>
                      </div>
                    </div>
                    <div className="bg-card/50 rounded-xl p-3 border border-border">
                      <h3 className="text-base font-bold mb-3 flex items-center gap-2"><Clock size={16} className="text-primary" />Career Statistics</h3>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="text-center p-3 bg-muted/50 rounded-lg border border-border"><Film size={16} className="mx-auto mb-1 text-blue-400" /><p className="text-xl font-bold text-blue-400">{movieCredits.length}</p><p className="text-[10px] text-muted-foreground">Movies</p></div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg border border-border"><Tv size={16} className="mx-auto mb-1 text-purple-400" /><p className="text-xl font-bold text-purple-400">{tvCredits.length}</p><p className="text-[10px] text-muted-foreground">TV Shows</p></div>
                        <div className="text-center p-3 bg-muted/50 rounded-lg border border-border"><Star size={16} className="mx-auto mb-1 text-yellow-400" /><p className="text-xl font-bold text-yellow-400">{credits.length}</p><p className="text-[10px] text-muted-foreground">Total Credits</p></div>
                        {personData.popularity > 0 && <div className="text-center p-3 bg-muted/50 rounded-lg border border-border"><Users size={16} className="mx-auto mb-1 text-green-400" /><p className="text-xl font-bold text-green-400">{Math.round(personData.popularity)}</p><p className="text-[10px] text-muted-foreground">Popularity</p></div>}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-6"><div className="text-muted-foreground text-center"><User size={32} className="mx-auto mb-2" /><div className="text-sm">No detailed information available</div></div></div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CastMemberDialog;