import useSWR from 'swr';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { useMemo } from 'react';
import { supabase } from '@/supabaseClient';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface PriceData {
  date: string;
  hex_price: string;
  ehex_price: string;
  maxi_price: string;
}

interface ProcessedDataPoint {
  day: number;
  date: string;
  backingRatio: number;
  discount: number | null;
}

export const CumBackingValueMAXI = () => {
  // Fetch HEX daily stats for yield calculations
  const { data: hexData, error: hexError } = useSWR(
    'https://hexdailystats.com/fulldatapulsechain',
    fetcher
  );

  // Fetch price data from Supabase
  const { data: priceData, error: priceError } = useSWR<PriceData[]>(
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

    // Ensure TOKEN_CONSTANTS are defined
    if (!TOKEN_CONSTANTS?.pMAXI?.TSHARES || 
        !TOKEN_CONSTANTS?.pMAXI?.STAKE_PRINCIPLE || 
        !TOKEN_CONSTANTS?.pMAXI?.STAKE_START_DATE || 
        !TOKEN_CONSTANTS?.pMAXI?.TOKEN_SUPPLY) {
      console.error('Missing required TOKEN_CONSTANTS');
      return [];
    }

    const TSHARES = TOKEN_CONSTANTS.pMAXI.TSHARES;
    const STAKE_PRINCIPLE = TOKEN_CONSTANTS.pMAXI.STAKE_PRINCIPLE;
    const START_DATE = TOKEN_CONSTANTS.pMAXI.STAKE_START_DATE;
    const TOKEN_SUPPLY = TOKEN_CONSTANTS.pMAXI.TOKEN_SUPPLY;

    // Process HEX daily stats data
    const sortedData = hexData
      .filter((day: any) => START_DATE && new Date(day.date) >= START_DATE)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let cumulativeYield = 0;
    const startDate = new Date('2022-05-01');

    return sortedData.map((day: any): ProcessedDataPoint => {
      const dailyYield = (day.payoutPerTshareHEX * TSHARES) || 0;
      cumulativeYield += dailyYield;
      const backingRatio = (cumulativeYield + STAKE_PRINCIPLE) / TOKEN_SUPPLY;

      const currentDate = new Date(day.date);
      const dayNumber = Math.floor((currentDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 881;

      // Calculate price ratio
      const maxiPrice = parseFloat(priceData.find(p => p.date === day.date)?.maxi_price || '0');
      const hexPrice = parseFloat(priceData.find(p => p.date === day.date)?.hex_price || priceData.find(p => p.date === day.date)?.ehex_price || '0');
      const priceRatio = hexPrice !== 0 ? maxiPrice / hexPrice : null;

      return {
        day: dayNumber,
        date: day.date,
        backingRatio,
        discount: priceRatio
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