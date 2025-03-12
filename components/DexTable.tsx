import React, { useState, useEffect } from 'react';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { motion, AnimatePresence } from 'framer-motion';

interface DexData {
  id: string;
  name: string;
  symbol: string;
  price: number;
  priceChange: number;
  volume24h: number;
  liquidity: number;
  chain: 'pulsechain' | 'ethereum' | 'solana';
  dex: string;
}

const DexTable = () => {
  const [dexData, setDexData] = useState<DexData[]>([]);
  const [selectedTokens, setSelectedTokens] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get all available tokens
    const availableTokens = Object.keys(TOKEN_CONSTANTS).filter(token => TOKEN_CONSTANTS[token].PAIR);
    setSelectedTokens(availableTokens);
  }, []);

  useEffect(() => {
    const fetchDexData = async () => {
      if (selectedTokens.length === 0) return;

      try {
        setIsLoading(true);
        setError(null);
        console.log('Fetching data for tokens:', selectedTokens);

        const promises = selectedTokens.map(async (token) => {
          const config = TOKEN_CONSTANTS[token];
          if (!config.PAIR) return null;

          const { chain, pairAddress } = config.PAIR;
          const url = `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pairAddress}`;
          console.log('Fetching from:', url);
          
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          const data = await response.json();
          
          if (data.pairs && data.pairs[0]) {
            const pairData = data.pairs[0];
            return {
              id: pairAddress,
              name: token,
              symbol: token,
              price: parseFloat(pairData.priceUsd || pairData.priceNative),
              priceChange: parseFloat(pairData.priceChange.h24),
              volume24h: parseFloat(pairData.volume.h24),
              liquidity: parseFloat(pairData.liquidity.usd),
              chain: chain,
              dex: pairData.dexId
            } as DexData;
          }
          return null;
        });

        const results = await Promise.all(promises);
        const validResults = results.filter((result): result is DexData => result !== null);
        const sortedResults = [...validResults].sort((a, b) => b.priceChange - a.priceChange);
        setDexData(sortedResults);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching DEX data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchDexData();

    // Update every 10 seconds
    const interval = setInterval(() => {
      fetchDexData();
      console.log('DEX Table Updated');
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedTokens]);

  if (error) {
    return (
      <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white mt-8">
        <div className="py-8">
          <h2 className="text-2xl font-semibold leading-tight mb-4">Real-time DEX Pairs</h2>
          <div className="text-red-500">Error: {error}</div>
          <div className="text-sm text-white/60 mt-2">Selected tokens: {selectedTokens.join(', ')}</div>
        </div>
      </div>
    );
  }

  if (isLoading && dexData.length === 0) {
    return (
      <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white mt-8">
        <div className="py-8">
          <h2 className="text-2xl font-semibold leading-tight mb-4">Real-time DEX Pairs</h2>
          <div className="text-white/60">Loading DEX data...</div>
          <div className="text-sm text-white/60 mt-2">Selected tokens: {selectedTokens.join(', ')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white mt-8">
      <div className="py-8">
        <div>
          <h2 className="text-2xl font-semibold leading-tight mb-4">Real-time DEX Pairs</h2>
          <div className="text-sm text-white/60 mb-4">Selected tokens: {selectedTokens.join(', ')}</div>
        </div>
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full rounded-lg overflow-hidden">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th className="px-5 py-3 border-b border-white/20 text-left text-xs font-semibold uppercase tracking-wider">
                    Token
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-left text-xs font-semibold uppercase tracking-wider">
                    Chain
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-left text-xs font-semibold uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-left text-xs font-semibold uppercase tracking-wider">
                    24h Change
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-left text-xs font-semibold uppercase tracking-wider">
                    24h Volume
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-left text-xs font-semibold uppercase tracking-wider">
                    Liquidity
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-left text-xs font-semibold uppercase tracking-wider">
                    DEX
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {dexData.map((token) => (
                    <motion.tr
                      key={token.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <td className="px-5 py-5 border-b border-white/20 text-sm">
                        <div className="flex items-center">
                          <p className="whitespace-no-wrap">
                            {token.name}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-5 border-b border-white/20 text-sm">
                        <p className="whitespace-no-wrap capitalize">
                          {token.chain}
                        </p>
                      </td>
                      <td className="px-5 py-5 border-b border-white/20 text-sm">
                        <p className="whitespace-no-wrap">
                          ${token.price.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                        </p>
                      </td>
                      <td className="px-5 py-5 border-b border-white/20 text-sm">
                        <p className={`whitespace-no-wrap ${token.priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {token.priceChange.toFixed(2)}%
                        </p>
                      </td>
                      <td className="px-5 py-5 border-b border-white/20 text-sm">
                        <p className="text-white/60 whitespace-no-wrap">
                          ${token.volume24h.toLocaleString()}
                        </p>
                      </td>
                      <td className="px-5 py-5 border-b border-white/20 text-sm">
                        <p className="text-white/60 whitespace-no-wrap">
                          ${token.liquidity.toLocaleString()}
                        </p>
                      </td>
                      <td className="px-5 py-5 border-b border-white/20 text-sm">
                        <span className="relative inline-block px-3 py-1 font-semibold text-blue-500 leading-tight">
                          <span
                            aria-hidden
                            className="absolute inset-0 bg-blue-500/20 rounded-full"
                          ></span>
                          <span className="relative">{token.dex}</span>
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DexTable; 