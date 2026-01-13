import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
  metadata?: any;
  poster_url?: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const previousCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize notification sound
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ4NVKzn77BjHAU7k9n0zn0vBSh+zPLaizsIGGS57OihUg8OT6Lj8LhlHQQ2jdXzzIEzBh1qu+rmnlEODlKm5fCsYBoEOI/X88l7LwUme8rx3I1ACRNbte3op1UPCkuf3/bDeiwGMYnU88yAMQYeb73v45xPDwxSpePxrWMdBTmP1/POfDEGKn/M8tyJOwgZZrjt46JUDwxPpOPwtmQcBDmR1/PMfC4GKHzL8dySQQoVXrTp66hTEApHnt/yvmwhBTKH0fLTgjIGHm3A7eSaUQ0OVKzi8K9iHQU5kdj0zn0wBil+y/DbjDsIF2O57OWhURAPT6Xk8bBkHAQ4j9bzyH0wBSh9y/HajDsIF2W56uWiUg8PTqTj8bFjHAU5j9fzy34xBSh/y/DajDwIF2O46uSgUQ8OUKTi8K9kHAU5j9bzyH4yBSh/y/DajTsIF2S56uWiUw8OTaPj8LBlHAU5j9bzyXwwBSiBy/DbjToIF2O46uSiUg8OT6Pj8LBkHQU5j9fzyngwBSeDy/DcizsIF2S46uWhUg8OT6Li8LBkHQQ4kNfzy3kwBSh/y/DajDoIG2S56+WjUg8PTqPj8K9kHAU5j9fzy3kwBSh/y/DajDoIG2O56+WiUg8OT6Pi8LBkHAU5j9fzy3gwBSh+y/DajDoIG2O56+WiUw8OT6Pi8LBlHQU5j9fzy3kxBSh/y/DbjDsIF2O56+SiUg8OT6Pi8K9kHQU5j9fzyHkwBSh/y/DbjDsIF2O56uWiUg8OT6Pi8K9kHQU5j9fzyHkxBSh/y/DbjDsIF2O56uWiUg8OT6Pi8K9kHQQ4j9fzy3gwBSh/y/DajDoIG2O56+WiUg8OT6Pi8LBkHAU5j9fzy3kwBSh/y/DajDoIG2O56+WiUg8OT6Pj8LBkHAU5jtfzyHkwBSh/y/DajDsIG2O56+WiUg8OT6Pi8K9kHQU5j9fzy3gwBSh/y/DbjDsIF2O56+WiUg8OT6Pi8K9kHQU5j9fzy3kwBSh/y/DajDoIG2O56+WiUg8OT6Pi8K9kHAU5j9fzy3kwBSh/y/DajDoIG2O56+WiUg8OT6Pj8LBkHAU5j9fzy3gwBSh/y/DbjDsIF2O56+WiUg8OT6Pi8K9kHQU5j9fzy3gwBSh/y/DbjDsIG2O56+WiUg8OT6Pi8K9kHQU5j9fzy3gwBSh/y/DbjDsIG2O56+WiUg8OT6Pi8K9kHQU5j9fzy3gwBSh/y/DbjDsIG2O56+WiUg8');
    
    // Request notification permission
    requestNotificationPermission();
    
    fetchNotifications();

    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_notifications'
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Play sound and show browser notification when new notifications arrive
  useEffect(() => {
    if (!loading && notifications.length > previousCountRef.current && previousCountRef.current > 0) {
      // Play notification sound
      if (audioRef.current) {
        audioRef.current.play().catch(err => console.log('Audio play failed:', err));
      }

      // Show browser push notification
      const latestNotification = notifications[0];
      if (permissionGranted && latestNotification) {
        showBrowserNotification(latestNotification);
      }
    }
    previousCountRef.current = notifications.length;
  }, [notifications, loading, permissionGranted]);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionGranted(permission === 'granted');
    }
  };

  const showBrowserNotification = (notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: notification.id,
        requireInteraction: false,
      });
    }
  };

  const fetchNotifications = async () => {
    const { data, error } = await supabase
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (!error && data) {
      // Fetch poster URLs for notifications with content_id or episode_id
      const enrichedNotifications = await Promise.all(
        data.map(async (notification) => {
          let poster_url = null;
          const metadata = notification.metadata as any;
          
          if (metadata?.content_id) {
            const { data: content } = await supabase
              .from('content')
              .select('poster_path')
              .eq('id', metadata.content_id)
              .single();
            poster_url = content?.poster_path;
          } else if (metadata?.episode_id) {
            const { data: episode } = await supabase
              .from('episodes')
              .select('still_path')
              .eq('id', metadata.episode_id)
              .single();
            poster_url = episode?.still_path;
          }
          
          return { ...notification, poster_url };
        })
      );
      
      setNotifications(enrichedNotifications);
      setUnreadCount(enrichedNotifications.filter(n => !n.is_read).length);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('admin_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('id', id);
    
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    await supabase
      .from('admin_notifications')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('is_read', false);
    
    fetchNotifications();
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications
  };
};
