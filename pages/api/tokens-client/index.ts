import { NextApiRequest, NextApiResponse } from 'next';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { supabase } from '@/supabaseClient';

// Define token order
const TOKEN_ORDER = [
  'pMAXI', 'eMAXI',
  'pDECI', 'eDECI',
  'pLUCKY', 'eLUCKY',
  'pTRIO', 'eTRIO',
  'pBASE', 'eBASE',
  'pBASE2', 'eBASE2',
  'pBASE3', 'eBASE3'
];

interface TokenResponse {
  name: string;
  stake: {
    principal: number;
    tShares: number;
    yieldSoFarHEX: number;
    backingHEX: number;
    percentageYieldEarnedSoFar: number;
    hexAPY: number;
    minterAPY: number;
  };
  token: {
    supply: number;
    burnedSupply: number;
    priceUSD: number;
    priceHEX: number;
    costPerTShareUSD: number;
    backingPerToken: number;
    discountFromBacking: number;
    discountFromMint: number;
  };
  gas: {
    equivalentSoloStakeUnits: number;
    endStakeUnits: number;
    savingPercentage: number;
  };
  dates: {
    stakeStartDate?: string;
    stakeEndDate?: string;
    daysTotal: number;
    daysSinceStart: number;
    daysLeft: number;
    progressPercentage: number;
  };
}

// Include all BASE variants
const POOL_TOKENS = [
  'MAXI',
  'DECI',
  'LUCKY',
  'TRIO',
  'BASE',
  'BASE2',
  'BASE3'
];

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;  // 10 requests per minute

// In-memory store for rate limiting
const rateLimit = new Map<string, { count: number; timestamp: number }>();

// Cache configuration
const CACHE_DURATION = 60 * 1000; // 1 minute
let cache: {
  data: { tokens: { [key: string]: TokenResponse } } | null;
  timestamp: number;
} = { data: null, timestamp: 0 };

async function getTokenPrice(symbol: string, config: any): Promise<number> {
  try {
    if (!config?.PAIR) return 0;
    const { chain, pairAddress } = config.PAIR;
    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pairAddress}`
    );
    if (!response.ok) return 0;
    const data = await response.json();
    const price = data.pair?.priceUsd || data.pairs?.[0]?.priceUsd;
    return price ? parseFloat(price) : 0;
  } catch (err) {
    return 0;
  }
}

// Calculate stake yield for a specific period
function calculateStakeYieldForPeriod(
  data: any[],
  startDate: Date,
  endDate: Date,
  tshares: number
): number {
  return data
    .filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= startDate && entryDate <= endDate;
    })
    .reduce((acc, entry) => acc + (entry.payoutPerTshareHEX * tshares || 0), 0);
}

function orderTokenProperties(token: any) {
  return {
    name: token.name,
    stake: {
      principal: token.stake.principal,
      tShares: token.stake.tShares,
      yieldSoFarHEX: token.stake.yieldSoFarHEX,
      backingHEX: token.stake.backingHEX,
      percentageYieldEarnedSoFar: token.stake.percentageYieldEarnedSoFar,
      hexAPY: token.stake.hexAPY,
      minterAPY: token.stake.minterAPY
    },
    token: {
      supply: token.token.supply,
      burnedSupply: token.token.burnedSupply,
      priceUSD: token.token.priceUSD,
      priceHEX: token.token.priceHEX,
      costPerTShareUSD: token.token.costPerTShareUSD,
      backingPerToken: token.token.backingPerToken,
      discountFromBacking: token.token.discountFromBacking,
      discountFromMint: token.token.discountFromMint
    },
    gas: {
      equivalentSoloStakeUnits: token.gas.equivalentSoloStakeUnits,
      endStakeUnits: token.gas.endStakeUnits,
      savingPercentage: token.gas.savingPercentage
    },
    dates: {
      stakeStartDate: token.dates.stakeStartDate,
      stakeEndDate: token.dates.stakeEndDate,
      daysTotal: token.dates.daysTotal,
      daysSinceStart: token.dates.daysSinceStart,
      daysLeft: token.dates.daysLeft,
      progressPercentage: token.dates.progressPercentage
    }
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try to get cached data from Supabase first
    const { data: cachedData, error: fetchError } = await supabase
      .from('api_data')
      .select('*')
      .eq('id', 'latest')
      .single();

    // If we have fresh cached data (less than 6 minutes old), use it
    if (cachedData && !fetchError) {
      const cacheAge = Date.now() - new Date(cachedData.updated_at).getTime();
      if (cacheAge < 6 * 60 * 1000) { // 6 minutes
        const orderedTokens: { [key: string]: TokenResponse } = {};
        TOKEN_ORDER.forEach(tokenId => {
          if (cachedData.data.tokens[tokenId]) {
            orderedTokens[tokenId] = orderTokenProperties(cachedData.data.tokens[tokenId]);
          }
        });
        return res.status(200).json({ tokens: orderedTokens });
      }
    }

    // If no fresh cache, fall back to direct calculation
    // Rate limiting logic
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const windowData = rateLimit.get(ip as string);

    if (windowData) {
      if (now - windowData.timestamp < RATE_LIMIT_WINDOW) {
        if (windowData.count >= MAX_REQUESTS_PER_WINDOW) {
          return res.status(429).json({ 
            error: 'Too many requests',
            retryAfter: Math.ceil((RATE_LIMIT_WINDOW - (now - windowData.timestamp)) / 1000)
          });
        }
        windowData.count++;
      } else {
        rateLimit.set(ip as string, { count: 1, timestamp: now });
      }
    } else {
      rateLimit.set(ip as string, { count: 1, timestamp: now });
    }

    // Check cache
    if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
      // Set CORS and cache headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET');
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
      
      const orderedTokens: { [key: string]: TokenResponse } = {};
      TOKEN_ORDER.forEach(tokenId => {
        if (cache.data?.tokens[tokenId]) {
          orderedTokens[tokenId] = orderTokenProperties(cache.data.tokens[tokenId]);
        }
      });
      return res.status(200).json({ tokens: orderedTokens });
    }

    // Fetch HEX stats data for yield calculations
    const [pulseData, ethData] = await Promise.all([
      fetch('https://hexdailystats.com/fulldatapulsechain').then(res => res.json()),
      fetch('https://hexdailystats.com/fulldata').then(res => res.json())
    ]);

    // Fetch all prices in parallel
    const pricePromises = Object.entries(TOKEN_CONSTANTS)
      .filter(([name]) => {
        const baseTokenName = name.replace(/[pe]/, '').replace(/(\d+)$/, '');
        const variant = name.match(/\d+$/)?.[0] || '';
        const fullTokenName = variant ? `${baseTokenName}${variant}` : baseTokenName;
        return POOL_TOKENS.includes(fullTokenName) || name === 'pHEX' || name === 'eHEX';
      })
      .map(async ([name, config]) => {
        const price = await getTokenPrice(name, config);
        return [name, price];
      });

    const prices = Object.fromEntries(await Promise.all(pricePromises));
    const tokens: { [key: string]: TokenResponse } = {};
    const currentDate = new Date();

    // Process tokens in the defined order
    TOKEN_ORDER.forEach(name => {
      const config = TOKEN_CONSTANTS[name];
      if (!config) return;

      const baseTokenName = name.replace(/[pe]/, '').replace(/(\d+)$/, '');
      const variant = name.match(/\d+$/)?.[0] || '';
      const fullTokenName = variant ? `${baseTokenName}${variant}` : baseTokenName;
      
      if (['MAXI', 'DECI', 'LUCKY', 'TRIO', 'BASE', 'BASE2', 'BASE3'].includes(fullTokenName)) {
        const startDate = config.STAKE_START_DATE;
        const daysSinceStart = startDate 
          ? Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) 
          : 0;
        const daysTotal = config.TOTAL_STAKED_DAYS || 0;
        const progressPercentage = daysTotal > 0 
          ? Number((Math.min((daysSinceStart / daysTotal) * 100, 100)).toFixed(2))
          : 0;

        const soloStakeGasUnits = 53694 + (2310 * daysTotal);
        const endStakeGasUnits = 70980;
        const gasSavingPercentage = Number((-(soloStakeGasUnits - endStakeGasUnits) / soloStakeGasUnits).toFixed(4));

        const tokenPrice = prices[name] || 0;
        const hexPrice = name.startsWith('e') ? prices['eHEX'] : prices['pHEX'];
        const priceHEX = hexPrice > 0 ? Number((tokenPrice / hexPrice).toFixed(8)) : 0;
        
        const supply = Number((config.TOKEN_SUPPLY || 0).toFixed(2));
        const tShares = config.TSHARES || 0;
        const costPerTShareUSD = tShares > 0 
          ? Number(((supply * tokenPrice) / tShares).toFixed(2))
          : 0;

        // Calculate backing including yield
        const hexData = name.startsWith('e') ? ethData : pulseData;
        let backingValue = config.STAKE_PRINCIPLE || 0;
        
        if (config.STAKE_TYPE === 'rolling' && config.RELATED_STAKES) {
          // For rolling stakes, combine all related stakes
          backingValue = config.RELATED_STAKES.reduce((total, stakeToken) => {
            const stakeConfig = TOKEN_CONSTANTS[stakeToken];
            if (!stakeConfig || !stakeConfig.STAKE_START_DATE) return total;
            
            const now = new Date();
            if (stakeConfig.STAKE_START_DATE > now) return total;
            if (stakeConfig.STAKE_END_DATE && stakeConfig.STAKE_END_DATE < now) return total;

            const endDate = stakeConfig.STAKE_END_DATE && stakeConfig.STAKE_END_DATE < now 
              ? stakeConfig.STAKE_END_DATE 
              : now;

            const stakeYield = calculateStakeYieldForPeriod(
              hexData,
              stakeConfig.STAKE_START_DATE,
              endDate,
              stakeConfig.TSHARES || 0
            );
            
            return total + (stakeConfig.STAKE_PRINCIPLE || 0) + stakeYield;
          }, 0);
        } else {
          // For fixed stakes, calculate single stake yield
          const endDate = config.STAKE_END_DATE && config.STAKE_END_DATE < currentDate
            ? config.STAKE_END_DATE
            : currentDate;

          if (startDate) {
            const stakeYield = calculateStakeYieldForPeriod(
              hexData,
              startDate,
              endDate,
              tShares
            );
            backingValue += stakeYield;
          }
        }

        const backingPerToken = supply > 0 ? Number((backingValue / supply).toFixed(8)) : 0;
        
        let discountFromBacking = 0;
        let discountFromMint = 0;

        if (backingPerToken > 0 && hexPrice > 0 && tokenPrice > 0) {
          const backingValueUSD = backingPerToken * hexPrice;
          discountFromBacking = Number((-((backingValueUSD - tokenPrice) / backingValueUSD)).toFixed(4));
          discountFromMint = Number((-((hexPrice - tokenPrice) / hexPrice)).toFixed(4));
        }

        // Calculate yield metrics
        const stakePrinciple = config.STAKE_PRINCIPLE || 0;
        const yieldSoFarHEX = Number((backingValue - stakePrinciple).toFixed(2));
        const backingHEX = Number(backingValue.toFixed(2));
        const percentageYieldEarnedSoFar = stakePrinciple > 0 
          ? Number((yieldSoFarHEX / stakePrinciple).toFixed(2))
          : 0;

        // Calculate APY metrics
        const daysInYear = 365;
        const hexAPY = daysSinceStart > 0 && stakePrinciple > 0
          ? Number((((yieldSoFarHEX / stakePrinciple) * (daysInYear / daysSinceStart)).toFixed(4)))
          : 0;

        // For minter APY:
        // - Calculate yield as (priceHEX - 1) since minters paid 1 HEX per token
        // - Annualize this yield by (365 / daysSinceStart)
        const minterAPY = (daysSinceStart > 0 && priceHEX > 0 && !['BASE2', 'BASE3'].includes(fullTokenName))
          ? Number((((priceHEX - 1) * (daysInYear / daysSinceStart))).toFixed(4))
          : 0;

        tokens[name] = orderTokenProperties({
          name,
          stake: {
            principal: Number((config.STAKE_PRINCIPLE || 0).toFixed(2)),
            tShares,
            yieldSoFarHEX,
            backingHEX,
            percentageYieldEarnedSoFar,
            hexAPY,
            minterAPY,
          },
          token: {
            supply,
            burnedSupply: fullTokenName === 'MAXI' ? 19777538.77 : 0,
            priceUSD: tokenPrice,
            priceHEX,
            costPerTShareUSD,
            backingPerToken,
            discountFromBacking,
            discountFromMint,
          },
          gas: {
            equivalentSoloStakeUnits: soloStakeGasUnits,
            endStakeUnits: endStakeGasUnits,
            savingPercentage: gasSavingPercentage,
          },
          dates: {
            stakeStartDate: config.STAKE_START_DATE?.toISOString().split('T')[0],
            stakeEndDate: config.STAKE_END_DATE?.toISOString().split('T')[0],
            daysTotal,
            daysSinceStart,
            daysLeft: Math.max(0, daysTotal - daysSinceStart),
            progressPercentage: Number((progressPercentage / 100).toFixed(4)),
          }
        });
      }
    });

    // Update cache
    const orderedTokens: { [key: string]: TokenResponse } = {};
    TOKEN_ORDER.forEach(tokenId => {
      if (tokens[tokenId]) {
        orderedTokens[tokenId] = tokens[tokenId];
      }
    });

    cache = {
      data: { tokens: orderedTokens },
      timestamp: now
    };

    // Set CORS headers to allow public access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');

    return res.status(200).json({
      tokens: orderedTokens
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 