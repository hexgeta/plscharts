'use client';

import AuthNavigationBar from '@/components/AuthNavBar';

const AuthTest = () => {
  return (
    <div className="min-h-screen bg-black">
      <AuthNavigationBar />
      <div className="max-w-[1200px] mx-auto p-8">
        <h1 className="text-3xl font-bold text-white mb-4">Auth Test Page</h1>
        <p className="text-gray-400">
          This page is using the authenticated navigation bar. Try signing in with Twitter to see how it works!
        </p>
      </div>
    </div>
  );
}

export default AuthTest; 