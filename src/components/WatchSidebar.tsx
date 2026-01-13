import { useState, useEffect } from 'react';
import { Home, TrendingUp, PlaySquare, Clock, ThumbsUp, Download, Users, Video, Menu } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';
import logoDark from '@/assets/khmerzoon.png';
import logoLight from '@/assets/logo-light-new.png';
import { supabase } from '@/lib/supabase';

interface WatchSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RelatedContent {
  id: string;
  title: string;
  poster_path?: string;
  backdrop_path?: string;
  tmdb_id?: string | number;
  content_type?: string;
}

const NAV_ITEMS = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: TrendingUp, label: 'Trending', path: '/trending' },
  { icon: PlaySquare, label: 'Subscriptions', path: '/subscriptions' },
];

const LIBRARY_ITEMS = [
  { icon: Clock, label: 'History', path: '/history' },
  { icon: Video, label: 'Your videos', path: '/your-videos' },
  { icon: ThumbsUp, label: 'Liked videos', path: '/liked' },
  { icon: Download, label: 'Downloads', path: '/downloads' },
];

const WatchSidebar = ({ isOpen, onClose }: WatchSidebarProps) => {
  const navigate = useNavigate();
  const { effectiveTheme } = useTheme();
  const logo = effectiveTheme === 'light' ? logoLight : logoDark;
  const [relatedContent, setRelatedContent] = useState<RelatedContent[]>([]);

  useEffect(() => {
    const fetchRelatedContent = async () => {
      try {
        const { data, error } = await supabase
          .from('content')
          .select('id, title, poster_path, backdrop_path, tmdb_id, content_type')
          .limit(10);

        if (error) {
          console.error('Error fetching related content:', error);
          return;
        }

        setRelatedContent(data || []);
      } catch (err) {
        console.error('Error fetching related content:', err);
      }
    };

    fetchRelatedContent();
  }, []);

  const handleNavClick = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-[280px] border-r border-border z-50 backdrop-blur-md transform transition-transform duration-300 ease-in-out bg-white dark:bg-[hsl(220,13%,8%)] ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <ScrollArea className="h-full">
          <div className="p-4 space-y-6">
            {/* Logo/Branding with Menu Icon */}
            <div className="flex items-center gap-3 px-3 py-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="hover:bg-accent text-gray-800 dark:text-white"
              >
                <Menu className="h-6 w-6" />
              </Button>
              <img src={logo} alt="KHMERZOON" className="w-10 h-10 object-contain" />
              <span className="font-bold text-xl text-primary dark:text-white">KHMERZOON</span>
            </div>

            <Separator />

            {/* Navigation */}
            <div>
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className="w-full flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-accent transition-colors text-left text-gray-800 dark:text-white"
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <Separator />

            {/* Library */}
            <div>
              <h3 className="px-3 mb-2 text-sm font-semibold text-muted-foreground">
                Library
              </h3>
              <nav className="space-y-1">
                {LIBRARY_ITEMS.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleNavClick(item.path)}
                    className="w-full flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-accent transition-colors text-left text-gray-800 dark:text-white"
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            <Separator />

            {/* Related Videos */}
            <div>
              <h3 className="px-3 mb-3 text-sm font-semibold text-muted-foreground">
                Related Videos
              </h3>
              <div className="space-y-3">
                {relatedContent.length > 0 ? (
                  relatedContent.map((item) => {
                    // Prefer backdrop_path for landscape thumbnails, construct full URL if needed
                    const imagePath = item.backdrop_path || item.poster_path;
                    const imageUrl = imagePath?.startsWith('http') 
                      ? imagePath 
                      : imagePath 
                        ? `https://image.tmdb.org/t/p/w500${imagePath}`
                        : null;
                    const contentId = item.tmdb_id || item.id;
                    const contentType = item.content_type || 'movie';
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          navigate(`/watch/${contentType}/${contentId}`);
                          onClose();
                        }}
                        className="w-full group text-left"
                      >
                        <div className="flex gap-2">
                          <div className="relative w-40 flex-shrink-0">
                            <AspectRatio ratio={16 / 9}>
                              {imageUrl ? (
                                <img
                                  src={imageUrl}
                                  alt={item.title}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg">
                                  <span className="text-2xl">🎬</span>
                                </div>
                              )}
                            </AspectRatio>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium line-clamp-2 group-hover:text-primary transition-colors">
                              {item.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mt-1">
                              KHMERZOON
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                ) : (
                  <p className="text-xs text-muted-foreground px-3">No related content available</p>
                )}
              </div>
            </div>

            <Separator />

            {/* Subscriptions */}
            <div>
              <h3 className="px-3 mb-3 text-sm font-semibold text-muted-foreground flex items-center gap-2">
                <Users className="h-5 w-5" />
                Subscriptions
              </h3>
              <div className="space-y-2">
                {['Tech Channel', 'Cooking Masters', 'Travel Vlogs'].map((channel) => (
                  <button
                    key={channel}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-accent transition-colors text-left text-gray-800 dark:text-white"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {channel.charAt(0)}
                      </span>
                    </div>
                    <span className="text-sm font-medium truncate">{channel}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>
      </aside>
    </>
  );
};

export default WatchSidebar;
