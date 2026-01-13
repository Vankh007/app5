import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useFileUpload } from '@/hooks/useFileUpload';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload } from 'lucide-react';

interface CastMember {
  id: string;
  tmdb_id: number;
  name: string;
  profile_path: string | null;
  biography: string | null;
  birthday: string | null;
  place_of_birth: string | null;
  known_for_department: string | null;
  popularity: number | null;
  gender: number | null;
  homepage: string | null;
  imdb_id: string | null;
}

interface CastEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  castMember: CastMember | null;
}

export function CastEditDialog({ open, onOpenChange, castMember }: CastEditDialogProps) {
  const [formData, setFormData] = useState<Partial<CastMember>>({});
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const queryClient = useQueryClient();

  const { uploadFile, uploading } = useFileUpload({
    bucket: 'cast-profiles',
    storage: 'storage1',
  });

  useEffect(() => {
    if (castMember) {
      setFormData(castMember);
    }
  }, [castMember]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!castMember) return;

      let profilePath = formData.profile_path;

      // Upload new profile image if selected
      if (profileImage) {
        const uploadedUrl = await uploadFile(profileImage);
        if (uploadedUrl) {
          profilePath = uploadedUrl;
        }
      }

      const { error } = await supabase
        .from('cast_members')
        .update({
          name: formData.name,
          profile_path: profilePath,
          biography: formData.biography,
          birthday: formData.birthday,
          place_of_birth: formData.place_of_birth,
          known_for_department: formData.known_for_department,
          homepage: formData.homepage,
          imdb_id: formData.imdb_id,
        })
        .eq('id', castMember.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-casters'] });
      toast.success('Cast member updated successfully');
      onOpenChange(false);
      setProfileImage(null);
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast.error('Failed to update cast member');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setProfileImage(e.target.files[0]);
    }
  };

  const getProfileImageUrl = () => {
    if (profileImage) {
      return URL.createObjectURL(profileImage);
    }
    if (formData.profile_path) {
      // Check if it's a TMDB path or uploaded path
      if (formData.profile_path.startsWith('http')) {
        return formData.profile_path;
      }
      return `https://image.tmdb.org/t/p/w185${formData.profile_path}`;
    }
    return undefined;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Cast Member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={getProfileImageUrl()} alt={formData.name} />
              <AvatarFallback>{formData.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Label htmlFor="profile-image" className="cursor-pointer">
                <div className="flex items-center gap-2 p-2 border rounded-md hover:bg-accent">
                  <Upload className="h-4 w-4" />
                  <span className="text-sm">Upload Profile Image</span>
                </div>
                <Input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                {profileImage ? profileImage.name : 'No file selected'}
              </p>
            </div>
          </div>

          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="known_for">Known For Department</Label>
            <Input
              id="known_for"
              value={formData.known_for_department || ''}
              onChange={(e) => setFormData({ ...formData, known_for_department: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="biography">Biography</Label>
            <Textarea
              id="biography"
              value={formData.biography || ''}
              onChange={(e) => setFormData({ ...formData, biography: e.target.value })}
              className="h-32"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="birthday">Birthday</Label>
              <Input
                id="birthday"
                type="date"
                value={formData.birthday || ''}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="place_of_birth">Place of Birth</Label>
              <Input
                id="place_of_birth"
                value={formData.place_of_birth || ''}
                onChange={(e) => setFormData({ ...formData, place_of_birth: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="imdb_id">IMDb ID</Label>
              <Input
                id="imdb_id"
                value={formData.imdb_id || ''}
                onChange={(e) => setFormData({ ...formData, imdb_id: e.target.value })}
                placeholder="nm1234567"
              />
            </div>
            <div>
              <Label htmlFor="homepage">Homepage</Label>
              <Input
                id="homepage"
                type="url"
                value={formData.homepage || ''}
                onChange={(e) => setFormData({ ...formData, homepage: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || uploading}>
              {updateMutation.isPending || uploading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
