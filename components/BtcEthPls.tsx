"use client"

import React, { useState, useEffect } from 'react'
import { CoinLogo } from './ui/CoinLogo'
// Remove these imports as we're not using them anymore
// import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react'

interface CryptoData {
  symbol: string
  priceChange: number
  currentPrice: number
}

type CryptoDataMap = {
  [key: string]: CryptoData
}

const fixedPrices = {
  'WBTC': 15466,
  'WETH': 884,
  'PLS': 0.00003105
}

const displayNames = {
  'WBTC': 'BTC',
  'WETH': 'ETH',
  'PLS': 'PLS'
};

const PriceComparison: React.FC = () => {
  const [cryptoData, setCryptoData] = useState<CryptoData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tokens = [
          { 
            symbol: 'WBTC', 
            pairAddress: '0xCBCdF9626bC03E24f779434178A73a0B4bad62eD', 
            chainId: '1'
          },
          { 
            symbol: 'WETH', 
            pairAddress: '0x11b815efB8f581194ae79006d24E0d814B7697F6', 
            chainId: '1'
          },
          { 
            symbol: 'PLS', 
            pairAddress: '0x6753560538eca67617a9ce605178f788be7e524e', 
            chainId: '369'
          }
        ]
        const data = await Promise.all(
          tokens.map(async (token) => {
            const url = `https://api.dexscreener.com/latest/dex/pairs/${token.chainId === '1' ? 'ethereum' : 'pulsechain'}/${token.pairAddress}`;
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            console.log(`Data for ${token.symbol}:`, result);
            
            const pair = result.pair;
            if (!pair) {
              throw new Error(`No pair data found for ${token.symbol}`);
            }
            
            const currentPrice = parseFloat(pair.priceUsd);
            const fixedPrice = fixedPrices[token.symbol];
            const priceChange = ((currentPrice - fixedPrice) / fixedPrice) * 100;
            
            return {
              symbol: token.symbol,
              priceChange: priceChange,
              currentPrice: currentPrice
            };
          })
        );
        console.log("Processed data:", data);
        setCryptoData(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center">Loading...</div>
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>
  }

  if (cryptoData.length === 0) {
    return <div className="text-center">No data available</div>
  }

  const formatPrice = (symbol: string, price: number) => {
    if (symbol === 'PLS') {
      return price.toFixed(6);
    } else {
      return Math.round(price).toLocaleString();
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="bg-gradient-to-br from-red-500 via-purple-500 to-blue-500 p-2 max-w-3xl mx-auto rounded-lg my-12">
        <div className="bg-black text-white p-8 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {cryptoData.map((crypto) => (
              <div key={crypto.symbol} className="text-center">
                <div className="flex justify-center mb-4">
                  <CoinLogo 
                    symbol={displayNames[crypto.symbol]}
                    size="xl"
                    priority={true}
                  />
                </div>
                <div className="text-2xl font-bold mb-2">
                  {displayNames[crypto.symbol]}
                </div>
                <div className="text-xl mb-2">
                  ${formatPrice(crypto.symbol, crypto.currentPrice)}
                </div>
                <div className={`text-lg font-bold ${crypto.priceChange >= 0 ? 'text-[#00FF00]' : 'text-red-500'}`}>
                  {crypto.priceChange >= 0 ? '+' : ''}{Math.round(crypto.priceChange)}%
                </div>
                <div className="text-sm text-gray-400">
                  from ${formatPrice(crypto.symbol, fixedPrices[crypto.symbol])}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default PriceComparison;