import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface UseProfileImageOptions {
  imagePath?: string | null;
  userId?: string;
}

export const useProfileImage = ({ imagePath, userId }: UseProfileImageOptions) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    const getSignedUrl = async () => {
      if (!imagePath) {
        setSignedUrl(null);
        return;
      }

      // If it's already a full URL, use it directly
      if (imagePath.startsWith('http')) {
        setSignedUrl(imagePath);
        return;
      }

      try {
        const { data } = await supabase.storage
          .from('avatars')
          .createSignedUrl(imagePath, 3600);

        setSignedUrl(data?.signedUrl || null);
      } catch (error) {
        console.error('Error getting signed URL:', error);
        setSignedUrl(null);
      }
    };

    getSignedUrl();
  }, [imagePath, userId]);

  return { signedUrl };
};
