import React from 'react';
import HEXLiquidityChart from '@/components/HEXLiquidityChart';
import EHEXLiquidityChart from '@/components/EHEXLiquidityChart';

const LiquidityChartPage: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">HEX Liquidity</h1>
      <p className="text-white/60 text-center">Charts showing HEX liquidity and price change over time.</p>
      <HEXLiquidityChart/>
      <EHEXLiquidityChart/>

    </div>
  );
};

export default LiquidityChartPage;