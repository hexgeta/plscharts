import { useState, useEffect } from 'react';

interface PooledStake {
  token: string;
  price_usd: number;
  price_hex: number;
  backing: number;
  premium: number;
  principal: number;
  length: number;
  t_shares: number;
}

export function usePooledStakesData() {
  const [data, setData] = useState<PooledStake[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/pooled-stakes');
        if (!response.ok) {
          throw new Error('Failed to fetch pooled stakes data');
        }
        const result = await response.json();
        setData(result);
        setIsLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, isLoading, error };
} 