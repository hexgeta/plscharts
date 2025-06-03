'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
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

interface GroupedValidator {
  withdrawalCredentials?: string;
  referenceAddress?: string; // For backward compatibility
  totalBalance: number;
  validatorCount: number;
  averageBalance?: number;
  validators?: string[] | ValidatorData[];
  statuses?: string[];
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
    groupedValidators?: GroupedValidator[];
    statusCounts: Record<string, number>;
    timestamp: string;
    disclaimer: string;
    totalStaked: number;
  };
  message: string;
}

interface HistoryDataPoint {
  date: string;
  validators: number;
  totalValidators: number;
  totalStaked: number;
  totalStakedFormatted: number;
  withdrawalAddresses: number;
  averagePerAddress: number;
  averagePerAddressFormatted: number;
  index: number;
  displayLabel: string;
}

interface ValidatorHistoryResponse {
  success: boolean;
  data: HistoryDataPoint[];
  summary: {
    totalDays: number;
    startDate: string;
    endDate: string;
    currentValidators: number;
    startValidators: number;
  };
  message: string;
}

export default function ValidatorsTracker() {
  const [validatorsData, setValidatorsData] = useState<ValidatorsResponse | null>(null);
  const [historyData, setHistoryData] = useState<HistoryDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [showContent, setShowContent] = useState(false);

  // Fetch token prices for PLS
  const { prices: tokenPrices, isLoading: pricesLoading } = useTokenPrices(['PLS']);

  // Fetch historical validator data
  const fetchHistoryData = async () => {
    try {
      setHistoryLoading(true);
      const response = await fetch('/api/validators/history');
      const data: ValidatorHistoryResponse = await response.json();
      
      if (data.success) {
        setHistoryData(data.data);
      } else {
        console.error('Failed to fetch history data:', data.message);
        setHistoryData([]);
      }
    } catch (err) {
      console.error('History data fetch error:', err);
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

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
    fetchHistoryData();
    
    const interval = setInterval(fetchValidatorsData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Use grouped validators from API if available, otherwise fallback to client-side grouping
  const groupedValidators = useMemo(() => {
    if (validatorsData?.data.groupedValidators) {
      return validatorsData.data.groupedValidators.slice(0, 20);
    }

    if (!validatorsData?.data.activeValidators) return [];
    
    const groups = new Map<string, {
      referenceAddress: string;
      totalBalance: number;
      validatorCount: number;
      validators: ValidatorData[];
    }>();

    validatorsData.data.activeValidators
      .filter(validator => validator.status.startsWith('active_'))
      .forEach(validator => {
        const refAddress = validator.validator.withdrawal_credentials;
        const balance = parseInt(validator.balance);
        
        if (groups.has(refAddress)) {
          const existing = groups.get(refAddress)!;
          existing.totalBalance += balance;
          existing.validatorCount += 1;
          existing.validators.push(validator);
        } else {
          groups.set(refAddress, {
            referenceAddress: refAddress,
            totalBalance: balance,
            validatorCount: 1,
            validators: [validator]
          });
        }
      });

    return Array.from(groups.values())
      .sort((a, b) => b.totalBalance - a.totalBalance)
      .slice(0, 20);
  }, [validatorsData]);

  const totalStaked = useMemo(() => {
    const total = validatorsData?.data.totalStaked || 0;
    return total;
  }, [validatorsData, tokenPrices, pricesLoading]);

  const totalWithdrawalAddresses = useMemo(() => {
    if (validatorsData?.data.groupedValidators) {
      return validatorsData.data.groupedValidators.length;
    }

    if (!validatorsData?.data.activeValidators) return 0;
    
    const uniqueAddresses = new Set<string>();
    validatorsData.data.activeValidators
      .filter(validator => validator.status.startsWith('active_'))
      .forEach(validator => {
        uniqueAddresses.add(validator.validator.withdrawal_credentials);
      });

    return uniqueAddresses.size;
  }, [validatorsData]);

  const averageWithdrawalBalance = useMemo(() => {
    if (!totalWithdrawalAddresses || !totalStaked) return 0;
    return totalStaked / totalWithdrawalAddresses;
  }, [totalWithdrawalAddresses, totalStaked]);

  // Format functions
  const formatBalance = (gweiBalance: string) => {
    const balance = parseInt(gweiBalance) / 1e9;
    return balance.toFixed(2);
  };

  const formatBalanceUSD = (gweiBalance: string) => {
    if (!tokenPrices?.PLS?.price) return '$0.00';
    const balance = parseInt(gweiBalance) / 1e9;
    const usdValue = balance * tokenPrices.PLS.price;
    return `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatTotalStakedUSD = (totalGweiBalance: number) => {
    if (!tokenPrices?.PLS?.price) return '$0';
    const balance = totalGweiBalance / 1e9;
    const usdValue = balance * tokenPrices.PLS.price;
    return `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatAverageBalanceUSD = (avgGweiBalance: number) => {
    if (!tokenPrices?.PLS?.price) return '$0';
    const balance = avgGweiBalance / 1e9;
    const usdValue = balance * tokenPrices.PLS.price;
    return `$${usdValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatValidatorName = (pubkey: string, index: number) => {
    return `${pubkey.slice(0, 6)}...${pubkey.slice(-4)}`;
  };

  // Extract Ethereum address from withdrawal credentials
  const extractAddressFromCredentials = (credentials: string) => {
    // Withdrawal credentials format: 0x01 + 11 zero bytes + 20 byte address
    // So we take the last 40 characters (20 bytes) and add 0x prefix
    if (credentials.length >= 42) {
      return '0x' + credentials.slice(-40);
    }
    return credentials; // fallback to original if format is unexpected
  };

  // Check if everything is ready to display
  const isDataReady = !loading && !historyLoading && !pricesLoading && validatorsData && !error;

  // Trigger fade-in effect when data is ready
  useEffect(() => {
    if (isDataReady) {
      // Small delay to ensure smooth transition
      setTimeout(() => setShowContent(true), 50);
    }
  }, [isDataReady]);

  if (!isDataReady) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl">
              {error ? (
                <div className="text-red-500">{error}</div>
              ) : (
                "Loading validators data..."
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-black text-white transition-opacity duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-8">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <div className="bg-black p-8 rounded-xl border-2 border-white/10 text-center relative min-h-[140px]">
                <div className="text-4xl font-bold text-white">
                  {formatTotalStakedUSD(totalStaked)}
                </div>
                <div className="text-xl text-gray-500 mt-1">
                  {(totalStaked / 1e9 / 1e12).toFixed(2)}T PLS
                </div>
                <div className="absolute bottom-4 right-4 text-sm text-gray-400/50">Total Staked</div>
              </div>
              
              <div className="bg-black p-8 rounded-xl border-2 border-white/10 text-center relative min-h-[140px]">
                <div className="text-4xl font-bold text-white">
                  {validatorsData?.data.activeCount.toLocaleString()}
                </div>
                <div className="absolute bottom-4 right-4 text-sm text-gray-400/50">Active Validators</div>
              </div>
              
              <div className="bg-black p-8 rounded-xl border-2 border-white/10 text-center relative min-h-[140px]">
                <div className="text-4xl font-bold text-white">
                  {validatorsData?.data.count.toLocaleString()}
                </div>
                <div className="absolute bottom-4 right-4 text-sm text-gray-400/50">All Historic Validators</div>
              </div>
            </div>

            {/* Table and Side Cards Container */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Side Cards */}
              <div className="flex flex-col gap-6 lg:order-2">
                <div className="bg-black p-8 rounded-xl border-2 border-white/10 text-center relative min-h-[140px]">
                  <div className="text-4xl font-bold text-white">
                    {totalWithdrawalAddresses.toLocaleString()}
                  </div>
                  <div className="absolute bottom-4 right-4 text-sm text-gray-400/50">Unique Addresses</div>
                </div>

                <div className="bg-black p-8 rounded-xl border-2 border-white/10 text-center relative min-h-[100px]">
                  <div className="text-4xl font-bold text-white">
                    {formatAverageBalanceUSD(averageWithdrawalBalance)}
                  </div>
                  <div className="text-xl text-gray-500 mt-1">
                    {(averageWithdrawalBalance / 1e9 / 1e9).toFixed(2)}B PLS
                  </div>
                  <div className="absolute bottom-4 right-4 text-sm text-gray-400/50">Avg Per Address</div>
                </div>
              </div>

              {/* Top 20 Validators Table */}
              <div className="lg:col-span-2 lg:order-1 bg-black rounded-xl border-2 border-white/10 overflow-hidden">
                <div className="p-6">
                  <h2 className="text-2xl font-bold">Top 20 Validators Ranked</h2>
                  <p className="text-gray-400 mt-2">Grouped by address, ranked by total staked PLS</p>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-black border-b border-white/10">
                      <tr>
                        <th className="px-6 py-4 text-center text-gray-300 font-medium">#</th>
                        <th className="px-6 py-4 text-center text-gray-300 font-medium">Address</th>
                        <th className="px-6 py-4 text-center text-gray-300 font-medium">No. of Validators</th>
                        <th className="px-6 py-4 text-center text-gray-300 font-medium">Total Staked</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {groupedValidators.map((group, index) => {
                        const withdrawalCredentials = group.withdrawalCredentials || group.referenceAddress;
                        const totalBalance = group.totalBalance;
                        const validatorCount = group.validatorCount;
                        
                        return (
                          <tr key={withdrawalCredentials}>
                            <td className="px-6 py-4 text-center font-mono">
                              {index < 3 ? (
                                <img 
                                  src={`/${index + 1}.png`} 
                                  alt={`Position ${index + 1}`}
                                  className="w-5 h-5 mx-auto"
                                />
                              ) : (
                                index + 1
                              )}
                            </td>
                            <td className="px-6 py-4 text-center">
                              <a 
                                href={`https://midgard.wtf/address/${extractAddressFromCredentials(withdrawalCredentials)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-sm text-white hover:underline cursor-pointer"
                              >
                                {extractAddressFromCredentials(withdrawalCredentials).slice(0, 4)}...{extractAddressFromCredentials(withdrawalCredentials).slice(-4)}
                              </a>
                            </td>
                            <td className="px-6 py-4 text-center font-mono">
                              <div className="text-white font-semibold">
                                {validatorCount}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-center font-mono">
                              <div className="text-green-400 text-lg font-semibold">
                                {tokenPrices?.PLS?.price 
                                  ? `$${((totalBalance / 1e9) * tokenPrices.PLS.price).toLocaleString('en-US', { 
                                      minimumFractionDigits: 0, 
                                      maximumFractionDigits: 0 
                                    })}`
                                  : '$0'
                                }
                              </div>
                              <div className="text-gray-400 text-sm mt-1">
                                {(totalBalance / 1e9).toLocaleString('en-US', { 
                                  minimumFractionDigits: 0, 
                                  maximumFractionDigits: 0 
                                })} PLS
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Historical Validator Count Chart */}
            <div className="w-full h-[450px] my-10 relative">
              <div className="w-full h-full p-8 border-2 border-white/10 rounded-xl">
                <h2 className="text-left text-white text-2xl mb-8 ml-10">
                  Active Validators
                </h2>
                <ResponsiveContainer width="100%" height="90%">
                  <LineChart data={historyData}>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="rgba(136, 136, 136, 0.2)" 
                      vertical={false} 
                    />
                    <XAxis 
                      dataKey="displayLabel"
                      axisLine={{ stroke: '#888', strokeWidth: 0 }}
                      tickLine={false}
                      tick={{ fill: '#888', fontSize: 14, dy: 5 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#888', fontSize: 14, dx: -5}}
                      tickFormatter={(value) => value.toLocaleString()}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.85)', 
                        border: '1px solid rgba(255, 255, 255, 0.2)', 
                        borderRadius: '10px'
                      }}
                      labelStyle={{ color: 'white' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div style={{
                              backgroundColor: 'rgba(0, 0, 0, 0.85)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '10px',
                              padding: '10px'
                            }}>
                              <p style={{ color: 'white', margin: 0, marginBottom: '8px', fontWeight: 'bold' }}>
                                {data.date ? new Date(data.date).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                }) : label}
                              </p>
                              <div style={{ color: '#10b981', marginBottom: '4px' }}>
                                <div>Active Validators</div>
                                <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                  {data.validators?.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="validators" 
                      name="Active Validators"
                      dot={false} 
                      strokeWidth={2} 
                      stroke="rgba(16, 185, 129, 1)"
                      activeDot={{ r: 4, fill: 'rgba(16, 185, 129, 1)', stroke: 'white' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}