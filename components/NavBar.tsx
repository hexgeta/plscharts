'use client'

// Static component with revalidation
export const revalidate = 2592000; // 30 days in seconds

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const handleBannerVisibility = (event: CustomEvent) => {
      setIsBannerVisible(event.detail.isVisible);
    };

    const bannerVisible = getComputedStyle(document.documentElement).getPropertyValue('--banner-visible').trim() === '1';
    setIsBannerVisible(bannerVisible);

    window.addEventListener('bannerVisibilityChange', handleBannerVisibility as EventListener);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('bannerVisibilityChange', handleBannerVisibility as EventListener);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className={`w-full bg-black h-16 flex items-center border-b border-[rgba(255,255,255,0.2)] relative z-[100] ${isBannerVisible ? 'md:mt-[52px]' : ''}`}>
      <div className="max-w-[1200px] w-full mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-10">
          <Link href="/" className="text-white hover:text-gray-300 font-bold text-2xl whitespace-nowrap">
            PLSCharts
          </Link>
          <div className="hidden xl:flex items-center space-x-6">
            <Link href="/pulsechain" className="text-white/80 hover:text-white transition-colors">PulseChain</Link>
            <Link href="/stake-hex" className="text-white/80 hover:text-white transition-colors">Stake HEX</Link>
            <Link href="/bridge" className="text-white/80 hover:text-white transition-colors">Bridge</Link>
            <Link href="/dex" className="text-white/80 hover:text-white transition-colors">DEX</Link>
          </div>
        </div>

        <button
          className="xl:hidden flex flex-col justify-center items-center w-8 h-8 relative"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className="w-5 h-[2px] bg-white my-[3px] transition-all"></span>
          <span className="w-5 h-[2px] bg-white my-[3px] transition-all"></span>
          <span className="w-5 h-[2px] bg-white my-[3px] transition-all"></span>
        </button>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 z-[150] xl:hidden"
            >
              <motion.div
                ref={menuRef}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="absolute right-4 top-20 w-56 bg-black border border-white/20 rounded-lg shadow-lg overflow-hidden"
              >
                <div className="py-2">
                  <Link href="/pulsechain" className="block px-4 py-2 text-white/80 hover:text-white hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>PulseChain</Link>
                  <Link href="/stake-hex" className="block px-4 py-2 text-white/80 hover:text-white hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>Stake HEX</Link>
                  <Link href="/bridge" className="block px-4 py-2 text-white/80 hover:text-white hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>Bridge</Link>
                  <Link href="/dex" className="block px-4 py-2 text-white/80 hover:text-white hover:bg-white/5" onClick={() => setIsMenuOpen(false)}>DEX</Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
};

export default NavBar; 