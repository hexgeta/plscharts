'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices';

interface ValidatorData {
  index: string;
  balance: string;
  status: string;
  validator: {
    pubkey: string;
    withdrawal_credentials: string;
    effective_balance: string;
    slashed: boolean;
    activation_eligibility_epoch: string;
    activation_epoch: string;
    exit_epoch: string;
    withdrawable_epoch: string;
  };
}

interface ValidatorsResponse {
  success: boolean;
  data: {
    count: number;
    activeCount: number;
    method: string;
    endpoint: string;
    validators: ValidatorData[];
    activeValidators: ValidatorData[];
    statusCounts: Record<string, number>;
    timestamp: string;
    disclaimer: string;
    totalStaked: number;
  };
  message: string;
}

export default function ValidatorsTracker() {
  const [validatorsData, setValidatorsData] = useState<ValidatorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch token prices for PLS
  const { prices: tokenPrices, isLoading: pricesLoading } = useTokenPrices(['PLS']);

  const fetchValidatorsData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/validators');
      const data: ValidatorsResponse = await response.json();
      
      if (data.success) {
        setValidatorsData(data);
        setLastUpdated(new Date().toLocaleTimeString());
        setError(null);
      } else {
        setError('Failed to fetch validators data');
      }
    } catch (err) {
      setError('Error fetching validators data');
      console.error('Validators data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValidatorsData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchValidatorsData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Get top 20 largest active validators
  const topValidators = useMemo(() => {
    if (!validatorsData?.data.activeValidators) return [];
    
    return validatorsData.data.activeValidators
      .filter(validator => validator.status.startsWith('active_'))
      .slice(0, 20); // Just take the first 20 since they're already sorted by balance from the API
  }, [validatorsData]);

  // Calculate average validator balance
  const averageBalance = useMemo(() => {
    if (!validatorsData?.data.activeValidators) return 0;
    
    const totalBalance = validatorsData.data.activeValidators.reduce((sum, validator) => {
      return sum + parseInt(validator.balance);
    }, 0);
    
    return totalBalance / validatorsData.data.activeValidators.length;
  }, [validatorsData]);

  // Use total staked from API response instead of calculating locally
  const totalStaked = useMemo(() => {
    const total = validatorsData?.data.totalStaked || 0;
    console.log('🔍 Debugging total staked:');
    console.log('Raw totalStaked from API:', total);
    console.log('Total in PLS:', total / 1e18);
    console.log('Active validators count:', validatorsData?.data.activeValidators?.length);
    console.log('PLS price:', tokenPrices?.PLS?.price);
    console.log('Price loading?', pricesLoading);
    return total;
  }, [validatorsData, tokenPrices, pricesLoading]);

  // Format balance from Gwei to PLS
  const formatBalance = (gweiBalance: string) => {
    const balance = parseInt(gweiBalance) / 1e9; // Convert Gwei to PLS
    return balance.toFixed(2);
  };

  // Format balance to USD
  const formatBalanceUSD = (gweiBalance: string) => {
    if (!tokenPrices?.PLS?.price) return '$0.00';
    const balance = parseInt(gweiBalance) / 1e9; // Convert Gwei to PLS
    const usdValue = balance * tokenPrices.PLS.price;
    return `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Format total staked to USD
  const formatTotalStakedUSD = (totalGweiBalance: number) => {
    if (!tokenPrices?.PLS?.price) return '$0';
    const balance = totalGweiBalance / 1e9; // Convert Gwei to PLS
    const usdValue = balance * tokenPrices.PLS.price;
    return `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Generate a readable name for validator (using first and last 4 chars of pubkey)
  const formatValidatorName = (pubkey: string, index: number) => {
    return `${pubkey.slice(0, 6)}...${pubkey.slice(-4)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="container mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl">Loading validators data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="container mx-auto">
          <h1 className="text-4xl font-bold mb-8">PulseChain Validators</h1>
          <div className="text-red-500 text-xl">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="container mx-auto">
      

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-black p-8 rounded-xl border-2 border-white/10 text-center">
            <div className="text-3xl font-bold text-green-400">
              {validatorsData?.data.activeCount.toLocaleString()}
            </div>
            <div className="text-gray-400 mt-2">Active Validators</div>
          </div>
          
          <div className="bg-black p-8 rounded-xl border-2 border-white/10 text-center">
            <div className="text-3xl font-bold text-blue-400">
              {validatorsData?.data.count.toLocaleString()}
            </div>
            <div className="text-gray-400 mt-2">Total Historic Validators</div>
          </div>
          
          <div className="bg-black p-8 rounded-xl border-2 border-white/10 text-center">
            <div className="text-3xl font-bold text-purple-400">
              {formatBalanceUSD(averageBalance.toString())}
            </div>
            <div className="text-gray-400 mt-2">Average Balance</div>
            <div className="text-sm text-gray-500 mt-1">
              {(averageBalance / 1e9).toFixed(2)} PLS
            </div>
          </div>

          <div className="bg-black p-8 rounded-xl border-2 border-white/10 text-center">
            <div className="text-3xl font-bold text-orange-400">
              {(totalStaked / 1e9 / 1e12).toFixed(2)}T PLS
            </div>
            <div className="text-gray-400 mt-2">Total PLS Staked</div>
            <div className="text-sm text-gray-500 mt-1">
              {formatTotalStakedUSD(totalStaked)}
            </div>
          </div>
        </div>

        {/* Top 20 Validators Table */}
        <div className="bg-black rounded-xl border-2 border-white/10 overflow-hidden">
          <div className="p-6 border-b border-white/10">
            <h2 className="text-2xl font-bold">Top 20 Largest Active Validators</h2>
            <p className="text-gray-400 mt-2">Ranked by validator balance</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-gray-300 font-medium">#</th>
                  <th className="px-6 py-4 text-left text-gray-300 font-medium">Validator</th>
                  <th className="px-6 py-4 text-center text-gray-300 font-medium">Balance (PLS)</th>
                  <th className="px-6 py-4 text-center text-gray-300 font-medium">Balance (USD)</th>
                  <th className="px-6 py-4 text-center text-gray-300 font-medium">Status</th>
                  <th className="px-6 py-4 text-center text-gray-300 font-medium">Index</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {topValidators.map((validator, index) => (
                  <tr key={validator.index} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 text-center font-mono">
                      {index + 1}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-mono text-sm">
                        {formatValidatorName(validator.validator.pubkey, index)}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {validator.validator.pubkey.slice(0, 20)}...
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      <div className="text-white">
                        {formatBalance(validator.balance)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center font-mono">
                      <div className="text-green-400">
                        {formatBalanceUSD(validator.balance)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        validator.status === 'active_ongoing' 
                          ? 'bg-green-900 text-green-300' 
                          : validator.status === 'active_exiting'
                          ? 'bg-yellow-900 text-yellow-300'
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {validator.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-gray-400">
                      {validator.index}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 