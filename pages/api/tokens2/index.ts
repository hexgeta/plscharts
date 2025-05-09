import { NextApiRequest, NextApiResponse } from 'next';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { supabaseAdmin } from '@/supabaseClient';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;  // 10 requests per minute

// In-memory store for rate limiting
const rateLimit = new Map<string, { count: number; timestamp: number }>();

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

export async function calculateTokenData() {
  // Fetch HEX stats data
  const [pulseData, ethData] = await Promise.all([
    fetch('https://hexdailystats.com/fulldatapulsechain').then(res => res.json()),
    fetch('https://hexdailystats.com/fulldata').then(res => res.json())
  ]);

  // Fetch all prices
  const pricePromises = Object.entries(TOKEN_CONSTANTS)
    .filter(([name]) => {
      const baseTokenName = name.replace(/[pe]/, '').replace(/(\d+)$/, '');
      const variant = name.match(/\d+$/)?.[0] || '';
      const fullTokenName = variant ? `${baseTokenName}${variant}` : baseTokenName;
      return ['MAXI', 'DECI', 'LUCKY', 'TRIO', 'BASE', 'BASE2', 'BASE3'].includes(fullTokenName) || 
             name === 'pHEX' || name === 'eHEX';
    })
    .map(async ([name, config]) => {
      const price = await getTokenPrice(name, config);
      return [name, price];
    });

  const prices = Object.fromEntries(await Promise.all(pricePromises));
  const tokens: { [key: string]: TokenResponse } = {};
  const currentDate = new Date();

  // Process tokens with prices
  Object.entries(TOKEN_CONSTANTS).forEach(([name, config]) => {
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

      tokens[name] = {
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
      };
    }
  });

  return { tokens };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

  try {
    // Try to get cached data from Supabase if available
    if (supabaseAdmin) {
      const { data: cachedData, error: fetchError } = await supabaseAdmin
        .from('token_data')
        .select('*')
        .eq('id', 'latest')
        .single();

      // If we have fresh cached data (less than 6 minutes old), use it
      if (cachedData && !fetchError) {
        const cacheAge = Date.now() - new Date(cachedData.updated_at).getTime();
        if (cacheAge < 6 * 60 * 1000) { // 6 minutes
          // Set CORS headers
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET');
          res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
          return res.status(200).json(cachedData.data);
        }
      }
    }

    // If no cache or stale cache, calculate directly
    const data = await calculateTokenData();

    // Store in Supabase if available
    if (supabaseAdmin) {
      await supabaseAdmin
        .from('token_data')
        .upsert({
          id: 'latest',
          data,
          updated_at: new Date().toISOString()
        })
        .then(({ error }) => {
          if (error) console.error('Failed to cache data:', error);
        });
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');

    // Format response with indentation for readability
    return res.status(200).json(data);
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 