import { ChevronDown, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BulkActionsDropdownProps {
  selectedCount: number;
  onSetStatus: (status: string) => void;
  onSetVersion: (version: string) => void;
  onDelete: () => void;
  isLoading?: boolean;
}

export function BulkActionsDropdown({
  selectedCount,
  onSetStatus,
  onSetVersion,
  onDelete,
  isLoading,
}: BulkActionsDropdownProps) {
  if (selectedCount === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isLoading}>
          Actions ({selectedCount})
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Status</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => onSetStatus('active')}>
              <span className="h-2 w-2 rounded-full bg-green-500 mr-2" />
              Public
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetStatus('draft')}>
              <span className="h-2 w-2 rounded-full bg-yellow-500 mr-2" />
              Draft
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>Version</DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem onClick={() => onSetVersion('free')}>
              Free
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetVersion('membership')}>
              Membership
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetVersion('purchase')}>
              Purchase
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
