import { useNavigate } from 'react-router-dom';
import { useFeaturedContent } from '@/hooks/useFeaturedContent';
import { TableSkeleton } from './TableSkeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, ArrowUp, ArrowDown, Image, Pencil } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function FeaturedTable() {
  const navigate = useNavigate();
  const { items, isLoading, deleteItem, updatePosition } = useFeaturedContent();

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (!items.length) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No featured content yet. Add your first featured item to get started.
      </div>
    );
  }

  const handleMoveUp = (id: string, currentPosition: number) => {
    if (currentPosition > 1) {
      updatePosition({ id, position: currentPosition - 1 });
    }
  };

  const handleMoveDown = (id: string, currentPosition: number) => {
    if (currentPosition < items.length) {
      updatePosition({ id, position: currentPosition + 1 });
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Position</TableHead>
            <TableHead className="w-20">Image</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Section</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.position}</TableCell>
              <TableCell>
                {item.image_url || item.poster_path || item.backdrop_path ? (
                  <img
                    src={item.image_url || item.poster_path || item.backdrop_path || ''}
                    alt={item.title}
                    className="w-12 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                    <Image className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">{item.title}</TableCell>
              <TableCell>
                <Badge variant="outline">{item.content_type}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{item.section}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={item.status === 'active' ? 'default' : 'secondary'}>
                  {item.status || 'active'}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveUp(item.id, item.position)}
                    disabled={item.position === 1}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleMoveDown(item.id, item.position)}
                    disabled={item.position === items.length}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => navigate(`/admin/featured/${item.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Featured Item</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to remove "{item.title}" from featured content?
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteItem(item.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
