import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface InteractionCounts {
  likes: number;
  dislikes: number;
  views: number;
}

interface UserInteraction {
  liked: boolean;
  disliked: boolean;
  inMyList: boolean;
}

export const useContentInteractions = (contentId: string | undefined, userId: string | undefined) => {
  const { toast } = useToast();
  const [counts, setCounts] = useState<InteractionCounts>({ likes: 0, dislikes: 0, views: 0 });
  const [userInteraction, setUserInteraction] = useState<UserInteraction>({ liked: false, disliked: false, inMyList: false });
  const [loading, setLoading] = useState(false);

  // Fetch interaction counts and user's current interactions
  const fetchInteractions = useCallback(async () => {
    if (!contentId) return;

    try {
      // Get like/dislike counts
      const { data: interactionData } = await supabase
        .from('content_interactions')
        .select('interaction_type')
        .eq('content_id', contentId);

      const likes = interactionData?.filter(i => i.interaction_type === 'like').length || 0;
      const dislikes = interactionData?.filter(i => i.interaction_type === 'dislike').length || 0;

      // Get view count
      const { data: contentData } = await supabase
        .from('content')
        .select('view_count')
        .eq('id', contentId)
        .maybeSingle();

      setCounts({
        likes,
        dislikes,
        views: contentData?.view_count || 0
      });

      // Get user's interactions if logged in
      if (userId) {
        const { data: userInteractionData } = await supabase
          .from('content_interactions')
          .select('interaction_type')
          .eq('content_id', contentId)
          .eq('user_id', userId)
          .maybeSingle();

        const { data: myListData } = await supabase
          .from('my_list')
          .select('id')
          .eq('content_id', contentId)
          .eq('user_id', userId)
          .maybeSingle();

        setUserInteraction({
          liked: userInteractionData?.interaction_type === 'like',
          disliked: userInteractionData?.interaction_type === 'dislike',
          inMyList: !!myListData
        });
      }
    } catch (error) {
      console.error('Error fetching interactions:', error);
    }
  }, [contentId, userId]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  // Record a view
  const recordView = useCallback(async () => {
    if (!contentId) return;

    try {
      // Insert view record
      await supabase.from('content_views').insert({
        content_id: contentId,
        user_id: userId || null,
        session_id: `session_${Date.now()}`
      });

      // Increment view count
      await supabase.rpc('increment_view_count', { p_content_id: contentId });

      setCounts(prev => ({ ...prev, views: prev.views + 1 }));
    } catch (error) {
      console.error('Error recording view:', error);
    }
  }, [contentId, userId]);

  // Handle like
  const handleLike = useCallback(async () => {
    if (!contentId || !userId) return false;

    setLoading(true);
    try {
      if (userInteraction.liked) {
        // Remove like
        await supabase
          .from('content_interactions')
          .delete()
          .eq('content_id', contentId)
          .eq('user_id', userId)
          .eq('interaction_type', 'like');

        setUserInteraction(prev => ({ ...prev, liked: false }));
        setCounts(prev => ({ ...prev, likes: prev.likes - 1 }));
        toast({ title: 'Like removed' });
      } else {
        // Remove dislike if exists
        if (userInteraction.disliked) {
          await supabase
            .from('content_interactions')
            .delete()
            .eq('content_id', contentId)
            .eq('user_id', userId)
            .eq('interaction_type', 'dislike');

          setCounts(prev => ({ ...prev, dislikes: prev.dislikes - 1 }));
        }

        // Add like
        await supabase.from('content_interactions').insert({
          content_id: contentId,
          user_id: userId,
          interaction_type: 'like'
        });

        setUserInteraction(prev => ({ ...prev, liked: true, disliked: false }));
        setCounts(prev => ({ ...prev, likes: prev.likes + 1 }));
        toast({ title: 'Liked!' });
      }
      return true;
    } catch (error) {
      console.error('Error handling like:', error);
      toast({ title: 'Error', description: 'Could not update like', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [contentId, userId, userInteraction, toast]);

  // Handle dislike
  const handleDislike = useCallback(async () => {
    if (!contentId || !userId) return false;

    setLoading(true);
    try {
      if (userInteraction.disliked) {
        // Remove dislike
        await supabase
          .from('content_interactions')
          .delete()
          .eq('content_id', contentId)
          .eq('user_id', userId)
          .eq('interaction_type', 'dislike');

        setUserInteraction(prev => ({ ...prev, disliked: false }));
        setCounts(prev => ({ ...prev, dislikes: prev.dislikes - 1 }));
        toast({ title: 'Dislike removed' });
      } else {
        // Remove like if exists
        if (userInteraction.liked) {
          await supabase
            .from('content_interactions')
            .delete()
            .eq('content_id', contentId)
            .eq('user_id', userId)
            .eq('interaction_type', 'like');

          setCounts(prev => ({ ...prev, likes: prev.likes - 1 }));
        }

        // Add dislike
        await supabase.from('content_interactions').insert({
          content_id: contentId,
          user_id: userId,
          interaction_type: 'dislike'
        });

        setUserInteraction(prev => ({ ...prev, disliked: true, liked: false }));
        setCounts(prev => ({ ...prev, dislikes: prev.dislikes + 1 }));
        toast({ title: 'Disliked' });
      }
      return true;
    } catch (error) {
      console.error('Error handling dislike:', error);
      toast({ title: 'Error', description: 'Could not update dislike', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [contentId, userId, userInteraction, toast]);

  // Handle add/remove from my list
  const handleMyList = useCallback(async (contentTitle?: string, posterPath?: string, contentType?: string) => {
    if (!contentId || !userId) return false;

    setLoading(true);
    try {
      if (userInteraction.inMyList) {
        // Remove from list
        await supabase
          .from('my_list')
          .delete()
          .eq('content_id', contentId)
          .eq('user_id', userId);

        setUserInteraction(prev => ({ ...prev, inMyList: false }));
        toast({ title: 'Removed from My List' });
      } else {
        // Add to list
        await supabase.from('my_list').insert({
          content_id: contentId,
          user_id: userId
        });

        setUserInteraction(prev => ({ ...prev, inMyList: true }));
        toast({ title: 'Added to My List!' });
      }
      return true;
    } catch (error) {
      console.error('Error handling my list:', error);
      toast({ title: 'Error', description: 'Could not update list', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [contentId, userId, userInteraction, toast]);

  // Handle report
  const handleReport = useCallback(async (reportType: string, description: string, episodeId?: string) => {
    if (!contentId || !userId) return false;

    setLoading(true);
    try {
      await supabase.from('reports').insert({
        content_id: contentId,
        user_id: userId,
        episode_id: episodeId || null,
        report_type: reportType,
        description: description
      });

      toast({ title: 'Report submitted', description: 'Thank you for your feedback' });
      return true;
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({ title: 'Error', description: 'Could not submit report', variant: 'destructive' });
      return false;
    } finally {
      setLoading(false);
    }
  }, [contentId, userId, toast]);

  return {
    counts,
    userInteraction,
    loading,
    recordView,
    handleLike,
    handleDislike,
    handleMyList,
    handleReport,
    refetch: fetchInteractions
  };
};
