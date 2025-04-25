import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/router';
import Link from 'next/link';

interface AuthOverlayProps {
  children?: React.ReactNode;
}

// Helper function to get page name from path
const getPageName = (path: string): string => {
  return path.substring(1).split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
};

const DummyTable = () => (
  <div className="w-full rounded-lg overflow-hidden border border-white/10 mb-8">
    <div className="grid grid-cols-4 gap-4 p-4 bg-[#111111]">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-6 bg-white/10 rounded animate-pulse" />
      ))}
    </div>
    <div className="divide-y divide-white/10">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4 p-4 bg-black/30">
          {[...Array(4)].map((_, j) => (
            <div key={j} className="h-4 bg-white/5 rounded animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  </div>
);

const DummyContent = () => (
  <div className="p-2 sm:p-4">
    <div className="h-8 w-48 bg-white/5 rounded mx-auto mb-8 animate-pulse" />
    <div className="h-4 w-3/4 bg-white/5 rounded mx-auto mb-12 animate-pulse" />
    
    <div className="mb-12">
      <div className="h-6 w-64 bg-white/5 rounded mb-4 animate-pulse" />
      <DummyTable />
    </div>

    <div className="mb-12">
      <div className="h-6 w-56 bg-white/5 rounded mb-4 animate-pulse" />
      <div className="h-4 w-32 bg-white/5 rounded mb-4 animate-pulse" />
      <DummyTable />
      <DummyTable />
    </div>

    <div>
      <div className="h-4 w-32 bg-white/5 rounded mb-4 animate-pulse" />
      <DummyTable />
      <DummyTable />
    </div>
  </div>
);

const AuthOverlay = ({ children }: AuthOverlayProps) => {
  const { signIn } = useAuth();
  const router = useRouter();
  const pageName = getPageName(router.pathname);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-[#111111] p-8 rounded-xl border border-white/10 max-w-md w-full mx-4 relative backdrop-blur-xl">
        <h2 className="text-2xl font-bold text-white mb-2 text-center">Sign in to access {pageName}</h2>
        <p className="text-gray-400 mb-6 text-center text-sm">
          Connect with your X account to access elite stats & charts.
        </p>

        <button
          onClick={signIn}
          className="w-full bg-white hover:bg-gray-100 text-black px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Sign in with X
        </button>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            By signing in you agree to our{' '}
            <Link href="/terms-and-conditions" className="text-blue-500 hover:text-blue-400">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy-policy" className="text-blue-500 hover:text-blue-400">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthOverlay; 