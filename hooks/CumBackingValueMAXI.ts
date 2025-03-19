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
  date: Date;
  backingRatio: number;
  discount: number | null;
  dailyYield: number;
  cumulativeYield: number;
}

export const CumBackingValueMAXI = () => {
  // Fetch HEX daily stats for yield calculations
  const { data: hexData, error: hexError } = useSWR(
    'https://hexdailystats.com/fulldatapulsechain',
    async (url) => {
      const data = await fetcher(url);
      console.log('Raw HEX daily stats:', {
        totalEntries: data?.length,
        firstEntry: data?.[0],
        lastEntry: data?.[data?.length - 1],
        sampleDates: data?.slice(-5).map((d: any) => d.date)
      });
      return data;
    }
  );

  // Fetch price data from Supabase
  const { data: priceData, error: priceError } = useSWR<PriceData[]>(
    'price_data_maxi',
    async () => {
      let allData: any[] = [];
      let lastDate = '2022-05-01';
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from('historic_prices')
          .select('date, hex_price, ehex_price, maxi_price')
          .gte('date', lastDate)
          .not('maxi_price', 'is', null)
          .order('date', { ascending: true })
          .limit(1000);
        
        if (error) throw error;
        
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          // Remove the first item if it's not the first batch (to avoid duplicates)
          if (allData.length > 0 && data.length > 0) {
            data.shift();
          }
          
          allData = [...allData, ...data];
          
          // Update lastDate for next batch
          if (data.length === 1000) {
            lastDate = data[data.length - 1].date;
          } else {
            hasMore = false;
          }
        }
      }
      
      console.log('Raw Supabase price data:', {
        totalEntries: allData?.length,
        firstEntry: allData?.[0],
        lastEntry: allData?.[allData?.length - 1],
        sampleLastFive: allData?.slice(-5).map(d => ({
          date: d.date,
          maxi_price: d.maxi_price,
          hex_price: d.hex_price || d.ehex_price
        }))
      });
      
      return allData;
    }
  );

  const processedData = useMemo(() => {
    if (!hexData || !priceData) {
      console.log('Missing data:', { 
        hasHexData: !!hexData, 
        hasPriceData: !!priceData,
        hexDataLength: hexData?.length,
        priceDataLength: priceData?.length
      });
      return [];
    }

    // Ensure TOKEN_CONSTANTS are defined
    if (!TOKEN_CONSTANTS?.pMAXI?.TSHARES || 
        !TOKEN_CONSTANTS?.pMAXI?.STAKE_PRINCIPLE || 
        !TOKEN_CONSTANTS?.pMAXI?.STAKE_START_DATE || 
        !TOKEN_CONSTANTS?.pMAXI?.TOKEN_SUPPLY) {
      console.error('Missing required TOKEN_CONSTANTS');
      return [];
    }

    // Add debug logs for hex data
    console.log('HEX data range:', {
      firstDate: hexData[0]?.date,
      lastDate: hexData[hexData.length - 1]?.date,
      totalPoints: hexData.length
    });

    // Create a map of dates to price ratios from Supabase data
    const priceMap = new Map(
      priceData.map(day => [
        new Date(day.date).toISOString().split('T')[0],
        {
          priceRatio: parseFloat(day.maxi_price) / (day.hex_price ? parseFloat(day.hex_price) : parseFloat(day.ehex_price))
        }
      ])
    );

    // Debug log for price map
    console.log('Price map size:', priceMap.size);
    console.log('Sample price map entries:', {
      first: Array.from(priceMap.entries())[0],
      last: Array.from(priceMap.entries())[priceMap.size - 1]
    });

    const TSHARES = TOKEN_CONSTANTS.pMAXI.TSHARES;
    const STAKE_PRINCIPLE = TOKEN_CONSTANTS.pMAXI.STAKE_PRINCIPLE;
    const START_DATE = TOKEN_CONSTANTS.pMAXI.STAKE_START_DATE;
    const TOKEN_SUPPLY = TOKEN_CONSTANTS.pMAXI.TOKEN_SUPPLY;

    // Process HEX daily stats data
    const sortedData = hexData
      .filter((day: any) => START_DATE && new Date(day.date) >= START_DATE)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Debug log for sorted data
    console.log('Sorted data range:', {
      firstDate: sortedData[0]?.date,
      lastDate: sortedData[sortedData.length - 1]?.date,
      totalPoints: sortedData.length
    });

    let cumulativeYield = 0;

    const result = sortedData.map((day: any): ProcessedDataPoint => {
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

    // Debug log for final processed data
    console.log('Final processed data range:', {
      firstDate: result[0]?.date,
      lastDate: result[result.length - 1]?.date,
      totalPoints: result.length
    });

    return result;
  }, [hexData, priceData]);

  const isLoading = !hexData || !priceData;
  const error = hexError || priceError;

  return {
    data: processedData,
    error,
    isLoading
  };
};