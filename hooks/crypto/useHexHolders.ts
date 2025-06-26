'use client';

import useSWR from 'swr';

interface HexHolder {
  address: string;
  isContract: boolean;
  balance: number;
  date: string;
  timestamp: string;
}

interface HexHoldersResponse {
  holders: HexHolder[];
  totalHolders: number;
  totalBalance: number;
  contractHolders: number;
  contractBalance: number;
  date: string;
}

export function useHexHolders() {
  const { data, error, isLoading } = useSWR<HexHoldersResponse>(
    '/api/holders/latest',
    (url) => fetch(url).then(res => res.json())
  );

  return {
    holders: data?.holders || [],
    totalHolders: data?.totalHolders || 0,
    isLoading,
    error: error?.message
  };
} 