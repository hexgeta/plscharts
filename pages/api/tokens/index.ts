/**
 * @endpoint GET /api/tokens
 * @description Returns detailed information about all PulseChain tokens tracked by LookIntoMaxi
 * 
 * @returns {Object} Response
 * - tokens: Object containing token data for each tracked token
 *   - stake: Staking information (principal, tShares, yields)
 *   - token: Token metrics (supply, price, backing)
 *   - gas: Gas efficiency metrics
 *   - dates: Stake timing information
 * 
 * @rateLimit 10 requests per minute per IP
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/supabaseClient';

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10;  // 10 requests per minute

// In-memory store for rate limiting
const rateLimit = new Map<string, { count: number; timestamp: number }>();

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

  // Rate limiting logic
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowData = rateLimit.get(ip as string);

  if (windowData) {
    if (now - windowData.timestamp < RATE_LIMIT_WINDOW) {
      if (windowData.count >= MAX_REQUESTS_PER_WINDOW) {
        return res.status(429).json({ error: 'Too many requests' });
      }
      windowData.count++;
    } else {
      windowData.count = 1;
      windowData.timestamp = now;
    }
  } else {
    rateLimit.set(ip as string, { count: 1, timestamp: now });
  }

  try {
    // Fetch token data from Supabase
    const { data: tokenData, error } = await supabase
      .from('api_data')
      .select('data')
      .eq('id', 'latest')
      .single();

    if (error) throw error;
    if (!tokenData?.data?.tokens) throw new Error('No token data available');

    const tokens = tokenData.data.tokens;
    const orderedTokens: { [key: string]: any } = {};

    // Order tokens according to TOKEN_ORDER
    TOKEN_ORDER.forEach(tokenId => {
      if (tokens[tokenId]) {
        orderedTokens[tokenId] = orderTokenProperties(tokens[tokenId]);
      }
    });

    // Set CORS headers to allow public access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=60');

    const response = {
      tokens: orderedTokens,
      lastUpdated: tokenData.data.timestamp || new Date().toISOString()
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error processing request:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 