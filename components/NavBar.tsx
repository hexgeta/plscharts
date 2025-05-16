'use client'

import Link from 'next/link';

const NavBar = () => {
  return (
    <nav className="w-full bg-black/60 px-8 py-4 top-0 left-0 right-0 z-[100] border-b border-[rgba(255,255,255,0.2)]">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between">
        <Link href="/" className="text-white font-bold text-xl">
          PlsCharts
        </Link>
        <div className="flex items-center space-x-6">
          <Link href="https://bridge.pulsechainapp.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">
            Bridge
          </Link>
          <Link href="https://pulsex.pulsechainapp.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">
            DEX
          </Link>
          <Link href="https://hex.pulsechainapp.com/" target="_blank" rel="noopener noreferrer" className="text-[rgb(153,153,153)] hover:text-gray-300">
            Stake HEX
          </Link>
        </div>
      </div>
    </nav>
  );
};

export default NavBar; 