import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, ShoppingBag, Gift } from 'lucide-react';

interface CastMember {
  id: string;
  profile_path: string;
  name?: string;
}

interface MovieCardProps {
  id: string;
  title: string;
  description: string;
  imageUrl: string | null;
  category?: string;
  cast?: CastMember[];
  contentType?: 'movie' | 'series';
  accessType?: 'free' | 'purchase' | 'membership';
  recentEpisode?: string;
  onClick?: () => void;
}

const MovieCard = ({ id, title, description, imageUrl, category, cast, contentType = 'movie', accessType, recentEpisode, onClick }: MovieCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const navigate = useNavigate();
  
  // Ensure cast is always an array
  const castArray = Array.isArray(cast) ? cast : [];
  
  // TMDB image base URL for cast member photos
  const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w185';

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/watch/${contentType}/${id}`);
    }
  };

  return (
    <div
      className="relative w-full h-[330px] md:h-[372px] bg-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:scale-105 hover:shadow-2xl hover:z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
      onClick={handleClick}
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        willChange: 'transform'
      }}
    >
      {/* Recent Episode Ribbon - positioned at top right with 0px margin */}
      {recentEpisode && (
        <div className="absolute top-3 right-0 z-10">
          <div className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1.5 rounded-l-md shadow-lg">
            {recentEpisode}
          </div>
        </div>
      )}

      {/* Image Container */}
      <div className="absolute inset-0">
        <div
          className="w-full h-full transition-all duration-500 ease-in-out"
          style={{
            transform: isHovered ? 'translateY(-50px)' : 'translateY(0)',
            filter: isHovered ? 'blur(3px)' : 'blur(0)'
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  const fallback = document.createElement('div');
                  fallback.className = 'w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20';
                  fallback.innerHTML = '<span class="text-6xl">🎬</span>';
                  parent.appendChild(fallback);
                }
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <span className="text-6xl">🎬</span>
            </div>
          )}
        </div>
      </div>

      {/* Details Overlay */}
      <div
        className="absolute bottom-0 left-0 right-0 p-6 text-white transition-all duration-500 ease-in-out z-20"
        style={{
          background: 'linear-gradient(to top, hsl(var(--primary)), hsl(var(--primary) / 0.95), transparent)',
          transform: isHovered ? 'translateY(0)' : 'translateY(calc(100% - 80px))',
          height: '250px'
        }}
      >
        <div className="space-y-3">
          {/* Title */}
          <h3
            className="text-lg font-bold leading-tight"
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
          >
            {title}
          </h3>

          {/* Category/Tag and Access Badge */}
          <div className="flex items-center justify-between gap-2">
            {category && (
              <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[11px] font-medium">
                {category}
              </div>
            )}
            
            {/* Access Type Badge - Large Icon with White Border */}
            {accessType === 'membership' && (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex-shrink-0 p-1.5 bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 rounded-lg border-2 border-white shadow-lg">
                  <Crown className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[8px] font-semibold text-white/90">Member</span>
              </div>
            )}
            {accessType === 'purchase' && (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex-shrink-0 p-1.5 bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 rounded-lg border-2 border-white shadow-lg">
                  <ShoppingBag className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[8px] font-semibold text-white/90">Buy</span>
              </div>
            )}
            {accessType === 'free' && (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex-shrink-0 p-1.5 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 rounded-lg border-2 border-white shadow-lg">
                  <Gift className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[8px] font-semibold text-white/90">Free</span>
              </div>
            )}
          </div>

          {/* Description */}
          <p
            className="text-xs leading-relaxed text-white/90"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {description}
          </p>

          {/* Cast Members */}
          {castArray.length > 0 && (
            <div className="pt-3 border-t border-white/20 mt-2">
              <p className="text-[11px] font-semibold text-white/80 mb-2">Cast</p>
              <div className="flex items-center gap-2">
                {castArray.slice(0, 5).map((member) => (
                  <div
                    key={member.id}
                    className="relative w-10 h-10 rounded-full border-2 border-white/40 overflow-hidden bg-muted flex-shrink-0"
                  >
                    {member.profile_path ? (
                      <img
                        src={member.profile_path.startsWith('http') 
                          ? member.profile_path 
                          : `${TMDB_IMAGE_BASE}${member.profile_path}`}
                        alt={member.name || 'Cast member'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const fallback = document.createElement('div');
                            fallback.className = 'w-full h-full flex items-center justify-center bg-primary/20 text-lg';
                            fallback.textContent = '👤';
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/20 text-lg">
                        👤
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
