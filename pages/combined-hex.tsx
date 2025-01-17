import React from 'react';
import CombinedHexChartSplit from '../components/CombinedHexChartSplit';
import CombinedHexChartMovingAvg from '../components/CombinedHexChartMovingAvg';


const CombinedHex = () => {
  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">Combined HEX Price Charts</h1>
      <p className="text-white/60 text-center">
      These charts plot the combined price of HEX (pHEX + eHEX). Useful too see if you held HEX prior to the PulseChain launch.
      </p>
      <CombinedHexChartMovingAvg/>
      <CombinedHexChartSplit/>
    </div>
  );
};

export default CombinedHex;