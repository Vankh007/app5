import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { X } from 'lucide-react';

interface Ad {
  id: string;
  name: string;
  image_url: string | null;
  link_url: string | null;
  ad_code: string | null;
}

interface AdSlotProps {
  placement: string;
  pageLocation: string;
  className?: string;
}

const AdSlot = ({ placement, pageLocation, className = '' }: AdSlotProps) => {
  const [ad, setAd] = useState<Ad | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const fetchAd = async () => {
      try {
        const now = new Date().toISOString();
        
        const { data, error } = await supabase
          .from('ads')
          .select('id, name, image_url, link_url, ad_code')
          .eq('placement', placement)
          .eq('page_location', pageLocation)
          .eq('is_active', true)
          .or(`start_date.is.null,start_date.lte.${now}`)
          .or(`end_date.is.null,end_date.gte.${now}`)
          .order('priority', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching ad:', error);
          return;
        }

        setAd(data);

        // Track impression
        if (data) {
          await supabase.from('ad_analytics').insert({
            ad_id: data.id,
            event_type: 'impression',
          });
        }
      } catch (err) {
        console.error('Error fetching ad:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAd();
  }, [placement, pageLocation]);

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

  if (loading || !ad || dismissed) {
    return null;
  }

  // Render custom ad code if provided
  if (ad.ad_code) {
    return (
      <div 
        className={`ad-slot relative ${className}`}
        dangerouslySetInnerHTML={{ __html: ad.ad_code }}
      />
    );
  }

  // Render image ad
  if (ad.image_url) {
    return (
      <div className={`ad-slot relative group ${className}`}>
        <div 
          className="cursor-pointer rounded-lg overflow-hidden border border-border/50 hover:border-primary/50 transition-colors"
          onClick={handleClick}
        >
          <img 
            src={ad.image_url} 
            alt={ad.name}
            className="w-full h-auto object-cover"
          />
        </div>
        <span className="absolute top-1 left-1 text-[10px] text-muted-foreground/60 bg-background/80 px-1 rounded">
          Ad
        </span>
      </div>
    );
  }

  return null;
};

export default AdSlot;
