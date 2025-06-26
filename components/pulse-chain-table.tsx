'use client';

import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { formatNumber, formatPrice, formatPercent, formatPriceSigFig } from '@/utils/format';
import { Skeleton } from '@/components/ui/skeleton2';
import { CoinLogo } from '@/components/ui/CoinLogo';
import { getDisplayTicker } from '@/utils/ticker-display';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useHistoricPriceChange, Period } from '@/hooks/crypto/useHistoricPriceChange';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices';
import { useCOMCouponRate } from '@/hooks/crypto/useCOMCouponRate';
import { useECOMCouponRate } from '@/hooks/crypto/useECOMCouponRate';

// Only show these tokens in this exact order
const TOKENS = ['PLS', 'PLSX', 'INC', 'HEX', 'eHEX'];

// Customizable subtitle for each token
const TOKEN_SUBTITLES: Record<string, string> = {
  'PLS': 'Gas Coin',
  'PLSX': 'Dex Token',
  'INC': 'Green Token',
  'HEX': 'HEX on PulseChain',
  'eHEX': 'HEX on Ethereum',
};

const PERIODS = ['5m', '1h', '6h', '24h', '7d', '30d', '90d', 'ATL'];

// Hardcode PulseChain start date (733 days ago from today, UTC)
const MS_PER_DAY = 24 * 60 * 60 * 1000;
// PulseChain launch: May 13, 2022 UTC
const PULSECHAIN_START_DATE = new Date(Date.UTC(2023, 4, 13, 0, 0, 0));

export function usePulsechainDay() {
  return Math.floor((Date.now() - PULSECHAIN_START_DATE.getTime()) / MS_PER_DAY) + 1;
}

interface PulseChainTableProps {
  LoadingComponent?: React.ComponentType;
}

// Helper function to get token config from constants
const getTokenConfig = (ticker: string) => {
  const config = TOKEN_CONSTANTS.find(t => t.ticker === ticker);
  if (!config) throw new Error(`No config found for token ${ticker}`);
  return config;
};

export function PulseChainTable({ LoadingComponent }: PulseChainTableProps) {
  const [selected, setSelected] = useState<Period>('24h');
  const [showMotion, setShowMotion] = useState(true);
  const animationCompleteRef = useRef(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const pulseChainDay = usePulsechainDay();

  const { prices, isLoading: pricesLoading, error } = useTokenPrices(TOKENS);
  
  // COM coupon rate calculation
  const { couponRate: comCouponRate, isLoading: comLoading } = useCOMCouponRate();
  
  // eCOM coupon rate calculation
  const { couponRate: ecomCouponRate, isLoading: ecomLoading } = useECOMCouponRate();
  
  // Historic change for each token
  const changeDataMap = Object.fromEntries(
    TOKENS.map(ticker => [
      ticker, 
      useHistoricPriceChange(ticker)
    ])
  );

  // Check if any historic data is still loading
  const isHistoricLoading = Object.values(changeDataMap).some(data => data.isLoading);

  // Check if we have valid price data for all tokens (not just empty objects)
  const hasValidPriceData = prices && TOKENS.every(ticker => {
    const priceData = prices[ticker];
    return priceData && priceData.price && priceData.price > 0;
  });

  // Overall loading state - only for initial load
  const isLoading = (pricesLoading || isHistoricLoading || comLoading || ecomLoading || !hasValidPriceData) && isInitialLoad;

  // Handle animation completion without state updates that cause re-renders
  const handleAnimationComplete = useCallback(() => {
    if (!animationCompleteRef.current) {
      animationCompleteRef.current = true;
      // Switch to regular divs after a delay to avoid any flashing
      setTimeout(() => setShowMotion(false), 50);
    }
  }, []);

  // Effect to handle initial load completion
  useEffect(() => {
    if (hasValidPriceData && !isHistoricLoading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [hasValidPriceData, isHistoricLoading, isInitialLoad]);

  // Show loading state only on initial load
  if (isLoading) {
    return LoadingComponent ? <LoadingComponent /> : <div className="bg-black h-screen" />;
  }

  // If we have an error, we should still show the table
  if (error) {
    console.error('Error loading token prices:', error);
  }

  // Container component - motion or regular div
  const Container = showMotion ? motion.div : 'div';
  const Header = showMotion ? motion.div : 'div';
  const Toggle = showMotion ? motion.div : 'div';
  const Card = showMotion ? motion.div : 'div';

  return (
    <Container 
      {...(showMotion ? {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { 
          duration: 0.4,
          ease: [0.23, 1, 0.32, 1]
        },
        onAnimationComplete: handleAnimationComplete
      } : {})}
      className="w-full max-w-5xl mx-auto rounded-xl p-4 h-auto relative flex flex-col gap-4"
    >
      <Header 
        {...(showMotion ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.3 }
        } : {})}
        className="text-3xl md:text-2xl lg:text-3xl mt-0 md:mt-2 font-bold text-white/15 select-none pointer-events-none static mb-2 ml-4 md:absolute md:top-4 md:left-6 md:z-10 md:mb-0 md:ml-0"
      >
        Day {pulseChainDay} ~ PlsCharts.com
      </Header>
      {/* Toggle group */}
      <Toggle 
        {...(showMotion ? {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
          transition: { duration: 0.3 }
        } : {})}
        className="w-full flex flex-col md:flex-row justify-center md:justify-end"
      >
        <div className="w-full md:w-auto flex items-center justify-between p-1 rounded-full border-2 border-white/10 bg-black/40">
          {PERIODS.map((period) => {
            const isActive = selected === period;
            return (
              <button
                key={period}
                onClick={() => setSelected(period as Period)}
                className={`relative p-2 text-center text-xs gap-0 md:text-sm font-semibold transition-colors rounded-full
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
      </Toggle>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOKENS.map(ticker => {
          const config = getTokenConfig(ticker);
          const priceData = prices[ticker];
          const { percentChange } = changeDataMap[ticker];
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
            <Card 
              key={ticker}
              {...(showMotion ? {
                initial: { opacity: 0 },
                animate: { opacity: 1 },
                transition: { duration: 0.3 }
              } : {})}
              className="bg-black/80 backdrop-blur-sm rounded-xl p-6 flex flex-col gap-0 border-2 border-white/10 relative min-w-[300px]"
            >
              {/* Chart icon link in top right */}
              {config.dexs && (
                <Link
                  href={`https://dexscreener.com/${config.chain === 1 ? 'ethereum' : 'pulsechain'}/${Array.isArray(config.dexs) ? config.dexs[0] : config.dexs}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute text-white/30 hover:text-white/70 transition-colors duration-100 ease-in-out top-8 right-6 z-10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chart-line" aria-hidden="true">
                    <path d="M3 3v16a2 2 0 0 0 2 2h16"></path>
                    <path d="m19 9-5 5-4-4-3 3"></path>
                  </svg>
                </Link>
              )}
              <div className="flex items-center gap-2 mb-2">
                <CoinLogo 
                  symbol={ticker === 'eHEX' ? 'eHEX' : ticker}
                  size="lg"
                  priority={true}
                />
                <div>
                  <div className="font-bold text-white">{getDisplayTicker(ticker)}</div>
                  <div className="text-xs text-gray-400">{TOKEN_SUBTITLES[ticker] || 'Token'}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-3xl text-white">
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
              {/* Add PLS price equivalent for PLSX */}
              {ticker === "PLSX" && prices?.PLS?.price && (
                <div className="text-[16px] text-[#777] text-bold whitespace-nowrap">
                  {formatNumber(price / prices.PLS.price, { decimals: 2 })} PLS | {formatNumber(price/0.0001, { decimals: 2 })}x Sac
                </div>
              )}
              {/* Add PLS price equivalent for INC */}
              {ticker === "INC" && prices?.PLS?.price && (
                <div className="text-[16px] text-[#777] text-bold whitespace-nowrap">
                  {formatNumber(price / prices.PLS.price, { decimals: 0 })} PLS
                </div>
              )}
              {/* Add Sac ratio for PLS */}
              {ticker === "PLS" && (
                <div className="text-[16px] text-[#777] text-bold whitespace-nowrap">
                  {formatNumber(price/0.0001, { decimals: 2 })}x Sac
                </div>
              )}
              {/* Add PLS price equivalent and ratio for HEX */}
              {ticker === "HEX" && prices?.PLS?.price && prices?.eHEX?.price && (
                <div className="text-[14px] text-[#777] text-bold whitespace-nowrap">
                  {formatNumber(price / prices.PLS.price, { decimals: 0 })} PLS | {formatNumber(price/prices.eHEX.price, { decimals: 2 })} eHEX | +eHEX: {formatPriceSigFig((prices.eHEX?.price || 0) + (price || 0), 3)}
                </div>
              )}
              {/* Add COM coupon rate for HEX */}
              {ticker === "HEX" && comCouponRate !== null && (
                <div className="text-[14px] text-[#777] text-bold whitespace-nowrap">
                  COM Coupon Rate: {formatNumber(comCouponRate, { decimals: 2 })}%
                </div>
              )}
              {/* Add PLS price equivalent and HEX ratio for eHEX */}
              {ticker === "eHEX" && prices?.PLS?.price && prices?.HEX?.price && (
                <div className="text-[14px] text-[#777] text-bold whitespace-nowrap">
                  {formatNumber(price / prices.PLS.price, { decimals: 0 })} PLS | {formatNumber(price / prices.HEX.price, { decimals: 2 })} HEX
                </div>
              )}
              {/* Add eCOM coupon rate for eHEX */}
              {ticker === "eHEX" && ecomCouponRate !== null && (
                <div className="text-[14px] text-[#777] text-bold whitespace-nowrap">
                  COM Coupon Rate: {formatNumber(ecomCouponRate, { decimals: 2 })}%
                </div>
              )}
              
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
            </Card>
          );
        })}

        {/* Custom 6th Block */}
        <Card 
          {...(showMotion ? {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            transition: { duration: 0.3 }
          } : {})}
          className="bg-black/80 backdrop-blur-sm rounded-xl p-6 flex flex-col justify-between gap-2 border-2 border-white/10 relative min-h-[270px] min-w-[300px]"
        >
          <div>
            <h3 className="text-2xl font-bold text-white mb-4">Get Started</h3>
            <ol className="text-gray-400 text-sm md:text-md list-decimal pl-5 [&>li]:mb-4">
              <li>Buy USDC, DAI or ETH on <a href="https://www.zkp2p.xyz/swap?tab=buy" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/70">ZKP2P</a></li>
              <li>Bridge from to PulseChain with <a href="https://libertyswap.finance/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/70">LibertySwap</a></li>
              <li>Track your <a href="/portfolio" target="_blank" rel="noopener noreferrer" className="underline hover:text-white/70">Portfolio</a></li>
            </ol>
          </div>
          <a
            href="https://www.zkp2p.xyz/swap?tab=buy"
            target="_blank"
            rel="noopener noreferrer" 
            className="w-full bg-white hover:bg-gray-100 text-black px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-4 transition-colors"
          >
            Explore More
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M7 17L17 7M17 7H8M17 7V16" strokeWidth="2" stroke="currentColor" fill="none"/>
            </svg>
          </a>
        </Card>
      </div>
    </Container>
  );
} 