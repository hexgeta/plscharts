'use client'

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

// Static component with revalidation
export const revalidate = 2592000; // 30 days in seconds

// Navigation links configuration
const NAV_LINKS = [
  { href: '/leagues', label: 'Leagues', mobileLabel: 'Leagues' },
  { href: '/bridge', label: 'Bridge', mobileLabel: 'Bridge' },
  // { href: '/portfolio', label: 'Portfolio', mobileLabel: 'Portfolio' },
];

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Helper function to determine if a link is active
  const isActive = (href: string) => pathname === href;

  // Helper function to get link classes
  const getLinkClasses = (href: string, isMobile = false) => {
    const baseClasses = "transition-colors";
    const activeClasses = isMobile 
      ? 'text-white cursor-default' 
      : 'text-white cursor-default';
    const inactiveClasses = isMobile 
      ? 'text-white/80 hover:text-white' 
      : 'text-[rgb(153,153,153)] hover:text-gray-300';
    
    return cn(baseClasses, isActive(href) ? activeClasses : inactiveClasses);
  };

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
    <nav className={`w-full bg-black px-4 pt-4 pb-4 border-b-1 border-b border-[rgba(255,255,255,0.2)] relative z-[100] ${isBannerVisible ? 'md:mt-[52px]' : ''}`}>
      <div className="max-w-[1200px] mx-auto flex items-center justify-between relative">
        <Link 
          href="/" 
          className={cn(
            "font-bold text-xl relative z-[100] transition-colors",
            isActive('/') 
              ? 'text-white cursor-default' 
              : 'text-[rgb(153,153,153)] hover:text-gray-300'
          )}
        >
          PlsCharts
        </Link>
        
        <div className="hidden xl:flex items-center justify-left flex-grow ml-10 relative z-[100]">
          <div className="flex space-x-6">
            {NAV_LINKS.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className={getLinkClasses(link.href)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* MOBILE VIEW */}
        <button
          className="xl:hidden flex flex-col justify-center items-center w-12 h-12 relative z-[100] bg-transparent border-0 p-2 touch-manipulation"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <div className="flex flex-col justify-center items-center space-y-2">
            <div className="w-6 h-0.5 bg-white transition-all duration-200"></div>
            <div className="w-6 h-0.5 bg-white transition-all duration-200"></div>
            <div className="w-6 h-0.5 bg-white transition-all duration-200"></div>
          </div>
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
              {NAV_LINKS.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={cn(
                    "block py-2",
                    getLinkClasses(link.href, true)
                  )}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.mobileLabel}
                </Link>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default NavBar; 
