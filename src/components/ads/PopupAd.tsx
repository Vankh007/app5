import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Ad {
  id: string;
  name: string;
  image_url: string | null;
  link_url: string | null;
  ad_code: string | null;
  countdown_seconds: number | null;
}

interface PopupAdProps {
  pageLocation: string;
  onClose?: () => void;
}

const PopupAd = ({ pageLocation, onClose }: PopupAdProps) => {
  const [ad, setAd] = useState<Ad | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [canClose, setCanClose] = useState(false);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const now = new Date().toISOString();
        
        const { data, error } = await supabase
          .from('ads')
          .select('id, name, image_url, link_url, ad_code, countdown_seconds')
          .eq('placement', 'popup')
          .eq('page_location', pageLocation)
          .eq('is_active', true)
          .or(`start_date.is.null,start_date.lte.${now}`)
          .or(`end_date.is.null,end_date.gte.${now}`)
          .order('priority', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching popup ad:', error);
          return;
        }

        if (data) {
          setAd(data);
          setCountdown(data.countdown_seconds || 5);
          setIsOpen(true);

          // Track impression
          await supabase.from('ad_analytics').insert({
            ad_id: data.id,
            event_type: 'impression',
          });
        }
      } catch (err) {
        console.error('Error fetching popup ad:', err);
      }
    };

    // Delay showing popup by 2 seconds after page load
    const timer = setTimeout(fetchAd, 2000);
    return () => clearTimeout(timer);
  }, [pageLocation]);

  useEffect(() => {
    if (!isOpen || countdown <= 0) {
      setCanClose(true);
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanClose(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, countdown]);

  const handleClose = useCallback(() => {
    if (!canClose) return;
    setIsOpen(false);
    onClose?.();
  }, [canClose, onClose]);

  const handleClick = async () => {
    if (!ad) return;

    // Track click
    await supabase.from('ad_analytics').insert({
      ad_id: ad.id,
      event_type: 'click',
    });

    if (ad.link_url) {
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!ad) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => canClose && setIsOpen(open)}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-border bg-background">
        <div className="relative">
          {/* Close button with countdown */}
          <div className="absolute top-2 right-2 z-10">
            {canClose ? (
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full bg-background/80 hover:bg-background"
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <div className="h-8 w-8 rounded-full bg-background/80 flex items-center justify-center text-sm font-medium">
                {countdown}
              </div>
            )}
          </div>

          {/* Ad label */}
          <span className="absolute top-2 left-2 text-[10px] text-muted-foreground/80 bg-background/80 px-2 py-0.5 rounded z-10">
            Advertisement
          </span>

          {/* Ad content */}
          <div className="cursor-pointer" onClick={handleClick}>
            {ad.ad_code ? (
              <div dangerouslySetInnerHTML={{ __html: ad.ad_code }} />
            ) : ad.image_url ? (
              <img 
                src={ad.image_url} 
                alt={ad.name}
                className="w-full h-auto object-cover"
              />
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PopupAd;
