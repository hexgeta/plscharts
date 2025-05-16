'use client';

import { PulseChainTable } from '@/components/pulse-chain-table'
import { AnimatedBackground } from '@/components/ui/animated-background'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton2'

const fadeInUp = {
  initial: { 
    opacity: 0,
    y: 10
  },
  animate: { 
    opacity: 1,
    y: 0
  },
  exit: { 
    opacity: 0,
    y: -10
  }
};

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const LoadingSkeleton = () => (
    <motion.div 
      {...fadeInUp}
      transition={{ 
        duration: 0.4,
        ease: [0.23, 1, 0.32, 1] // Custom easing function for smooth animation
      }}
      className="w-full max-w-5xl mx-auto my-8 relative"
    >
      <div className="w-full h-[600px] relative bg-black/20 backdrop-blur-sm rounded-xl border border-white/10">
        <Skeleton 
          variant="table" 
          className="w-full h-full rounded-xl" 
        />
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black py-8 relative overflow-hidden">
      <AnimatePresence mode="wait">
        <div className="container mx-auto px-4">
          <PulseChainTable 
            LoadingComponent={LoadingSkeleton}
          />
        </div>
      </AnimatePresence>
    </div>
  )
} 