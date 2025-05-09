import { useEffect } from 'react';
import { useRouter } from 'next/router';
import supabaseClient from '@/utils/supabase/client';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const { searchParams } = new URL(window.location.href);
      const code = searchParams.get('code');
      const next = searchParams.get('next') ?? '/';

      if (code) {
        await supabaseClient.auth.exchangeCodeForSession(code);
      }

      // Get the stored redirect path or default to '/'
      const redirectPath = localStorage.getItem('authRedirectPath') || '/';
      localStorage.removeItem('authRedirectPath'); // Clean up
      router.push(redirectPath);
    };

    handleCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-white text-center">
        <h1 className="text-2xl font-bold mb-4">Completing sign in...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mx-auto"></div>
      </div>
    </div>
  );
} 