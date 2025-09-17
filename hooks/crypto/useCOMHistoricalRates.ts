'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { useTokenPrices } from './useTokenPrices';

interface ShareRatePoint {
  id: string;
  shareRate: string;
  timestamp: string;
}

interface HistoricalCOMRate {
  date: string;
  rate: number;
  tShares: number;
  comStartBonus: number;
  hexPrice: number;
  comPrice: number;
}

interface PricePoint {
  timestamp: string;
  price: number;
}

const SUBGRAPH_URL = 'https://graph.pulsechain.com/subgraphs/name/Codeakk/Hex';
const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/pairs/pulsechain';

// Fetch historical share rates from the subgraph
const fetchHistoricalShareRates = async (fromDay: number): Promise<ShareRatePoint[]> => {
  let allRates: ShareRatePoint[] = [];
  let hasMore = true;
  let skip = 0;
  const first = 1000;

  // Convert HEX day to timestamp for filtering
  const HEX_LAUNCH_DATE = new Date('2019-12-03T00:00:00Z').getTime();
  const SECONDS_PER_DAY = 86400;
  const fromTimestamp = (HEX_LAUNCH_DATE + (fromDay * SECONDS_PER_DAY * 1000)).toString();

  while (hasMore) {
    const query = `{
      shareRateChanges(
        first: ${first},
        skip: ${skip},
        where: { timestamp_gte: "${fromTimestamp}" }
        orderBy: timestamp
        orderDirection: asc
      ) {
        id
        shareRate
        timestamp
      }
    }`;

    try {
      const response = await fetch(SUBGRAPH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const result = await response.json();
      
      if (result.errors) {
        break;
      }

      const fetchedRates = result.data?.shareRateChanges || [];
      
      if (fetchedRates.length > 0) {
        allRates = [...allRates, ...fetchedRates];
        skip += first;
      } else {
        hasMore = false;
      }
    } catch (error) {
      break;
    }
  }

  return allRates;
};

// Fetch historical prices from DexScreener
const fetchHistoricalPrices = async (pairAddress: string): Promise<PricePoint[]> => {
  try {
    const response = await fetch(`${DEXSCREENER_API}/${pairAddress}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    if (!data.pair?.priceUsd || !data.pair?.priceHistory) {
      throw new Error('Invalid price data from DexScreener');
    }

    // Convert price history to our format
    return data.pair.priceHistory.map((point: any) => ({
      timestamp: point.timestamp,
      price: parseFloat(point.priceUsd)
    }));
  } catch (error) {
    return [];
  }
};

// Calculate COM coupon rate for given parameters
const calculateCOMRate = (
  shareRate: number,
  hexPrice: number,
  comPrice: number,
  hexPrincipal: number,
  stakeDays: number
): { rate: number; tShares: number; comStartBonus: number } | null => {
  try {
    // Calculate T-Shares
    let bpb: number;
    if (hexPrincipal < 150000000) {
      bpb = ((hexPrincipal / (150 * Math.pow(10, 7))) * hexPrincipal);
    } else {
      bpb = hexPrincipal * 0.1;
    }
    
    const lpb = ((stakeDays - 1) / 1820) * hexPrincipal;
    const totalHexForTShares = hexPrincipal + bpb + lpb;
    const tShares = (totalHexForTShares / shareRate) * 10;

    // Calculate COM start bonus
    const numeratorPart1 = tShares * 1000000000000;
    const numeratorPart2 = (stakeDays * Math.pow(10, 15)) / 5555;
    const numeratorPart3 = (numeratorPart1 * numeratorPart2) / Math.pow(10, 15);
    const numerator = numeratorPart3 * Math.pow(10, 10);
    
    const denominatorPart1 = 10 * Math.pow(10, 10);
    const denominatorPart2Inner = ((stakeDays - 365) * Math.pow(10, 10)) / 5190 / Math.pow(10, 10);
    const denominatorPart2 = 6 * Math.pow(10, 10) * denominatorPart2Inner;
    const denominator = denominatorPart1 - denominatorPart2;
    
    const comStartBonus = numerator / denominator;
    
    // Calculate coupon rate
    const comBonusValue = comStartBonus * comPrice;
    const hexStakeValue = hexPrincipal * hexPrice;
    const rate = (comBonusValue / hexStakeValue) * 100;

    return { rate, tShares, comStartBonus };
  } catch (err) {
    return null;
  }
};

export const useCOMHistoricalRates = (
  fromDay: number = 1280,
  hexPrincipal: number = 100000,
  stakeDays: number = 5555
) => {
  const { prices, isLoading: pricesLoading } = useTokenPrices(['HEX', 'COM']);

  // Fetch historical data
  const { data: shareRates, error: shareError, isLoading: shareLoading } = useSWR(
    ['com-historical-rates', fromDay],
    () => fetchHistoricalShareRates(fromDay),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000, // Cache for 1 hour
    }
  );

  // Fetch historical HEX prices
  const { data: hexPrices, error: hexError, isLoading: hexLoading } = useSWR(
    'hex-historical-prices',
    () => fetchHistoricalPrices('0x6c9c9757f0471e878e774c8c661b14d3bc3d2d7b'), // HEX-WPLS pair
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000,
    }
  );

  // Fetch historical COM prices
  const { data: comPrices, error: comError, isLoading: comLoading } = useSWR(
    'com-historical-prices',
    () => fetchHistoricalPrices('0x9c09bad3c198e90731e5224f2b8cd07e5f1fd8c6'), // COM-WPLS pair
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 3600000,
    }
  );

  // Calculate rates for each data point
  const historicalRates = useMemo(() => {
    if (!shareRates || !hexPrices || !comPrices) return null;

    // Create a map of prices by timestamp for quick lookup
    const hexPriceMap = new Map(hexPrices.map(p => [p.timestamp, p.price]));
    const comPriceMap = new Map(comPrices.map(p => [p.timestamp, p.price]));

    return shareRates.map(point => {
      const shareRate = parseFloat(point.shareRate);
      const timestamp = point.timestamp;
      
      // Get prices for this timestamp
      const hexPrice = hexPriceMap.get(timestamp) || prices?.HEX?.price || 0;
      const comPrice = comPriceMap.get(timestamp) || prices?.COM?.price || 0;

      const calculation = calculateCOMRate(
        shareRate,
        hexPrice,
        comPrice,
        hexPrincipal,
        stakeDays
      );

      if (!calculation) return null;

      return {
        date: timestamp,
        ...calculation,
        hexPrice,
        comPrice
      };
    }).filter(Boolean) as HistoricalCOMRate[];
  }, [shareRates, hexPrices, comPrices, prices, hexPrincipal, stakeDays]);

  return {
    historicalRates,
    isLoading: shareLoading || hexLoading || comLoading || pricesLoading,
    error: shareError || hexError || comError,
    currentPrices: {
      hex: prices?.HEX?.price || 0,
      com: prices?.COM?.price || 0
    }
  };
}; 