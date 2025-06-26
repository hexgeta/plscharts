import useSWR from 'swr';

interface LeagueHexData {
  league_name: string;
  percentage: number | null;
  all_holders: number;
  user_holders: number;
  last_week_holders: number;
  holder_change: number;
  date: string;
}

export function useLeagueHex() {
  const { data, error, isLoading } = useSWR<{ data: LeagueHexData[] }>(
    '/api/holders/latest',
    (url) => fetch(url).then(res => res.json())
  );

  return {
    leagueData: data?.data || [],
    isLoading,
    error: error?.message
  };
} 