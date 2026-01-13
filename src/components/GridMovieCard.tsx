import { useState } from 'react';
import { Crown, ShoppingBag, Gift } from 'lucide-react';

interface CastMember {
  id: string;
  profile_path: string;
  name?: string;
}

interface Content {
  id: string;
  title: string;
  poster_path?: string;
  backdrop_path?: string;
  overview?: string;
  genre?: string;
  tmdb_id?: number;
  content_type?: string;
  cast?: CastMember[];
  access_type?: 'free' | 'purchase' | 'membership';
  recent_episode?: string;
}

interface GridMovieCardProps {
  item: Content;
  onClick: (item: Content) => void;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w185';

const GridMovieCard = ({ item, onClick }: GridMovieCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const getImageUrl = (item: Content): string | null => {
    if (item.poster_path) {
      if (item.poster_path.startsWith('http')) return item.poster_path;
      return `https://image.tmdb.org/t/p/w500${item.poster_path}`;
    }
    if (item.backdrop_path) {
      if (item.backdrop_path.startsWith('http')) return item.backdrop_path;
      return `https://image.tmdb.org/t/p/w500${item.backdrop_path}`;
    }
    return null;
  };

  return (
    <div
      className="relative w-full h-[330px] md:h-[372px] bg-card rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:scale-105 hover:shadow-2xl hover:z-10"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
      onClick={() => onClick(item)}
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        willChange: 'transform'
      }}
    >
      {/* Recent Episode Ribbon */}
      {item.recent_episode && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-white text-xs font-bold px-3 py-1.5 rounded-md shadow-lg">
            {item.recent_episode}
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
          {getImageUrl(item) ? (
            <img
              src={getImageUrl(item) || ''}
              alt={item.title}
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
            {item.title}
          </h3>

          {/* Category/Tag and Access Badge */}
          <div className="flex items-center justify-between gap-2">
            {item.genre && (
              <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-[11px] font-medium">
                {item.genre}
              </div>
            )}
            
            {/* Access Type Badge - Large Icon with White Border */}
            {item.access_type === 'membership' && (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex-shrink-0 p-1.5 bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 rounded-lg border-2 border-white shadow-lg">
                  <Crown className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[8px] font-semibold text-white/90">Member</span>
              </div>
            )}
            {item.access_type === 'purchase' && (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex-shrink-0 p-1.5 bg-gradient-to-br from-orange-500 via-orange-600 to-red-500 rounded-lg border-2 border-white shadow-lg">
                  <ShoppingBag className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[8px] font-semibold text-white/90">Buy</span>
              </div>
            )}
            {item.access_type === 'free' && (
              <div className="flex flex-col items-center gap-0.5">
                <div className="flex-shrink-0 p-1.5 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-500 rounded-lg border-2 border-white shadow-lg">
                  <Gift className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
                <span className="text-[8px] font-semibold text-white/90">Free</span>
              </div>
            )}
          </div>

          {/* Description */}
          {item.overview && (
            <p
              className="text-xs leading-relaxed text-white/90"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}
            >
              {item.overview}
            </p>
          )}

          {/* Cast Members */}
          {item.cast && item.cast.length > 0 && (
            <div className="pt-3 border-t border-white/20 mt-2">
              <p className="text-[11px] font-semibold text-white/80 mb-2">Cast</p>
              <div className="flex items-center gap-2">
                {item.cast.slice(0, 5).map((member) => (
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

export default GridMovieCard;
