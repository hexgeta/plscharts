import useSWR from 'swr';

interface HEXStats {
  date: string;
  currentDay: number;
  circulatingHEX: number;
  stakedHEX: number;
  stakedHEXGA: number;
  tshareRateHEX: number;
  dailyPayoutHEX: number;
  totalTshares: number;
  averageStakeLength: number;
  penaltiesHEX: number;
  priceUV2: number;
  priceUV3: number;
  tshareRateUSD: number;
  payoutPerTshareHEX: number;
  actualAPYRate: number;
  stakedHEXPercent: number;
  marketCap: number;
  tshareMarketCap: number;
  totalValueLocked: number;
  currentStakerCount: number;
  totalStakerCount: number;
}

const OA_TSHARES_PLS = 26482068;
const OA_TSHARES_ETH = 26155727;

const fetcher = async (url: string) => {
  const res = await fetch(url);
  const data = await res.json();
  // Return only the most recent day's data (first item in array)
  return data[0];
};

export function usePulseHEXStats() {
  const { data, error, isLoading } = useSWR<HEXStats>(
    'https://hexdailystats.com/fulldatapulsechain',
    fetcher
  );

  return {
    stats: {
      ...data,
      totalTshares: data?.totalTshares ? data.totalTshares - OA_TSHARES_PLS : 0
    },
    isLoading,
    error
  };
}

export function useEthereumHEXStats() {
  const { data, error, isLoading } = useSWR<HEXStats>(
    'https://hexdailystats.com/fulldata',
    fetcher
  );

  return {
    stats: {
      ...data,
      totalTshares: data?.totalTshares ? data.totalTshares - OA_TSHARES_ETH : 0
    },
    isLoading,
    error
  };
}

// Helper function to get combined t-shares from both chains
export function useTotalTShares() {
  const { stats: pulsechainStats, isLoading: pulsechainLoading } = usePulseHEXStats();
  const { stats: ethereumStats, isLoading: ethereumLoading } = useEthereumHEXStats();

  const isLoading = pulsechainLoading || ethereumLoading;
  const totalTShares = !isLoading ? 
    ((pulsechainStats?.totalTshares || 0) + (ethereumStats?.totalTshares || 0)) : 0;

  return {
    totalTShares,
    isLoading,
    pulsechainTShares: pulsechainStats?.totalTshares || 0,
    ethereumTShares: ethereumStats?.totalTshares || 0
  };
} 