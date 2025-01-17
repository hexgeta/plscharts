import React from 'react';
import CombinedChartXs from '../components/CombinedChartXs';

const HexGains = () => {
  return (
    <div className="p-2 sm:p-4">
          <h1 className="text-white text-2xl font-bold mt-20 mb-8 text-center">Combined HEX gains in Xs</h1>
          <p className="text-white/60 text-center">A chart showing HEX gains from various points.</p>
      <CombinedChartXs/>
    </div>
  );
};

export default HexGains;