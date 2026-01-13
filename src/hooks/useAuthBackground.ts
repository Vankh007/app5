import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface BackgroundContent {
  backdrop_path: string | null;
  poster_path: string | null;
}

const STORAGE_KEY = 'auth_background';
const TWELVE_HOURS = 12 * 60 * 60 * 1000; // 12 hours in milliseconds

export const useAuthBackground = () => {
  const [background, setBackground] = useState<BackgroundContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBackground = async () => {
      try {
        // Check localStorage for existing background
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const { data, timestamp } = JSON.parse(stored);
          const now = Date.now();
          
          // If less than 12 hours old, use cached version
          if (now - timestamp < TWELVE_HOURS) {
            setBackground(data);
            setLoading(false);
            return;
          }
        }

        // Fetch recent content
        const { data: content, error } = await supabase
          .from('content')
          .select('backdrop_path, poster_path')
          .not('backdrop_path', 'is', null)
          .not('poster_path', 'is', null)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) {
          console.error('Error fetching background:', error);
          setLoading(false);
          return;
        }

        if (content && content.length > 0) {
          // Select random item
          const randomIndex = Math.floor(Math.random() * content.length);
          const selectedBackground = content[randomIndex];

          // Store in localStorage with timestamp
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              data: selectedBackground,
              timestamp: Date.now()
            })
          );

          setBackground(selectedBackground);
        }
      } catch (err) {
        console.error('Error in fetchBackground:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBackground();
  }, []);

  return { background, loading };
};
