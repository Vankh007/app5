import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { useSiteSettings } from '@/contexts/SiteSettingsContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Mail, Lock, CheckCircle2 } from 'lucide-react';
import defaultLogoDark from '@/assets/khmerzoon.png';
import defaultLogoLight from '@/assets/logo-light-new.png';

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AuthDialog({ open, onOpenChange, onSuccess }: AuthDialogProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const { signUp, signIn, signInWithGoogle } = useAuth();
  const { effectiveTheme } = useTheme();
  const { logos } = useSiteSettings();
  
  // Use dynamic logos from admin settings, fallback to default imports
  const logo = effectiveTheme === 'light' 
    ? (logos.light_logo || defaultLogoLight) 
    : (logos.dark_logo || defaultLogoDark);

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
          onOpenChange(false);
          onSuccess?.();
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
        const errorMessage = error.message || 'Google sign-in failed. Please try again.';
        console.error('Google Sign-In Error:', error);
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        });
      } else {
        onOpenChange(false);
        onSuccess?.();
      }
    } catch (error: any) {
      console.error('Google Sign-In Exception:', error);
      const errorMessage = error?.message || error?.error || 'Something went wrong with Google sign-in';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <img 
              src={logo} 
              alt="KHMERZOON" 
              className="w-16 h-16 object-contain"
            />
          </div>
          <DialogTitle className="text-center text-2xl">
            {isSignUp ? 'Create Account' : 'Sign In'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isSignUp ? 'Join KHMERZOON today' : 'Welcome back to KHMERZOON'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="pl-11 h-12"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-11 h-12"
              />
            </div>
          </div>

          {isSignUp && (
            <div className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg">
              <button
                type="button"
                onClick={() => setAgreedToTerms(!agreedToTerms)}
                className="mt-0.5 flex-shrink-0"
              >
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                  agreedToTerms 
                    ? 'bg-primary border-primary' 
                    : 'border-muted-foreground/50'
                }`}>
                  {agreedToTerms && <CheckCircle2 className="w-4 h-4 text-primary-foreground" />}
                </div>
              </button>
              <label 
                className="text-sm text-muted-foreground cursor-pointer select-none"
                onClick={() => setAgreedToTerms(!agreedToTerms)}
              >
                I agree to the terms and conditions
              </label>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full h-12" 
            disabled={loading || (isSignUp && !agreedToTerms)}
          >
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            className="w-full h-12" 
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
            Sign in with Google
          </Button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-primary hover:underline"
            >
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
