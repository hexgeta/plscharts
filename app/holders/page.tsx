'use client'

import { useState, useEffect } from 'react';
import LeagueDistributionChart from '@/components/LeagueDistributionChart';

interface LeagueData {
  league_name: string;
  user_holders: number;
}

interface HolderData {
  plsx: LeagueData[];
  hex: LeagueData[];
  hdrn: LeagueData[];
  com: LeagueData[];
  inc: LeagueData[];
  icsa?: LeagueData[];
}

export default function HoldersPage() {
  const [data, setData] = useState<HolderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchHolderData() {
      try {
        console.log('Fetching holder data from:', '/api/holders');
        
        const response = await fetch('/api/holders');

        if (!response.ok) {
          console.error('Failed to fetch holder data:', response.status, response.statusText);
          throw new Error(`Failed to fetch holder data: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Holder data received:', result);
        setData(result);
      } catch (err) {
        console.error('Error fetching holder data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch holder data');
      } finally {
        setLoading(false);
      }
    }

    fetchHolderData();
  }, []);

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-8 md:px-28">
        <h1 className="text-2xl font-bold mb-0 text-center">Token Holder Distribution</h1>
        <div className="rounded-lg shadow p-8 text-center">
          <div className="text-gray-400">Loading holder data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-8 md:px-28">
        <h1 className="text-2xl font-bold mb-0 text-center">Token Holder Distribution</h1>
        <div className="rounded-lg shadow p-8 text-center">
          <div className="text-red-400">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-8 md:px-28">
      <h1 className="text-2xl font-bold mb-0 text-center">Token Holder Distribution</h1>
      <div className="rounded-lg shadow p-0">
        {data && <LeagueDistributionChart data={data} />}
      </div>
    </div>
  );
} 