import React from 'react';
import HEXPriceRatioChart from '../components/HEXPriceRatioChart';
import PlsPlsxRatioChart from '@/components/PlsPlsxRatioChart';
import HEXtoPLSRatioChart from '@/components/HexPlsRatio';

const PriceRatioChartPage: React.FC = () => {
  return (
    <div className="p-2 sm:p-4">
            <h1 className="text-2xl font-bold mt-10 mb-4 text-center">Ratios</h1>
            <p className="text-white/60 text-center">Chart showing key price ratios between different assets.</p>
      {/* <h1 className="text-white text-2xl font-bold mt-20 mb-4 text-center">eHEX:pHEX Price Ratio</h1>
      <HEXPriceRatioChart /> */}
      <PlsPlsxRatioChart/>
      <HEXtoPLSRatioChart/>
    </div>
  );
};

export default PriceRatioChartPage;