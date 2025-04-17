import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@/utils/supabase/client';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = createClient();
      try {
        // Get the redirect path from the URL
        const redirectPath = router.query.redirect as string || '/';
        const decodedRedirect = decodeURIComponent(redirectPath);

        // Check if we have a session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // If we have a session, redirect to the return path
          router.push(decodedRedirect);
        } else {
          // If no session, redirect to home
          router.push('/');
        }
      } catch (error) {
        console.error('Error in auth callback:', error);
        router.push('/');
      }
    };

    // Only run the callback handler if we have query parameters
    if (router.isReady) {
      handleCallback();
    }
  }, [router.isReady, router.query]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-center">
        <h1 className="text-2xl font-bold mb-4">Completing sign in...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mx-auto"></div>
      </div>
    </div>
  );
} 