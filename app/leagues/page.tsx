'use client'

import LeagueTable from '../../components/LeagueTable'
import PopupLeagueTable from '../../components/PopupLeagueTable'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'
import { getCachedSupplies } from '@/hooks/crypto/useBackgroundPreloader'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { getDisplayTicker } from '@/utils/ticker-display'
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

// More PulseChain tokens (individually loaded)
const moreTokens = [
  { ticker: 'HELGO', name: 'Helgo' },
  { ticker: 'TWO', name: 'Two' },
  { ticker: 'SOLIDX', name: 'SolidX' },
  { ticker: 'UFO', name: 'UFO' },
  { ticker: 'pTGC', name: 'pTGC' },
  { ticker: 'SOIL', name: 'Soil' },
  { ticker: 'TSFi', name: 'TSFi' },
  { ticker: 'pWBTC', name: 'pWBTC' },
  { ticker: 'pWETH', name: 'pWETH' },
  { ticker: 'eWBTC', name: 'eWBTC' },
  { ticker: 'GOFURS', name: 'GOFURS' },
  { ticker: 'BBC', name: 'BBC' },
  { ticker: 'USDL', name: 'USDL' },
  { ticker: 'WATT', name: 'WATT' },
  { ticker: 'pUSDC', name: 'pUSDC' },
  { ticker: '9INCH', name: '9INCH' },
  { ticker: 'eUSDC', name: 'eUSDC' },
  { ticker: 'DOGE', name: 'DOGE' },
  { ticker: 'BEAR', name: 'BEAR' },
  { ticker: 'APC', name: 'APC' },
  { ticker: 'UPX', name: 'UPX' },
  { ticker: 'pUSDT', name: 'pUSDT' },
  { ticker: 'pDAI', name: 'pDAI' },
  { ticker: 'eUSDT', name: 'eUSDT' },
  { ticker: 'PTS', name: 'PTS' },
  { ticker: 'ALIEN', name: 'ALIEN' },
  { ticker: 'vPLS', name: 'vPLS' },
  { ticker: 'WBNB', name: 'WBNB' },
  { ticker: 'UP', name: 'UP' },
  { ticker: 'BLAST', name: 'BLAST' },
  { ticker: 'LEGAL', name: 'LEGAL' },
  { ticker: 'MONAT', name: 'MONAT' },
  { ticker: 'TBILL', name: 'TBILL' },
  { ticker: 'PLSP', name: 'PLSP' },
  { ticker: 'HEXDC', name: 'HEXDC' },
  { ticker: 'PLSD', name: 'PLSD' },
  { ticker: 'PZEN', name: 'PZEN' },
  { ticker: 'DMND', name: 'DMND' },
  { ticker: 'pSHIB', name: 'pSHIB' },
  { ticker: 'PXDC', name: 'PXDC' },
  { ticker: 'PTP', name: 'PTP' },
  { ticker: 'pYFI', name: 'pYFI' },
  { ticker: 'TETRA', name: 'TETRA' },
  { ticker: 'NOPE', name: 'NOPE' },
  { ticker: 'pBAL', name: 'pBAL' },
  { ticker: 'pAAVE', name: 'pAAVE' },
];

// OA (Origin Address) supplies to subtract when toggle is enabled
const OA_SUPPLIES = {
  'PLS': 120_000_000_000_000, // Example OA supply for PLS
  'PLSX': 122_000_000_000_000, // Example OA supply for PLSX  
  'HEX': 0, // OA HEX supply
  'eHEX': 0, // OA HEX supply (same as HEX)
  // Add other tokens as needed
};

// Memoized component for popup tokens (individually loaded)
const PopupTokenCard = React.memo(({ token }: { 
  token: { ticker: string; name: string };
}) => {
  return (
    <PopupLeagueTable token={token}>
      {(onClick) => (
        <div
          onClick={onClick}
          className="bg-black border border-2 border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-gray-800/50 transition-all duration-200 flex flex-col items-center gap-3 w-full"
        >
          <div className="w-12 h-12 relative">
            <CoinLogo
              symbol={token.ticker}
              size="xl"
              className="rounded-full"
            />
          </div>
          <div className="text-center">
            <div className="font-semibold text-sm">{getDisplayTicker(token.ticker)}</div>
            <div className="text-xs text-gray-400 truncate">{token.name}</div>
          </div>
        </div>
      )}
    </PopupLeagueTable>
  );
}, (prevProps, nextProps) => {
  // Only re-render if token data changed
  return (
    prevProps.token.ticker === nextProps.token.ticker &&
    prevProps.token.name === nextProps.token.name
  );
});

PopupTokenCard.displayName = 'PopupTokenCard';

export default function LeaguesPage() {
  const [mounted, setMounted] = useState(false);
  const [excludeOA, setExcludeOA] = useState(true);
  const showHolders = true; // Set to true/false to show/hide holders column

  // League images are now preloaded by the background preloader
  
  // Batch fetch prices and supplies for main tokens only
  const { prices, isLoading: pricesLoading } = useTokenPrices(MAIN_TOKENS, { disableRefresh: true });
  
  // Get supplies from cache (background preloader should have loaded these)
  const cachedSupplies = getCachedSupplies();
  const supplies = useMemo(() => {
    if (!cachedSupplies) return null;
    // Filter to only include MAIN_TOKENS
    const filteredSupplies: Record<string, number> = {};
    MAIN_TOKENS.forEach(token => {
      if (cachedSupplies.supplies[token]) {
        filteredSupplies[token] = cachedSupplies.supplies[token];
      }
    });
    return filteredSupplies;
  }, [cachedSupplies]);
  
  const suppliesLoading = !cachedSupplies; // Loading if no cached data available

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

  // Memoize the supply data with OA exclusion logic
  const memoizedSupplies = useMemo(() => {
    if (!supplies) return null;
    
    // Don't modify supplies here - just return the raw supplies
    return supplies;
  }, [supplies]);

  // Calculate OA deduction amounts for each token
  const getOADeduction = (ticker: string): number => {
    return excludeOA && OA_SUPPLIES[ticker] ? OA_SUPPLIES[ticker] : 0;
  };

  // Check if we have valid data for at least some main tokens (not all)
  const hasValidData = useMemo(() => {
    if (!memoizedPrices || !memoizedSupplies) return false;
    
    // Check if we have valid data for at least some tokens (not requiring all)
    const validTokenCount = MAIN_TOKENS.filter(ticker => {
      const priceData = memoizedPrices[ticker];
      const supplyData = memoizedSupplies[ticker];
      const isValid = priceData && priceData.price && priceData.price > 0 && supplyData && supplyData > 0;
      
      // Debug logging for failed tokens
      if (!isValid) {
        console.log(`[LeaguesPage] Token ${ticker} failed validation:`, {
          priceData,
          supplyData,
          hasPrice: priceData && priceData.price > 0,
          hasSupply: supplyData && supplyData > 0
        });
      }
      
      return isValid;
    }).length;
    
    console.log(`[LeaguesPage] Valid tokens: ${validTokenCount}/${MAIN_TOKENS.length}`);
    
    // Show the page if we have data for at least 50% of tokens
    return validTokenCount >= Math.ceil(MAIN_TOKENS.length * 0.5);
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
          supplyDeduction={getOADeduction('PLS')}
          showLeagueNames={true}
        />
        <LeagueTable 
          tokenTicker="PLSX" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['PLSX']}
          supplyDeduction={getOADeduction('PLSX')}
          showLeagueNames={true}
        />
        <LeagueTable 
          tokenTicker="INC" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['INC']}
          supplyDeduction={getOADeduction('INC')}
          showLeagueNames={true}
        />
      </div>

      {/* HEX Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center">
        <LeagueTable 
          tokenTicker="eHEX" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['eHEX']}
          supplyDeduction={getOADeduction('eHEX')}
          showLeagueNames={true}
        />
        <LeagueTable 
          tokenTicker="HEX" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['HEX']}
          supplyDeduction={getOADeduction('HEX')}
          showLeagueNames={true}
          showHolders={showHolders}
        />
      </div>

      {/* HDRN Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center">
        <LeagueTable 
          tokenTicker="eHDRN" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['eHDRN']}
          supplyDeduction={getOADeduction('eHDRN')}
          showLeagueNames={true}
        />
        <LeagueTable 
          tokenTicker="HDRN" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['HDRN']}
          supplyDeduction={getOADeduction('HDRN')}
          showLeagueNames={true}
        />
      </div>

      {/* ICSA Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center">
        <LeagueTable 
          tokenTicker="eICSA" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['eICSA']}
          supplyDeduction={getOADeduction('eICSA')}
          showLeagueNames={true}
        />
        <LeagueTable 
          tokenTicker="ICSA" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['ICSA']}
          supplyDeduction={getOADeduction('ICSA')}
          showLeagueNames={true}
        />
      </div>

      {/* COM Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center">
        <LeagueTable 
          tokenTicker="eCOM" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['eCOM']}
          supplyDeduction={getOADeduction('eCOM')}
          showLeagueNames={true}
        />
        <LeagueTable 
          tokenTicker="COM" 
          preloadedPrices={memoizedPrices} 
          preloadedSupply={memoizedSupplies?.['COM']}
          supplyDeduction={getOADeduction('COM')}
          showLeagueNames={true}
        />
      </div>
    </>
  ), [memoizedPrices, memoizedSupplies, excludeOA, showHolders]);

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
          className="max-w-[1000px] py-8 mx-auto w-full relative flex flex-col gap-4 sm:gap-8"
        >
          {/* Toggle Buttons */}
          <div className="flex justify-center gap-4 mb-0">
            <button
              onClick={() => setExcludeOA(!excludeOA)}
              className={`px-6 py-2 rounded-full border-2 font-medium transition-all duration-200 ${
                excludeOA 
                  ? 'bg-transparent text-white border-white/20 hover:border-white/40' 
                  : 'bg-transparent text-white border-white/20 hover:border-white/40'
              }`}
            >
              {excludeOA ? 'Include OA' : 'Exclude OA'}
            </button>
          </div>

          {mainLeagueTables}

          {/* Maximus Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Maximus</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {maximusTokens.map((token) => (
                <PopupTokenCard key={token.ticker} token={token} />
              ))}
            </div>
          </div>

          {/* Memes Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Memes</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 place-items-center md:place-items-start">
              <div className="hidden md:block"></div>
              {memeTokens.map((token) => (
                <PopupTokenCard key={token.ticker} token={token} />
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
                <PopupTokenCard key={token.ticker} token={token} />
              ))}
              <div className="hidden md:block"></div>
            </div>
          </div>

          {/* Popular Tokens Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Popular Tokens</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {additionalTokens.map((token) => (
                <PopupTokenCard key={token.ticker} token={token} />
              ))}
            </div>
          </div>

          {/* More Tokens Section */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-6 text-center">More Tokens</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {moreTokens.map((token) => (
                <PopupTokenCard key={token.ticker} token={token} />
              ))}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
} 