import { NextApiRequest, NextApiResponse } from 'next';
import { TOKEN_CONSTANTS } from '@/constants/crypto';

interface TokenResponse {
  name: string;
  stake: {
    principal: number;
    tShares: number;
  daysTotal: number;
  daysSinceStart: number;
    daysLeft: number;
  progressPercentage: number;
  };
  token: {
    supply: number;
  priceUSD: number;
    costPerTShareUSD: number;
  };
  gas: {
    equivalentSoloStakeUnits: number;
    endStakeUnits: number;
    savingPercentage: number;
  };
  dates: {
  stakeStartDate?: string;
  stakeEndDate?: string;
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check cache
  if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
    // Set CORS and cache headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');
    
    return res.status(200).json(cache.data);
  }

  const tokens: { [key: string]: TokenResponse } = {};
  const currentDate = new Date();

  // Fetch all prices in parallel
  const pricePromises = Object.entries(TOKEN_CONSTANTS)
    .filter(([name]) => {
      const baseTokenName = name.replace(/[pe]/, '').replace(/(\d+)$/, '');
      const variant = name.match(/\d+$/)?.[0] || '';
      const fullTokenName = variant ? `${baseTokenName}${variant}` : baseTokenName;
      return POOL_TOKENS.includes(fullTokenName);
    })
    .map(async ([name, config]) => {
      const price = await getTokenPrice(name, config);
      return [name, price];
    });

  const prices = Object.fromEntries(await Promise.all(pricePromises));

  // Process tokens with prices
  Object.entries(TOKEN_CONSTANTS).forEach(([name, config]) => {
    const baseTokenName = name.replace(/[pe]/, '').replace(/(\d+)$/, '');
    const variant = name.match(/\d+$/)?.[0] || '';
    const fullTokenName = variant ? `${baseTokenName}${variant}` : baseTokenName;
    
    if (POOL_TOKENS.includes(fullTokenName)) {
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
      const gasSavingPercentage = Number((-(soloStakeGasUnits - endStakeGasUnits) / soloStakeGasUnits * 100).toFixed(2));

      const tokenPrice = prices[name] || 0;
      const supply = Number((config.TOKEN_SUPPLY || 0).toFixed(2));
      const tShares = config.TSHARES || 0;
      const costPerTShareUSD = tShares > 0 
        ? Number(((supply * tokenPrice) / tShares).toFixed(2))
        : 0;

      tokens[name] = {
        name,
        stake: {
          principal: Number((config.STAKE_PRINCIPLE || 0).toFixed(2)),
          tShares,
        daysTotal,
        daysSinceStart,
          daysLeft: Math.max(0, daysTotal - daysSinceStart),
        progressPercentage,
        },
        token: {
          supply,
        priceUSD: tokenPrice,
          costPerTShareUSD,
        },
        gas: {
          equivalentSoloStakeUnits: soloStakeGasUnits,
          endStakeUnits: endStakeGasUnits,
          savingPercentage: gasSavingPercentage,
        },
        dates: {
          stakeStartDate: config.STAKE_START_DATE?.toISOString().split('T')[0],
          stakeEndDate: config.STAKE_END_DATE?.toISOString().split('T')[0]
        }
      };
    }
  });

  // Update cache
  cache = {
    data: { tokens },
    timestamp: now
  };

  // Set CORS headers to allow public access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');

  return res.status(200).json({
    tokens
  });
} 