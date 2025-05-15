import useSWR from 'swr';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { useMemo } from 'react';
import { supabase } from '@/supabaseClient';
import { DAILY_SWR_CONFIG } from '@/utils/swr-config';
import { HEX_DATA, PRICE_CACHE_KEYS } from './crypto/utils/cache-keys';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Ensure required constants exist
if (!TOKEN_CONSTANTS?.pMAXI?.LAUNCH_DATE) {
  throw new Error('MAXI launch date is not defined in TOKEN_CONSTANTS');
}

if (!TOKEN_CONSTANTS?.pMAXI?.TSHARES) {
  throw new Error('MAXI T-shares are not defined in TOKEN_CONSTANTS');
}

if (!TOKEN_CONSTANTS?.pMAXI?.STAKE_PRINCIPLE) {
  throw new Error('MAXI stake principle is not defined in TOKEN_CONSTANTS');
}

if (!TOKEN_CONSTANTS?.pMAXI?.TOKEN_SUPPLY) {
  throw new Error('MAXI token supply is not defined in TOKEN_CONSTANTS');
}

interface PriceData {
  date: string;
  hex_price: string;
  ehex_price: string;
  maxi_price: string;
}

interface ProcessedDataPoint {
  date: Date;
  backingRatio: number;
  discount: number | null;
  dailyYield: number;
  cumulativeYield: number;
}

export const CumBackingValueMAXI = () => {
  // Use daily cache key for HEX stats
  const { data: hexData, error: hexError } = useSWR(
    HEX_DATA.pulsechain.getCacheKey(),
    () => fetcher(HEX_DATA.pulsechain.url),
    DAILY_SWR_CONFIG
  );

  // Use daily cache key for price data
  const { data: priceData, error: priceError } = useSWR(
    PRICE_CACHE_KEYS.daily('maxi'),
    async () => {
      console.log('Fetching MAXI price data...');
      const startDate = TOKEN_CONSTANTS.pMAXI.LAUNCH_DATE!.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('historic_prices')
        .select('date, hex_price, ehex_price, maxi_price')
        .gte('date', startDate)
        .not('maxi_price', 'is', null)
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data;
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
          priceRatio: parseFloat(day.maxi_price) / (day.hex_price ? parseFloat(day.hex_price) : parseFloat(day.ehex_price))
        }
      ])
    );

    // These constants are guaranteed to exist due to the checks above
    const TSHARES = TOKEN_CONSTANTS.pMAXI.TSHARES!;
    const STAKE_PRINCIPLE = TOKEN_CONSTANTS.pMAXI.STAKE_PRINCIPLE!;
    const START_DATE = TOKEN_CONSTANTS.pMAXI.LAUNCH_DATE!;
    const TOKEN_SUPPLY = TOKEN_CONSTANTS.pMAXI.TOKEN_SUPPLY!;

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