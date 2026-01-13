import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Film, 
  Tv,
  Plus,
  Edit,
  Trash2,
  Search,
  Image as ImageIcon,
  Save,
  X,
  Upload,
  FileUp,
  Users,
  Video,
  Settings,
  BarChart3
} from 'lucide-react';
import { toast } from 'sonner';
import { BulkImportDialog } from '@/components/BulkImportDialog';
import { BulkImportEpisodesDialog } from '@/components/BulkImportEpisodesDialog';

interface Content {
  id: string;
  title: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  content_type: 'movie' | 'series';
  release_date?: string;
  genre?: string;
  access_type?: 'free' | 'membership' | 'purchase';
  price?: number;
  currency?: string;
  created_at: string;
  seasons?: number;
}

interface Episode {
  id: string;
  show_id: string;
  season_id?: string;
  title: string;
  episode_number: number;
  overview?: string;
  still_path?: string;
  air_date?: string;
  duration?: number;
  access_type?: 'free' | 'membership' | 'purchase';
  price?: number;
}

const AdminContentManagement = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [contents, setContents] = useState<Content[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [showEpisodeDialog, setShowEpisodeDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [showBulkImportEpisodesDialog, setShowBulkImportEpisodesDialog] = useState(false);
  const [editingContent, setEditingContent] = useState<Content | null>(null);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: '',
    overview: '',
    poster_path: '',
    backdrop_path: '',
    content_type: 'movie' as 'movie' | 'series',
    release_date: '',
    genre: '',
    access_type: 'free' as 'free' | 'membership' | 'purchase',
    price: 0,
    currency: 'USD',
    seasons: 1,
  });

  const [episodeFormData, setEpisodeFormData] = useState({
    title: '',
    episode_number: 1,
    overview: '',
    still_path: '',
    air_date: '',
    duration: 0,
    access_type: 'free' as 'free' | 'membership' | 'purchase',
    price: 0,
  });

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user?.id)
        .eq('role', 'admin')
        .single();

      if (!roleData) {
        toast.error('Access denied: Admin privileges required');
        navigate('/');
        return;
      }

      fetchContents();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/');
    }
  };

  const fetchContents = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('content_type', filterType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setContents(data || []);
    } catch (error) {
      console.error('Error fetching contents:', error);
      toast.error('Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const fetchEpisodes = async (seriesId: string) => {
    try {
      const { data, error } = await supabase
        .from('episodes')
        .select('*')
        .eq('show_id', seriesId)
        .order('episode_number', { ascending: true });

      if (error) throw error;
      setEpisodes(data || []);
    } catch (error) {
      console.error('Error fetching episodes:', error);
      toast.error('Failed to load episodes');
    }
  };

  const handleSaveContent = async () => {
    try {
      if (!formData.title) {
        toast.error('Title is required');
        return;
      }

      const contentData = {
        ...formData,
        price: formData.access_type === 'purchase' ? Number(formData.price) : null,
        seasons: formData.content_type === 'series' ? Number(formData.seasons) : null,
      };

      if (editingContent) {
        const { error } = await supabase
          .from('content')
          .update(contentData)
          .eq('id', editingContent.id);

        if (error) throw error;
        toast.success('Content updated successfully');
      } else {
        const { error } = await supabase
          .from('content')
          .insert([contentData]);

        if (error) throw error;
        toast.success('Content created successfully');
      }

      setShowContentDialog(false);
      resetForm();
      fetchContents();
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content');
    }
  };

  const handleDeleteContent = async (id: string) => {
    if (!confirm('Are you sure you want to delete this content?')) return;

    try {
      const { error } = await supabase
        .from('content')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Content deleted successfully');
      fetchContents();
    } catch (error) {
      console.error('Error deleting content:', error);
      toast.error('Failed to delete content');
    }
  };

  const handleEditContent = (content: Content) => {
    navigate(`/admin/content/edit?id=${content.id}&type=${content.content_type}`);
  };

  const handleManageEpisodes = (seriesId: string) => {
    setSelectedSeriesId(seriesId);
    fetchEpisodes(seriesId);
  };

  const handleSaveEpisode = async () => {
    if (!selectedSeriesId) return;

    try {
      if (!episodeFormData.title) {
        toast.error('Episode title is required');
        return;
      }

      const episodeData = {
        ...episodeFormData,
        show_id: selectedSeriesId,
        price: episodeFormData.access_type === 'purchase' ? Number(episodeFormData.price) : null,
        duration: Number(episodeFormData.duration) || null,
      };

      if (editingEpisode) {
        const { error } = await supabase
          .from('episodes')
          .update(episodeData)
          .eq('id', editingEpisode.id);

        if (error) throw error;
        toast.success('Episode updated successfully');
      } else {
        const { error } = await supabase
          .from('episodes')
          .insert([episodeData]);

        if (error) throw error;
        toast.success('Episode created successfully');
      }

      setShowEpisodeDialog(false);
      resetEpisodeForm();
      fetchEpisodes(selectedSeriesId);
    } catch (error) {
      console.error('Error saving episode:', error);
      toast.error('Failed to save episode');
    }
  };

  const handleDeleteEpisode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this episode?')) return;

    try {
      const { error } = await supabase
        .from('episodes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Episode deleted successfully');
      if (selectedSeriesId) fetchEpisodes(selectedSeriesId);
    } catch (error) {
      console.error('Error deleting episode:', error);
      toast.error('Failed to delete episode');
    }
  };

  const handleEditEpisode = (episode: Episode) => {
    setEditingEpisode(episode);
    setEpisodeFormData({
      title: episode.title,
      episode_number: episode.episode_number,
      overview: episode.overview || '',
      still_path: episode.still_path || '',
      air_date: episode.air_date || '',
      duration: episode.duration || 0,
      access_type: episode.access_type || 'free',
      price: episode.price || 0,
    });
    setShowEpisodeDialog(true);
  };

  const resetForm = () => {
    setEditingContent(null);
    setFormData({
      title: '',
      overview: '',
      poster_path: '',
      backdrop_path: '',
      content_type: 'movie',
      release_date: '',
      genre: '',
      access_type: 'free',
      price: 0,
      currency: 'USD',
      seasons: 1,
    });
  };

  const resetEpisodeForm = () => {
    setEditingEpisode(null);
    setEpisodeFormData({
      title: '',
      episode_number: 1,
      overview: '',
      still_path: '',
      air_date: '',
      duration: 0,
      access_type: 'free',
      price: 0,
    });
  };

  const filteredContents = contents.filter(content => {
    if (searchQuery) {
      return content.title.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} hideJoinMember />
        <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading content...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} hideJoinMember />
      
      {/* Sidebar */}
      <aside className={`fixed left-0 top-14 h-[calc(100vh-3.5rem)] bg-admin-sidebar border-r border-border/50 transition-all duration-300 z-40 ${sidebarOpen ? 'w-64' : 'w-16'}`}>
        <div className="p-2 space-y-1">
          <Button 
            variant="ghost" 
            className={`w-full text-admin-sidebar-foreground hover:bg-primary hover:text-primary-foreground transition-colors ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} ${location.pathname === '/admin' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => navigate('/admin')}
          >
            <BarChart3 className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''}`} />
            {sidebarOpen && <span>Dashboard</span>}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full text-admin-sidebar-foreground hover:bg-primary hover:text-primary-foreground transition-colors ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} ${location.pathname === '/admin/content' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => navigate('/admin/content')}
          >
            <Film className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''}`} />
            {sidebarOpen && <span>Content Management</span>}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full text-admin-sidebar-foreground hover:bg-primary hover:text-primary-foreground transition-colors ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} ${location.pathname === '/admin/users' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => navigate('/admin/users')}
          >
            <Users className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''}`} />
            {sidebarOpen && <span>Users</span>}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full text-admin-sidebar-foreground hover:bg-primary hover:text-primary-foreground transition-colors ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} ${location.pathname === '/admin/shorts' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => navigate('/admin/shorts')}
          >
            <Video className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''}`} />
            {sidebarOpen && <span>Shorts</span>}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full text-admin-sidebar-foreground hover:bg-primary hover:text-primary-foreground transition-colors ${sidebarOpen ? 'justify-start px-4' : 'justify-center px-0'} ${location.pathname === '/admin/payment-settings' ? 'bg-primary text-primary-foreground' : ''}`}
            onClick={() => navigate('/admin/payment-settings')}
          >
            <Settings className={`h-5 w-5 ${sidebarOpen ? 'mr-3' : ''}`} />
            {sidebarOpen && <span>Payment Settings</span>}
          </Button>
        </div>
      </aside>
      
      <main className={`p-6 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Content Management</h1>
              <p className="text-muted-foreground">Create and manage movies, series, and episodes</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowBulkImportDialog(true)} variant="outline">
                <FileUp className="h-4 w-4 mr-2" />
                Bulk Import
              </Button>
              <Button onClick={() => navigate('/admin/content/edit?type=movie')}>
                <Plus className="h-4 w-4 mr-2" />
                Add Content
              </Button>
            </div>
          </div>

          {/* Filters */}
          <Card className="border-border/50 bg-white dark:bg-admin-card">
            <CardContent className="pt-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by title..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div>
                  <Label>Content Type</Label>
                  <Select value={filterType} onValueChange={(value) => {
                    setFilterType(value);
                    fetchContents();
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="movie">Movies</SelectItem>
                      <SelectItem value="series">Series</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={fetchContents} variant="outline" className="w-full">
                    <Search className="h-4 w-4 mr-2" />
                    Apply Filters
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Content List */}
          <Tabs defaultValue="list">
            <TabsList>
              <TabsTrigger value="list">Content List ({filteredContents.length})</TabsTrigger>
              {selectedSeriesId && <TabsTrigger value="episodes">Episodes</TabsTrigger>}
            </TabsList>

            <TabsContent value="list" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Poster</TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Access</TableHead>
                          <TableHead>Genre</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredContents.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No content found
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredContents.map((content) => (
                            <TableRow key={content.id}>
                              <TableCell>
                                {content.poster_path ? (
                                  <img src={content.poster_path} alt={content.title} className="w-12 h-16 object-cover rounded" />
                                ) : (
                                  <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
                                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">{content.title}</TableCell>
                              <TableCell>
                                <Badge variant="outline">
                                  {content.content_type === 'movie' ? <Film className="h-3 w-3 mr-1" /> : <Tv className="h-3 w-3 mr-1" />}
                                  {content.content_type}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={content.access_type === 'free' ? 'default' : content.access_type === 'membership' ? 'secondary' : 'outline'}>
                                  {content.access_type}
                                </Badge>
                              </TableCell>
                              <TableCell>{content.genre || 'N/A'}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {content.release_date ? new Date(content.release_date).toLocaleDateString() : 'N/A'}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="sm" onClick={() => handleEditContent(content)}>
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {content.content_type === 'series' && (
                                    <Button variant="ghost" size="sm" onClick={() => handleManageEpisodes(content.id)}>
                                      <Tv className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button variant="ghost" size="sm" onClick={() => handleDeleteContent(content.id)}>
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
                </CardContent>
              </Card>
            </TabsContent>

            {selectedSeriesId && (
              <TabsContent value="episodes" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Episodes</CardTitle>
                        <CardDescription>Manage episodes for this series</CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={() => setSelectedSeriesId(null)} variant="outline" size="sm">
                          <X className="h-4 w-4 mr-2" />
                          Close
                        </Button>
                        <Button onClick={() => setShowBulkImportEpisodesDialog(true)} variant="outline" size="sm">
                          <FileUp className="h-4 w-4 mr-2" />
                          Bulk Import
                        </Button>
                        <Button onClick={() => {
                          resetEpisodeForm();
                          setShowEpisodeDialog(true);
                        }} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Episode
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Episode #</TableHead>
                            <TableHead>Title</TableHead>
                            <TableHead>Duration</TableHead>
                            <TableHead>Access</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {episodes.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                No episodes found
                              </TableCell>
                            </TableRow>
                          ) : (
                            episodes.map((episode) => (
                              <TableRow key={episode.id}>
                                <TableCell className="font-medium">Episode {episode.episode_number}</TableCell>
                                <TableCell>{episode.title}</TableCell>
                                <TableCell>{episode.duration ? `${episode.duration} min` : 'N/A'}</TableCell>
                                <TableCell>
                                  <Badge variant={episode.access_type === 'free' ? 'default' : 'secondary'}>
                                    {episode.access_type}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Button variant="ghost" size="sm" onClick={() => handleEditEpisode(episode)}>
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => handleDeleteEpisode(episode.id)}>
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
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>

      {/* Content Dialog */}
      <Dialog open={showContentDialog} onOpenChange={setShowContentDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContent ? 'Edit Content' : 'Add New Content'}</DialogTitle>
            <DialogDescription>
              Fill in the details to {editingContent ? 'update' : 'create'} content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter title"
                />
              </div>
              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select value={formData.content_type} onValueChange={(value: 'movie' | 'series') => setFormData({ ...formData, content_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="movie">Movie</SelectItem>
                    <SelectItem value="series">Series</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Overview</Label>
              <Textarea
                value={formData.overview}
                onChange={(e) => setFormData({ ...formData, overview: e.target.value })}
                placeholder="Enter content description"
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Poster URL</Label>
                <Input
                  value={formData.poster_path}
                  onChange={(e) => setFormData({ ...formData, poster_path: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Backdrop URL</Label>
                <Input
                  value={formData.backdrop_path}
                  onChange={(e) => setFormData({ ...formData, backdrop_path: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Genre</Label>
                <Input
                  value={formData.genre}
                  onChange={(e) => setFormData({ ...formData, genre: e.target.value })}
                  placeholder="Action, Drama..."
                />
              </div>
              <div className="space-y-2">
                <Label>Release Date</Label>
                <Input
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                />
              </div>
              {formData.content_type === 'series' && (
                <div className="space-y-2">
                  <Label>Seasons</Label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.seasons}
                    onChange={(e) => setFormData({ ...formData, seasons: parseInt(e.target.value) })}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Access Type</Label>
                <Select value={formData.access_type} onValueChange={(value: any) => setFormData({ ...formData, access_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="membership">Membership</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.access_type === 'purchase' && (
                <>
                  <div className="space-y-2">
                    <Label>Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select value={formData.currency} onValueChange={(value) => setFormData({ ...formData, currency: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="KHR">KHR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowContentDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveContent}>
                <Save className="h-4 w-4 mr-2" />
                {editingContent ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Episode Dialog */}
      <Dialog open={showEpisodeDialog} onOpenChange={setShowEpisodeDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingEpisode ? 'Edit Episode' : 'Add New Episode'}</DialogTitle>
            <DialogDescription>
              Fill in the episode details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Episode Number *</Label>
                <Input
                  type="number"
                  min="1"
                  value={episodeFormData.episode_number}
                  onChange={(e) => setEpisodeFormData({ ...episodeFormData, episode_number: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input
                  value={episodeFormData.title}
                  onChange={(e) => setEpisodeFormData({ ...episodeFormData, title: e.target.value })}
                  placeholder="Episode title"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Overview</Label>
              <Textarea
                value={episodeFormData.overview}
                onChange={(e) => setEpisodeFormData({ ...episodeFormData, overview: e.target.value })}
                placeholder="Episode description"
                rows={3}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Still Image URL</Label>
                <Input
                  value={episodeFormData.still_path}
                  onChange={(e) => setEpisodeFormData({ ...episodeFormData, still_path: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label>Air Date</Label>
                <Input
                  type="date"
                  value={episodeFormData.air_date}
                  onChange={(e) => setEpisodeFormData({ ...episodeFormData, air_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  value={episodeFormData.duration}
                  onChange={(e) => setEpisodeFormData({ ...episodeFormData, duration: parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Access Type</Label>
                <Select value={episodeFormData.access_type} onValueChange={(value: any) => setEpisodeFormData({ ...episodeFormData, access_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="membership">Membership</SelectItem>
                    <SelectItem value="purchase">Purchase</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {episodeFormData.access_type === 'purchase' && (
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={episodeFormData.price}
                    onChange={(e) => setEpisodeFormData({ ...episodeFormData, price: parseFloat(e.target.value) })}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowEpisodeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEpisode}>
                <Save className="h-4 w-4 mr-2" />
                {editingEpisode ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <BulkImportDialog
        open={showBulkImportDialog}
        onOpenChange={setShowBulkImportDialog}
        onImportComplete={fetchContents}
      />

      {/* Bulk Import Episodes Dialog */}
      <BulkImportEpisodesDialog
        open={showBulkImportEpisodesDialog}
        onOpenChange={setShowBulkImportEpisodesDialog}
        onImportComplete={() => {
          if (selectedSeriesId) fetchEpisodes(selectedSeriesId);
        }}
      />
    </div>
  );
};

export default AdminContentManagement;
