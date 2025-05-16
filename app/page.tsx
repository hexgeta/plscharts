'use client';

import { PulseChainTable } from '@/components/pulse-chain-table'
import { AnimatedBackground } from '@/components/ui/animated-background'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure smooth animation
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black py-8 relative overflow-hidden">
      <AnimatePresence>
        {isReady && (
          <>
            <AnimatedBackground />
            <motion.div 
              className="relative z-10 w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="container mx-auto px-4 py-4">
                <PulseChainTable />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
} 