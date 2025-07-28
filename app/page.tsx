'use client';

import { PulseChainTable } from '@/components/pulse-chain-table'
import MarketingBanner from '@/components/ui/marketing-banner'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="bg-black h-screen" />;
  }

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      <div className="pt-4">
        <MarketingBanner />
      </div>
      <div className="pb-8 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <div className="container mx-auto grid grid-cols-1 gap-8">
            <PulseChainTable />
          </div>
        </AnimatePresence>
      </div>
    </div>
  )
} 