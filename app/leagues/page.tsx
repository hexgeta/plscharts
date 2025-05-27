'use client'

import LeagueTable from '../../components/LeagueTable'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import Image from 'next/image'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'

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

// All tokens that will be displayed on the page
const ALL_TOKENS = ['PLS', 'PLSX', 'INC', 'HEX', 'eHEX', 'HDRN', 'eHDRN', 'ICSA', 'eICSA', 'COM', 'eCOM'];

// Maximus tokens to show in their own section
const maximusTokens = [
  { ticker: 'MAXI', name: 'Maximus' },
  { ticker: 'DECI', name: 'Maximus DECI' },
  { ticker: 'LUCKY', name: 'Maximus LUCKY' },
  { ticker: 'TRIO', name: 'Maximus TRIO' },
  { ticker: 'BASE', name: 'Maximus BASE' },
  { ticker: 'TEAM', name: 'Team' },
  { ticker: 'PARTY', name: 'Pool Party' },
  { ticker: 'POLY', name: 'Poly' },
];

// Other additional tokens
const additionalTokens = [
  { ticker: 'MINT', name: 'Mintra' },
  { ticker: 'LOAN', name: 'LOAN' },
  { ticker: 'TIME', name: 'TIME' },
  { ticker: 'AXIS', name: 'AxisAlive' },
  { ticker: 'ATROPA', name: 'Atropa' },
  { ticker: 'EARN', name: 'Powercity EARN' },
  { ticker: 'TEXAN', name: 'Texan' },
  { ticker: 'PHIAT', name: 'Phiat' },
  { ticker: 'PHAME', name: 'Phamous' },
];

// Meme tokens
const memeTokens = [
  { ticker: 'MOST', name: 'MostWanted' },
  { ticker: 'PUMP', name: 'PUMP.tires' },
  { ticker: 'TRUMP', name: 'Trump' },
];

// Tang Gang tokens
const tangGangTokens = [
  { ticker: 'HOA', name: 'Hex Orange Address' },
  { ticker: 'DWB', name: 'DickWifButt' },
  { ticker: '9MM', name: '9mm' },
];

export default function LeaguesPage() {
  const [mounted, setMounted] = useState(false);
  const { prices, isLoading } = useTokenPrices(ALL_TOKENS);

  // Check if we have valid price data for all main tokens
  const hasValidPriceData = prices && ALL_TOKENS.every(ticker => {
    const priceData = prices[ticker];
    return priceData && priceData.price && priceData.price > 0;
  });

  // Overall loading state
  const loading = isLoading || !hasValidPriceData;

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || loading) {
    return <div className="bg-black h-screen" />;
  }

  return (
    <div className="bg-black text-white p-4 sm:p-6 pb-24 sm:pb-24 relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div 
          {...fadeInUp}
          transition={{ 
            duration: 0.4,
            ease: [0.23, 1, 0.32, 1]
          }}
          className="max-w-[1200px] py-8 mx-auto w-full relative flex flex-col gap-4 sm:gap-8"
        >
          {/* First Row - Main Tokens */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <LeagueTable tokenTicker="PLS" preloadedPrices={prices} />
            <LeagueTable tokenTicker="PLSX" preloadedPrices={prices} />
            <LeagueTable tokenTicker="INC" preloadedPrices={prices} />
          </div>

          {/* HEX Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <LeagueTable tokenTicker="eHEX" preloadedPrices={prices} />
            <LeagueTable tokenTicker="HEX" preloadedPrices={prices} />
          </div>

          {/* HDRN Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <LeagueTable tokenTicker="eHDRN" preloadedPrices={prices} />

            <LeagueTable tokenTicker="HDRN" preloadedPrices={prices} />
          </div>

          {/* ICSA Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <LeagueTable tokenTicker="eICSA" preloadedPrices={prices} />

            <LeagueTable tokenTicker="ICSA" preloadedPrices={prices} />
          </div>

          {/* COM Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <LeagueTable tokenTicker="eCOM" preloadedPrices={prices} />
            <LeagueTable tokenTicker="COM" preloadedPrices={prices} />
          </div>

          {/* Maximus Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Maximus</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {maximusTokens.map((token) => (
                <Dialog key={token.ticker}>
                  <DialogTrigger asChild>
                    <motion.div
                      className="bg-black border border-2 border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-gray-800/50 transition-all duration-200 flex flex-col items-center gap-3"
                    >
                      <div className="w-12 h-12 relative">
                        <Image
                          src={`/coin-logos/${token.ticker}.svg`}
                          alt={token.name}
                          width={48}
                          height={48}
                          className="rounded-full"
                          onError={(e) => {
                            // Fallback to a default icon if logo doesn't exist
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-sm">{token.ticker}</div>
                        <div className="text-xs text-gray-400 truncate">{token.name}</div>
                      </div>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl w-full max-w-[400px] max-h-[90vh] bg-black border-2 border-white/10 rounded-lg overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-white text-xl font-bold">
                        {token.name} ({token.ticker}) League
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 pb-4">
                      <LeagueTable tokenTicker={token.ticker} containerStyle={false} />
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>

          {/* Memes Section */}
          {/* <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Memes</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 place-items-center md:place-items-start">
              <div className="hidden md:block"></div>
              {memeTokens.map((token) => (
                <Dialog key={token.ticker}>
                  <DialogTrigger asChild>
                    <motion.div
                      className="bg-black border border-2 border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-gray-800/50 transition-all duration-200 flex flex-col items-center gap-3 w-full"
                    >
                      <div className="w-12 h-12 relative">
                        <Image
                          src={`/coin-logos/${token.ticker}.svg`}
                          alt={token.name}
                          width={48}
                          height={48}
                          className="rounded-full"
                          onError={(e) => {
                            // Fallback to a default icon if logo doesn't exist
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-sm">{token.ticker}</div>
                        <div className="text-xs text-gray-400 truncate">{token.name}</div>
                      </div>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl w-full max-w-[400px] max-h-[90vh] bg-black border-2 border-white/10 rounded-lg overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-white text-xl font-bold">
                        {token.name} ({token.ticker}) League
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 pb-4">
                      <LeagueTable tokenTicker={token.ticker} containerStyle={false} />
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
              <div className="hidden md:block"></div>
            </div>
          </div> */}

          {/* Tang Gang Section */}
          {/* <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Tang Gang</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 place-items-center md:place-items-start">
              <div className="hidden md:block"></div>
              {tangGangTokens.map((token) => (
                <Dialog key={token.ticker}>
                  <DialogTrigger asChild>
                    <motion.div
                      className="bg-black border border-2 border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-gray-800/50 transition-all duration-200 flex flex-col items-center gap-3 w-full"
                    >
                      <div className="w-12 h-12 relative">
                        <Image
                          src={`/coin-logos/${token.ticker}.svg`}
                          alt={token.name}
                          width={48}
                          height={48}
                          className="rounded-full"
                          onError={(e) => {
                            // Fallback to a default icon if logo doesn't exist
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-sm">{token.ticker}</div>
                        <div className="text-xs text-gray-400 truncate">{token.name}</div>
                      </div>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl w-full max-w-[400px] max-h-[90vh] bg-black border-2 border-white/10 rounded-lg overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-white text-xl font-bold">
                        {token.name} ({token.ticker}) League
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 pb-4">
                      <LeagueTable tokenTicker={token.ticker} containerStyle={false} />
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
              <div className="hidden md:block"></div>
            </div>
          </div> */}

          {/* Additional Tokens Section */}
          {/* <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-center">More Tokens</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {additionalTokens.map((token) => (
                <Dialog key={token.ticker}>
                  <DialogTrigger asChild>
                    <motion.div
                      className="bg-black border border-2 border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-gray-800/50 transition-all duration-200 flex flex-col items-center gap-3"
                    >
                      <div className="w-12 h-12 relative">
                        <Image
                          src={`/coin-logos/${token.ticker}.svg`}
                          alt={token.name}
                          width={48}
                          height={48}
                          className="rounded-full"
                          onError={(e) => {
                            // Fallback to a default icon if logo doesn't exist
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-sm">{token.ticker}</div>
                        <div className="text-xs text-gray-400 truncate">{token.name}</div>
                      </div>
                    </motion.div>
                  </DialogTrigger>
                  <DialogContent className="w-full max-w-[400px] max-h-[90vh] bg-black border border-2 border-white/10 rounded-lg overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle className="text-white text-xl font-bold">
                        {token.name} ({token.ticker}) League
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 pb-4">
                      <LeagueTable tokenTicker={token.ticker} containerStyle={false} />
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div> */}
        </motion.div>
      </AnimatePresence>
    </div>
  )
} 