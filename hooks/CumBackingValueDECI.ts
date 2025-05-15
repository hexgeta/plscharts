import useSWR from 'swr';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { useMemo } from 'react';
import { supabase } from '@/supabaseClient';
import { getDailyCacheKey, DAILY_SWR_CONFIG } from '@/utils/swr-config';

const fetcher = (url: string) => fetch(url).then(res => res.json());

// Ensure required constants exist
if (!TOKEN_CONSTANTS?.pDECI?.LAUNCH_DATE) {
  throw new Error('DECI launch date is not defined in TOKEN_CONSTANTS');
}

if (!TOKEN_CONSTANTS?.pDECI?.TSHARES) {
  throw new Error('DECI T-shares are not defined in TOKEN_CONSTANTS');
}

if (!TOKEN_CONSTANTS?.pDECI?.STAKE_PRINCIPLE) {
  throw new Error('DECI stake principle is not defined in TOKEN_CONSTANTS');
}

if (!TOKEN_CONSTANTS?.pDECI?.TOKEN_SUPPLY) {
  throw new Error('DECI token supply is not defined in TOKEN_CONSTANTS');
}

interface PriceData {
  date: string;
  hex_price: string;
  ehex_price: string;
  deci_price: string;
}

interface ProcessedDataPoint {
  date: Date;
  backingRatio: number;
  discount: number | null;
  dailyYield: number;
  cumulativeYield: number;
}

export const CumBackingValueDECI = () => {
  // Use daily cache key for HEX stats
  const { data: hexData, error: hexError } = useSWR(
    getDailyCacheKey('hex-daily-stats-pulsechain'),
    () => fetcher('https://hexdailystats.com/fulldatapulsechain'),
    DAILY_SWR_CONFIG
  );

  // Use daily cache key for price data
  const { data: priceData, error: priceError } = useSWR(
    getDailyCacheKey('price-data-deci'),
    async () => {
      console.log('Fetching DECI price data...');
      const startDate = TOKEN_CONSTANTS.pDECI.LAUNCH_DATE!.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('historic_prices')
        .select('date, hex_price, ehex_price, deci_price')
        .gte('date', startDate)
        .not('deci_price', 'is', null)
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
          priceRatio: parseFloat(day.deci_price) / (day.hex_price ? parseFloat(day.hex_price) : parseFloat(day.ehex_price))
        }
      ])
    );

    // These constants are guaranteed to exist due to the checks above
    const TSHARES = TOKEN_CONSTANTS.pDECI.TSHARES!;
    const STAKE_PRINCIPLE = TOKEN_CONSTANTS.pDECI.STAKE_PRINCIPLE!;
    const START_DATE = TOKEN_CONSTANTS.pDECI.LAUNCH_DATE!;
    const TOKEN_SUPPLY = TOKEN_CONSTANTS.pDECI.TOKEN_SUPPLY!;

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