import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import { CommentItem } from './CommentItem';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  likes: number;
  dislikes: number;
  user_id: string;
  parent_id: string | null;
  content_id: string;
  episode_id: string | null;
  user_profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface CommentsListProps {
  contentId: string;
  episodeId?: string | null;
}

export const CommentsList = ({ contentId, episodeId }: CommentsListProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    getCurrentUser();
  }, []);

  // Fetch comments
  const fetchComments = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('comments')
        .select('*')
        .eq('content_id', contentId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });

      if (episodeId) {
        query = query.eq('episode_id', episodeId);
      } else {
        query = query.is('episode_id', null);
      }

      const { data: commentsData, error: commentsError } = await query;

      if (commentsError) throw commentsError;

      // Fetch user profiles for all comment authors
      const userIds = [...new Set(commentsData?.map(c => c.user_id) || [])];
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('user_profiles')
          .select('id, full_name, avatar_url')
          .in('id', userIds);

        // Map profiles to comments
        const enrichedComments = commentsData?.map(comment => ({
          ...comment,
          user_profiles: profilesData?.find(p => p.id === comment.user_id)
        })) || [];

        setComments(enrichedComments);
      } else {
        setComments(commentsData || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast({
        title: "Error",
        description: "Failed to load comments",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [contentId, episodeId]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;

    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to post a comment",
        variant: "destructive"
      });
      navigate('/auth');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          content: newComment.trim(),
          content_id: contentId,
          episode_id: episodeId || null,
          user_id: currentUserId
        });

      if (error) throw error;

      setNewComment('');
      await fetchComments();

      toast({
        title: "Comment posted",
        description: "Your comment has been posted successfully"
      });
    } catch (error) {
      console.error('Error posting comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Organize comments into parent and child structure
  const parentComments = comments.filter(c => !c.parent_id);
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId);

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          <h3 className="font-semibold">
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </h3>
        </div>
        
        <div className="space-y-2">
          <Textarea
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={!currentUserId}
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={!newComment.trim() || isSubmitting || !currentUserId}
              size="sm"
            >
              {isSubmitting ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No comments yet. Be the first to comment!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {parentComments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              <CommentItem
                comment={comment}
                currentUserId={currentUserId || undefined}
                onReplySubmit={fetchComments}
              />
              {/* Replies */}
              {getReplies(comment.id).map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUserId={currentUserId || undefined}
                  level={1}
                />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
