import useSWR from 'swr';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { useMemo } from 'react';
import { supabase } from '@/supabaseClient';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export const CumBackingValueEMAXI = () => {
  // Fetch HEX daily stats for yield calculations
  const { data: hexData, error: hexError } = useSWR(
    'https://hexdailystats.com/fulldata',
    fetcher
  );

  // Fetch price data from Supabase
  const { data: priceData, error: priceError } = useSWR(
    'price_data_emaxi',
    async () => {
      const { data, error } = await supabase
        .from('historic_prices')
        .select('date, hex_price, ehex_price, emaxi_price')
        .gte('date', '2022-05-01')
        .not('emaxi_price', 'is', null)
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  );

  const processedData = useMemo(() => {
    if (!hexData || !priceData) return [];

    // Create a map of dates to price ratios from Supabase data
    const priceMap = new Map(
      priceData.map(day => {
        // Ensure we have valid numbers
        const emaxiPrice = parseFloat(day.emaxi_price);
        const ehexPrice = parseFloat(day.ehex_price);
        
        // Skip invalid values
        if (isNaN(emaxiPrice) || isNaN(ehexPrice) || ehexPrice === 0) {
          console.log('Invalid price data:', {
            date: day.date,
            emaxi_price: day.emaxi_price,
            ehex_price: day.ehex_price
          });
          return [
            new Date(day.date).toISOString().split('T')[0],
            { priceRatio: null }
          ];
        }

        const priceRatio = emaxiPrice / ehexPrice;
        if (priceRatio > 2.5) {
          console.log('High price ratio:', {
            date: day.date,
            emaxi_price: emaxiPrice,
            ehex_price: ehexPrice,
            ratio: priceRatio
          });
        }
        return [
          new Date(day.date).toISOString().split('T')[0],
          { priceRatio }
        ];
      })
    );

    const TSHARES = TOKEN_CONSTANTS.eMAXI.TSHARES;
    const STAKE_PRINCIPLE = TOKEN_CONSTANTS.eMAXI.STAKE_PRINCIPLE;
    const START_DATE = TOKEN_CONSTANTS.eMAXI.STAKE_START_DATE;

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