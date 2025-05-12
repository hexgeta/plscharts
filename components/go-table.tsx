import { TOKEN_CONSTANTS, TOKEN_LOGOS } from '@/constants/crypto';
import { useCryptoPrice } from '@/hooks/crypto/useCryptoPrice';
import { useBackingValue } from '@/hooks/crypto/useBackingValue';
import { formatNumber, formatPrice, formatPercent } from '@/utils/format';
import { Skeleton } from '@/components/ui/skeleton2';
import Image from 'next/image';
import { useState } from 'react';
import { useHistoricPriceChange, Period } from '@/hooks/crypto/useHistoricPriceChange';
import { motion } from 'framer-motion';

const PERIODS = ['24h', '7d', '30d', '90d', 'ATL'];

// Only show these tokens
const TOKENS = ['PLS', 'PLSX', 'INC', 'pHEX', 'eHEX'];

function formatPriceSigFig(price: number, sigFigs = 3): string {
  if (price === 0) return '$0.00';
  // Use toPrecision for significant digits, then remove trailing zeros after decimal
  let str = price.toPrecision(sigFigs);
  // If the number is in exponential notation, convert to fixed
  if (str.includes('e')) {
    str = price.toFixed(sigFigs - 1);
  }
  // Remove trailing zeros after decimal, but keep at least 2 decimals for small numbers
  if (str.includes('.')) {
    str = str.replace(/(\.\d*?[1-9])0+$/, '$1').replace(/\.0+$/, '');
    if (parseFloat(str) < 1) {
      // For small numbers, pad to at least 3 decimals
      const [int, dec = ''] = str.split('.');
      str = int + '.' + dec.padEnd(3, '0');
    }
  }
  return '$' + str;
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
    <div className="w-full max-w-6xl mx-auto rounded-xl p-4 bg-black border-2 border-white/10 h-auto relative flex flex-col gap-4">
      {/* Toggle group */}
      <div className="flex justify-end">
        <div className="relative flex items-center gap-1 px-1 py-1 rounded-full border-2 border-white/10 bg-black/40">
          {PERIODS.map((period) => {
            const isActive = selected === period;
            return (
              <button
                key={period}
                onClick={() => setSelected(period as Period)}
                className={`relative px-4 py-1 rounded-full text-sm font-medium transition-colors
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
          const change = percentChange?.[selected];
          return (
            <div key={token} className="bg-black rounded-xl p-6 flex flex-col gap-2 border-2 border-white/10">
              <div className="flex items-center gap-2 mb-2">
                <Image src={TOKEN_LOGOS[token] || '/coin-logos/HEX.svg'} alt={token} width={32} height={32} />
                <div>
                  <div className="font-bold text-white">{token}</div>
                  <div className="text-xs text-gray-400">Token</div>
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
                      changeLoading
                        ? ''
                        : change == null
                          ? 'text-gray-400 text-xs font-700.npm run dev'
                          : change >= 0
                            ? 'text-[#00ff55] text-xs'
                            : 'text-red-500 text-xs font-700'
                        }>
                      {changeLoading
                        ? <Skeleton className="w-12 h-5" />
                        : change == null
                          ? '--'
                          : formatPercent(change)
                        }
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 