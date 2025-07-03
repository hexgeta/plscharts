import useSWR from 'swr';

interface LeagueData {
  league_name: string;
  percentage: number | null;
  all_holders: number;
  user_holders: number;
  last_week_holders: number;
  holder_change: number;
  date: string;
}

export function useLeagueData(tokenTicker: string | null) {
  // Only fetch if we have a valid token ticker
  const shouldFetch = tokenTicker && ['HEX', 'PLSX', 'INC', 'HDRN', 'ICSA', 'COM'].includes(tokenTicker.toUpperCase());
  
  const { data, error, isLoading } = useSWR<{ data: LeagueData[] }>(
    shouldFetch ? `/api/leagues/${tokenTicker.toLowerCase()}` : null,
    (url) => fetch(url).then(res => res.json())
  );

  return {
    leagueData: data?.data || [],
    isLoading: shouldFetch ? isLoading : false,
    error: error?.message
  };
} 