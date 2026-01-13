export interface StoredCastMember {
  id: number;
  name: string;
  profile_path?: string | null;
  biography?: string | null;
  birthday?: string | null;
  place_of_birth?: string | null;
  known_for_department?: string | null;
  popularity?: number | null;
  gender?: number | null;
  homepage?: string | null;
  imdb_id?: string | null;
}

export interface StoredCastCredit {
  id: number;
  title: string;
  character_name?: string | null;
  media_type: 'movie' | 'tv';
  release_date?: string | null;
  poster_path?: string | null;
}

const TMDB_API_KEY = '5cfa727c2f549c594772a50e10e3f272';
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

export const getCastMemberWithCredits = async (castId: number): Promise<{
  castMember: StoredCastMember;
  credits: StoredCastCredit[];
}> => {
  try {
    // Fetch person details
    const detailsResponse = await fetch(
      `${TMDB_BASE_URL}/person/${castId}?api_key=${TMDB_API_KEY}`
    );
    
    if (!detailsResponse.ok) {
      throw new Error('Failed to fetch cast member details');
    }
    
    const detailsData = await detailsResponse.json();
    
    // Fetch combined credits (movies and TV shows)
    const creditsResponse = await fetch(
      `${TMDB_BASE_URL}/person/${castId}/combined_credits?api_key=${TMDB_API_KEY}`
    );
    
    if (!creditsResponse.ok) {
      throw new Error('Failed to fetch cast member credits');
    }
    
    const creditsData = await creditsResponse.json();
    
    // Transform cast member data
    const castMember: StoredCastMember = {
      id: detailsData.id,
      name: detailsData.name,
      profile_path: detailsData.profile_path,
      biography: detailsData.biography,
      birthday: detailsData.birthday,
      place_of_birth: detailsData.place_of_birth,
      known_for_department: detailsData.known_for_department,
      popularity: detailsData.popularity,
      gender: detailsData.gender,
      homepage: detailsData.homepage,
      imdb_id: detailsData.imdb_id,
    };
    
    // Transform credits data
    const allCredits = [
      ...(creditsData.cast || []).map((credit: any) => ({
        id: credit.id,
        title: credit.title || credit.name,
        character_name: credit.character,
        media_type: credit.media_type as 'movie' | 'tv',
        release_date: credit.release_date || credit.first_air_date,
        poster_path: credit.poster_path,
      })),
    ];
    
    // Sort by release date (most recent first)
    allCredits.sort((a, b) => {
      const dateA = a.release_date ? new Date(a.release_date).getTime() : 0;
      const dateB = b.release_date ? new Date(b.release_date).getTime() : 0;
      return dateB - dateA;
    });
    
    return {
      castMember,
      credits: allCredits,
    };
  } catch (error) {
    console.error('Error fetching cast member data from TMDB:', error);
    
    // Return fallback data
    return {
      castMember: {
        id: castId,
        name: 'Cast Member',
        profile_path: null,
        biography: 'Biography not available',
        birthday: null,
        place_of_birth: null,
        known_for_department: 'Acting',
        popularity: 0,
        gender: 0,
        homepage: null,
        imdb_id: null,
      },
      credits: [],
    };
  }
};
