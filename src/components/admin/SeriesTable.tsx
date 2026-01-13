import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Pencil, Trash2 } from 'lucide-react';
import { TableSkeleton } from './TableSkeleton';
import { BulkActionsDropdown } from './BulkActionsDropdown';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function SeriesTable() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: series, isLoading } = useQuery({
    queryKey: ['admin-series'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content')
        .select(`
          *,
          upcoming_releases!content_id(status)
        `)
        .eq('content_type', 'series')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return data?.filter((series: any) => {
        const upcomingRelease = series.upcoming_releases?.[0];
        return !upcomingRelease || upcomingRelease.status === 'released';
      }) || [];
    },
  });

  const filteredSeries = series?.filter((s) =>
    s.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data: contentData } = await supabase
        .from('content')
        .select('tmdb_id')
        .in('id', ids);
      
      const tmdbIds = contentData?.map(c => c.tmdb_id).filter(Boolean) as number[];

      await supabase.from('trailers').delete().in('content_id', ids);

      if (tmdbIds.length > 0) {
        await supabase.from('cast_credits').delete().in('tmdb_content_id', tmdbIds);
      }

      const { error } = await supabase.from('content').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Series deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-series'] });
      setSelectedIds([]);
    },
    onError: (error: Error) => {
      toast.error('Failed to delete series: ' + error.message);
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase.from('content').update({ status }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      toast.success(`${selectedIds.length} series set to ${status}`);
      queryClient.invalidateQueries({ queryKey: ['admin-series'] });
      setSelectedIds([]);
    },
    onError: (error: Error) => {
      toast.error('Failed to update status: ' + error.message);
    },
  });

  const versionMutation = useMutation({
    mutationFn: async ({ ids, access_type }: { ids: string[]; access_type: 'free' | 'membership' | 'purchase' }) => {
      const { error } = await supabase.from('content').update({ access_type }).in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, { access_type }) => {
      toast.success(`${selectedIds.length} series set to ${access_type}`);
      queryClient.invalidateQueries({ queryKey: ['admin-series'] });
      setSelectedIds([]);
    },
    onError: (error: Error) => {
      toast.error('Failed to update version: ' + error.message);
    },
  });

  const handleSetStatus = (status: string) => {
    if (selectedIds.length === 0) return;
    statusMutation.mutate({ ids: selectedIds, status });
  };

  const handleSetVersion = (access_type: string) => {
    if (selectedIds.length === 0) return;
    versionMutation.mutate({ ids: selectedIds, access_type: access_type as 'free' | 'membership' | 'purchase' });
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedIds(checked ? (filteredSeries?.map(s => s.id) || []) : []);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    setSelectedIds(checked ? [...selectedIds, id] : selectedIds.filter(sid => sid !== id));
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Delete ${selectedIds.length} series?`)) {
      deleteMutation.mutate(selectedIds);
    }
  };

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search series..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <BulkActionsDropdown
          selectedCount={selectedIds.length}
          onSetStatus={handleSetStatus}
          onSetVersion={handleSetVersion}
          onDelete={handleDelete}
          isLoading={deleteMutation.isPending || statusMutation.isPending || versionMutation.isPending}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === filteredSeries?.length && filteredSeries?.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Cover</TableHead>
              <TableHead>TMDB ID</TableHead>
              <TableHead>IMDB ID</TableHead>
              <TableHead>Views</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Vote</TableHead>
              <TableHead>Pinned</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Version</TableHead>
              <TableHead className="text-right">Options</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSeries?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center">
                  No series found
                </TableCell>
              </TableRow>
            ) : (
              filteredSeries?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(s.id)}
                      onCheckedChange={(checked) => handleSelectOne(s.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell>
                    {s.poster_path ? (
                      <img
                        src={s.poster_path}
                        alt={s.title}
                        className="w-12 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-12 h-16 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                        No poster
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{s.tmdb_id || '-'}</TableCell>
                  <TableCell>-</TableCell>
                  <TableCell>0</TableCell>
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      ⭐ {s.popularity ? (s.popularity / 10).toFixed(1) : '0'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1">
                      📌 No
                    </span>
                  </TableCell>
                  <TableCell>
                    <select 
                      className="px-3 py-1 rounded border bg-background"
                      value={s.status || 'active'}
                      onChange={(e) => {
                        statusMutation.mutate({ ids: [s.id], status: e.target.value });
                      }}
                    >
                      <option value="active">Public</option>
                      <option value="draft">Draft</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    <select className="px-3 py-1 rounded border bg-background">
                      <option>{s.access_type === 'free' ? 'Free' : s.access_type === 'membership' ? 'Premium' : 'Purchase'}</option>
                    </select>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/admin/series/${s.tmdb_id}/edit`)}
                        disabled={!s.tmdb_id}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this series?')) {
                            deleteMutation.mutate([s.id]);
                          }
                        }}
                      >
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
