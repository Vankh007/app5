import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapApp } from '@capacitor/app';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * Get the appropriate redirect URL based on platform
 * - Web: uses window.location.origin
 * - Native: uses custom URL scheme (com.plexkhmerzoon://)
 */
const getRedirectUrl = (): string => {
  if (Capacitor.isNativePlatform()) {
    // Use custom URL scheme for native apps
    return 'com.plexkhmerzoon://auth/callback';
  }
  return `${window.location.origin}/`;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Handle deep link OAuth callback for native apps
    if (Capacitor.isNativePlatform()) {
      const handleDeepLink = async (url: string) => {
        console.log('[Auth] Deep link received:', url);
        
        // Check if this is an OAuth callback
        if (url.includes('access_token') || url.includes('refresh_token') || url.includes('code=')) {
          try {
            // Extract the hash/query from the deep link URL
            const urlObj = new URL(url);
            const params = new URLSearchParams(urlObj.hash.substring(1) || urlObj.search);
            
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            
            if (accessToken && refreshToken) {
              // Set the session from the tokens
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              
              if (error) {
                console.error('[Auth] Error setting session:', error);
              } else {
                console.log('[Auth] Session set successfully from deep link');
                // Close the browser after successful auth
                try {
                  await Browser.close();
                } catch (e) {
                  // Browser might not be open
                }
              }
            }
          } catch (error) {
            console.error('[Auth] Error handling deep link:', error);
          }
        }
      };

      // Listen for app URL open events (deep links)
      CapApp.addListener('appUrlOpen', ({ url }) => {
        handleDeepLink(url);
      });

      // Check if app was opened via deep link
      CapApp.getLaunchUrl().then((result) => {
        if (result?.url) {
          handleDeepLink(result.url);
        }
      });
    }

    return () => {
      subscription.unsubscribe();
      if (Capacitor.isNativePlatform()) {
        CapApp.removeAllListeners();
      }
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const redirectUrl = getRedirectUrl();
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    const redirectUrl = getRedirectUrl();
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // For native apps, use in-app browser and handle deep link callback
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true, // Don't auto-redirect, we'll handle it
          },
        });

        if (error) {
          return { error };
        }

        if (data?.url) {
          // Open OAuth URL in in-app browser
          await Browser.open({ 
            url: data.url,
            presentationStyle: 'popover',
            toolbarColor: '#000000',
          });
        }

        return { error: null };
      } catch (error) {
        console.error('[Auth] Native Google sign-in error:', error);
        return { error };
      }
    } else {
      // Web: standard OAuth flow
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });

      return { error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, signInWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
