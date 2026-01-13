import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Search } from 'lucide-react';
import { TableSkeleton } from './TableSkeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface MediaTableProps {
  selectedType: string;
}

export function MediaTable({ selectedType }: MediaTableProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: content, isLoading } = useQuery({
    queryKey: ['admin-content', selectedType],
    queryFn: async () => {
      let query = supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (selectedType !== 'all') {
        query = query.eq('content_type', selectedType);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredContent = content?.filter((item) =>
    item.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Access</TableHead>
              <TableHead>Genre</TableHead>
              <TableHead>Year</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredContent?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center">
                  No content found
                </TableCell>
              </TableRow>
            ) : (
              filteredContent?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.content_type === 'movie' ? 'Movie' : 'Series'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={item.access_type === 'free' ? 'default' : 'secondary'}
                    >
                      {item.access_type?.toUpperCase() || 'FREE'}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{item.genre || '-'}</TableCell>
                  <TableCell>{item.release_year || '-'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/content/${item.id}/edit`)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
