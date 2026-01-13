import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface TrailerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trailerUrl: string;
}

export function TrailerDialog({ open, onOpenChange, trailerUrl }: TrailerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Trailer</DialogTitle>
        </DialogHeader>
        <div className="aspect-video">
          <iframe
            src={trailerUrl}
            className="w-full h-full"
            allowFullScreen
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
