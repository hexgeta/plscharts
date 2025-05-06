import { NextApiRequest, NextApiResponse } from 'next';
import { TOKEN_CONSTANTS } from '@/constants/crypto';

interface TokenResponse {
  name: string;
  daysTotal: number;
  daysSinceStart: number;
  progressPercentage: number;
  principal: number;
  tShares: number;
  tokenSupply: number;
  costPerTShare: number;
  priceUSD: number;
  soloStakeGasUnits: number;
  endStakeGasUnits: number;
  gasSavingPercentage: number;
  launchDate?: string;
  stakeStartDate?: string;
  stakeEndDate?: string;
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
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
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
        ? Math.min((daysSinceStart / daysTotal) * 100, 100) 
        : 0;

      const soloStakeGasUnits = 53694 + (2310 * daysTotal);
      const endStakeGasUnits = 70980;
      const gasSavingPercentage = (-(soloStakeGasUnits - endStakeGasUnits) / soloStakeGasUnits) * 100;

      const tokenPrice = prices[name] || 0;
      const supply = config.TOKEN_SUPPLY || 0;
      const tShares = config.TSHARES || 0;
      const costPerTShare = tShares > 0 ? (supply * tokenPrice) / tShares : 0;

      tokens[name] = {
        name,
        daysTotal,
        daysSinceStart,
        progressPercentage,
        principal: config.STAKE_PRINCIPLE || 0,
        tShares,
        tokenSupply: supply,
        costPerTShare,
        priceUSD: tokenPrice,
        soloStakeGasUnits,
        endStakeGasUnits,
        gasSavingPercentage,
        launchDate: config.LAUNCH_DATE?.toISOString(),
        stakeStartDate: config.STAKE_START_DATE?.toISOString(),
        stakeEndDate: config.STAKE_END_DATE?.toISOString()
      };
    }
  });

  // Set CORS headers to allow public access
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=30');

  return res.status(200).json({
    tokens,
    lastUpdated: new Date().toISOString(),
    apiVersion: '1.0.0'
  });
} 