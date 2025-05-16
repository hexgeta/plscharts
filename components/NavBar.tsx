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

    // Check initial banner visibility from CSS variable
    const bannerVisible = getComputedStyle(document.documentElement)
      .getPropertyValue('--banner-visible')
      .trim() === '1';
    setIsBannerVisible(bannerVisible);

    // Listen for banner visibility changes
    window.addEventListener('bannerVisibilityChange', handleBannerVisibility as EventListener);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('bannerVisibilityChange', handleBannerVisibility as EventListener);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className={`w-full bg-black px-4 pt-2 pb-4 border-b-1 border-b border-[rgba(255,255,255,0.2)] relative z-[100] ${isBannerVisible ? 'md:mt-[52px]' : ''}`}>
      <div className="max-w-[1200px] mx-auto flex items-center justify-between relative">
        <Link href="/" className="text-white hover:text-gray-300 font-bold text-2xl relative z-[100]">
          PLS Charts
        </Link>
        <div className="hidden xl:flex items-center justify-left flex-grow ml-10 relative z-[100]">
          <div className="flex space-x-6">
            {/* Add any navigation links here */}
          </div>
        </div>

        {/* MOBILE VIEW */}
        <button
          className="rgba(255, 255, 255, 0.2) xl:hidden flex flex-col justify-center items-center relative z-[100]"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className="w-5 h-[2px] bg-white my-[3px]"></span>
          <span className="w-5 h-[2px] bg-white my-[3px]"></span>
          <span className="w-5 h-[2px] bg-white my-[3px]"></span>
        </button>
      </div>
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[150]"
          >
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="absolute right-2 top-2 h-auto w-64 bg-black bg-opacity-85 p-4 shadow-lg z-[160] border border-white/20 rounded-[10px]"
            >
              <Link href="/pulsechain" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>PulseChain</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default NavBar; 