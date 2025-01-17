"use client"

import React, { useState, useEffect } from 'react'

const PDAIPerformanceVisual: React.FC = () => {
  const [tokenData, setTokenData] = useState<{
    currentPrice: number;
    percentageToTarget: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const url = 'https://api.dexscreener.com/latest/dex/pairs/pulsechain/0xfC64556FAA683e6087F425819C7Ca3C558e13aC1';
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        
        const currentPrice = parseFloat(result.pair.priceUsd);
        const targetPrice = 1; // $1 target
        const percentageToTarget = ((targetPrice - currentPrice) / currentPrice) * 100;
        
        setTokenData({
          currentPrice,
          percentageToTarget
        });
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
          pDAI $1
        </div>
        <div className="text-center">
          <div className="bg-black rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <img src="/coin-logos/pDAI.svg" alt="pDAI" className="w-20 h-20" />
          </div>
          <div className="text-2xl font-bold mb-2">
            Current Price: ${tokenData.currentPrice.toFixed(3)}
          </div>
          <div className="text-3xl font-bold text-[#00FF00]">
            {`+${Math.round(tokenData.percentageToTarget).toLocaleString()}%`}
          </div>
          <div className="text-xl mt-2">until $1</div>
        </div>
      </div>
    </div>
  );
};

export default PDAIPerformanceVisual;