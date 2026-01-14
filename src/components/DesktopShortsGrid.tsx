import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Play } from 'lucide-react';

interface Short {
  id: string;
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string;
  views: number;
}

const DesktopShortsGrid = () => {
  const [shorts, setShorts] = useState<Short[]>([]);
  const [selectedShort, setSelectedShort] = useState<Short | null>(null);

  useEffect(() => {
    fetchShorts();
  }, []);

  const fetchShorts = async () => {
    const { data, error } = await supabase
      .from('shorts')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (data && !error) {
      setShorts(data);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Short Videos</h1>
          <p className="text-muted-foreground">Quick entertainment on the go</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
          {shorts.map((short) => (
            <div
              key={short.id}
              onClick={() => setSelectedShort(short)}
              className="group relative aspect-[9/16] rounded-lg overflow-hidden cursor-pointer bg-muted"
            >
              {short.thumbnail_url ? (
                <img
                  src={short.thumbnail_url}
                  alt={short.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
              )}
              
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors flex items-center justify-center">
                <Play className="w-12 h-12 text-white opacity-80 group-hover:opacity-100" fill="white" />
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white font-medium text-sm line-clamp-2">{short.title}</h3>
                <p className="text-white/70 text-xs mt-1">{short.views?.toLocaleString() || 0} views</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Video Modal */}
      {selectedShort && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedShort(null)}
        >
          <div className="relative max-w-2xl w-full aspect-[9/16] bg-black rounded-lg overflow-hidden">
            <video
              src={selectedShort.video_url}
              controls
              autoPlay
              loop
              className="w-full h-full object-contain"
            />
            <button
              onClick={() => setSelectedShort(null)}
              className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/70 rounded-full w-10 h-10 flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default DesktopShortsGrid;
