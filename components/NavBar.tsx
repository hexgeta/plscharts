import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const NavigationBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <nav className="w-full bg-black px-4 pt-2 pb-4 border-b-1 border-b border-[rgba(255,255,255,0.2)]">
      <div className="max-w-[1200px] mx-auto flex items-center justify-between">
        <Link href="/" className="text-white font-bold text-xl">
          LookIntoMaxi
        </Link>
        <div className="hidden lg:flex items-center justify-left flex-grow ml-10">
          <div className="flex space-x-6">
            <Link href="/delta-discounts" className="text-[rgb(153,153,153)] hover:text-gray-300">Δ Discounts</Link>
            <Link href="/projections" className="text-[rgb(153,153,153)] hover:text-gray-300">〰 Projections</Link>
            <Link href="/prices" className="text-[rgb(153,153,153)] hover:text-gray-300">$ Prices</Link>
            <Link href="/leagues" className="text-[rgb(153,153,153)] hover:text-gray-300">♆ Leagues</Link>
            <Link href="/gas" className="text-[rgb(153,153,153)] hover:text-gray-300">≋ Gas</Link>
            <Link href="https://app.piteas.io/#/swap?inputCurrency=PLS&outputCurrency=0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b" target="_blank" className="text-[rgb(153,153,153)] hover:text-gray-300">⇋ Buy</Link>
            <Link href="https://portfolio.lookintomaxi.com/" target="_blank" className="text-[rgb(153,153,153)] hover:text-gray-300">⊟ Portfolio</Link>
          </div>
        </div>
        <div className="hidden lg:flex items-center">
          <Link href="https://x.com/hexgeta" target="_blank" rel="noopener noreferrer" className="text-white">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </Link>
        </div>

        {/* MOBILE VIEW */}
        <button
          className="rgba(255, 255, 255, 0.2) lg:hidden flex flex-col justify-center items-center"
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
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          >
            <motion.div
              ref={menuRef}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", duration: 0.3 }}
              className="absolute right-2 top-2 h-auto w-64 bg-black bg-opacity-85 p-4 shadow-lg z-50 border border-white/20 rounded-[10px]"
            >
              <Link href="/delta-discounts" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Discounts</Link>
              <Link href="/projections" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Projections</Link>
              <Link href="/prices" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Prices</Link>
              <Link href="/leagues" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Leagues</Link>
              <Link href="/gas" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Gas</Link>              
              <Link href="https://app.piteas.io/#/swap?inputCurrency=PLS&outputCurrency=0x0d86EB9f43C57f6FF3BC9E23D8F9d82503f0e84b" target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Buy</Link>
              <Link href="/radio" target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Radio</Link>
              <Link href="https://portfolio.lookintomaxi.com/" target="_blank" rel="noopener noreferrer" className="block text-white/80 hover:text-white py-2" onClick={() => setIsMenuOpen(false)}>Portfolio</Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default NavigationBar;
