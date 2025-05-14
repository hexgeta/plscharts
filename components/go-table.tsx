import { TOKEN_CONSTANTS, TOKEN_LOGOS } from '@/constants/crypto';
import { useCryptoPrice } from '@/hooks/crypto/useCryptoPrice';
import { useBackingValue } from '@/hooks/crypto/useBackingValue';
import { formatNumber, formatPrice, formatPercent, formatPriceSigFig } from '@/utils/format';
import { Skeleton } from '@/components/ui/skeleton2';
import Image from 'next/image';
import { useState, useEffect, useMemo } from 'react';
import { useHistoricPriceChange, Period } from '@/hooks/crypto/useHistoricPriceChange';
import { motion } from 'framer-motion';
import Link from 'next/link';

const PERIODS = ['24h', '7d', '30d', '90d', 'ATL'];

// Only show these tokens
const TOKENS = ['PLS', 'PLSX', 'INC', 'pHEX', 'eHEX'];

// Customizable subtitle for each token
const TOKEN_SUBTITLES: Record<string, string> = {
  PLS: 'Gas Token',
  PLSX: 'Dex Token',
  INC: 'Green Coin',
  pHEX: 'HEX: on PulseChain',
  eHEX: 'HEX: On Ethereum',
};

// Hardcode PulseChain start date (733 days ago from today, UTC)
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// PulseChain launch: May 13, 2022 UTC
const PULSECHAIN_START_DATE = new Date(Date.UTC(2023, 4, 13, 0, 0, 0)); // May 13, 2022, 00:00:00 UTC

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

export function GoTable() {
  const [selected, setSelected] = useState<Period>('24h');

  // Live price and historic change for each token
  const priceDataMap = Object.fromEntries(
    TOKENS.map(token => [token, useCryptoPrice(token)])
  );
  const changeDataMap = Object.fromEntries(
    TOKENS.map(token => [token, useHistoricPriceChange(token)])
  );

  console.log('[GoTable] tokens:', TOKENS);

  try {
    if (!TOKENS || TOKENS.length === 0) {
      return <div className="text-white p-8">No tokens to display. Check token list and state.</div>;
    }
  } catch (err) {
    return <div className="text-red-500 p-8">Error rendering GoTable: {String(err)}</div>;
  }

  return (
    <div className="w-full max-w-5xl mx-auto my-8 rounded-xl p-4 bg-black h-auto relative flex flex-col gap-4">
      {/* Day counter in top left of container */}
      <div
        className="text-3xl font-bold text-white/15 select-none pointer-events-none static mb-2 ml-4 md:absolute md:top-4 md:left-6 md:z-10 md:mb-0 md:ml-0"
      >
        Day {usePulsechainDay()}
      </div>
      {/* Toggle group */}
      <div className="w-full flex flex-col md:flex-row justify-center md:justify-end">
        <div className="w-full md:w-auto flex items-center gap-1 px-1 py-1 rounded-full border-2 border-white/10 bg-black/40">
          {PERIODS.map((period) => {
            const isActive = selected === period;
            return (
              <button
                key={period}
                onClick={() => setSelected(period as Period)}
                className={`flex-1 md:flex-none relative px-4 py-1 rounded-full text-lg md:text-base font-bold transition-colors
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
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TOKENS.map(token => {
          const { priceData, isLoading: priceLoading } = priceDataMap[token];
          const { percentChange, isLoading: changeLoading } = changeDataMap[token];
          const price = priceData?.price;
          // Use Dexscreener for 24h, historic for others
          const change = selected === '24h'
            ? priceData?.priceChange24h
            : percentChange?.[selected];
          return (
            <div key={token} className="bg-black rounded-xl p-6 flex flex-col gap-2 border-2 border-white/10 relative">
              {/* Chart icon link in top right */}
              {TOKEN_CONSTANTS[token]?.PAIR && (
                <Link
                  href={`https://dexscreener.com/${TOKEN_CONSTANTS[token].PAIR.chain}/${TOKEN_CONSTANTS[token].PAIR.pairAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute text-white/20 hover:text-white top-3 right-3 z-10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chart-line" aria-hidden="true">
                    <path d="M3 3v16a2 2 0 0 0 2 2h16"></path>
                    <path d="m19 9-5 5-4-4-3 3"></path>
                  </svg>
                </Link>
              )}
              <div className="flex items-center gap-2 mb-2">
                <Image src={TOKEN_LOGOS[token] || '/coin-logos/HEX.svg'} alt={token} width={32} height={32} />
                <div>
                  <div className="font-bold text-white">{token}</div>
                  <div className="text-xs text-gray-400">{TOKEN_SUBTITLES[token] || 'Token'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {priceLoading ? (
                  <Skeleton className="w-16 h-6" />
                ) : (
                  <>
                    <span className="text-2xl text-white">
                      {price ? formatPriceSigFig(price, 3) : '--'}
                    </span>
                    <span className={ 
                      changeLoading && selected !== '24h'
                        ? ''
                        : change == null
                          ? 'text-gray-400 text-xs font-700.npm run dev'
                          : change >= 0
                            ? 'text-[#00ff55] text-xs'
                            : 'text-red-500 text-xs font-700'
                        }>
                      {changeLoading && selected !== '24h'
                        ? <Skeleton className="w-12 h-5" />
                        : change == null
                          ? '--'
                          : formatPercent(change)
                        }
                    </span>
                  </>
                )}
              </div>
              {/* Stats row */}
              <div className="grid grid-cols-2 gap-y-1 gap-x-4 mt-2">
                <div>
                  <div className="text-xs text-gray-400">Market Cap</div>
                  <div className="font-bold text-white">
                    {priceData?.marketCap ? formatNumber(priceData.marketCap, { compact: true, prefix: '$', decimals: 1 }) : '--'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Liquidity</div>
                  <div className="font-bold text-white">
                    {priceData?.liquidity ? formatNumber(priceData.liquidity, { compact: true, prefix: '$', decimals: 1 }) : '--'}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 