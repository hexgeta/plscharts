'use client';

import { PulseChainTable } from '@/components/pulse-chain-table'
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
    <div className="min-h-screen py-8 flex flex-col items-center justify-center bg-black relative overflow-hidden">
      <AnimatePresence mode="wait">
        <div className="container mx-auto grid grid-cols-1 gap-8">
          <PulseChainTable />
        </div>
      </AnimatePresence>
    </div>
  )
} 