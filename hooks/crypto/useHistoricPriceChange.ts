import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { supabase } from '@/supabaseClient';

export type Period = '24h' | '7d' | '30d' | '90d' | '180d' | '365d' | 'ATL';

const PERIOD_TO_DAYS: Record<Period, number> = {
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
  pHEX: 'hex_price',
  eHEX: 'ehex_price',
  pMAXI: 'maxi_price',
  pDECI: 'deci_price',
  pLUCKY: 'lucky_price',
  pTRIO: 'trio_price',
  pBASE: 'base_price',
  // Add eHEX, eMAXI, etc if needed
};

interface HistoricChangeResult {
  [period: string]: number | null; // percent change, null if not enough data
}

export function useHistoricPriceChange(symbol: string, periods: Period[] = ['24h', '7d', '30d', '90d', 'ATL']) {
  const field = TOKEN_FIELD_MAP[symbol];
  console.log('[useHistoricPriceChange] symbol:', symbol, 'field:', field);
  const { data, error, isLoading } = useSWR(
    field ? `historic-prices-${symbol}` : null,
    async () => {
      if (!field) return null;
      // Fetch all data for this token
      const { data: rows, error } = await supabase
        .from('historic_prices')
        .select(`date, ${field}`)
        .not(field, 'is', null)
        .order('date', { ascending: true });
      if (error) throw error;
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
        if (period === 'ATL') {
          // All-time-low
          const min = parsed.reduce((min, row) => row.price < min.price ? row : min, parsed[0]);
          if (symbol === 'eHEX') {
            console.log('[ATL] eHEX min:', { date: min.date, price: min.price });
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
      return result;
    },
    {
      refreshInterval: 60000,
      revalidateOnFocus: true,
    }
  );
  return { percentChange: data, isLoading, error };
} 