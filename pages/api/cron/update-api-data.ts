import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/supabaseClient';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { Resend } from 'resend';

// Define the order of tokens
const TOKEN_ORDER = [
  'pMAXI', 'eMAXI',
  'pDECI', 'eDECI',
  'pLUCKY', 'eLUCKY',
  'pTRIO', 'eTRIO',
  'pBASE', 'eBASE',
  'pBASE2', 'eBASE2',
  'pBASE3', 'eBASE3'
];

// Define the order of properties within each token
const PROPERTY_ORDER = {
  root: ['name', 'stake', 'token', 'gas', 'dates'],
  stake: ['principal', 'tShares', 'yieldSoFarHEX', 'backingHEX', 'percentageYieldEarnedSoFar', 'hexAPY', 'minterAPY'],
  token: ['supply', 'burnedSupply', 'priceUSD', 'priceHEX', 'costPerTShareUSD', 'backingPerToken', 'discountFromBacking', 'discountFromMint'],
  gas: ['equivalentSoloStakeUnits', 'endStakeUnits', 'savingPercentage'],
  dates: ['stakeStartDate', 'stakeEndDate', 'daysTotal', 'daysSinceStart', 'daysLeft', 'progressPercentage']
};

export interface TokenData {
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
    stakeStartDate: string;
    stakeEndDate: string;
    daysTotal: number;
    daysSinceStart: number;
    daysLeft: number;
    progressPercentage: number;
  };
}

export interface TokenDataResponse {
  tokens: {
    [key: string]: TokenData;
  };
}

function orderProperties(obj: any, orderArray: string[]): any {
  const ordered: any = {};
  orderArray.forEach(key => {
    if (key in obj) {
      ordered[key] = obj[key];
    }
  });
  return ordered;
}

function createOrderedReplacer() {
  const rootOrder = ['id', ...PROPERTY_ORDER.root];
  const subOrders = {
    stake: PROPERTY_ORDER.stake,
    token: PROPERTY_ORDER.token,
    gas: PROPERTY_ORDER.gas,
    dates: PROPERTY_ORDER.dates
  };

  return function(key: string, value: any) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const ordered: any = {};
      const propertyOrder = key === '' ? [] : // root object (tokens array)
                          key === 'tokens' ? rootOrder : // token objects
                          subOrders[key as keyof typeof subOrders] || []; // sub-objects

      // Add properties in order
      propertyOrder.forEach(k => {
        if (k in value) {
          ordered[k] = value[k];
        }
      });

      // Add any remaining properties
      Object.keys(value).forEach(k => {
        if (!propertyOrder.includes(k)) {
          ordered[k] = value[k];
        }
      });

      return ordered;
    }
    return value;
  };
}

function stringifyOrdered(data: any): string {
  // Create an array of tokens in the correct order
  const orderedTokensArray = TOKEN_ORDER
    .map(tokenName => {
      if (tokenName in data) {
        const token = data[tokenName];
        // Create ordered token object
        return {
          id: tokenName,
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
      return null;
    })
    .filter(token => token !== null);

  // Create the final structure
  const orderedObj = {
    tokens: orderedTokensArray.reduce((acc, token) => {
      const { id, ...rest } = token;
      acc[id] = rest;
      return acc;
    }, {})
  };

  // Stringify with 2 spaces for readability
  return JSON.stringify(orderedObj, null, 2);
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

const DISCOUNT_THRESHOLD = -0.5;
const EMAIL_INTERVAL_HOURS = 14;
const EMAIL_ROW_ID = 'last_discount_email';

const resend = new Resend(process.env.RESEND_API_KEY);

async function shouldSendDiscountEmail(supabase: any): Promise<boolean> {
  const { data, error } = await supabase
    .from('api_data')
    .select('updated_at')
    .eq('id', EMAIL_ROW_ID)
    .single();
  if (error && error.code !== 'PGRST116') return true; // If not found, send
  if (!data?.updated_at) return true;
  const lastSent = new Date(data.updated_at);
  const now = new Date();
  const hoursSince = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
  return hoursSince > EMAIL_INTERVAL_HOURS;
}

async function markDiscountEmailSent(supabase: any) {
  await supabase.from('api_data').upsert({ id: EMAIL_ROW_ID, updated_at: new Date().toISOString() });
}

async function sendDiscountEmail(discountedTokens: { name: string, discount: number }[]) {
  const email = process.env.NOTIFY_EMAIL;
  if (!email) return;
  const subject = 'Token Backing Discount Alert';
  const body = `The following tokens have a backing discount greater than 50%:\n\n` +
    discountedTokens.map(t => `${t.name}: ${(t.discount * 100).toFixed(2)}%`).join('\n');
  await resend.emails.send({
    from: 'alerts@lookintomaxi.app',
    to: email,
    subject,
    text: body
  });
}

async function calculateTokenData() {
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
  const tokens = new Map<string, TokenData>();
  const currentDate = new Date();

  // Process tokens in the defined order
  TOKEN_ORDER.forEach(tokenName => {
    const config = TOKEN_CONSTANTS[tokenName];
    if (!config) return;

    const baseTokenName = tokenName.replace(/[pe]/, '').replace(/(\d+)$/, '');
    const variant = tokenName.match(/\d+$/)?.[0] || '';
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

      const tokenPrice = prices[tokenName] || 0;
      const hexPrice = tokenName.startsWith('e') ? prices['eHEX'] : prices['pHEX'];
      const priceHEX = hexPrice > 0 ? Number((tokenPrice / hexPrice).toFixed(8)) : 0;
      
      const supply = Number((config.TOKEN_SUPPLY || 0).toFixed(2));
      const tShares = config.TSHARES || 0;
      const costPerTShareUSD = tShares > 0 
        ? Number(((supply * tokenPrice) / tShares).toFixed(2))
        : 0;

      // Calculate backing including yield
      const hexData = tokenName.startsWith('e') ? ethData : pulseData;
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

      tokens.set(tokenName, {
        name: tokenName,
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
          stakeStartDate: config.STAKE_START_DATE ? config.STAKE_START_DATE.toISOString().split('T')[0] : '',
          stakeEndDate: config.STAKE_END_DATE ? config.STAKE_END_DATE.toISOString().split('T')[0] : '',
          daysTotal,
          daysSinceStart,
          daysLeft: Math.max(0, daysTotal - daysSinceStart),
          progressPercentage: Number((progressPercentage / 100).toFixed(4)),
        }
      });
    }
  });

  // Convert Map to object while maintaining order
  return Object.fromEntries(tokens);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Verify cron secret to ensure this is called by Vercel
    if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!supabase) {
      throw new Error('Supabase client is not available');
    }

    // Calculate token data
    const data = await calculateTokenData();

    // Check for big discounts
    const discountedTokens = Object.entries(data)
      .filter(([_, token]) => token.token.discountFromBacking < DISCOUNT_THRESHOLD)
      .map(([name, token]) => ({ name, discount: token.token.discountFromBacking }));

    if (discountedTokens.length > 0 && await shouldSendDiscountEmail(supabase)) {
      await sendDiscountEmail(discountedTokens);
      await markDiscountEmailSent(supabase);
    }

    // Create ordered JSON string
    const orderedJsonStr = stringifyOrdered(data);
    const orderedData = JSON.parse(orderedJsonStr);

    // Store the ordered data in Supabase
    const { error } = await supabase
      .from('api_data')
      .upsert({
        id: 'latest',
        data: orderedData,
        updated_at: new Date().toISOString()
      });

    if (error) throw error;

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Cron job failed:', error);
    return res.status(500).json({ error: 'Failed to update token data' });
  }
} 