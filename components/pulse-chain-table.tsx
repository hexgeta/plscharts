'use client';

import { TOKEN_CONSTANTS, TOKEN_LOGOS } from '@/constants/crypto';
import { formatNumber, formatPrice, formatPercent, formatPriceSigFig } from '@/utils/format';
import { Skeleton } from '@/components/ui/skeleton2';
import { CoinLogo } from '@/components/ui/CoinLogo';
import { useState, useEffect, useMemo } from 'react';
import { useHistoricPriceChange, Period } from '@/hooks/crypto/useHistoricPriceChange';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices';

// Only show these tokens
const TOKENS = ['PLS', 'PLSX', 'INC', 'pHEX', 'eHEX'];

// Customizable subtitle for each token
const TOKEN_SUBTITLES: Record<string, string> = {
  PLS: 'Gas Token',
  PLSX: 'Dex Token',
  INC: 'Green Coin',
  pHEX: 'Real HEX',
  eHEX: 'Also real HEX',
};

const PERIODS = ['5m', '1h', '6h', '24h', '7d', '30d', '90d', 'ATL'];

// Hardcode PulseChain start date (733 days ago from today, UTC)
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// PulseChain launch: May 13, 2022 UTC
const PULSECHAIN_START_DATE = new Date(Date.UTC(2023, 4, 13, 0, 0, 0));

export function usePulsechainDay() {
  return useMemo(() => {
    const nowUTC = new Date(Date.UTC(
      new Date().getUTCFullYear(),
      new Date().getUTCMonth(),
      new Date().getUTCDate()
    ));
    const diff = nowUTC.getTime() - PULSECHAIN_START_DATE.getTime();
    return Math.floor(diff / MS_PER_DAY) + 1;
  }, []);
}

interface PulseChainTableProps {
  LoadingComponent?: React.ComponentType;
}

export function PulseChainTable({ LoadingComponent }: PulseChainTableProps) {
  const [selected, setSelected] = useState<Period>('24h');
  const pulseChainDay = usePulsechainDay();

  // Use batched price fetching with SWR's built-in caching
  const { prices, isLoading: pricesLoading } = useTokenPrices(TOKENS);
  
  // Historic change for each token
  const changeDataMap = Object.fromEntries(
    TOKENS.map(token => [token, useHistoricPriceChange(token)])
  );

  // Check if any historic data is still loading
  const isHistoricLoading = Object.values(changeDataMap).some(data => data.isLoading);

  // Overall loading state
  const isLoading = pricesLoading || isHistoricLoading;

  return (
    <div className="w-full max-w-5xl mx-auto my-8 rounded-xl p-4 h-auto relative flex flex-col gap-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className="text-3xl font-bold text-white/15 select-none pointer-events-none static mb-2 ml-4 md:absolute md:top-4 md:left-6 md:z-10 md:mb-0 md:ml-0"
      >
        Day {pulseChainDay}
      </motion.div>
      {/* Toggle group */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: isLoading ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        className="w-full flex flex-col md:flex-row justify-center md:justify-end"
      >
        <div className="w-full md:w-auto flex items-center justify-between px-2 py-1 rounded-full border-2 border-white/10 bg-black/40">
          {PERIODS.map((period) => {
            const isActive = selected === period;
            return (
              <button
                key={period}
                onClick={() => setSelected(period as Period)}
                className={`relative min-w-[40px] text-center py-1 rounded-full text-xs md:text-sm font-semibold transition-colors
                  ${isActive ? 'text-white' : 'text-gray-400 hover:text-white'}`}
                style={{ zIndex: 1 }}
              >
                {isActive && (
                  <motion.div
                    layoutId="period-indicator"
                    className="absolute inset-0 bg-zinc-800"
                    style={{ borderRadius: 9999, zIndex: -1 }}
                    transition={{ type: 'spring', stiffness: 1000, damping: 50 }}
                  />
                )}
                <span className="relative z-10">{period}</span>
              </button>
            );
          })}
        </div>
      </motion.div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TOKENS.map(token => {
          const priceData = prices?.[token];
          const { percentChange } = changeDataMap[token];
          const price = priceData?.price;
          
          // Map period to DexScreener format
          const dexPeriodMap = {
            '5m': 'm5',
            '1h': 'h1',
            '6h': 'h6',
            '24h': 'h24'
          };
          
          // Use Dexscreener for short periods, historic for others
          const change = selected === '5m' ? priceData?.priceChange?.m5 :
                        selected === '1h' ? priceData?.priceChange?.h1 :
                        selected === '6h' ? priceData?.priceChange?.h6 :
                        selected === '24h' ? priceData?.priceChange?.h24 :
                        percentChange?.[selected];

          // Get transaction stats for the selected period
          const dexPeriod = dexPeriodMap[selected as keyof typeof dexPeriodMap];
          const txnStats = dexPeriod ? priceData?.txns?.[dexPeriod] : null;
          const volume = dexPeriod ? priceData?.volume?.[dexPeriod] : null;

          return (
            <motion.div 
              key={token}
              className="bg-black/80 backdrop-blur-sm rounded-xl p-6 flex flex-col gap-2 border-2 border-white/10 relative"
              initial={{ opacity: 0 }}
              animate={{ opacity: isLoading ? 0 : 1 }}
              transition={{ duration: 0.3 }}
            >
              {/* Chart icon link in top right */}
              {TOKEN_CONSTANTS[token]?.PAIR && (
                <Link
                  href={`https://dexscreener.com/${TOKEN_CONSTANTS[token].PAIR.chain}/${TOKEN_CONSTANTS[token].PAIR.pairAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute text-white/20 hover:text-white/70 transition-colors duration-100 ease-in-out top-8 right-6 z-10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chart-line" aria-hidden="true">
                    <path d="M3 3v16a2 2 0 0 0 2 2h16"></path>
                    <path d="m19 9-5 5-4-4-3 3"></path>
                  </svg>
                </Link>
              )}
              <div className="flex items-center gap-2 mb-2">
                <CoinLogo 
                  symbol={token} 
                  size="lg"
                  priority={true}
                />
                <div>
                  <div className="font-bold text-white">{token}</div>
                  <div className="text-xs text-gray-400">{TOKEN_SUBTITLES[token] || 'Token'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl text-white">
                  {price ? formatPriceSigFig(price, 3) : '--'}
                </span>
                <span
                  className={ 
                    change == null
                      ? 'text-gray-400 text-sm text-bold'
                      : change <= -1
                        ? 'text-red-500 text-sm'
                        : change >= 1
                          ? 'text-[#00ff55] text-sm text-bold'
                          : 'text-gray-400 text-sm text-bold'
                  }
                >
                  {change == null ? '--' : formatPercent(change)}
                </span>
              </div>
              
              {/* Transaction Stats */}
              {['5m', '1h', '6h', '24h'].includes(selected) && (
                <div className="mt-2">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-xs text-gray-400">Buys</div>
                      <div className="font-bold text-white">
                        {txnStats?.buys || '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Sells</div>
                      <div className="font-bold text-white">
                        {txnStats?.sells || '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-400">Volume</div>
                      <div className="font-bold text-white">
                        {volume ? formatNumber(volume, { compact: true, prefix: '$', decimals: 1 }) : '--'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Liquidity row */}
              <div className="flex items-center justify-between mt-4 border-t border-white/10 pt-4">
                <div>
                  <div className="text-xs text-gray-400">Liquidity</div>
                  <div className="font-bold text-white">
                    {priceData?.liquidity ? formatNumber(priceData.liquidity, { compact: true, prefix: '$', decimals: 1 }) : '--'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400"></div>
                  <div className="font-bold text-white"></div>
                </div>
                <div>
                  <div className="text-xs text-gray-400"></div>
                  <div className="font-bold text-white"></div>
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Custom 6th Block */}
        <motion.div 
          className="bg-black/80 backdrop-blur-sm rounded-xl p-6 flex flex-col justify-between gap-2 border-2 border-white/10 relative min-h-[300px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoading ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        >
          <div>
            <h3 className="text-2xl font-bold text-white mb-6">Get Started</h3>
            <ol className="text-gray-400 text-md list-decimal pl-5 [&>li]:mb-4">
              <li>Bridge your assets to <a href="https://bridge.pulsechainapp.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/70">PulseChain</a></li>
              <li>Swap tokens <a href="https://pulsex.pulsechainapp.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/70">on PulseX</a></li>
              <li>Create your first <a href="https://hex.pulsechainapp.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/70">HEX stake</a></li>
            </ol>
          </div>
          <a
            href="https://gorealdefi.com/"
            target="_blank"
            rel="noopener noreferrer" 
            className="w-full bg-white hover:bg-gray-100 text-black px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors"
          >
            Explore More
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 17L17 7M17 7H8M17 7V16" strokeWidth="2" stroke="currentColor" fill="none"/>
            </svg>
          </a>
        </motion.div>
      </div>
    </div>
  );
} 