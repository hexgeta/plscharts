'use client'

import useSWR from 'swr'
import { TOKEN_CONSTANTS } from '@/constants/crypto'

interface PriceData {
  price: number;
  priceChange: {
    m5: number;
    h1: number;
    h6: number;
    h24: number;
  };
  liquidity: number | null;
  marketCap: number | null;
  supply: number | null;
  lastUpdated: Date;
  chain: string;
  txns: {
    [key: string]: {
      buys: number;
      sells: number;
    };
  };
  volume: {
    [key: string]: number;
  };
}

interface PriceResponse {
  pairs?: {
    priceUsd: string
    priceChange: {
      h24?: number
      h6?: number
      h1?: number
    }
  }[]
  pair?: {
    priceUsd: string
    priceChange: {
      h24?: number
      h6?: number
      h1?: number
    }
  }
}

export function useCryptoPrice(symbol: string) {
  const upperSymbol = symbol.toUpperCase();
  
  // Try both original and uppercase symbol for backward compatibility
  const tokenConfig = TOKEN_CONSTANTS[symbol] || TOKEN_CONSTANTS[upperSymbol];
  
  const { data, error, isLoading } = useSWR(
    typeof window !== 'undefined' ? `crypto/price/${symbol}` : null,
    async () => {
      try {
        if (!tokenConfig?.PAIR) {
          throw new Error(`No pair config found for ${symbol}`)
        }

        const { chain, pairAddress } = tokenConfig.PAIR
        
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pairAddress}`
        )
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${symbol} price from DexScreener`)
        }
        
        const data = await response.json()
        console.log(`RAW_DEXSCREENER_RESPONSE_${symbol}:`, {
          pair: data.pair || data.pairs?.[0],
          fdv: data.pair?.fdv || data.pairs?.[0]?.fdv,
          marketCap: data.pair?.marketCap || data.pairs?.[0]?.marketCap,
          price: data.pair?.priceUsd || data.pairs?.[0]?.priceUsd,
          liquidity: data.pair?.liquidity?.usd || data.pairs?.[0]?.liquidity?.usd,
          supply: data.pair?.baseToken?.totalSupply || data.pairs?.[0]?.baseToken?.totalSupply,
          txns: {
            m5: data.pair?.txns?.m5 || data.pairs?.[0]?.txns?.m5,
            h1: data.pair?.txns?.h1 || data.pairs?.[0]?.txns?.h1,
            h6: data.pair?.txns?.h6 || data.pairs?.[0]?.txns?.h6,
            h24: data.pair?.txns?.h24 || data.pairs?.[0]?.txns?.h24
          },
          volume: {
            m5: data.pair?.volume?.m5 || data.pairs?.[0]?.volume?.m5,
            h1: data.pair?.volume?.h1 || data.pairs?.[0]?.volume?.h1,
            h6: data.pair?.volume?.h6 || data.pairs?.[0]?.volume?.h6,
            h24: data.pair?.volume?.h24 || data.pairs?.[0]?.volume?.h24
          },
          priceChange: {
            m5: data.pair?.priceChange?.m5 || data.pairs?.[0]?.priceChange?.m5,
            h1: data.pair?.priceChange?.h1 || data.pairs?.[0]?.priceChange?.h1,
            h6: data.pair?.priceChange?.h6 || data.pairs?.[0]?.priceChange?.h6,
            h24: data.pair?.priceChange?.h24 || data.pairs?.[0]?.priceChange?.h24
          },
          // Add detailed market cap calculation data
          marketCapCalculation: {
            symbol,
            price: data.pair?.priceUsd || data.pairs?.[0]?.priceUsd,
            totalSupply: data.pair?.baseToken?.totalSupply || data.pairs?.[0]?.baseToken?.totalSupply,
            dexScreenerMarketCap: data.pair?.marketCap || data.pairs?.[0]?.marketCap,
            dexScreenerFDV: data.pair?.fdv || data.pairs?.[0]?.fdv,
            baseToken: data.pair?.baseToken || data.pairs?.[0]?.baseToken
          }
        });
        
        // Try both pairs and pair fields
        const pair = data.pair || data.pairs?.[0];
        const price = pair?.priceUsd;
        const priceChange = {
          m5: Number(pair?.priceChange?.m5 || 0),
          h1: Number(pair?.priceChange?.h1 || 0),
          h6: Number(pair?.priceChange?.h6 || 0),
          h24: Number(pair?.priceChange?.h24 || 0)
        };
        const liquidity = pair?.liquidity?.usd;
        
        // Map transaction stats directly from DexScreener format
        const txns = {
          m5: pair?.txns?.m5 || { buys: 0, sells: 0 },
          h1: pair?.txns?.h1 || { buys: 0, sells: 0 },
          h6: pair?.txns?.h6 || { buys: 0, sells: 0 },
          h24: pair?.txns?.h24 || { buys: 0, sells: 0 }
        };
        
        // Map volume directly from DexScreener format
        const volume = {
          m5: Number(pair?.volume?.m5 || 0),
          h1: Number(pair?.volume?.h1 || 0),
          h6: Number(pair?.volume?.h6 || 0),
          h24: Number(pair?.volume?.h24 || 0)
        };
        
        // Custom market cap calculation for specific tokens
        let marketCap: number | null = null;
        const baseTokenSupply = pair?.baseToken?.totalSupply;
        const dexScreenerMC = pair?.marketCap;
        const dexScreenerFDV = pair?.fdv;

        console.log(`MARKET_CAP_DEBUG_${symbol}:`, {
          baseTokenSupply,
          dexScreenerMC,
          dexScreenerFDV,
          price,
          rawPair: pair
        });

        if (symbol === 'PLS') {
          try {
            // Fetch PLS supply from PulseChain API
            const response = await fetch('https://api.scan.pulsechain.com/api?module=stats&action=coinsupply');
            const supply = await response.text();
            
            if (supply && price) {
              marketCap = Number(price) * Number(supply);
              console.log(`MARKET_CAP_CALCULATION_${symbol}:`, {
                method: 'PulseChain API Supply',
                price,
                supply,
                marketCap,
                calculation: `${price} * ${supply} = ${marketCap}`
              });
            } else {
              throw new Error('Invalid supply data from PulseChain API');
            }
          } catch (err) {
            // Fallback to fixed supply if API fails
            const PLS_TOTAL_SUPPLY = 2_000_000_000_000_000;
            marketCap = price ? Number(price) * PLS_TOTAL_SUPPLY : null;
            console.log(`MARKET_CAP_CALCULATION_${symbol}_FALLBACK:`, {
              method: 'Fixed Supply (Fallback)',
              price,
              totalSupply: PLS_TOTAL_SUPPLY,
              marketCap,
              error: err.message
            });
          }
        } else if (symbol === 'pHEX' || symbol === 'eHEX') {
          // Use circulating supply from baseToken if available
          if (baseTokenSupply && price) {
            marketCap = Number(price) * Number(baseTokenSupply);
            console.log(`MARKET_CAP_CALCULATION_${symbol}:`, {
              method: 'Circulating Supply',
              price,
              supply: baseTokenSupply,
              marketCap,
              calculation: `${price} * ${baseTokenSupply} = ${marketCap}`,
              dexScreenerComparison: {
                dexScreenerMC,
                dexScreenerFDV,
                difference: marketCap - (dexScreenerMC || 0)
              }
            });
          } else {
            console.log(`MARKET_CAP_CALCULATION_${symbol}_ERROR:`, {
              error: 'Missing required data',
              price,
              baseTokenSupply
            });
          }
        } else {
          // For other tokens, use DexScreener's market cap or FDV
          marketCap = dexScreenerMC ? Number(dexScreenerMC) : dexScreenerFDV ? Number(dexScreenerFDV) : null;
          console.log(`MARKET_CAP_CALCULATION_${symbol}:`, {
            method: 'DexScreener',
            price,
            dexScreenerMC,
            dexScreenerFDV,
            marketCap,
            baseTokenSupplyComparison: baseTokenSupply ? {
              baseTokenSupply,
              calculatedMC: price ? Number(price) * Number(baseTokenSupply) : null
            } : 'No baseTokenSupply available'
          });
        }

        if (!price) {
          throw new Error(`No price data found for ${symbol}`)
        }

        // Convert price string to number while preserving precision
        const numPrice = Number(price);

        return {
          price: numPrice,
          priceChange,
          liquidity: liquidity ? Number(liquidity) : null,
          marketCap,
          supply: pair?.baseToken?.totalSupply ? Number(pair.baseToken.totalSupply) : null,
          lastUpdated: new Date(),
          chain: chain,
          txns,
          volume
        }
      } catch (err) {
        console.log('RAW_DEXSCREENER_ERROR:', {
          symbol,
          error: err.message
        });
        return {
          price: 0,
          priceChange: {
            m5: 0,
            h1: 0,
            h6: 0,
            h24: 0
          },
          liquidity: null,
          marketCap: null,
          supply: null,
          lastUpdated: new Date(),
          chain: tokenConfig?.PAIR?.chain || (symbol.includes('p') ? 'pulsechain' : 'ethereum'),
          txns: {},
          volume: {}
        }
      }
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 15000,
      fallbackData: {
        price: 0,
        priceChange: {
          m5: 0,
          h1: 0,
          h6: 0,
          h24: 0
        },
        liquidity: null,
        marketCap: null,
        supply: null,
        lastUpdated: new Date(),
        chain: tokenConfig?.PAIR?.chain || (symbol.includes('p') ? 'pulsechain' : 'ethereum'),
        txns: {},
        volume: {}
      }
    }
  )

  return {
    priceData: data,
    isLoading: typeof window === 'undefined' ? true : isLoading,
    error
  }
} 