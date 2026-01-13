import React from "react";
import { Users, ExternalLink, Clock, Star, Calendar, MapPin, User, Globe, Award, Film, Tv } from "lucide-react";
import { formatDate, getAge, getGenderLabel } from "./utils";

interface CastMember {
  id: string;
  actor_name: string;
  character_name?: string;
  profile_url?: string;
}

interface TMDBPerson {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  gender: number;
  popularity: number;
  also_known_as: string[];
  homepage: string | null;
}

interface TMDBCredit {
  id: number;
  title?: string;
  name?: string;
  character?: string;
  media_type: 'movie' | 'tv';
  poster_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  overview: string;
}

interface CastMemberDetailsProps {
  castMember: CastMember;
  tmdbPerson: TMDBPerson | null;
  movieCredits: TMDBCredit[];
  tvCredits: TMDBCredit[];
  isLoading: boolean;
  isMobile: boolean;
}

const CastMemberDetails = ({ castMember, tmdbPerson, movieCredits, tvCredits, isLoading, isMobile }: CastMemberDetailsProps) => {
  const allCredits = [...movieCredits, ...tvCredits];
  
  const careerSpan = React.useMemo(() => {
    const allDates = allCredits
      .map(credit => credit.release_date || credit.first_air_date)
      .filter(Boolean)
      .map(date => new Date(date!).getFullYear())
      .sort();
    
    if (allDates.length === 0) return null;
    
    const firstYear = allDates[0];
    const lastYear = allDates[allDates.length - 1];
    const yearsActive = lastYear - firstYear + 1;
    
    return { firstYear, lastYear, yearsActive };
  }, [allCredits]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="bg-gray-800/20 backdrop-blur-md rounded-xl p-4 border border-gray-700/30">
          <div className="h-6 w-48 bg-gray-700/50 rounded animate-pulse mb-4" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-gray-700/30 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!tmdbPerson) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-400 text-center">
          <User size={40} className="mx-auto mb-3" />
          <div className="text-lg mb-2">No detailed information available</div>
          <div className="text-sm">Check back later for more details</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-6">
      <div className="bg-gray-800/20 backdrop-blur-md rounded-xl p-4 border border-gray-700/30">
        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-4 flex items-center gap-2 text-white`}>
          <Users size={20} className="text-cyan-500" />
          Personal Information
        </h3>
        <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-2 gap-4'}`}>
          {tmdbPerson.known_for_department && (
            <div className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg border border-gray-600/20">
              <Award size={16} className="text-yellow-400 flex-shrink-0" />
              <div>
                <span className="text-gray-400 text-xs block">Known For</span>
                <p className="font-semibold text-sm text-white">{tmdbPerson.known_for_department}</p>
              </div>
            </div>
          )}
          
          {tmdbPerson.birthday && (
            <div className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg border border-gray-600/20">
              <Calendar size={16} className="text-blue-400 flex-shrink-0" />
              <div>
                <span className="text-gray-400 text-xs block">Birthday</span>
                <p className="font-semibold text-sm text-white">{formatDate(tmdbPerson.birthday)}</p>
                {getAge(tmdbPerson.birthday) && (
                  <p className="text-xs text-gray-400">({getAge(tmdbPerson.birthday)})</p>
                )}
              </div>
            </div>
          )}
          
          {tmdbPerson.place_of_birth && (
            <div className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg border border-gray-600/20">
              <MapPin size={16} className="text-green-400 flex-shrink-0" />
              <div>
                <span className="text-gray-400 text-xs block">Place of Birth</span>
                <p className="font-semibold text-xs text-white">{tmdbPerson.place_of_birth}</p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg border border-gray-600/20">
            <User size={16} className="text-purple-400 flex-shrink-0" />
            <div>
              <span className="text-gray-400 text-xs block">Gender</span>
              <p className="font-semibold text-sm text-white">{getGenderLabel(tmdbPerson.gender)}</p>
            </div>
          </div>

          {tmdbPerson.popularity > 0 && (
            <div className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg border border-gray-600/20">
              <Star size={16} className="text-pink-400 flex-shrink-0" />
              <div>
                <span className="text-gray-400 text-xs block">Popularity Score</span>
                <p className="font-semibold text-sm text-white">{Math.round(tmdbPerson.popularity)}</p>
              </div>
            </div>
          )}

          {careerSpan && (
            <div className="flex items-center gap-3 p-3 bg-gray-700/20 rounded-lg border border-gray-600/20">
              <Clock size={16} className="text-indigo-400 flex-shrink-0" />
              <div>
                <span className="text-gray-400 text-xs block">Career Span</span>
                <p className="font-semibold text-sm text-white">
                  {careerSpan.firstYear} - {careerSpan.lastYear}
                </p>
                <p className="text-xs text-gray-400">({careerSpan.yearsActive} years active)</p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {tmdbPerson.homepage && (
        <div className="bg-gray-800/20 backdrop-blur-md rounded-xl p-4 border border-gray-700/30">
          <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-4 flex items-center gap-2 text-white`}>
            <ExternalLink size={20} className="text-cyan-500" />
            External Links
          </h3>
          <div className={`flex ${isMobile ? 'flex-col gap-2' : 'flex-wrap gap-3'}`}>
            <a 
              href={tmdbPerson.homepage} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-all duration-300 text-white font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 text-sm"
            >
              <Globe size={14} />
              Official Website
            </a>
          </div>
        </div>
      )}
      
      <div className="bg-gray-800/20 backdrop-blur-md rounded-xl p-4 border border-gray-700/30">
        <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold mb-4 flex items-center gap-2 text-white`}>
          <Clock size={20} className="text-cyan-500" />
          Career Statistics
        </h3>
        <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-4 gap-4'}`}>
          <div className="text-center p-4 bg-gray-700/20 rounded-lg border border-gray-600/20">
            <Film size={20} className="mx-auto mb-2 text-blue-400" />
            <p className="text-2xl font-bold text-blue-400 mb-1">{movieCredits.length}</p>
            <p className="text-xs font-medium text-gray-400">Movies</p>
          </div>
          <div className="text-center p-4 bg-gray-700/20 rounded-lg border border-gray-600/20">
            <Tv size={20} className="mx-auto mb-2 text-purple-400" />
            <p className="text-2xl font-bold text-purple-400 mb-1">{tvCredits.length}</p>
            <p className="text-xs font-medium text-gray-400">TV Shows</p>
          </div>
          <div className="text-center p-4 bg-gray-700/20 rounded-lg border border-gray-600/20">
            <Star size={20} className="mx-auto mb-2 text-yellow-400" />
            <p className="text-2xl font-bold text-yellow-400 mb-1">{allCredits.length}</p>
            <p className="text-xs font-medium text-gray-400">Total Credits</p>
          </div>
          {tmdbPerson.popularity > 0 && (
            <div className="text-center p-4 bg-gray-700/20 rounded-lg border border-gray-600/20">
              <Users size={20} className="mx-auto mb-2 text-green-400" />
              <p className="text-2xl font-bold text-green-400 mb-1">{Math.round(tmdbPerson.popularity)}</p>
              <p className="text-xs font-medium text-gray-400">Popularity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CastMemberDetails;