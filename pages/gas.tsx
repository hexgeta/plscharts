"use client"

import React from 'react';
import GasTable from '../components/GasTable';
import GasTableEth from '../components/GasTableEth';
import GasTableComparison from '../components/GasTableComparison';
import GasTableYearlySummary from '../components/GasTableYearlySummary';
import GasTableYearlySummaryPLS from '../components/GasTableYearlySummaryPLS';

const GasPage: React.FC = () => {
  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">Gas</h1>
      <p className="text-white/60 text-center mb-8">
        These tables detail the HEX end-stake gas costs across PulseChain and Ethereum as well as the cost savings of pooled HEX staking vs solo-staking.
      </p>
      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-1 text-left text-gray-400 ml-4">ETH vs PLS: Solo-staking end-stake comparison</h2>
        <GasTableComparison />
      </div>

      <div className="mb-12">
        <h2 className="text-xl font-semibold mb-4 text-left text-gray-400 ml-4">Solo vs pooled HEX staking</h2>
        <h3 className="text-l font-normal text-left text-gray-400 ml-4">PulseChain</h3>
        <GasTableYearlySummaryPLS />
        <GasTable />
      </div>

      <div className="mb-1">
        <h3 className="text-l font-normal text-left text-gray-400 ml-4">Ethereum</h3>
        <GasTableYearlySummary />
        <GasTableEth />
      </div>
    </div>
  );
};

export default GasPage; 