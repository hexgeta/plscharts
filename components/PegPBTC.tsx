"use client"

import React, { useState, useEffect } from 'react'
import { Skeleton } from "@/components/ui/skeleton2"

const PBTCPerformanceVisual: React.FC = () => {
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
        const pbtcUrl = 'https://api.dexscreener.com/latest/dex/pairs/pulsechain/0x46E27Ea3A035FfC9e6d6D56702CE3D208FF1e58c';
        const wbtcUrl = 'https://api.dexscreener.com/latest/dex/pairs/ethereum/0xCBCdF9626bC03E24f779434178A73a0B4bad62eD';
        
        const [pbtcResponse, wbtcResponse] = await Promise.all([
          fetch(pbtcUrl),
          fetch(wbtcUrl)
        ]);

        if (!pbtcResponse.ok || !wbtcResponse.ok) {
          throw new Error(`HTTP error! status: ${pbtcResponse.status || wbtcResponse.status}`);
        }

        const [pbtcResult, wbtcResult] = await Promise.all([
          pbtcResponse.json(),
          wbtcResponse.json()
        ]);
        
        // Debug logs
        console.log('Raw pBTC Response:', pbtcResult);
        console.log('Raw WBTC Response:', wbtcResult);
        
        if (!pbtcResult?.pairs?.[0] || !wbtcResult?.pairs?.[0]) {
          console.error('Missing pairs data:', { pbtcResult, wbtcResult });
          throw new Error('API response missing pairs data');
        }

        // Add more detailed logging
        console.log('pBTC pair:', pbtcResult.pairs[0]);
        console.log('WBTC pair:', wbtcResult.pairs[0]);
        
        const currentPrice = parseFloat(pbtcResult.pairs[0].priceUsd);
        const targetPrice = parseFloat(wbtcResult.pairs[0].priceUsd);
        
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
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-black p-6 rounded-lg border border-white/20">
        <div className="space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-4 w-full" />
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  if (!tokenData) {
    return <div>No data available</div>;
  }

  return (
    <div className="bg-gradient-to-br from-red-500 via-purple-500 to-blue-500 p-2 max-w-3xl mx-auto rounded-lg my-12">
      <div className="bg-black text-white p-8 rounded-lg">
        <h2 className="text-4xl font-bold mb-8 text-center">
          The journey to
        </h2>
        <div className="text-6xl font-bold text-center mb-8">
          pWBTC ${tokenData.targetPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
        <div className="text-center">
          <div className="bg-black rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <img src="/coin-logos/pWBTC.svg" alt="pBTC" className="w-20 h-20" />
          </div>
          <div className="text-2xl font-bold mb-2">
            Current Price: ${tokenData.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
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

export default PBTCPerformanceVisual;