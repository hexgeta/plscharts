'use client'

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { TokenSearch } from '@/components/ui/token-search';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';

// Static component with revalidation
export const revalidate = 2592000; // 30 days in seconds

// Navigation links configuration
const NAV_LINKS = [
  { href: '/leagues', label: 'Leagues', mobileLabel: 'Leagues' },
  { href: '/bridge', label: 'Bridge', mobileLabel: 'Bridge' },
  { href: '/gas', label: 'Gas', mobileLabel: 'Gas' },
  { href: '/validators', label: 'Validators', mobileLabel: 'Validators' },
  { href: '/holders', label: 'Holders', mobileLabel: 'Holders' },
  { href: '/portfolio', label: 'Portfolio', mobileLabel: 'Portfolio' },
];

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Helper function to determine if a link is active
  const isActive = (href: string) => pathname === href;

  // Helper function to get link classes
  const getLinkClasses = (href: string, isMobile = false) => {
    const baseClasses = "transition-colors";
    const desktopPadding = "px-0 py-3 rounded-md";
    const mobilePadding = "block py-2";
    const activeClasses = isMobile 
      ? 'text-white cursor-default' 
      : 'text-white cursor-default';
    const inactiveClasses = isMobile 
      ? 'text-white/80 hover:text-white' 
      : 'text-[rgb(153,153,153)] hover:text-gray-300';
    
    const padding = isMobile ? mobilePadding : desktopPadding;
    
    return cn(baseClasses, padding, isActive(href) ? activeClasses : inactiveClasses);
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

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for Cmd+S (Mac) or Ctrl+S (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault(); // Prevent default save dialog
        setIsSearchOpen(true);
      }
    };

    // Check initial banner visibility from CSS variable
    const bannerVisible = getComputedStyle(document.documentElement)
      .getPropertyValue('--banner-visible')
      .trim() === '1';
    setIsBannerVisible(bannerVisible);

    // Listen for banner visibility changes
    window.addEventListener('bannerVisibilityChange', handleBannerVisibility as EventListener);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('bannerVisibilityChange', handleBannerVisibility as EventListener);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <nav className={`w-full bg-black px-0 pt-0 pb-0 border-b-1 border-b border-[rgba(255,255,255,0.2)] relative z-[100] ${isBannerVisible ? 'md:mt-[52px]' : ''}`}>
      <div className="max-w-[1200px] mx-auto flex items-center justify-between relative">
        <Link 
          href="/" 
          className={cn(
            "font-bold text-xl relative z-[100] transition-colors px-4 py-4 rounded-md",
            isActive('/') 
              ? 'text-white cursor-default' 
              : 'text-[rgb(153,153,153)] hover:text-gray-300'
          )}
        >
          PlsCharts
        </Link>
        
        <div className="hidden sm:flex items-center justify-left flex-grow ml-6 relative z-[100]">
          <div className="flex items-bottom space-x-6 py-0">
            {NAV_LINKS.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className={getLinkClasses(link.href)}
              >
                {link.label}
              </Link>
            ))}
            
            {/* Search Icon */}
            <button
              onClick={() => {
                console.log('Search icon clicked, current state:', isSearchOpen);
                setIsSearchOpen(!isSearchOpen);
                console.log('Setting search state to:', !isSearchOpen);
              }}
              className="flex items-center justify-center px-0 py-0 rounded-md text-[rgb(153,153,153)] hover:text-gray-300 transition-colors relative z-[10000]"
              aria-label="Search tokens"
            >
              <MagnifyingGlassIcon className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* MOBILE VIEW */}
        <button
          className="sm:hidden flex flex-col justify-center items-center w-16 h-12 relative z-[100] bg-transparent border-0 p-0 touch-manipulation"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
          aria-expanded={isMenuOpen}
        >
          <div className="flex flex-col justify-center items-center space-y-1.5">
            <div className="w-6 h-0.5 bg-[rgb(153,153,153)] transition-all duration-200"></div>
            <div className="w-6 h-0.5 bg-[rgb(153,153,153)] transition-all duration-200"></div>
            <div className="w-6 h-0.5 bg-[rgb(153,153,153)] transition-all duration-200"></div>
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
                  className={getLinkClasses(link.href, true)}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.mobileLabel}
                </Link>
              ))}
              <button
                onClick={() => {
                  setIsSearchOpen(!isSearchOpen);
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full text-left py-2 text-white/80 hover:text-white transition-colors"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
                Search
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Token Search Dialog */}
      <TokenSearch open={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </nav>
  );
};

export default NavBar; 
