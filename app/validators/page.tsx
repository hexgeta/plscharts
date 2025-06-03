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

export default function ValidatorsTracker() {
  const [validatorsData, setValidatorsData] = useState<ValidatorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Fetch token prices for PLS
  const { prices: tokenPrices, isLoading: pricesLoading } = useTokenPrices(['PLS']);

  // Historical validator data
  const validatorHistoryData = [4096,4096,4096,4348,5371,6451,7412,8491,9568,10633,11708,12726,13803,14640,15669,16746,17821,18901,19949,20049,20397,20916,21406,21541,22114,22195,22182,22332,22493,21597,20696,19821,19947,19880,19005,19054,19138,19282,19200,19276,19279,19458,19456,19721,19896,20102,20155,20417,20805,20739,20908,21118,21247,21565,21737,22140,22966,23440,23901,24034,24433,24606,25351,25828,26065,26472,26886,26951,27808,28888,29961,30257,30715,31194,32106,32616,33428,33713,34333,34501,35035,36098,36661,36919,37209,37304,37522,37565,37525,37340,37229,37241,37433,37496,37805,37846,38441,38821,38896,38873,39182,39189,39305,39391,39389,39475,39533,39398,39507,39507,39545,39530,39550,39564,39277,39150,39173,39178,39199,39273,39302,39970,40385,40384,40423,40395,41139,40955,41507,42149,42715,43135,43119,43149,43173,43195,43201,43249,43270,43285,43296,43296,43686,43719,44152,44244,44247,44245,44255,44241,44247,44255,44255,44314,44332,44473,44939,45205,45217,45468,45901,46398,46449,46515,46520,46846,47126,47546,48079,48714,48722,48699,48713,48619,48657,48735,48822,48851,48884,48930,49417,50482,50718,50769,50818,50822,50822,50814,50811,50736,50875,50871,50930,50931,50939,51174,51192,51203,51204,51226,51164,51062,50879,50879,50785,50827,50713,50765,50751,50676,50704,50616,50503,50498,50389,50402,49712,49841,49930,50110,50204,50192,50128,50137,49936,49937,49949,49991,50007,50005,49992,50000,50212,50312,50360,50415,50415,50401,50381,50298,50444,50485,50511,50529,50842,51075,51226,51667,51724,52028,52037,52132,52257,52607,52626,52714,52606,52508,52463,52495,52540,52537,52537,52562,52576,52580,52697,52713,52754,52752,52792,52753,52760,52763,52785,52783,52786,52790,52749,52795,52830,52843,52859,52861,52795,52771,52596,52544,52555,52566,52587,52361,52355,52373,51952,51891,51759,51774,51967,52211,52213,52223,52351,51466,50417,49650,49598,49650,49562,49570,49454,49268,49270,49251,49137,49159,49270,49291,49317,49386,49380,49435,49436,49504,49545,49348,49349,49352,49308,49314,49317,49337,49352,49339,49314,49212,49151,49165,49165,48905,48910,49116,49157,49198,49199,49138,49125,48975,48973,49188,49189,49263,49264,49266,49268,49278,49278,49282,49285,49290,49099,48970,48975,48976,48983,48940,48885,48891,48891,48892,48940,48944,48915,48905,48823,48833,48826,48698,48694,48721,48806,48805,48809,48799,48748,48753,48752,48759,48726,48732,48863,48870,48874,48867,48845,48845,48863,48728,48733,48734,48736,48736,48736,48735,48739,48644,48642,48654,48677,48687,48693,48694,48650,48425,48428,48436,48438,48373,48374,48373,48372,48375,48383,48383,48367,48367,48404,48405,48320,48331,48331,48335,48336,48338,48367,48337,48439,48584,48582,48586,48780,48874,48875,48616,48617,48617,48609,48624,48625,48627,48627,48644,48384,48387,48398,48373,48375,48345,48344,48357,48490,48495,48502,48512,48510,48495,48501,48463,48468,48418,48420,48421,48425,48425,48437,48449,48456,48471,48485,48487,48489,48489,48487,48494,48506,48516,48516,48643,48644,48645,48645,48645,48648,48655,48657,48675,48676,48676,48676,48720,48727,48728,48728,48729,48730,48711,48703,48702,48678,48685,48684];

  // Format data for the chart
  const chartData = useMemo(() => {
    return validatorHistoryData.map((count, index) => ({
      index: index,
      validators: count,
      displayLabel: index === 0 ? 'May 13, 2023' : index === validatorHistoryData.length - 1 ? 'Now' : ''
    }));
  }, []);

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

  // Use grouped validators from API if available, otherwise fallback to client-side grouping
  const groupedValidators = useMemo(() => {
    // If API provides grouped data, use it directly
    if (validatorsData?.data.groupedValidators) {
      return validatorsData.data.groupedValidators
        .slice(0, 20); // Top 20 groups
    }

    // Fallback to client-side grouping (for backward compatibility)
    if (!validatorsData?.data.activeValidators) return [];
    
    const groups = new Map<string, {
      referenceAddress: string;
      totalBalance: number;
      validatorCount: number;
      validators: ValidatorData[];
    }>();

    // Group active validators by withdrawal_credentials
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

    // Convert to array and sort by total balance (largest to smallest)
    return Array.from(groups.values())
      .sort((a, b) => b.totalBalance - a.totalBalance)
      .slice(0, 20); // Top 20 groups
  }, [validatorsData]);

  // Use total staked from API response instead of calculating locally
  const totalStaked = useMemo(() => {
    const total = validatorsData?.data.totalStaked || 0;
    return total;
  }, [validatorsData, tokenPrices, pricesLoading]);

  // Calculate total number of unique withdrawal addresses (from ALL data, not just top 20)
  const totalWithdrawalAddresses = useMemo(() => {
    // If API provides grouped data, get the full count
    if (validatorsData?.data.groupedValidators) {
      return validatorsData.data.groupedValidators.length;
    }

    // Fallback to client-side calculation from all active validators
    if (!validatorsData?.data.activeValidators) return 0;
    
    const uniqueAddresses = new Set<string>();
    validatorsData.data.activeValidators
      .filter(validator => validator.status.startsWith('active_'))
      .forEach(validator => {
        uniqueAddresses.add(validator.validator.withdrawal_credentials);
      });

    return uniqueAddresses.size;
  }, [validatorsData]);

  // Calculate average withdrawal address balance (total staked / ALL withdrawal addresses)
  const averageWithdrawalBalance = useMemo(() => {
    if (!totalWithdrawalAddresses || !totalStaked) return 0;
    return totalStaked / totalWithdrawalAddresses;
  }, [totalWithdrawalAddresses, totalStaked]);

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

  // Format average balance to USD
  const formatAverageBalanceUSD = (avgGweiBalance: number) => {
    if (!tokenPrices?.PLS?.price) return '$0';
    const balance = avgGweiBalance / 1e9; // Convert Gwei to PLS
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
      <div className="mx-auto max-w-6xl space-y-8">
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
          {/* Side Cards - On mobile: show first, on desktop: show on right */}
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

          {/* Top 20 Validators Table - On mobile: show second, on desktop: show on left and span 2 columns */}
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
                    // Handle both API format and fallback format
                    const withdrawalCredentials = group.withdrawalCredentials || group.referenceAddress;
                    const totalBalance = group.totalBalance;
                    const validatorCount = group.validatorCount;
                    
                    return (
                      <tr key={withdrawalCredentials} className=" transition-colors">
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
                            href={`https://midgard.wtf/address/${withdrawalCredentials}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-sm text-white hover:underline transition-colors cursor-pointer"
                          >
                            {withdrawalCredentials.slice(0, 4)}...{withdrawalCredentials.slice(-4)}
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
        <div className="w-full h-[550px] my-10 relative">
          <div className="w-full h-full p-8 border-2 border-white/10 rounded-xl">
            <h2 className="text-left text-white text-2xl mb-0 ml-10">
              Active Validators
            </h2>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
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
                            {label || `Day ${data.index + 1}`}
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
            
            {/* Chart Legend */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              width: '100%', 
              marginTop: '40px',
              marginBottom: '40px'
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}>
                <div style={{ 
                  width: '16px', 
                  height: '2px', 
                  backgroundColor: 'rgba(16, 185, 129, 1)' 
                }}></div>
                <span style={{ 
                  color: '#fff', 
                  fontSize: '12px' 
                }}>
                  Active Validators - Current: {validatorsData?.data.activeCount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}