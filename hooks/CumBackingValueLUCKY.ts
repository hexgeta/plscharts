import useSWR from 'swr';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { useMemo } from 'react';
import { supabase } from '@/supabaseClient';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export const CumBackingValueLUCKY = () => {
  // Fetch HEX daily stats for yield calculations
  const { data: hexData, error: hexError } = useSWR(
    'https://hexdailystats.com/fulldatapulsechain',
    fetcher
  );

  // Fetch price data from Supabase
  const { data: priceData, error: priceError } = useSWR(
    'price_data_lucky',
    async () => {
      console.log('Fetching LUCKY price data...');
      const { data, error } = await supabase
        .from('historic_prices')
        .select('date, hex_price, ehex_price, lucky_price')
        .gte('date', '2022-09-27')
        .not('lucky_price', 'is', null)
        .order('date', { ascending: true });
      
      if (error) throw error;

      if (data && data.length > 0) {
        console.log('LUCKY Data:', {
          total: data.length,
          first: data[0],
          last: data[data.length - 1]
        });
      }

      return data;
    }
  );

  const processedData = useMemo(() => {
    if (!hexData || !priceData) return [];

    // Create a map of dates to price ratios from Supabase data
    const priceMap = new Map(
      priceData.map(day => [
        new Date(day.date).toISOString().split('T')[0],
        {
          // If hex_price is null, use ehex_price instead
          priceRatio: parseFloat(day.lucky_price) / (day.hex_price ? parseFloat(day.hex_price) : parseFloat(day.ehex_price))
        }
      ])
    );

    const TSHARES = TOKEN_CONSTANTS.pLUCKY.TSHARES;
    const STAKE_PRINCIPLE = TOKEN_CONSTANTS.pLUCKY.STAKE_PRINCIPLE;
    const START_DATE = TOKEN_CONSTANTS.pLUCKY.LAUNCH_DATE;

    console.log('LUCKY Constants:', {
      TSHARES,
      STAKE_PRINCIPLE,
      START_DATE: START_DATE.toISOString()
    });

    // Process HEX daily stats data
    const sortedData = hexData
      .filter((day: any) => new Date(day.date) >= START_DATE)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let cumulativeYield = 0;

    const result = sortedData.map((day: any) => {
      // Calculate daily yield using payoutPerTshareHEX
      const dailyYield = day.payoutPerTshareHEX * TSHARES || 0;
      cumulativeYield += dailyYield;
      const yieldAdjustedBacking = (cumulativeYield + STAKE_PRINCIPLE) / STAKE_PRINCIPLE;

      // Get price ratio from Supabase data
      const dateKey = new Date(day.date).toISOString().split('T')[0];
      const priceData = priceMap.get(dateKey);

      return {
        date: new Date(day.date),
        discount: priceData?.priceRatio,
        backingValue: 1,
        backingRatio: yieldAdjustedBacking,
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