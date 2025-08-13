import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { MORE_COINS } from '@/constants/more-coins';
import { PRICE_CACHE_KEYS } from './utils/cache-keys';

export interface TokenPriceData {
  price: number;
  priceChange: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  volume?: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  txns?: {
    m5?: { buys: number; sells: number };
    h1?: { buys: number; sells: number };
    h6?: { buys: number; sells: number };
    h24?: { buys: number; sells: number };
  };
  liquidity?: number;
}

export interface TokenPrices {
  [ticker: string]: TokenPriceData;
}

// Essential tokens that should be loaded first
export const ESSENTIAL_TOKENS = ['PLS', 'PLSX', 'INC', 'pHEX', 'eHEX'];

const DEFAULT_PRICE_DATA: TokenPriceData = {
  price: 0,
  priceChange: {},
  liquidity: 0,
  volume: {},
  txns: {}
};

// Batch fetch function for multiple pairs on the same chain
async function fetchBatchPairData(chainName: string, pairAddresses: string[]): Promise<(any | null)[]> {
  const maxBatchSize = 30; // DexScreener supports up to 30 pairs per request
  const results: (any | null)[] = [];
  
  console.log(`[Batch Fetch] Starting batch fetch for ${pairAddresses.length} pairs on ${chainName}`);
  
  // Split into batches
  for (let i = 0; i < pairAddresses.length; i += maxBatchSize) {
    const batch = pairAddresses.slice(i, i + maxBatchSize);
    const pairString = batch.join(',');
    const batchNum = Math.floor(i / maxBatchSize) + 1;
    
    console.log(`[Batch Fetch] Batch ${batchNum}: Fetching ${batch.length} pairs from ${chainName}`);
    console.log(`[Batch Fetch] URL: https://api.dexscreener.com/latest/dex/pairs/${chainName}/${pairString}`);
    
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/pairs/${chainName}/${pairString}`);
      
      console.log(`[Batch Fetch] Batch ${batchNum} response: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        console.error(`[Batch Fetch] HTTP error for batch ${batchNum}! status: ${response.status}`);
        // Add default data for failed batch
        results.push(...batch.map(() => null));
        continue;
      }
      
      const data = await response.json();
      const pairs = data.pairs || [];
      
      console.log(`[Batch Fetch] Batch ${batchNum}: Received ${pairs.length} pairs from API`);
      console.log(`[Batch Fetch] Batch ${batchNum}: Expected addresses:`, batch);
      console.log(`[Batch Fetch] Batch ${batchNum}: Received pairs:`, pairs.map((p: any) => p.pairAddress));
      
      // Map pairs back to addresses (order might not match)
      const batchResults = batch.map(address => {
        const pair = pairs.find((p: any) => p.pairAddress?.toLowerCase() === address.toLowerCase());
        return pair || null;
      });
      
      console.log(`[Batch Fetch] Batch ${batchNum}: Mapping results:`, 
        batch.map((addr, idx) => `${addr} -> ${batchResults[idx] ? 'FOUND' : 'NOT_FOUND'}`));
      
      results.push(...batchResults);
      
      // Add delay between batches to respect rate limits
      if (i + maxBatchSize < pairAddresses.length) {
        console.log(`[Batch Fetch] Waiting 200ms before next batch...`);
        await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay
      }
    } catch (error) {
      console.error(`[Batch Fetch] Error fetching batch ${batchNum}:`, error);
      // Add default data for failed batch
      results.push(...batch.map(() => null));
    }
  }
  
  console.log(`[Batch Fetch] Completed: ${results.length} total results, ${results.filter(r => r !== null).length} successful`);
  
  return results;
}

async function fetchTokenPrices(tickers: string[], customTokens: any[] = []): Promise<TokenPrices> {
  console.log(`[Price Fetch] Starting fetch for ${tickers.length} tokens:`, tickers);
  
  // Group tokens by chain
  const tokensByChain: { [chain: string]: { ticker: string; pairAddress: string }[] } = {};
  
  for (const ticker of tickers) {
  // Look for token in TOKEN_CONSTANTS, MORE_COINS, and custom tokens
  const allTokens = [...TOKEN_CONSTANTS, ...MORE_COINS, ...customTokens];
  const tokenConfig = allTokens.find(token => token.ticker === ticker);
  
  if (!tokenConfig) {
      console.warn(`[Price Fetch] No token config found for ticker ${ticker}`);
      continue;
  }

    const { chain: chainId, dexs } = tokenConfig;
  const dexAddress = Array.isArray(dexs) ? dexs[0] : dexs;
  
  if (!dexAddress || dexAddress === '0x0') {
      console.warn(`[Price Fetch] No valid DEX address found for token ${ticker}`);
      continue;
  }

  const chainName = chainId === 1 ? 'ethereum' : 'pulsechain';
  
    if (!tokensByChain[chainName]) {
      tokensByChain[chainName] = [];
    }
    
    tokensByChain[chainName].push({ ticker, pairAddress: dexAddress });
  }

  console.log('[Price Fetch] Grouped by chain:', Object.entries(tokensByChain).map(([chain, tokens]) => 
    `${chain}: ${tokens.length} tokens`
  ).join(', '));

  const results: TokenPrices = {};
  const successfulTokens: string[] = [];
  const failedTokens: string[] = [];

  // Process each chain separately
  for (const [chainName, tokens] of Object.entries(tokensByChain)) {
    try {
      console.log(`[Price Fetch] Fetching ${tokens.length} tokens for ${chainName}:`, tokens.map(t => t.ticker));
      
      const pairAddresses = tokens.map(t => t.pairAddress);
      console.log(`[Price Fetch] Pair addresses for ${chainName}:`, pairAddresses);
      
      const pairData = await fetchBatchPairData(chainName, pairAddresses);
      console.log(`[Price Fetch] Received ${pairData.length} pairs back for ${chainName}`);
      
      // Map results back to tickers with detailed logging
      tokens.forEach((token, index) => {
        const pair = pairData[index];
        
        if (pair && pair.priceUsd) {
          results[token.ticker] = {
      price: parseFloat(pair.priceUsd),
      priceChange: {
              m5: pair.priceChange?.m5,
              h1: pair.priceChange?.h1,
              h6: pair.priceChange?.h6,
              h24: pair.priceChange?.h24
      },
      volume: {
              m5: pair.volume?.m5,
              h1: pair.volume?.h1,
              h6: pair.volume?.h6,
              h24: pair.volume?.h24
      },
      txns: {
              m5: pair.txns?.m5,
              h1: pair.txns?.h1,
              h6: pair.txns?.h6,
              h24: pair.txns?.h24
            },
            liquidity: pair.liquidity?.usd
          };
          successfulTokens.push(token.ticker);
          console.log(`✅ ${token.ticker}: $${pair.priceUsd} (${pair.priceChange?.h24 || 0}%)`);
        } else {
          failedTokens.push(token.ticker);
          console.warn(`❌ ${token.ticker}: No price data found (pair: ${token.pairAddress})`);
          
          // Special case: if stpCOM fails to get price, try to use COM price as fallback
          if (token.ticker === 'stpCOM' && results['COM']) {
            console.log(`🔄 Using COM price as fallback for stpCOM`);
            results[token.ticker] = { ...results['COM'] };
          } else {
            results[token.ticker] = DEFAULT_PRICE_DATA;
          }
        }
      });
  } catch (error) {
      console.error(`[Price Fetch] Error fetching prices for ${chainName}:`, error);
      // Add default data for all tokens in this chain
      tokens.forEach(token => {
        failedTokens.push(token.ticker);
        console.warn(`❌ ${token.ticker}: Failed due to chain error`);
        results[token.ticker] = DEFAULT_PRICE_DATA;
      });
    }
  }

  // Final summary
  console.log(`\n=== PRICE FETCH SUMMARY ===`);
  console.log(`Total tokens requested: ${tickers.length}`);
  console.log(`Successful fetches: ${successfulTokens.length}`);
  console.log(`Failed fetches: ${failedTokens.length}`);
  
  if (successfulTokens.length > 0) {
    console.log(`\n✅ SUCCESSFUL (${successfulTokens.length}):`);
    successfulTokens.forEach(ticker => {
      const data = results[ticker];
      console.log(`   ${ticker}: $${data.price.toFixed(6)} (${data.priceChange.h24 || 0}%)`);
    });
  }
  
  // Post-processing: Handle special price relationships
  // If COM has a price but stpCOM doesn't, use COM's price for stpCOM
  if (results['COM'] && results['COM'].price > 0 && (!results['stpCOM'] || results['stpCOM'].price === 0)) {
    console.log(`🔄 Post-processing: Using COM price for stpCOM`);
    results['stpCOM'] = { ...results['COM'] };
    if (failedTokens.includes('stpCOM')) {
      failedTokens.splice(failedTokens.indexOf('stpCOM'), 1);
      successfulTokens.push('stpCOM');
    }
  }
  
  if (failedTokens.length > 0) {
    console.log(`\n❌ FAILED (${failedTokens.length}):`);
    failedTokens.forEach(ticker => {
      console.log(`   ${ticker}`);
    });
  }
  
  console.log(`===========================\n`);

  return results;
}

export function useTokenPrices(tickers: string[], options?: { disableRefresh?: boolean; customTokens?: any[] }) {
  const [prices, setPrices] = useState<TokenPrices>({});
  const [error, setError] = useState<Error | null>(null);

  // Create a unique key for this set of tokens
  const cacheKey = tickers.join(',');

  const { data, error: swrError, isLoading } = useSWR(
    cacheKey ? PRICE_CACHE_KEYS.realtime(cacheKey) : null,
    async () => {
      try {
        return await fetchTokenPrices(tickers, options?.customTokens || []);
      } catch (e) {
        setError(e as Error);
        return {};
      }
    },
    {
      refreshInterval: options?.disableRefresh ? 0 : 15000, // Disable refresh if requested
      dedupingInterval: 5000, // 5 seconds
      revalidateOnFocus: false
    }
  );

  useEffect(() => {
    if (data) {
      setPrices(data);
    }
    if (swrError) {
      setError(swrError);
    }
  }, [data, swrError]);

  return { prices, isLoading, error };
}