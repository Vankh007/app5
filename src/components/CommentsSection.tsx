import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageSquare, ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface CommentsSectionProps {
  episodeId?: string;
  movieId?: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  likes: number;
  dislikes: number;
  user_id: string;
  profiles?: {
    username?: string;
    profile_image?: string;
  };
}

export const CommentsSection = ({ episodeId, movieId }: CommentsSectionProps) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);

  const contentId = episodeId || movieId;

  useEffect(() => {
    if (!contentId) return;

    const fetchComments = async () => {
      const { data } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (username, profile_image)
        `)
        .eq('content_id', contentId)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) setComments(data);
      setLoading(false);
    };

    fetchComments();
  }, [contentId]);

  const handleSubmit = async () => {
    if (!user || !contentId || !newComment.trim()) return;

    const { data, error } = await supabase
      .from('comments')
      .insert({
        content: newComment.trim(),
        content_id: contentId,
        user_id: user.id,
        episode_id: episodeId || null
      })
      .select()
      .single();

    if (!error && data) {
      setComments(prev => [data, ...prev]);
      setNewComment('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Comment Input */}
      {user ? (
        <div className="space-y-2">
          <Textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <Button 
            size="sm" 
            onClick={handleSubmit}
            disabled={!newComment.trim()}
          >
            Post Comment
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground text-center py-4">
          Please sign in to comment
        </p>
      )}

      {/* Comments List */}
      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No comments yet. Be the first!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex gap-3 p-3 rounded-lg bg-muted/30">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarImage src={comment.profiles?.profile_image} />
                <AvatarFallback className="text-xs">
                  {(comment.profiles?.username || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium">
                    {comment.profiles?.username || 'Anonymous'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-foreground/90">{comment.content}</p>
                <div className="flex items-center gap-3 mt-2">
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">
                    <ThumbsUp className="h-3 w-3" />
                    <span>{comment.likes || 0}</span>
                  </button>
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
                    <ThumbsDown className="h-3 w-3" />
                    <span>{comment.dislikes || 0}</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
