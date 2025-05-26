'use client'

import LeagueTable from '../../components/LeagueTable'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

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

export default function LeaguesPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="bg-black h-full" />;
  }

  return (
    <div className="bg-black text-white p-4 sm:p-6 relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div 
          {...fadeInUp}
          transition={{ 
            duration: 0.4,
            ease: [0.23, 1, 0.32, 1]
          }}
          className="max-w-[1200px] mx-auto w-full relative flex flex-col gap-4 sm:gap-8"
        >
          {/* First Row - Main Tokens */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LeagueTable tokenTicker="PLS" />
            <LeagueTable tokenTicker="PLSX" />
            <LeagueTable tokenTicker="INC" />
          </div>

          {/* HEX Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LeagueTable tokenTicker="HEX" />
            <LeagueTable tokenTicker="eHEX" />
          </div>

          {/* HDRN Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LeagueTable tokenTicker="HDRN" />
            <LeagueTable tokenTicker="eHDRN" />
          </div>

          {/* ICSA Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LeagueTable tokenTicker="ICSA" />
            <LeagueTable tokenTicker="eICSA" />
          </div>

          {/* COM Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LeagueTable tokenTicker="COM" />
            <LeagueTable tokenTicker="eCOM" />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
} 