import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface SuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: any;
}

export function SuggestionDialog({ open, onOpenChange, suggestion }: SuggestionDialogProps) {
  if (!suggestion) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suggestion Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium">Title</p>
            <p className="text-sm text-muted-foreground">{suggestion.title}</p>
          </div>
          <div>
            <p className="text-sm font-medium">Description</p>
            <p className="text-sm text-muted-foreground">{suggestion.description}</p>
          </div>
          <div className="flex gap-2">
            <Badge>{suggestion.type}</Badge>
            <Badge variant="outline">{suggestion.status}</Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
