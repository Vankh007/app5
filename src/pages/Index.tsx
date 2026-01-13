import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import HeroBanner from '@/components/HeroBanner';
import ContentRow from '@/components/ContentRow';
import { Button } from '@/components/ui/button';
import { LogOut, Search, User } from 'lucide-react';

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const isGuestMode = localStorage.getItem('guestMode') === 'true';
    if (!loading && !user && !isGuestMode) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const isGuestMode = localStorage.getItem('guestMode') === 'true';

  if (!user && !isGuestMode) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    localStorage.removeItem('guestMode');
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold text-primary">StreamScape</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Search className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon">
              <User className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main>
        <HeroBanner />
        <div className="px-[1px] md:px-8 pb-8 space-y-8">
          <ContentRow title="Trending Now" />
          <ContentRow title="Movies" category="movie" />
          <ContentRow title="TV Shows" category="tv_show" />
          <ContentRow title="New Releases" />
        </div>
      </main>
    </div>
  );
};

export default Index;
