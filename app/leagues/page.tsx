'use client'

import LeagueTable from '../../components/LeagueTable'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import Image from 'next/image'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'
import { useTokenSupplies } from '@/hooks/crypto/useTokenSupplies'
import React from 'react'

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

// Main tokens that will be displayed as tables on the page (batch loaded)
const MAIN_TOKENS = ['PLS', 'PLSX', 'INC', 'HEX', 'eHEX', 'HDRN', 'eHDRN', 'ICSA', 'eICSA', 'COM', 'eCOM'];

// Maximus tokens to show in their own section (individually loaded)
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

// Other additional tokens (individually loaded)
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

// Meme tokens (individually loaded)
const memeTokens = [
  { ticker: 'MOST', name: 'MostWanted' },
  { ticker: 'PUMP', name: 'PUMP.tires' },
  { ticker: 'TRUMP', name: 'Trump' },
];

// Tang Gang tokens (individually loaded)
const tangGangTokens = [
  { ticker: 'HOA', name: 'Hex Orange Address' },
  { ticker: 'DWB', name: 'DickWifButt' },
  { ticker: '9MM', name: '9mm' },
];

// Memoized TokenCard component for popup tokens (individually loaded)
const TokenCard = React.memo(({ token }: { 
  token: { ticker: string; name: string };
}) => {
  return (
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
      <DialogContent className="max-w-4xl w-full max-w-[360px] max-h-[90vh] bg-black border-2 border-white/10 rounded-lg overflow-y-auto">
        <div className="mt-4 pb-4">
          {/* No preloaded data - will fetch individually when opened */}
          <LeagueTable 
            tokenTicker={token.ticker} 
            containerStyle={false} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}, (prevProps, nextProps) => {
  // Only re-render if token data changed
  return (
    prevProps.token.ticker === nextProps.token.ticker &&
    prevProps.token.name === nextProps.token.name
  );
});

TokenCard.displayName = 'TokenCard';

export default function LeaguesPage() {
  const [mounted, setMounted] = useState(false);
  
  // Batch fetch prices and supplies for main tokens only
  const { prices, isLoading: pricesLoading } = useTokenPrices(MAIN_TOKENS, { disableRefresh: true });
  const { supplies, isLoading: suppliesLoading } = useTokenSupplies(MAIN_TOKENS);

  // Memoize the price data with a more stable comparison
  const memoizedPrices = useMemo(() => {
    if (!prices) return null;
    
    // Create a stable reference that only changes when actual price values change
    const stablePrices: Record<string, any> = {};
    for (const ticker of MAIN_TOKENS) {
      if (prices[ticker]) {
        stablePrices[ticker] = {
          price: prices[ticker].price,
          priceChange: prices[ticker].priceChange,
          volume: prices[ticker].volume,
          txns: prices[ticker].txns,
          liquidity: prices[ticker].liquidity
        };
      }
    }
    return stablePrices;
  }, [
    // Only depend on the actual price values, not the object reference
    prices && MAIN_TOKENS.map(ticker => prices[ticker]?.price).join(','),
    prices && MAIN_TOKENS.map(ticker => JSON.stringify(prices[ticker]?.priceChange)).join(',')
  ]);

  // Memoize the supply data
  const memoizedSupplies = useMemo(() => {
    return supplies || null;
  }, [supplies]);

  // Check if we have valid data for all main tokens
  const hasValidData = useMemo(() => {
    return memoizedPrices && memoizedSupplies && MAIN_TOKENS.every(ticker => {
      const priceData = memoizedPrices[ticker];
      const supplyData = memoizedSupplies[ticker];
      return priceData && priceData.price && priceData.price > 0 && supplyData && supplyData > 0;
    });
  }, [memoizedPrices, memoizedSupplies]);

  // Overall loading state
  const loading = pricesLoading || suppliesLoading || !hasValidData;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoize the main league tables to prevent re-renders
  const mainLeagueTables = useMemo(() => (
    <>
      {/* First Row - Main Tokens */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <LeagueTable 
          tokenTicker="PLS" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['PLS']}
        />
        <LeagueTable 
          tokenTicker="PLSX" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['PLSX']}
        />
        <LeagueTable 
          tokenTicker="INC" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['INC']}
        />
      </div>

      {/* HEX Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <LeagueTable 
          tokenTicker="eHEX" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['eHEX']}
        />
        <LeagueTable 
          tokenTicker="HEX" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['HEX']}
        />
      </div>

      {/* HDRN Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <LeagueTable 
          tokenTicker="eHDRN" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['eHDRN']}
        />
        <LeagueTable 
          tokenTicker="HDRN" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['HDRN']}
        />
      </div>

      {/* ICSA Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <LeagueTable 
          tokenTicker="eICSA" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['eICSA']}
        />
        <LeagueTable 
          tokenTicker="ICSA" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['ICSA']}
        />
      </div>

      {/* COM Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <LeagueTable 
          tokenTicker="eCOM" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['eCOM']}
        />
        <LeagueTable 
          tokenTicker="COM" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['COM']}
        />
      </div>
    </>
  ), [memoizedPrices, memoizedSupplies]);

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
          {mainLeagueTables}

          {/* Maximus Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Maximus</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {maximusTokens.map((token) => (
                <TokenCard key={token.ticker} token={token} />
              ))}
            </div>
          </div>

          {/* Memes Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Memes</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 place-items-center md:place-items-start">
              <div className="hidden md:block"></div>
              {memeTokens.map((token) => (
                <TokenCard key={token.ticker} token={token} />
              ))}
              <div className="hidden md:block"></div>
            </div>
          </div>

          {/* Tang Gang Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Tang Gang</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 place-items-center md:place-items-start">
              <div className="hidden md:block"></div>
              {tangGangTokens.map((token) => (
                <TokenCard key={token.ticker} token={token} />
              ))}
              <div className="hidden md:block"></div>
            </div>
          </div>

          {/* More Tokens Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-center">More Tokens</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {additionalTokens.map((token) => (
                <TokenCard key={token.ticker} token={token} />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
} 