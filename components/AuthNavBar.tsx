'use client'

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

const AuthNavigationBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBannerVisible, setIsBannerVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, loading, signOut, signIn, isAuthenticated } = useAuth();

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
        <Link href="/" className="text-white font-bold text-xl relative z-[100]">
          LookIntoMaxi
        </Link>
        <div className="hidden xl:flex items-center justify-left flex-grow ml-10 relative z-[100]">
          <div className="flex space-x-6">
          <Link href="/stats" className="text-[rgb(153,153,153)] hover:text-gray-300">⌗ Stats</Link>
            <Link href="/delta-discounts" className="text-[rgb(153,153,153)] hover:text-gray-300">Δ Discounts</Link>
            <Link href="/projections" className="text-[rgb(153,153,153)] hover:text-gray-300">〰 Projections</Link>
            <Link href="/prices" className="text-[rgb(153,153,153)] hover:text-gray-300">$ Prices</Link>
            <Link href="/leagues" className="text-[rgb(153,153,153)] hover:text-gray-300">♆ Leagues</Link>
            <Link href="/gas" className="text-[rgb(153,153,153)] hover:text-gray-300">≋ Gas</Link>
            <Link href="https://app.piteas.io/#/swap?inputCurrency=PLS&outputCurrency=0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b" target="_blank" className="text-[rgb(153,153,153)] hover:text-gray-300">⇋ Buy</Link>
            <Link href="/api-docs" className="text-[rgb(153,153,153)] hover:text-gray-300">&#123; &#125; API</Link>

          </div>
        </div>
        <div className="hidden xl:flex items-center relative z-[100]">
          {!loading && (
            <>
              {!isAuthenticated ? (
                <button
                  onClick={signIn}
                  className="bg-white hover:bg-gray-100 text-black px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Sign in
                </button>
              ) : (
                <div className="flex items-center gap-4">
                  {user?.user_metadata?.avatar_url && (
                    <>
                      <Image
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                      <span className="text-white text-sm">
                        @{user.user_metadata.user_name}
                      </span>
                      <button
                        onClick={signOut}
                        className="text-white hover:text-gray-300 text-sm font-medium transition-colors"
                      >
                        Sign out
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
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
              <Link href="/dashboard" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Stats</Link>
              <Link href="/delta-discounts" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Discounts</Link>
              <Link href="/projections" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Projections</Link>
              <Link href="/prices" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Prices</Link>
              <Link href="/leagues" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Leagues</Link>
              <Link href="/gas" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Gas</Link>
              <Link href="https://app.piteas.io/#/swap?inputCurrency=PLS&outputCurrency=0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b" target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Buy</Link>
              <Link href="https://portfolio.lookintomaxi.com/" target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Portfolio</Link>
              {!loading && (
                <div className="pt-2 border-t border-white/20">
                  {!isAuthenticated ? (
                    <button
                      onClick={() => {
                        signIn();
                        setIsMenuOpen(false);
                      }}
                      className="w-full bg-white hover:bg-gray-100 text-black px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 justify-center"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      Sign in
                    </button>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      {user?.user_metadata?.avatar_url && (
                        <>
                          <Image
                            src={user.user_metadata.avatar_url}
                            alt="Profile"
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                          <span className="text-white text-sm">
                            @{user.user_metadata.user_name}
                          </span>
                          <button
                            onClick={() => {
                              signOut();
                              setIsMenuOpen(false);
                            }}
                            className="w-full inline-flex items-center justify-center px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-md text-sm font-medium cursor-pointer transition-colors"
                          >
                            Sign out
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default AuthNavigationBar; 