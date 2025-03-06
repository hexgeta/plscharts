import React from 'react';
import TokenRatioChart from '@/components/ratios';

const RatiosPage = () => {
  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">Token Price Ratio</h1>
      <p className="text-white/60 text-center">
        Track the price ratio between any two tokens over time. This tool allows you to compare the relative performance of different tokens and identify potential trading opportunities.
      </p>
      <div>
        <TokenRatioChart />
      </div>
    </div>
  );
};

export default RatiosPage;