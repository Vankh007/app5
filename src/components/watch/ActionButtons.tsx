import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown, Share2, Bookmark, Flag, MoreVertical, Eye } from 'lucide-react';
import { AuthDialog } from '@/components/AuthDialog';
import { ReportDialog } from '@/components/ReportDialog';
import { ShareDialog } from '@/components/ShareDialog';
import { useContentInteractions } from '@/hooks/useContentInteractions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ActionButtonsProps {
  contentId?: string;
  contentType?: 'movie' | 'series';
  episodeId?: string;
  userId?: string;
  contentTitle?: string;
  posterPath?: string;
  tmdbId?: string | number;
  seasonNumber?: number;
  episodeNumber?: number;
}

const formatViewCount = (count: number): string => {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return count.toString();
};

export const ActionButtons = ({ 
  contentId, 
  contentType = 'movie', 
  episodeId, 
  userId, 
  contentTitle,
  posterPath,
  tmdbId,
  seasonNumber,
  episodeNumber
}: ActionButtonsProps) => {
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [viewRecorded, setViewRecorded] = useState(false);

  const {
    counts,
    userInteraction,
    loading,
    recordView,
    handleLike,
    handleDislike,
    handleMyList,
  } = useContentInteractions(contentId, userId);

  // Record view once when component mounts
  useEffect(() => {
    if (contentId && !viewRecorded) {
      recordView();
      setViewRecorded(true);
    }
  }, [contentId, recordView, viewRecorded]);

  const requireAuth = (action: () => void) => {
    if (!userId) {
      setShowAuthDialog(true);
      return;
    }
    action();
  };

  const onLikeClick = () => {
    requireAuth(() => handleLike());
  };

  const onDislikeClick = () => {
    requireAuth(() => handleDislike());
  };

  const onShareClick = () => {
    setShowShareDialog(true);
  };

  const onSaveClick = () => {
    requireAuth(() => handleMyList(contentTitle, posterPath, contentType));
  };

  const onReportClick = () => {
    requireAuth(() => setShowReportDialog(true));
  };

  return (
    <>
      <div className="flex items-center gap-1 flex-wrap">
        {/* Views count */}
        <div className="flex items-center gap-1 text-muted-foreground px-2 py-1">
          <Eye className="h-4 w-4" />
          <span className="text-sm">{formatViewCount(counts.views)}</span>
        </div>

        {/* Like button with count */}
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 gap-1 ${userInteraction.liked ? 'text-primary' : ''}`}
          onClick={onLikeClick}
          disabled={loading}
        >
          <ThumbsUp className="h-4 w-4" fill={userInteraction.liked ? 'currentColor' : 'none'} />
          {counts.likes > 0 && <span className="text-xs">{formatViewCount(counts.likes)}</span>}
        </Button>

        {/* Dislike button with count */}
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-8 gap-1 ${userInteraction.disliked ? 'text-destructive' : ''}`}
          onClick={onDislikeClick}
          disabled={loading}
        >
          <ThumbsDown className="h-4 w-4" fill={userInteraction.disliked ? 'currentColor' : 'none'} />
          {counts.dislikes > 0 && <span className="text-xs">{formatViewCount(counts.dislikes)}</span>}
        </Button>

        {/* Share button */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onShareClick}>
          <Share2 className="h-4 w-4" />
        </Button>

        {/* Save to My List button */}
        <Button 
          variant="ghost" 
          size="icon" 
          className={`h-8 w-8 ${userInteraction.inMyList ? 'text-primary' : ''}`}
          onClick={onSaveClick}
          disabled={loading}
        >
          <Bookmark className="h-4 w-4" fill={userInteraction.inMyList ? 'currentColor' : 'none'} />
        </Button>

        {/* More options dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onReportClick}>
              <Flag className="h-4 w-4 mr-2" />
              Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AuthDialog 
        open={showAuthDialog} 
        onOpenChange={setShowAuthDialog}
      />

      {contentId && (
        <ReportDialog
          open={showReportDialog}
          onOpenChange={setShowReportDialog}
          contentId={contentId}
          episodeId={episodeId}
        />
      )}

      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        contentTitle={contentTitle}
        contentType={contentType}
        tmdbId={tmdbId}
        seasonNumber={seasonNumber}
        episodeNumber={episodeNumber}
      />
    </>
  );
};
