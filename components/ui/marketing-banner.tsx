'use client'

import Link from 'next/link'

const MarketingBanner = () => {
  return (
    <div className="w-full px-4 py-2 hidden md:block">
      <div className="grid grid-cols-3 gap-4 max-w-5xl mx-auto px-4">
        <div className="relative">
          <span className="absolute top-1 right-1 text-xs text-gray-400 bg-gray-800/0 px-1.5 py-0.5 rounded text-[10px] font-medium z-10">AD</span>
          <Link
            href="https://www.lookintomaxi.com/" target="_blank" rel="noopener noreferrer"
            className="bg-white/5 hover:bg-white/10 rounded-lg px-6 py-2.5 border-2 border-white/10 inline-block transition-all duration-200 backdrop-blur-sm text-center w-full"
          >
            <span className="text-white block font-medium">
              LookIntoMaxi<u className="hover:text-white"></u>
            </span>
            <span className="text-xs text-[rgb(153,153,153)] block font-medium">
              Advanced HEX pooled staking stats.
            </span>
          </Link>
        </div>
        
        <div className="relative">
          <span className="absolute top-1 right-1 text-xs text-gray-400 bg-gray-800/0 px-1.5 py-0.5 rounded text-[10px] font-medium z-10">AD</span>
          <Link
            href="/advertise"
            className="bg-white/5 hover:bg-white/10 rounded-lg px-6 py-2.5 border-2 border-white/10 inline-block transition-all duration-200 backdrop-blur-sm text-center w-full"
          >
            <span className="text-white block font-medium">
              Place your ad here
            </span>
            <span className="text-xs text-[rgb(153,153,153)] block font-medium">
              See all pricing plans
            </span>
          </Link>
        </div>
        
        <div className="relative">
          <span className="absolute top-1 right-1 text-xs text-gray-400 bg-gray-800/0 px-1.5 py-0.5 rounded text-[10px] font-medium z-10">AD</span>
          <Link
            href="/advertise"
            className="bg-white/5 hover:bg-white/10 rounded-xl px-6 py-2.5 border-2 border-white/10 inline-block transition-all duration-200 backdrop-blur-sm text-center w-full"
          >
            <span className="text-white block font-medium">
            Place your ad here
            </span>
            <span className="text-xs text-[rgb(153,153,153)] block font-medium">
              See all pricing plans
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default MarketingBanner;