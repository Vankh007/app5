import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageCircle, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface CommentItemProps {
  comment: {
    id: string;
    content: string;
    created_at: string;
    likes: number;
    dislikes: number;
    user_id: string;
    content_id: string;
    episode_id: string | null;
    user_profiles?: {
      full_name: string | null;
      avatar_url: string | null;
    };
  };
  onReplySubmit?: (commentId: string) => void;
  currentUserId?: string;
  level?: number;
}

export const CommentItem = ({ comment, onReplySubmit, currentUserId, level = 0 }: CommentItemProps) => {
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userInteraction, setUserInteraction] = useState<'like' | 'dislike' | null>(null);
  const [localLikes, setLocalLikes] = useState(comment.likes);
  const [localDislikes, setLocalDislikes] = useState(comment.dislikes);
  const { toast } = useToast();

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)}w ago`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
    return `${Math.floor(diffInSeconds / 31536000)}y ago`;
  };

  const handleLikeDislike = async (type: 'like' | 'dislike') => {
    if (!currentUserId) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to interact with comments",
        variant: "destructive"
      });
      return;
    }

    try {
      if (userInteraction === type) {
        // Remove interaction
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', comment.id)
          .eq('user_id', currentUserId);

        if (type === 'like') {
          setLocalLikes(prev => Math.max(0, prev - 1));
        } else {
          setLocalDislikes(prev => Math.max(0, prev - 1));
        }
        setUserInteraction(null);
      } else if (userInteraction) {
        // Switch interaction
        await supabase
          .from('comment_likes')
          .update({ interaction_type: type })
          .eq('comment_id', comment.id)
          .eq('user_id', currentUserId);

        if (type === 'like') {
          setLocalLikes(prev => prev + 1);
          setLocalDislikes(prev => Math.max(0, prev - 1));
        } else {
          setLocalDislikes(prev => prev + 1);
          setLocalLikes(prev => Math.max(0, prev - 1));
        }
        setUserInteraction(type);
      } else {
        // New interaction
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: comment.id,
            user_id: currentUserId,
            interaction_type: type
          });

        if (type === 'like') {
          setLocalLikes(prev => prev + 1);
        } else {
          setLocalDislikes(prev => prev + 1);
        }
        setUserInteraction(type);
      }
    } catch (error) {
      console.error('Error updating comment interaction:', error);
      toast({
        title: "Error",
        description: "Failed to update your reaction",
        variant: "destructive"
      });
    }
  };

  const handleReplySubmit = async () => {
    if (!replyContent.trim() || !currentUserId) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          content: replyContent.trim(),
          content_id: comment.content_id,
          episode_id: comment.episode_id,
          user_id: currentUserId,
          parent_id: comment.id
        });

      if (error) throw error;

      setReplyContent('');
      setShowReply(false);
      onReplySubmit?.(comment.id);

      toast({
        title: "Reply posted",
        description: "Your reply has been posted successfully"
      });
    } catch (error) {
      console.error('Error posting reply:', error);
      toast({
        title: "Error",
        description: "Failed to post reply",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayName = comment.user_profiles?.full_name || 'Anonymous User';
  const avatarUrl = comment.user_profiles?.avatar_url;
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={`flex gap-3 ${level > 0 ? 'ml-8 pt-3' : ''}`}>
      <Avatar className="w-10 h-10 flex-shrink-0">
        <AvatarImage src={avatarUrl || undefined} />
        <AvatarFallback className="bg-primary/20 text-primary text-sm font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-sm">{displayName}</span>
            <span className="text-xs text-muted-foreground">{formatTimeAgo(comment.created_at)}</span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => handleLikeDislike('like')}
            className={`flex items-center gap-1 text-xs transition-colors ${
              userInteraction === 'like' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            <span>{localLikes}</span>
          </button>

          <button
            onClick={() => handleLikeDislike('dislike')}
            className={`flex items-center gap-1 text-xs transition-colors ${
              userInteraction === 'dislike' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ThumbsDown className="w-4 h-4" />
            <span>{localDislikes}</span>
          </button>

          {level === 0 && (
            <button
              onClick={() => setShowReply(!showReply)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Reply</span>
            </button>
          )}
        </div>

        {showReply && (
          <div className="pt-2 space-y-2">
            <Textarea
              placeholder="Write a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReply(false);
                  setReplyContent('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleReplySubmit}
                disabled={!replyContent.trim() || isSubmitting}
              >
                {isSubmitting ? 'Posting...' : 'Reply'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
