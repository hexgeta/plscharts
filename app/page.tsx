'use client';

import { PulseChainTable } from '@/components/pulse-chain-table'
import { AnimatedBackground } from '@/components/ui/animated-background'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton2'

export default function HomePage() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Small delay to ensure smooth animation
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const LoadingSkeleton = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="w-full max-w-5xl mx-auto my-8 relative"
    >
      <div className="w-full h-[600px] relative bg-black/20">
        <Skeleton 
          variant="table" 
          className="w-full h-full" 
        />
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black py-8 relative overflow-hidden">
      <AnimatePresence mode="wait">
        {!isReady ? (
          <div className="container mx-auto px-4">
            <LoadingSkeleton />
          </div>
        ) : (
          <>
            <AnimatedBackground />
            <motion.div 
              className="relative z-10 w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="container mx-auto px-4">
                <PulseChainTable />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
} 