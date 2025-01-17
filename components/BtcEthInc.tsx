"use client"

import React, { useState, useEffect } from 'react'
// Remove these imports as we're not using them anymore
// import { ArrowUpIcon, ArrowDownIcon } from 'lucide-react'

interface CryptoData {
  symbol: string
  logo: string
  priceChange: number
  currentPrice: number
}

const fixedPrices = {
  'WBTC': 15466,
  'WETH': 884,
  'INC': 0.3940
}

const displayNames = {
  'WBTC': 'BTC',
  'WETH': 'ETH',
  'INC': 'INC'
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
            chainId: '1',
            logo: '/coin-logos/BTC.svg'
          },
          { 
            symbol: 'WETH', 
            pairAddress: '0x11b815efB8f581194ae79006d24E0d814B7697F6', 
            chainId: '1',
            logo: '/coin-logos/ETH.svg'
          },
          { 
            symbol: 'INC', 
            pairAddress: '0xf808Bb6265e9Ca27002c0A04562Bf50d4FE37EAA',
            chainId: '369',
            logo: '/coin-logos/INC.svg'
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
              logo: token.logo, // Use the local logo path
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
    if (symbol === 'INC') {
      return price.toFixed(2);
    } else {
      return Math.round(price).toLocaleString();
    }
  };

  return (
    <div className="bg-[#fff200] p-2 max-w-3xl mx-auto rounded-lg my-12">
      <div className="bg-black text-white p-4 sm:p-6 md:p-8 rounded-lg">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 md:mb-8 text-center">
          Price performance from the <span className="underline">local bottom</span>:
        </h2>
        <div className="flex flex-col sm:flex-row justify-around items-center space-y-6 sm:space-y-0">
          {cryptoData.map((crypto) => (
            <div key={crypto.symbol} className="text-center w-full sm:w-auto">
              <div className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-4 ${crypto.priceChange >= 0 ? 'text-[#00FF00]' : 'text-red-400'}`}>
                {crypto.priceChange >= 0 ? '+' : '-'}
                {Math.abs(Math.round(crypto.priceChange))}%
              </div>
              <div className="bg-black rounded-full w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 mx-auto mb-1 flex items-center justify-center">
                <img src={crypto.logo} alt={crypto.symbol} className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24" />
              </div>
              <div className="text-xl sm:text-2xl font-bold pt-2 sm:pt-4">
                {displayNames[crypto.symbol] || crypto.symbol}
              </div>
              <div className="text-base sm:text-lg">${formatPrice(crypto.symbol, crypto.currentPrice)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default PriceComparison;