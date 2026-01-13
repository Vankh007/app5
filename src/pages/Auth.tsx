import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuthBackground } from '@/hooks/useAuthBackground';
import { useTheme } from '@/contexts/ThemeContext';
import { useSiteSettingsOptional } from '@/contexts/SiteSettingsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Mail, Lock, User, CheckCircle2 } from 'lucide-react';

const SkipIcon = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="20" 
    height="20" 
    viewBox="0 0 24 24" 
    fill="currentColor"
    className={className}
  >
    <g fill="currentColor">
      <path fillRule="evenodd" d="M6.278 1.756c-1.143-.739-2.438-.622-3.417.048c-.967.66-1.611 1.841-1.611 3.229v13.934c0 1.388.644 2.568 1.61 3.23c.98.669 2.275.786 3.418.048l10.789-6.968c1.15-.742 1.683-2.043 1.683-3.277s-.533-2.535-1.683-3.277L6.277 1.755ZM2.75 5.033c0-.921.423-1.625.958-1.991c.522-.358 1.162-.41 1.756-.026l10.789 6.967c.637.41.997 1.18.997 2.017c0 .836-.36 1.606-.997 2.017L5.464 20.985c-.594.383-1.234.33-1.756-.027c-.535-.365-.958-1.07-.958-1.99V5.032Z" clipRule="evenodd"/>
      <path d="M22.75 5a.75.75 0 0 0-1.5 0v14a.75.75 0 0 0 1.5 0V5Z"/>
    </g>
  </svg>
);
import logoDark from '@/assets/khmerzoon.png';
import logoLight from '@/assets/logo-light-new.png';

const Auth = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { signUp, signIn, signInWithGoogle, user } = useAuth();
  const { background, loading: bgLoading } = useAuthBackground();
  const { effectiveTheme } = useTheme();
  const siteSettings = useSiteSettingsOptional();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const lightLogo = siteSettings?.logos?.light_logo || logoLight;
  const darkLogo = siteSettings?.logos?.dark_logo || logoDark;
  const brandTitle = siteSettings?.settings?.site_title || 'KHMERZOON';
  const logo = effectiveTheme === 'light' ? lightLogo : darkLogo;

  if (user) {
    navigate('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp && !agreedToTerms) {
      toast({
        title: 'Agreement Required',
        description: 'Please agree to the terms and conditions to sign up.',
        variant: 'destructive'
      });
      return;
    }
    
    setLoading(true);

    try {
      const { error } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      } else {
        toast({
          title: 'Success',
          description: isSignUp ? 'Account created! Please check your email.' : 'Welcome back!'
        });
        if (!isSignUp) {
          navigate('/');
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: 'Error',
          description: error.message,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('guestMode', 'true');
    navigate('/');
  };

  // Desktop: backdrop image (landscape), Mobile: poster image (portrait)
  const backgroundImage = background
    ? `url(${isMobile ? background.poster_path : background.backdrop_path})`
    : 'none';

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden -mt-[env(safe-area-inset-top)] pt-[env(safe-area-inset-top)]"
      style={{
        backgroundImage: !bgLoading ? backgroundImage : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        minHeight: 'calc(100vh + env(safe-area-inset-top))'
      }}
    >
      {/* Gradient overlay - clear at top, darker at bottom */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background/80" />

      {/* Desktop Layout - 2D Flat Style */}
      <div className="hidden md:flex w-full max-w-md relative z-10">
        <div className="w-full space-y-8 p-8">
          {/* Logo and Title */}
          <div className="flex items-center justify-center gap-4">
            <img 
              src={logo} 
              alt={`${brandTitle} logo`} 
              className="w-14 h-14 object-contain"
            />
            <h1 className="text-3xl font-bold uppercase tracking-widest text-foreground">
              {brandTitle}
            </h1>
          </div>
          <div className="w-32 h-[1px] bg-foreground/20 mx-auto" />

          {/* Glass Form */}
          <form 
            onSubmit={handleSubmit} 
            className="space-y-5"
          >
            <div className="text-center mb-6">
              <h2 className="text-xl font-medium text-foreground">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </h2>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-11 bg-transparent border-white/30 rounded-lg placeholder:text-foreground/50"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 h-11 bg-transparent border-white/30 rounded-lg placeholder:text-foreground/50"
                />
              </div>
            </div>

            {isSignUp && (
              <div className="flex items-start space-x-3 p-3 bg-transparent border border-white/30 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                  className="mt-0.5 flex-shrink-0"
                >
                  <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${
                    agreedToTerms 
                      ? 'bg-primary border-primary' 
                      : 'border-muted-foreground/50 bg-background'
                  }`}>
                    {agreedToTerms && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </button>
                <label 
                  htmlFor="terms" 
                  className="text-xs text-muted-foreground cursor-pointer select-none"
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                >
                  I agree to the terms and conditions
                </label>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 rounded-lg font-medium" 
              disabled={loading || (isSignUp && !agreedToTerms)}
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground">OR</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-11 rounded-lg border-white/30 bg-transparent hover:bg-white/10"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>

            <Button 
              type="button"
              onClick={handleSkip}
              className="w-full h-11 rounded-lg bg-transparent hover:bg-white/10 text-foreground font-medium border border-white/30 group"
            >
              SKIP <SkipIcon className="ml-2 transition-transform group-hover:translate-x-1" />
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-foreground/60 hover:text-foreground transition-colors"
              >
                {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Mobile Layout - 2D Flat Style */}
      <div className="flex md:hidden w-full max-w-sm relative z-10">
        <div className="w-full space-y-8 p-6">
          {/* Logo and Title */}
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center gap-3">
              <img 
                src={logo} 
                alt={`${brandTitle} logo`} 
                className="w-12 h-12 object-contain"
              />
              <h1 className="text-2xl font-bold uppercase tracking-widest text-foreground">
                {brandTitle}
              </h1>
            </div>
            <div className="w-24 h-[1px] bg-foreground/20" />
            <p className="text-sm text-muted-foreground">
              {isSignUp ? 'Create Account' : 'Sign In'}
            </p>
          </div>

          {/* Mobile Form - 2D Minimal */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-12 bg-transparent border-white/30 rounded-lg placeholder:text-foreground/50"
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10 h-12 bg-transparent border-white/30 rounded-lg placeholder:text-foreground/50"
                />
              </div>
            </div>

            {isSignUp && (
              <div className="flex items-start space-x-3 p-3 bg-transparent border border-white/30 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                  className="mt-0.5 flex-shrink-0"
                >
                  <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${
                    agreedToTerms 
                      ? 'bg-primary border-primary' 
                      : 'border-muted-foreground/50 bg-background'
                  }`}>
                    {agreedToTerms && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                  </div>
                </button>
                <label 
                  className="text-xs text-foreground/70 cursor-pointer select-none"
                  onClick={() => setAgreedToTerms(!agreedToTerms)}
                >
                  I agree to the terms
                </label>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 rounded-lg font-medium uppercase tracking-wide" 
              disabled={loading || (isSignUp && !agreedToTerms)}
            >
              {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Login'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-sm text-foreground/60 hover:text-foreground transition-colors uppercase tracking-wide"
              >
                {isSignUp ? 'Login' : 'Sign Up'}
              </button>
            </div>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground">OR</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline" 
              className="w-full h-12 rounded-lg border-white/30 bg-transparent hover:bg-white/10"
              onClick={handleGoogleSignIn}
              disabled={loading}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>

            <Button 
              type="button"
              onClick={handleSkip}
              className="w-full h-12 rounded-lg bg-transparent hover:bg-white/10 text-foreground font-medium uppercase tracking-wide border border-white/30 group"
            >
              SKIP <SkipIcon className="ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Auth;
