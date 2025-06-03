'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices';

interface GasData {
  network: string;
  currentGasPrice: string;
  currentGasPriceGwei: number;
  feeHistory?: {
    baseFeePerGas: string[];
    gasUsedRatio: number[];
    oldestBlock: string;
    reward?: string[][];
  };
  timestamp: string;
}

interface GasResponse {
  success: boolean;
  data: {
    ethereum: GasData;
    pulsechain: GasData;
    comparison: {
      ethereumGwei: number;
      pulsechainGwei: number;
      difference: number;
      pulsechainCheaperBy: string;
    };
  };
  timestamp: string;
}

interface ChartDataPoint {
  blockIndex: number;
  ethereum: number;
  pulsechain: number;
  blockLabel: string;
  displayLabel: string;
}

export default function GasTracker() {
  const [gasData, setGasData] = useState<GasResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  const [visibleLines, setVisibleLines] = useState({
    ethereum: true,
    pulsechain: true
  });

  // Fetch token prices for ETH and PLS
  const { prices: tokenPrices, isLoading: pricesLoading } = useTokenPrices(['ETH', 'PLS']);

  const fetchGasData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gas');
      const data: GasResponse = await response.json();
      
      if (data.success) {
        setGasData(data);
        setLastUpdated(new Date().toLocaleTimeString());
        setError(null);
      } else {
        setError('Failed to fetch gas data');
      }
    } catch (err) {
      setError('Error fetching gas data');
      console.error('Gas data fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGasData();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchGasData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate USD costs for a standard 21,000 gas transaction
  const calculateTransactionCost = (gasPriceGwei: number, tokenPrice: number) => {
    // Gas Price (Gwei) × 21,000 gas units ÷ 1e9 (to convert to ETH/PLS) × Token Price (USD)
    return (gasPriceGwei * 21000 / 1e9) * tokenPrice;
  };

  // Format data for the chart
  const chartData = useMemo(() => {
    if (!gasData?.data.ethereum.feeHistory || !gasData?.data.pulsechain.feeHistory || !tokenPrices?.ETH?.price || !tokenPrices?.PLS?.price) {
      return [];
    }

    const ethHistory = gasData.data.ethereum.feeHistory;
    const plsHistory = gasData.data.pulsechain.feeHistory;
    
    console.log('ETH fee history length:', ethHistory.baseFeePerGas.length);
    console.log('PLS fee history length:', plsHistory.baseFeePerGas.length);
    
    // Convert baseFeePerGas from hex to gwei, then to USD
    const ethBaseFees = ethHistory.baseFeePerGas.map(fee => {
      const gasPriceGwei = parseInt(fee, 16) / 1e9;
      return {
        gwei: gasPriceGwei,
        usd: calculateTransactionCost(gasPriceGwei, tokenPrices.ETH.price)
      };
    });
    const plsBaseFees = plsHistory.baseFeePerGas.map(fee => {
      const gasPriceGwei = parseInt(fee, 16) / 1e9;
      return {
        beats: gasPriceGwei,
        usd: calculateTransactionCost(gasPriceGwei, tokenPrices.PLS.price)
      };
    });
    
    const maxLength = Math.min(ethBaseFees.length, plsBaseFees.length);
    console.log('Chart data length:', maxLength);
    
    return Array.from({ length: maxLength }, (_, i) => ({
      blockIndex: i,
      ethereum: ethBaseFees[i]?.usd || 0,
      pulsechain: plsBaseFees[i]?.usd || 0,
      ethereumGwei: ethBaseFees[i]?.gwei || 0,
      pulsechainBeats: plsBaseFees[i]?.beats || 0,
      blockLabel: `Block -${maxLength - i - 1}`,
      displayLabel: i === 0 ? 'Yesterday' : i === maxLength - 1 ? 'Today' : ''
    }));
  }, [gasData, tokenPrices]);

  const handleLegendClick = (dataKey: string) => {
    setVisibleLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  const customLegend = (props: any) => {
    const { payload } = props;
    
    if (payload && gasData) {
      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          width: '100%', 
          marginTop: '30px',
          marginBottom: '40px'
        }}>
          <ul style={{ 
            listStyle: 'none', 
            padding: 0, 
            display: 'flex', 
            flexDirection: 'column',
            gap: '0px',
            alignItems: 'center'
          }}>
            {payload.map((entry: any, index: number) => (
              <li 
                key={`item-${index}`}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer',
                  padding: '2px 0'
                }}
                onClick={() => handleLegendClick(entry.dataKey)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <img 
                    src={`/coin-logos/${entry.dataKey === 'ethereum' ? 'ETH' : 'PLS'}.svg`}
                    alt={entry.dataKey === 'ethereum' ? 'Ethereum' : 'PulseChain'}
                    style={{ width: '16px', height: '16px' }}
                  />
                  <span 
                    style={{ 
                      color: visibleLines[entry.dataKey as keyof typeof visibleLines] ? '#fff' : '#888',
                      fontSize: '12px'
                    }}
                  >
                    {entry.value} - Current: {entry.dataKey === 'ethereum' 
                      ? `$${tokenPrices?.ETH?.price ? calculateTransactionCost(gasData.data.ethereum.currentGasPriceGwei, tokenPrices.ETH.price).toPrecision(2) : '0.00'}`
                      : `$${tokenPrices?.PLS?.price ? calculateTransactionCost(gasData.data.pulsechain.currentGasPriceGwei, tokenPrices.PLS.price).toPrecision(2) : '0.00'}`}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl">Loading gas data...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !gasData) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-xl text-red-400">{error || 'Failed to load gas data'}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Current Gas Prices */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Ethereum */}
          <div className="bg-black rounded-xl p-6 border-2 border-white/10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                  src="/coin-logos/ETH.svg" 
                  alt="Ethereum" 
                  className="w-8 h-8"
                />
              </div>
              <h2 className="text-xl font-semibold hidden md:block">Ethereum</h2>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-indigo-400">
                {tokenPrices?.ETH?.price ? 
                  `$${calculateTransactionCost(gasData.data.ethereum.currentGasPriceGwei, tokenPrices.ETH.price).toPrecision(2)} USD` :
                  'Price loading...'
                }
              </div>
              <div className="text-sm text-gray-400">
                {gasData.data.ethereum.currentGasPriceGwei.toFixed(2)} Gwei
              </div>
            </div>
          </div>

          {/* PulseChain */}
          <div className="bg-black rounded-xl p-6 border-2 border-white/10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 flex items-center justify-center">
                <img 
                  src="/coin-logos/PLS.svg" 
                  alt="PulseChain" 
                  className="w-8 h-8"
                />
              </div>
              <h2 className="text-xl font-semibold hidden md:block">PulseChain</h2>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-pink-400">
                {tokenPrices?.PLS?.price ? 
                  `$${calculateTransactionCost(gasData.data.pulsechain.currentGasPriceGwei, tokenPrices.PLS.price).toPrecision(2)} USD` :
                  'Price loading...'
                }
              </div>
              <div className="text-sm text-gray-400">
                {Math.round(gasData.data.pulsechain.currentGasPriceGwei).toLocaleString('en-US', {maximumFractionDigits: 0})} Beats
              </div>
            </div>
          </div>
        </div>

        {/* Comparison and Gas Fee Table */}
        <div className="grid md:grid-cols-2 gap-6 items-start">
          {/* Gas Fee Comparison Table */}
          <div className="bg-black rounded-xl border-2 border-white/10 overflow-hidden order-2 md:order-none">
            <div className="grid grid-cols-3 gap-4 p-6 border-b border-white/10">
              <div className="text-gray-400 font-medium text-center">Current Fees</div>
              <div className="flex items-center justify-center space-x-2">
                <img src="/coin-logos/ETH.svg" alt="Ethereum" className="w-5 h-5" />
                <span className="font-medium hidden md:block">Ethereum</span>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <img src="/coin-logos/PLS.svg" alt="PulseChain" className="w-5 h-5" />
                <span className="font-medium hidden md:block">PulseChain</span>
              </div>
            </div>

            {[
              { name: 'Send Native', gas: 21000 },
              { name: 'Coin Approval', gas: 45000 },
              { name: 'Send Coin', gas: 65000 },
              { name: 'Stake HEX', gas: 90000 },
              { name: 'Bridge', gas: 114556 },
              { name: 'Swap', gas: 356190 },
              { name: 'Sell NFT', gas: 601953 },
            ].map((transaction, index) => {
              const ethCostUSD = tokenPrices?.ETH?.price ? 
                (gasData.data.ethereum.currentGasPriceGwei * transaction.gas / 1e9) * tokenPrices.ETH.price : 0;
              const plsCostUSD = tokenPrices?.PLS?.price ? 
                (gasData.data.pulsechain.currentGasPriceGwei * transaction.gas / 1e9) * tokenPrices.PLS.price : 0;
              const ethAmount = gasData.data.ethereum.currentGasPriceGwei * transaction.gas / 1e9;
              const plsAmount = gasData.data.pulsechain.currentGasPriceGwei * transaction.gas / 1e9;

              return (
                <div key={transaction.name} className="grid grid-cols-3 gap-4 p-6 border-b border-white/10 last:border-b-0">
                  <div className="text-center">
                    <div className="font-medium text-white">{transaction.name}</div>
                    <div className="text-sm text-gray-400">{transaction.gas.toLocaleString()} gas</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-indigo-400">${ethCostUSD.toPrecision(2)}</div>
                    <div className="text-sm text-gray-400">{ethAmount.toFixed(4)} ETH</div>
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-pink-400">${plsCostUSD.toPrecision(2)}</div>
                    <div className="text-sm text-gray-400">{Math.round(plsAmount).toLocaleString()} PLS</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison */}
          <div className="bg-black rounded-xl p-12 border-2 border-white/10 flex flex-col justify-center order-1 md:order-none">
            <div className="flex items-baseline">
              <div className="text-4xl font-bold text-green-400">
                {tokenPrices?.ETH?.price && tokenPrices?.PLS?.price ? (
                  Math.round(calculateTransactionCost(gasData.data.ethereum.currentGasPriceGwei, tokenPrices.ETH.price) / 
                      calculateTransactionCost(gasData.data.pulsechain.currentGasPriceGwei, tokenPrices.PLS.price)).toLocaleString()
                ) : (
                  'Calculating'
                )}
              </div>
              <div className="text-4xl font-bold text-green-400 mr-4">x</div>
              <div className="text-sm text-gray-400">
                {tokenPrices?.ETH?.price && tokenPrices?.PLS?.price ? (
                  `(-${(((calculateTransactionCost(gasData.data.ethereum.currentGasPriceGwei, tokenPrices.ETH.price) - 
                      calculateTransactionCost(gasData.data.pulsechain.currentGasPriceGwei, tokenPrices.PLS.price)) / 
                      calculateTransactionCost(gasData.data.ethereum.currentGasPriceGwei, tokenPrices.ETH.price)) * 100).toFixed(1)}%)`
                ) : (
                  'Calculating...'
                )}
              </div>
            </div>
            <div className="text-sm text-gray-400 mt-2">Cheaper than Ethereum</div>
          </div>
        </div>

        {/* Historical Chart */}
        {chartData.length > 0 && (
          <div className="w-full h-[550px] my-10 relative">
            <div className="w-full h-full p-8 border-2 border-white/10 rounded-xl">
              <h2 className="text-left text-white text-2xl mb-0 ml-10">
                Gas Price History (Last 24 hrs)
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
                    label={{ 
                      value: 'BLOCKS', 
                      position: 'bottom',
                      offset: 5,
                      style: { 
                        fill: '#888',
                        fontSize: 12,
                      }
                    }}
                  />
                  <YAxis 
                    scale="log"
                    domain={['dataMin', 'dataMax']}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#888', fontSize: 14, dx: -5}}
                    tickFormatter={(value) => `$${value.toPrecision(2)}`}
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
                            <p style={{ color: 'white', margin: 0, marginBottom: '8px', fontWeight: 'bold' }}>{label}</p>
                            <div style={{ color: '#ec4899', marginBottom: '4px' }}>
                              <div>PulseChain</div>
                              <div>${data.pulsechain?.toPrecision(2)}</div>
                              <div style={{ fontSize: '11px', color: '#888' }}>
                                {Math.round(data.pulsechainBeats).toLocaleString()} Beats
                              </div>
                            </div>
                            <div style={{ color: '#6366f1' }}>
                              <div>Ethereum</div>
                              <div>${data.ethereum?.toPrecision(2)}</div>
                              <div style={{ fontSize: '11px', color: '#888' }}>
                                {data.ethereumGwei?.toFixed(2)} Gwei
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend content={customLegend} />
                  <Line 
                    type="monotone" 
                    dataKey="ethereum" 
                    name="Ethereum"
                    dot={false} 
                    strokeWidth={2} 
                    stroke="rgba(99, 102, 241, 1)"
                    hide={!visibleLines.ethereum}
                    activeDot={{ r: 4, fill: 'rgba(99, 102, 241, 1)', stroke: 'white' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="pulsechain" 
                    name="PulseChain"
                    dot={false} 
                    strokeWidth={2} 
                    stroke="rgba(236, 72, 153, 1)"
                    hide={!visibleLines.pulsechain}
                    activeDot={{ r: 4, fill: 'rgba(236, 72, 153, 1)', stroke: 'white' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 