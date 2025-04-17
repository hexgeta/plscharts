import React from 'react';
import { useAuth } from '@/hooks/useAuth';

export const AccessDenied: React.FC = () => {
  const { signIn, isAuthenticated } = useAuth();

  return (
    <div className="min-h-[400px] flex flex-col items-center justify-center space-y-6 p-8 bg-black/50 backdrop-blur-sm rounded-lg">
      <h2 className="text-2xl font-bold text-white">
        {isAuthenticated ? 'Access Restricted' : 'Sign in Required'}
      </h2>
      <p className="text-gray-300 text-center max-w-md">
        {isAuthenticated 
          ? 'Your Twitter account is not whitelisted for access to this content.'
          : 'Please sign in with your Twitter account to access this content.'}
      </p>
      {!isAuthenticated && (
        <button
          onClick={signIn}
          className="bg-white hover:bg-gray-100 text-black px-6 py-3 rounded-md text-sm font-medium flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Sign in with Twitter
        </button>
      )}
    </div>
  );
}; 