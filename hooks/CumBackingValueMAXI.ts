import useSWR from 'swr';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { useMemo } from 'react';
import { supabase } from '@/supabaseClient';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export const CumBackingValueMAXI = () => {
  // Fetch HEX daily stats for yield calculations
  const { data: hexData, error: hexError } = useSWR(
    'https://hexdailystats.com/fulldatapulsechain',
    fetcher
  );

  // Fetch price data from Supabase
  const { data: priceData, error: priceError } = useSWR(
    'price_data_maxi',
    async () => {
      const { data, error } = await supabase
        .from('historic_prices')
        .select('date, hex_price, ehex_price, maxi_price')
        .gte('date', '2022-05-01')
        .not('maxi_price', 'is', null)
        .order('date', { ascending: true });
      
      if (error) throw error;
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
          priceRatio: parseFloat(day.maxi_price) / (day.hex_price ? parseFloat(day.hex_price) : parseFloat(day.ehex_price))
        }
      ])
    );

    const TSHARES = TOKEN_CONSTANTS.pMAXI.TSHARES; // 42104.44
    const STAKE_PRINCIPLE = TOKEN_CONSTANTS.pMAXI.STAKE_PRINCIPLE; // 294323603.77
    const START_DATE = TOKEN_CONSTANTS.pMAXI.STAKE_START_DATE; // May 1st 2022

    // Process HEX daily stats data
    const sortedData = hexData
      .filter((day: any) => new Date(day.date) >= START_DATE)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let cumulativeYield = 0;

    return sortedData.map((day: any) => {
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

  }, [hexData, priceData]);

  const isLoading = !hexData || !priceData;
  const error = hexError || priceError;

  return {
    data: processedData,
    error,
    isLoading
  };
};