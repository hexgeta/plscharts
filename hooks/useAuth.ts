import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { User } from '@supabase/supabase-js';
import { useRouter } from 'next/router';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    const supabase = createClient();

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        console.log('Initial auth check - session:', session);
        setUser(session?.user ?? null);
        setIsAuthenticated(!!session);
      } catch (error) {
        console.error('Error getting initial session:', error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session);
      setUser(session?.user ?? null);
      setIsAuthenticated(!!session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Only run on client-side
      if (typeof window === 'undefined') return;

      const supabase = createClient();
      const currentPath = window.location.pathname;
      await supabase.auth.signOut();
      setUser(null);
      setIsAuthenticated(false);
      
      // Force reload the page to reset all state
      window.location.reload();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const signIn = async () => {
    try {
      // Only run on client-side
      if (typeof window === 'undefined') return;

      const supabase = createClient();
      const currentPath = window.location.pathname;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(currentPath)}`
        }
      });
      
      if (error) throw error;
      console.log('Sign in successful:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return {
    user,
    loading,
    signOut,
    signIn,
    isAuthenticated
  };
}; 