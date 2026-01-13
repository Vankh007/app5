import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { TableSkeleton } from './TableSkeleton';
import { CastEditDialog } from './CastEditDialog';
import { Pencil } from 'lucide-react';

export function CastersTable() {
  const [selectedCast, setSelectedCast] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { data: casters, isLoading } = useQuery({
    queryKey: ['admin-casters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cast_members')
        .select('*')
        .order('popularity', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  if (isLoading) return <TableSkeleton />;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Photo</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Known For</TableHead>
            <TableHead>Popularity</TableHead>
            <TableHead>TMDB ID</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {casters?.map((caster) => (
            <TableRow key={caster.id}>
              <TableCell>
                <Avatar>
                  <AvatarImage 
                    src={caster.profile_path ? 
                      (caster.profile_path.startsWith('http') ? caster.profile_path : `https://image.tmdb.org/t/p/w185${caster.profile_path}`) 
                      : undefined} 
                    alt={caster.name} 
                  />
                  <AvatarFallback>{caster.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </TableCell>
              <TableCell className="font-medium">{caster.name}</TableCell>
              <TableCell>{caster.known_for_department || 'N/A'}</TableCell>
              <TableCell>{caster.popularity?.toFixed(1) || 'N/A'}</TableCell>
              <TableCell className="text-muted-foreground">{caster.tmdb_id}</TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedCast(caster);
                    setEditDialogOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {!casters?.length && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                No cast members found. Import content from TMDB to automatically add cast members.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      
      <CastEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        castMember={selectedCast}
      />
    </div>
  );
}
