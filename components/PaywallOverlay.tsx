import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface PaywallOverlayProps {
  pageName?: string;
}

const getPageName = (path: string): string => {
  // Remove leading slash and capitalize
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

const PaywallOverlay = ({ pageName: propPageName }: PaywallOverlayProps) => {
  const router = useRouter();
  const pageName = propPageName || getPageName(router.pathname);

  return (
    <div className="min-h-screen bg-black relative">
      {/* Blurred background content */}
      <div className="blur-md pointer-events-none opacity-50">
        <DummyContent />
      </div>

      {/* Paywall overlay */}
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20">
        <div className="bg-[#111111] p-8 rounded-xl border border-white/10 max-w-md w-full mx-4 relative backdrop-blur-xl">
          <h2 className="text-3xl font-bold text-white mb-2 text-center">Upgrade to Access {pageName}</h2>
          <p className="text-gray-400 mb-6 text-center text-normal">
            Thanks for signing in! Upgrade to a paid account for $99 to get lifetime access to all advanced stats & charts.{' '}
          </p>

          <Link
            href="https://x.com/hexgeta"
            className="block w-full bg-white hover:bg-gray-100 text-black px-4 py-3 rounded-lg text-sm font-medium text-center transition-colors"
          >
            DM me on X for access
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaywallOverlay; 