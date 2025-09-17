import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { useTokenPrices } from './useTokenPrices';

export type Period = '5m' | '1h' | '6h' | '24h' | '7d' | '30d' | '90d' | '180d' | '365d' | 'ATL';

const PERIOD_TO_DAYS: Record<Period, number> = {
  '5m': 0.00347222, // 5 minutes in days
  '1h': 0.0416667, // 1 hour in days
  '6h': 0.25, // 6 hours in days
  '24h': 1,
  '7d': 7,
  '30d': 30,
  '90d': 90,
  '180d': 180,
  '365d': 365,
  'ATL': -1, // Special case for all-time-low
};

const TOKEN_FIELD_MAP: Record<string, string> = {
  PLS: 'pls_price',
  PLSX: 'plsx_price',
  INC: 'inc_price',
  HEX: 'hex_price',
  pHEX: 'hex_price',
  eHEX: 'ehex_price'
};

interface HistoricChangeResult {
  [period: string]: number | null; // percent change, null if not enough data
}

// Calculate milliseconds until next UTC+1
function getMillisecondsUntilNextUTC1(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(1, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

export function useHistoricPriceChange(symbol: string, periods: Period[] = ['24h', '7d', '30d', '90d', 'ATL']) {
  const field = TOKEN_FIELD_MAP[symbol];
  const { prices } = useTokenPrices([symbol]);
  const priceData = prices[symbol];
  
  
  // Get cached data from localStorage if available
  const getCachedData = () => {
    if (typeof window === 'undefined') return null;
    try {
      const cached = localStorage.getItem(`historic-prices-${symbol}`);
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  };
  
  const { data, error, isLoading } = useSWR(
    field ? `historic-prices-${symbol}` : null,
    async () => {
      if (!field) return null;
      
      // Fetch data from our API endpoint
      const response = await fetch(`/api/prices/historic?symbol=${symbol}&field=${field}`);
      if (!response.ok) {
        throw new Error('Failed to fetch historic prices');
      }
      
      const { data: rows } = await response.json();
      if (!rows || rows.length === 0) return null;

      // Parse dates and prices
      const parsed = rows.map((row: any) => ({
        date: new Date(row.date),
        price: parseFloat(row[field]),
      })).filter((row: any) => !isNaN(row.price));

      if (parsed.length === 0) return null;

      // Latest price is the last entry
      const latest = parsed[parsed.length - 1];
      
      // For each period, find the closest price before that period ago
      const now = latest.date;
      const result: HistoricChangeResult = {};
      
      for (const period of periods) {
        if (period === '5m') {
          result[period] = priceData?.priceChange?.m5 ?? null;
        } else if (period === '1h') {
          result[period] = priceData?.priceChange?.h1 ?? null;
        } else if (period === '6h') {
          result[period] = priceData?.priceChange?.h6 ?? null;
        } else if (period === '24h') {
          result[period] = priceData?.priceChange?.h24 ?? null;
        } else if (period === 'ATL') {
          // All-time-low
          const min = parsed.reduce((min, row) => row.price < min.price ? row : min, parsed[0]);
          if (symbol === 'eHEX') {
          }
          result[period] = min && min.price > 0 ? ((latest.price - min.price) / min.price) * 100 : null;
        } else {
          const daysAgo = PERIOD_TO_DAYS[period];
          const targetDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
          // Find the closest price before or at targetDate
          const past = [...parsed].reverse().find(row => row.date <= targetDate);
          result[period] = past && past.price > 0 ? ((latest.price - past.price) / past.price) * 100 : null;
        }
      }

      // Cache the result
      if (typeof window !== 'undefined') {
        localStorage.setItem(`historic-prices-${symbol}`, JSON.stringify(result));
      }

      return result;
    },
    {
      dedupingInterval: 3600000, // 1 hour in milliseconds
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 3600000, // 1 hour in milliseconds
      fallbackData: getCachedData() || periods.reduce((acc, period) => ({
        ...acc,
        [period]: period === '24h' ? priceData?.priceChange?.h24 ?? 0 : 0
      }), {})
    }
  );

  return { percentChange: data, isLoading, error };
} 