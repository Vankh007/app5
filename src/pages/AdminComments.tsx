import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, MessageSquare, MoreHorizontal, Check, X, Trash2, Pin, ThumbsUp, ThumbsDown, Reply, Film, Tv } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { TableSkeleton } from "@/components/admin/TableSkeleton";

interface Comment {
  id: string;
  content: string;
  user_id: string;
  content_id: string;
  episode_id: string | null;
  is_approved: boolean;
  is_pinned: boolean;
  likes: number;
  dislikes: number;
  created_at: string;
  parent_id: string | null;
  user_profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  };
  content_info?: {
    title: string;
    content_type: string;
  };
  episode_info?: {
    title: string;
    episode_number: number;
    season_id: string;
  };
}

export default function AdminComments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [replyComment, setReplyComment] = useState<Comment | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery<Comment[]>({
    queryKey: ["admin-comments", filter],
    queryFn: async () => {
      let query = supabase
        .from("comments")
        .select(`
          *,
          user_profiles:user_id (full_name, avatar_url),
          content_info:content_id (title, content_type),
          episode_info:episode_id (title, episode_number, season_id)
        `)
        .order("created_at", { ascending: false });

      if (filter === "pending") {
        query = query.eq("is_approved", false);
      } else if (filter === "approved") {
        query = query.eq("is_approved", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Fetch season info for episodes
      const episodeIds = data?.filter(c => c.episode_info?.season_id).map(c => c.episode_info.season_id) || [];
      let seasonsMap: Record<string, { season_number: number }> = {};
      
      if (episodeIds.length > 0) {
        const { data: seasons } = await supabase
          .from("seasons")
          .select("id, season_number")
          .in("id", episodeIds);
        
        if (seasons) {
          seasonsMap = Object.fromEntries(seasons.map(s => [s.id, { season_number: s.season_number }]));
        }
      }
      
      // Attach season info to comments
      return (data || []).map(comment => ({
        ...comment,
        season_info: comment.episode_info?.season_id ? seasonsMap[comment.episode_info.season_id] : null
      }));
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("comments")
        .update({ is_approved: approved })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
      toast.success("Comment updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update comment: " + error.message);
    },
  });

  const pinMutation = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase
        .from("comments")
        .update({ is_pinned: pinned })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
      toast.success("Comment updated");
    },
    onError: (error: any) => {
      toast.error("Failed to update comment: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("comments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
      toast.success("Comment deleted");
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error("Failed to delete comment: " + error.message);
    },
  });

  const replyMutation = useMutation({
    mutationFn: async ({ parentComment, content }: { parentComment: Comment; content: string }) => {
      // Get current admin user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("comments")
        .insert({
          content,
          content_id: parentComment.content_id,
          episode_id: parentComment.episode_id,
          user_id: user.id,
          parent_id: parentComment.id,
          is_approved: true, // Admin replies are auto-approved
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-comments"] });
      toast.success("Reply posted");
      setReplyComment(null);
      setReplyContent("");
    },
    onError: (error: any) => {
      toast.error("Failed to post reply: " + error.message);
    },
  });

  const filteredComments = comments.filter(
    (comment) =>
      comment.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.user_profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      comment.content_info?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pendingCount = comments.filter((c) => !c.is_approved).length;

  const getContentTypeIcon = (contentType?: string) => {
    if (contentType === 'series' || contentType === 'anime-series') {
      return <Tv className="h-3 w-3" />;
    }
    return <Film className="h-3 w-3" />;
  };

  const formatContentLocation = (comment: Comment & { season_info?: { season_number: number } | null }) => {
    const title = comment.content_info?.title || "Unknown Content";
    const contentType = comment.content_info?.content_type;
    
    if (comment.episode_info) {
      const seasonNum = comment.season_info?.season_number || 1;
      const epNum = comment.episode_info.episode_number;
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            {getContentTypeIcon(contentType)}
            <span className="font-medium truncate max-w-[150px]">{title}</span>
          </div>
          <Badge variant="outline" className="text-xs">
            S{seasonNum} E{epNum}: {comment.episode_info.title}
          </Badge>
        </div>
      );
    }
    
    return (
      <div className="flex items-center gap-1.5">
        {getContentTypeIcon(contentType)}
        <span className="truncate max-w-[150px]">{title}</span>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Comments</h1>
            <p className="text-muted-foreground">
              Moderate user comments ({comments.length} total, {pendingCount} pending)
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search comments..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("all")}
                >
                  All
                </Button>
                <Button
                  variant={filter === "pending" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("pending")}
                >
                  Pending
                  {pendingCount > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {pendingCount}
                    </Badge>
                  )}
                </Button>
                <Button
                  variant={filter === "approved" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("approved")}
                >
                  Approved
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Content / Episode</TableHead>
                    <TableHead>Engagement</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredComments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">No comments found</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredComments.map((comment) => (
                      <TableRow key={comment.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {comment.user_profiles?.avatar_url ? (
                              <img 
                                src={comment.user_profiles.avatar_url} 
                                alt="" 
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                                <span className="text-xs">
                                  {(comment.user_profiles?.full_name || "A")[0].toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="truncate max-w-[100px]">
                              {comment.user_profiles?.full_name || "Anonymous"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="space-y-1">
                            {comment.parent_id && (
                              <Badge variant="secondary" className="text-xs">
                                <Reply className="h-3 w-3 mr-1" />
                                Reply
                              </Badge>
                            )}
                            <p className="truncate">{comment.content}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatContentLocation(comment as any)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1 text-green-600">
                              <ThumbsUp className="h-3 w-3" />
                              {comment.likes}
                            </span>
                            <span className="flex items-center gap-1 text-red-600">
                              <ThumbsDown className="h-3 w-3" />
                              {comment.dislikes}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {comment.is_pinned && (
                              <Badge variant="secondary" className="text-xs">
                                <Pin className="h-3 w-3 mr-1" />
                                Pinned
                              </Badge>
                            )}
                            <Badge
                              variant={comment.is_approved ? "default" : "destructive"}
                            >
                              {comment.is_approved ? "Approved" : "Pending"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(comment.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setReplyComment(comment)}
                              >
                                <Reply className="h-4 w-4 mr-2" />
                                Reply
                              </DropdownMenuItem>
                              {!comment.is_approved && (
                                <DropdownMenuItem
                                  onClick={() => approveMutation.mutate({ id: comment.id, approved: true })}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Approve
                                </DropdownMenuItem>
                              )}
                              {comment.is_approved && (
                                <DropdownMenuItem
                                  onClick={() => approveMutation.mutate({ id: comment.id, approved: false })}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Unapprove
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => pinMutation.mutate({ id: comment.id, pinned: !comment.is_pinned })}
                              >
                                <Pin className="h-4 w-4 mr-2" />
                                {comment.is_pinned ? "Unpin" : "Pin"}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteId(comment.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reply Dialog */}
      <Dialog open={!!replyComment} onOpenChange={() => { setReplyComment(null); setReplyContent(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Comment</DialogTitle>
            <DialogDescription>
              Replying to {replyComment?.user_profiles?.full_name || "Anonymous"}'s comment on "{replyComment?.content_info?.title}"
            </DialogDescription>
          </DialogHeader>
          
          {replyComment && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Original comment:</p>
                <p className="text-sm">{replyComment.content}</p>
              </div>
              
              <Textarea
                placeholder="Write your reply..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                rows={4}
              />
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReplyComment(null); setReplyContent(""); }}>
              Cancel
            </Button>
            <Button 
              onClick={() => replyComment && replyMutation.mutate({ parentComment: replyComment, content: replyContent })}
              disabled={!replyContent.trim() || replyMutation.isPending}
            >
              {replyMutation.isPending ? "Posting..." : "Post Reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}