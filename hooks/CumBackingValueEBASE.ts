import useSWR from 'swr';
import { TOKEN_CONSTANTS } from '@/constants/crypto';
import { useMemo } from 'react';
import { supabase } from '@/supabaseClient';

const fetcher = (url: string) => fetch(url).then(res => res.json());

interface StakePeriod {
  startDate: Date;
  endDate: Date;
  tshares: number;
  stakePrinciple: number;
}

export const CumBackingValueEBASE = () => {
  // Fetch HEX daily stats for yield calculations
  const { data: hexData, error: hexError } = useSWR(
    'https://hexdailystats.com/fulldata',
    fetcher
  );

  // Fetch price data from Supabase
  const { data: priceData, error: priceError } = useSWR(
    'price_data_ebase',
    async () => {
      console.log('Fetching EBASE price data...');
      const { data, error } = await supabase
        .from('historic_prices')
        .select('date, hex_price, ehex_price, ebase_price')
        .gte('date', '2022-09-27') // First EBASE launch date
        .not('ebase_price', 'is', null)
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data;
    }
  );

  const processedData = useMemo(() => {
    if (!hexData || !priceData) return [];

    // Create a map of dates to price ratios
    const priceMap = new Map(
      priceData.map(day => [
        new Date(day.date).toISOString().split('T')[0],
        {
          priceRatio: parseFloat(day.ebase_price) / parseFloat(day.ehex_price)
        }
      ])
    );

    // Define all stake periods
    const stakePeriods: StakePeriod[] = [
      {
        startDate: TOKEN_CONSTANTS.eBASE.STAKE_START_DATE,
        endDate: TOKEN_CONSTANTS.eBASE.STAKE_END_DATE,
        tshares: TOKEN_CONSTANTS.eBASE.TSHARES || 0,
        stakePrinciple: TOKEN_CONSTANTS.eBASE.STAKE_PRINCIPLE || 0
      },
      {
        startDate: TOKEN_CONSTANTS.eBASE2.STAKE_START_DATE,
        endDate: TOKEN_CONSTANTS.eBASE2.STAKE_END_DATE,
        tshares: TOKEN_CONSTANTS.eBASE2.TSHARES || 0,
        stakePrinciple: TOKEN_CONSTANTS.eBASE2.STAKE_PRINCIPLE || 0
      },
      {
        startDate: TOKEN_CONSTANTS.eBASE3.STAKE_START_DATE,
        endDate: TOKEN_CONSTANTS.eBASE3.STAKE_END_DATE,
        tshares: TOKEN_CONSTANTS.eBASE3.TSHARES || 0,
        stakePrinciple: TOKEN_CONSTANTS.eBASE3.STAKE_PRINCIPLE || 0
      }
    ];

    // Process HEX daily stats data
    const sortedData = hexData
      .filter((day: any) => new Date(day.date) >= stakePeriods[0].startDate)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate final ratios for each period to use as starting points
    const periodFinalRatios = new Map<number, number>();
    periodFinalRatios.set(-1, 1); // Starting ratio for first period

    stakePeriods.forEach((period, index) => {
      if (new Date() > period.endDate) {
        const finalYield = sortedData
          .filter(d => {
            const date = new Date(d.date);
            return date >= period.startDate && date <= period.endDate;
          })
          .reduce((acc, d) => acc + (d.payoutPerTshareHEX * period.tshares || 0), 0);
        
        const previousRatio = periodFinalRatios.get(index - 1) || 1;
        const periodRatio = (period.stakePrinciple + finalYield) / period.stakePrinciple;
        periodFinalRatios.set(index, previousRatio * periodRatio);
      }
    });

    const result = sortedData.map((day: any) => {
      const currentDate = new Date(day.date);
      let isActiveStakePeriod = false;
      let currentRatio = 1;

      // Find which period we're in and calculate the ratio
      stakePeriods.forEach((period, index) => {
        if (currentDate >= period.startDate) {
          const previousRatio = periodFinalRatios.get(index - 1) || 1;

          if (currentDate <= period.endDate) {
            // Active period - calculate current ratio
            isActiveStakePeriod = true;
            const currentYield = sortedData
              .filter(d => {
                const date = new Date(d.date);
                return date >= period.startDate && date <= currentDate;
              })
              .reduce((acc, d) => acc + (d.payoutPerTshareHEX * period.tshares || 0), 0);
            
            const periodRatio = (period.stakePrinciple + currentYield) / period.stakePrinciple;
            currentRatio = previousRatio * periodRatio;
          } else {
            // Completed period - use its final ratio
            currentRatio = periodFinalRatios.get(index) || previousRatio;
          }
        }
      });

      // Get price ratio from Supabase data
      const dateKey = currentDate.toISOString().split('T')[0];
      const priceData = priceMap.get(dateKey);

      return {
        date: currentDate,
        discount: priceData?.priceRatio,
        backingValue: currentRatio,
        backingRatio: currentRatio,
        isStakePeriod: isActiveStakePeriod
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