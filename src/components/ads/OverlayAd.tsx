import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface OverlayAdProps {
  onClose: () => void;
  currentTime?: number;
}

export const OverlayAd = ({ onClose, currentTime }: OverlayAdProps) => {
  const [countdown, setCountdown] = useState(5);
  const [canClose, setCanClose] = useState(false);
  const [ad, setAd] = useState<{ image_url?: string; link_url?: string } | null>(null);

  useEffect(() => {
    const fetchAd = async () => {
      const { data } = await supabase
        .from('ads')
        .select('image_url, link_url')
        .eq('is_active', true)
        .eq('placement', 'video_overlay')
        .limit(1)
        .maybeSingle();

      setAd(data);
    };

    fetchAd();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanClose(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute bottom-20 right-4 z-50 max-w-xs">
      <div className="relative bg-background/95 backdrop-blur-sm rounded-lg border shadow-lg overflow-hidden">
        {/* Close Button */}
        <div className="absolute top-2 right-2 z-10">
          {canClose ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 bg-black/50 hover:bg-black/70 text-white"
              onClick={onClose}
            >
              <X className="h-3 w-3" />
            </Button>
          ) : (
            <span className="bg-black/50 text-white text-xs px-2 py-1 rounded">
              {countdown}s
            </span>
          )}
        </div>

        {/* Ad Content */}
        {ad?.image_url ? (
          <a 
            href={ad.link_url || '#'} 
            target="_blank" 
            rel="noopener noreferrer"
            onClick={(e) => !ad.link_url && e.preventDefault()}
          >
            <img 
              src={ad.image_url} 
              alt="Advertisement" 
              className="w-full h-auto"
            />
          </a>
        ) : (
          <div className="p-4 text-center">
            <p className="text-sm font-medium">Advertisement</p>
            <p className="text-xs text-muted-foreground">Support us by viewing this ad</p>
          </div>
        )}
      </div>
    </div>
  );
};
