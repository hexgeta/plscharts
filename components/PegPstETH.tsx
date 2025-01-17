"use client"

import React, { useState, useEffect } from 'react'

const PstETHPerformanceVisual: React.FC = () => {
  const [tokenData, setTokenData] = useState<{
    currentPrice: number;
    targetPrice: number;
    percentageToTarget: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pstethUrl = 'https://api.dexscreener.com/latest/dex/pairs/pulsechain/0x34243b6878cb49530B2B647F38AA26623dab2509';
        const wethUrl = 'https://api.dexscreener.com/latest/dex/pairs/ethereum/0x11b815efB8f581194ae79006d24E0d814B7697F6';
        
        const [pstethResponse, wethResponse] = await Promise.all([
          fetch(pstethUrl),
          fetch(wethUrl)
        ]);

        if (!pstethResponse.ok || !wethResponse.ok) {
          throw new Error(`HTTP error! status: ${pstethResponse.status || wethResponse.status}`);
        }

        const [pstethResult, wethResult] = await Promise.all([
          pstethResponse.json(),
          wethResponse.json()
        ]);
        
        // Debug logs updated for WETH
        console.log('Raw pstETH Response:', pstethResult);
        console.log('Raw WETH Response:', wethResult);
        
        if (!pstethResult?.pairs?.[0] || !wethResult?.pairs?.[0]) {
          console.error('Missing pairs data:', { pstethResult, wethResult });
          throw new Error('API response missing pairs data');
        }

        // Updated logging
        console.log('pstETH pair:', pstethResult.pairs[0]);
        console.log('WETH pair:', wethResult.pairs[0]);
        
        const currentPrice = parseFloat(pstethResult.pairs[0].priceUsd);
        const targetPrice = parseFloat(wethResult.pairs[0].priceUsd);
        
        console.log('Parsed prices:', { currentPrice, targetPrice });
        
        if (!currentPrice || isNaN(currentPrice) || !targetPrice || isNaN(targetPrice)) {
          console.error('Invalid price data:', { currentPrice, targetPrice });
          throw new Error('Invalid price data received');
        }
        
        const percentageToTarget = ((targetPrice - currentPrice) / currentPrice) * 100;
        
        setTokenData({
          currentPrice,
          targetPrice,
          percentageToTarget
        });
        setLoading(false);
      } catch (error) {
        console.error('Detailed error in fetchData:', error);
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

  if (!tokenData) {
    return <div className="text-center">No data available</div>
  }

  return (
    <div className="bg-gradient-to-br from-red-500 via-purple-500 to-blue-500 p-2 max-w-3xl mx-auto rounded-lg my-12">
      <div className="bg-black text-white p-8 rounded-lg">
        <h2 className="text-4xl font-bold mb-8 text-center">
          The journey to
        </h2>
        <div className="text-6xl font-bold text-center mb-8">
          pSTETH ${tokenData.targetPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div className="text-center">
          <div className="bg-black rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <img src="/coin-logos/pSTETH.svg" alt="pstETH" className="w-20 h-20" />
          </div>
          <div className="text-2xl font-bold mb-2">
            Current Price: ${tokenData.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          </div>
          <div className="text-3xl font-bold text-[#00FF00]">
            {`+${Math.round(tokenData.percentageToTarget).toLocaleString()}%`}
          </div>
          <div className="text-xl mt-2">until ${tokenData.targetPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
      </div>
    </div>
  );
};

export default PstETHPerformanceVisual;