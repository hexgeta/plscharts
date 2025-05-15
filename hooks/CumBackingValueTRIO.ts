import useSWR from 'swr';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { useMemo } from 'react';
import { supabase } from '@/supabaseClient';
import { DAILY_SWR_CONFIG } from '@/utils/swr-config';
import { HEX_DATA, PRICE_CACHE_KEYS } from './crypto/utils/cache-keys';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Ensure required constants exist
if (!TOKEN_CONSTANTS?.pTRIO?.LAUNCH_DATE) {
  throw new Error('TRIO launch date is not defined in TOKEN_CONSTANTS');
}

if (!TOKEN_CONSTANTS?.pTRIO?.TSHARES) {
  throw new Error('TRIO T-shares are not defined in TOKEN_CONSTANTS');
}

if (!TOKEN_CONSTANTS?.pTRIO?.STAKE_PRINCIPLE) {
  throw new Error('TRIO stake principle is not defined in TOKEN_CONSTANTS');
}

if (!TOKEN_CONSTANTS?.pTRIO?.TOKEN_SUPPLY) {
  throw new Error('TRIO token supply is not defined in TOKEN_CONSTANTS');
}

interface PriceData {
  date: string;
  hex_price: string;
  ehex_price: string;
  trio_price: string;
}

interface ProcessedDataPoint {
  date: Date;
  backingRatio: number;
  discount: number | null;
  dailyYield: number;
  cumulativeYield: number;
}

export const CumBackingValueTRIO = () => {
  // Use daily cache key for HEX stats
  const { data: hexData, error: hexError } = useSWR(
    HEX_DATA.pulsechain.getCacheKey(),
    () => fetcher(HEX_DATA.pulsechain.url),
    DAILY_SWR_CONFIG
  );

  // Use daily cache key for price data
  const { data: priceData, error: priceError } = useSWR(
    PRICE_CACHE_KEYS.daily('trio'),
    async () => {
      console.log('Fetching TRIO price data...');
      const startDate = TOKEN_CONSTANTS.pTRIO.LAUNCH_DATE!.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('historic_prices')
        .select('date, hex_price, ehex_price, trio_price')
        .gte('date', startDate)
        .not('trio_price', 'is', null)
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data as PriceData[];
    },
    DAILY_SWR_CONFIG
  );

  const processedData = useMemo(() => {
    if (!hexData || !priceData) return [];

    // Create a map of dates to price ratios
    const priceMap = new Map(
      priceData.map(day => [
        new Date(day.date).toISOString().split('T')[0],
        {
          priceRatio: parseFloat(day.trio_price) / (day.hex_price ? parseFloat(day.hex_price) : parseFloat(day.ehex_price))
        }
      ])
    );

    // These constants are guaranteed to exist due to the checks above
    const TSHARES = TOKEN_CONSTANTS.pTRIO.TSHARES!;
    const STAKE_PRINCIPLE = TOKEN_CONSTANTS.pTRIO.STAKE_PRINCIPLE!;
    const START_DATE = TOKEN_CONSTANTS.pTRIO.LAUNCH_DATE!;
    const TOKEN_SUPPLY = TOKEN_CONSTANTS.pTRIO.TOKEN_SUPPLY!;

    // Process HEX daily stats data
    const sortedData = hexData
      .filter((day: any) => START_DATE && new Date(day.date) >= START_DATE)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let cumulativeYield = 0;

    const result = sortedData.map((day: any) => {
      const dailyYield = (day.payoutPerTshareHEX * TSHARES) || 0;
      cumulativeYield += dailyYield;
      const backingRatio = (cumulativeYield + STAKE_PRINCIPLE) / TOKEN_SUPPLY;

      // Get price ratio from Supabase data
      const dateKey = new Date(day.date).toISOString().split('T')[0];
      const priceData = priceMap.get(dateKey);

      return {
        date: new Date(day.date),
        backingRatio,
        discount: priceData?.priceRatio || null,
        dailyYield,
        cumulativeYield
      };
    });

    return result;
  }, [hexData, priceData]);

  return {
    data: processedData,
    error: hexError || priceError,
    isLoading: !hexData || !priceData
  };
};