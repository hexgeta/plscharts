'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices';
import { Info, Globe, MessageCircle, Send, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// Constants
const ADDRESS_DISPLAY_NAMES: Record<string, string> = {
  '0x1F082785Ca889388Ce523BF3de6781E40b99B060': 'Vouch (vPLS)',
  '0xc7EA05E91eB81776d63D073D196E72349082Dc60': 'ValidatorX (uPLS)',
  '0xAE94A6eef313C136E260EbdB9E1EeC3cc9C15d4c': 'Project Pi (stPLS)',
  '0xa48da3dd749872c13e3cdff2941882de77215144': 'BW',
  '0x496cf17010a986f43093fc0a6dafaccf0059234c': 'BWX',
};

const VALIDATOR_INFO: Record<string, { 
  title: string; 
  description: string; 
  socials: { type: 'website' | 'twitter' | 'telegram' | 'discord'; url: string; label: string }[];
}> = {
  '0x1F082785Ca889388Ce523BF3de6781E40b99B060': {
    title: 'Vouch (vPLS)',
    description: 'Vouch is a liquid staking protocol on PulseChain that allows users to stake PLS while maintaining liquidity.',
    socials: [
      { type: 'website', url: 'https://vouch.run/', label: 'Website' },
      { type: 'twitter', url: 'https://x.com/vouchLSD', label: 'Twitter' },
      { type: 'telegram', url: 'https://t.me/vouchrun', label: 'Telegram' }
    ]
  },
  '0xc7EA05E91eB81776d63D073D196E72349082Dc60': {
    title: 'ValidatorX (uPLS)',
    description: 'ValidatorX is a liquid staking protocol on PulseChain that allows users to stake PLS while maintaining liquidity.',
    socials: [
      { type: 'website', url: 'https://www.plusx.app/', label: 'Website' },
      { type: 'twitter', url: 'https://x.com/PlusxApp', label: 'Twitter' },
      { type: 'telegram', url: 'https://t.me/uPabns', label: 'Telegram' }
    ]
  },
  '0xAE94A6eef313C136E260EbdB9E1EeC3cc9C15d4c': {
    title: 'Project Pi (stPLS)',
    description: 'Project Pi is a liquid staking protocol on PulseChain that allows users to stake PLS while maintaining liquidity.',
    socials: [
      { type: 'website', url: 'https://app.projectpi.xyz/', label: 'Website' },
      { type: 'twitter', url: 'https://x.com/ProjectPiLabs', label: 'Twitter' },
      { type: 'telegram', url: 'https://t.me/Project_Pi314', label: 'Telegram' }
    ]
  },
  '0xa48da3dd749872c13e3cdff2941882de77215144': {
    title: 'BW',
    description: 'BW is group of private validators hosted by the UpX team.',
    socials: []
  },
  '0x496cf17010a986f43093fc0a6dafaccf0059234c': {
    title: 'BWX',
    description: 'BWX is group of private validators hosted by the UpX team.',
    socials: []
  }
};

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
  const [selectedValidatorInfo, setSelectedValidatorInfo] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [displayCount, setDisplayCount] = useState(20);

  // Animation variants for table rows
  const rowVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.95
    },
    visible: {
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        duration: 0.3,
        ease: [0.25, 0.46, 0.45, 0.94] // Smooth ease-out curve
      }
    }
  };

  // Fetch token prices for PLS
  const { prices: tokenPrices, isLoading: pricesLoading } = useTokenPrices(['PLS']);

  // Extract Ethereum address from withdrawal credentials
  const extractAddressFromCredentials = (credentials: string) => {
    // Withdrawal credentials format: 0x01 + 11 zero bytes + 20 byte address
    // So we take the last 40 characters (20 bytes) and add 0x prefix
    if (credentials.length >= 42) {
      return '0x' + credentials.slice(-40);
    }
    return credentials; // fallback to original if format is unexpected
  };

  // Get display text for address
  const getAddressDisplayText = (address: string) => {
    const lowerAddress = address.toLowerCase();
    const foundKey = Object.keys(ADDRESS_DISPLAY_NAMES).find(key => key.toLowerCase() === lowerAddress);
    if (foundKey) {
      return ADDRESS_DISPLAY_NAMES[foundKey];
    }
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

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
      if (isInitialLoad) {
        setLoading(true);
      }
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
      if (isInitialLoad) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchValidatorsData();
    fetchHistoryData();
    
    const interval = setInterval(() => {
      setIsInitialLoad(false);
      fetchValidatorsData();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Use grouped validators from API if available, otherwise fallback to client-side grouping
  const groupedValidators = useMemo(() => {
    if (validatorsData?.data.groupedValidators) {
      return validatorsData.data.groupedValidators.slice(0, displayCount);
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
      .slice(0, displayCount);
  }, [validatorsData, displayCount]);

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

  // Prepare data for bar chart - top 100 validators by staked amount
  const barChartData = useMemo(() => {
    if (!validatorsData?.data.groupedValidators) return [];
    
    return validatorsData.data.groupedValidators
      .slice(0, 100) // Top 100 validators
      .map((group, index) => {
        const withdrawalCredentials = group.withdrawalCredentials || group.referenceAddress || '';
        const address = extractAddressFromCredentials(withdrawalCredentials);
        const displayName = getAddressDisplayText(address);
        const balanceInPLS = group.totalBalance / 1e9;
        
        return {
          rank: index + 1,
          name: displayName,
          address: address,
          balancePLS: balanceInPLS,
          balanceUSD: tokenPrices?.PLS?.price ? balanceInPLS * tokenPrices.PLS.price : 0,
          validatorCount: group.validatorCount
        };
      });
  }, [validatorsData, tokenPrices]);

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

  // Check if address has info available
  const hasValidatorInfo = (address: string) => {
    const lowerAddress = address.toLowerCase();
    return Object.keys(VALIDATOR_INFO).some(key => key.toLowerCase() === lowerAddress);
  };

  // Get validator info
  const getValidatorInfo = (address: string) => {
    const lowerAddress = address.toLowerCase();
    const foundKey = Object.keys(VALIDATOR_INFO).find(key => key.toLowerCase() === lowerAddress);
    return foundKey ? VALIDATOR_INFO[foundKey] : null;
  };

  // Render social icon
  const renderSocialIcon = (type: string) => {
    const iconProps = { size: 20, className: "" };
    
    switch (type) {
      case 'website':
        return <Globe {...iconProps} />;
      case 'twitter':
      case 'x':
        return (
          <svg 
            width={iconProps.size} 
            height={iconProps.size} 
            className={iconProps.className}
            viewBox="0 0 24 24" 
            fill="currentColor"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
        );
      case 'telegram':
        return <Send {...iconProps} />;
      case 'discord':
        return <Users {...iconProps} />;
      default:
        return <Globe {...iconProps} />;
    }
  };

  // Check if everything is ready to display (only for initial load)
  const isDataReady = !loading && !historyLoading && !pricesLoading && validatorsData && !error;

  // Trigger fade-in effect when data is ready (only on initial load)
  useEffect(() => {
    if (isDataReady && isInitialLoad) {
      setTimeout(() => setShowContent(true), 50);
    } else if (!isInitialLoad && validatorsData) {
      setShowContent(true);
    }
  }, [isDataReady, isInitialLoad, validatorsData]);

  if (isInitialLoad && (!validatorsData || loading || historyLoading || pricesLoading || error)) {
    return (
      <div className="min-h-screen bg-black" />
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.6,
        ease: [0.23, 1, 0.32, 1]
      }}
      className="min-h-screen bg-black text-white"
    >
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="space-y-8">
            {/* Summary Stats */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.5,
                delay: 0.1,
                ease: [0.23, 1, 0.32, 1]
              }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
            >
              <div className="bg-black p-8 rounded-xl border-2 border-white/10 text-center relative min-h-[140px]">
                <div className="text-4xl font-bold text-white">
                  {formatTotalStakedUSD(totalStaked)}
                </div>
                <div className="text-md text-gray-500 mt-1">
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
            </motion.div>

            {/* Table and Side Cards Container */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.5,
                delay: 0.2,
                ease: [0.23, 1, 0.32, 1]
              }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-6"
            >
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
                  <div className="text-md text-gray-500 mt-1">
                    {(averageWithdrawalBalance / 1e9 / 1e9).toFixed(2)}B PLS
                  </div>
                  <div className="absolute bottom-4 right-4 text-sm text-gray-400/50">Avg Per Address</div>
                </div>
              </div>

              {/* Top 20 Validators Table */}
              <div className="lg:col-span-2 lg:order-1 bg-black rounded-xl border-2 border-white/10 overflow-hidden">
                <div className="p-6">
                  <h2 className="text-2xl font-bold">Top {displayCount} Validators Ranked</h2>
                  <p className="text-gray-400 mt-2">Grouped by address, ranked by total staked PLS</p>
                </div>
                
                <div className="">
                  <table className="w-full">
                    <thead className="bg-black border-b border-white/10 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 text-center text-gray-300 font-medium">#</th>
                        <th className="px-6 py-4 text-center text-gray-300 font-medium">Address</th>
                        <th className="px-6 py-4 text-center text-gray-300 font-medium">No. of Validators</th>
                        <th className="px-6 py-4 text-center text-gray-300 font-medium">Total Staked</th>
                      </tr>
                    </thead>
                    <motion.tbody 
                      className="divide-y divide-white/10"
                      initial="hidden"
                      animate="visible"
                    >
                      {groupedValidators.map((group, index) => {
                        const withdrawalCredentials = group.withdrawalCredentials || group.referenceAddress;
                        const totalBalance = group.totalBalance;
                        const validatorCount = group.validatorCount;
                        
                        return (
                          <motion.tr
                            key={withdrawalCredentials}
                            variants={rowVariants}
                            initial="hidden"
                            animate="visible"
                          >
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
                              <div className="flex items-center justify-center gap-2">
                                <a 
                                  href={`https://midgard.wtf/address/${extractAddressFromCredentials(withdrawalCredentials)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-mono text-sm text-white hover:underline cursor-pointer"
                                >
                                  {getAddressDisplayText(extractAddressFromCredentials(withdrawalCredentials))}
                                </a>
                                {hasValidatorInfo(extractAddressFromCredentials(withdrawalCredentials)) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedValidatorInfo(extractAddressFromCredentials(withdrawalCredentials));
                                    }}
                                    className="text-gray-400 hover:text-white transition-colors"
                                  >
                                    <Info size={14} />
                                  </button>
                                )}
                              </div>
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
                          </motion.tr>
                        );
                      })}
                    </motion.tbody>
                  </table>
                </div>

                {/* Load More Button */}
                {validatorsData?.data.groupedValidators && displayCount < validatorsData.data.groupedValidators.length && (
                  <div className="flex justify-center p-6 border-t border-white/10">
                    <button
                      onClick={() => setDisplayCount(prev => prev + 100)}
                      className="px-6 py-2 rounded-full border-2 font-medium transition-all duration-200 bg-transparent text-white border-white/20 hover:border-white/40"
                    >
                      Load {Math.min(100, validatorsData.data.groupedValidators.length - displayCount)} more
                    </button>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Top Validators Bar Chart */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.5,
                delay: 0.3,
                ease: [0.23, 1, 0.32, 1]
              }}
              className="w-full h-[450px] my-10 relative"
            >
              <div className="w-full h-full p-8 border-2 border-white/10 rounded-xl">
                <h2 className="text-left text-white text-2xl mb-0 md:mb-8 ml-10">
                  Top 100 Staking Addresses Ranked
                </h2>
                <ResponsiveContainer width="100%" height="90%">
                  <BarChart data={barChartData} margin={{ top: 20, right: 5, left: 5, bottom: 20 }}>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="rgba(136, 136, 136, 0.2)" 
                      horizontal={true}
                      vertical={false} 
                    />
                    <XAxis 
                      axisLine={{ stroke: '#888', strokeWidth: 1 }}
                      tickLine={false}
                      tick={false}
                      height={20}
                      label={{ value: 'Address', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle', fill: '#888', fontSize: '14px' } }}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#888', fontSize: 14, dx: -5}}
                      tickFormatter={(value) => `$${(value / 1e6).toFixed(0)}M`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(0, 0, 0, 0.4)', 
                        border: '1px solid rgba(255, 255, 255, 0.2)', 
                        borderRadius: '10px'
                      }}
                      labelStyle={{ color: 'white' }}
                      cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div style={{
                              backgroundColor: 'rgba(0, 0, 0, 0.4)',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              borderRadius: '10px',
                              padding: '10px'
                            }}>
                              <p style={{ color: 'white', margin: 0, marginBottom: '8px', fontWeight: 'bold' }}>
                                #{data.rank} {data.name}
                              </p>
                              <div style={{ color: 'white', marginBottom: '4px' }}>
                                <div>Total Staked</div>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#4ade80' }}>
                                  ${data.balanceUSD?.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                                </div>
                                <div style={{ fontSize: '14px', color: '#888' }}>
                                  {data.balancePLS?.toLocaleString('en-US', { maximumFractionDigits: 0 })} PLS
                                </div>
                              </div>
                              <div style={{ color: '#888', fontSize: '12px' }}>
                                {data.validatorCount} validators
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="balanceUSD" 
                      fill="#4ade80"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Historical Validator Count Chart */}
            {/* 
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.5,
                delay: 0.4,
                ease: [0.23, 1, 0.32, 1]
              }}
              className="w-full h-[450px] my-10 relative"
            >
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
                              <div style={{ color: 'white', marginBottom: '4px' }}>
                                <div>Active Validators</div>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'gray' }}>
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
                      stroke='white'
                      activeDot={{ r: 4, fill: 'white', stroke: 'white' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
            */}
          </div>
        </div>

        {/* Validator Info Dialog */}
        <Dialog 
          open={!!selectedValidatorInfo} 
          onOpenChange={(open) => !open && setSelectedValidatorInfo(null)}
        >
          <DialogContent className="bg-black border-2 border-white/20 text-white max-w-md">
            {selectedValidatorInfo && getValidatorInfo(selectedValidatorInfo) && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-white">
                    {getValidatorInfo(selectedValidatorInfo)!.title}
                  </DialogTitle>
                  <DialogDescription className="text-gray-300 mt-2">
                    {getValidatorInfo(selectedValidatorInfo)!.description}
                  </DialogDescription>
                </DialogHeader>
                
                {getValidatorInfo(selectedValidatorInfo)!.socials.length > 0 && (
                  <div className="mt-0">
                    <div className="flex flex-wrap gap-3">
                      {getValidatorInfo(selectedValidatorInfo)!.socials.map((social, index) => (
                        <a
                          key={index}
                          href={social.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 text-white/60 hover:text-white text-md"
                        >
                          {renderSocialIcon(social.type)}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </motion.div>
  );
}