"use client"

import React from 'react';
import dynamic from 'next/dynamic';
import { withAuth } from '@/components/withAuth';

// Dynamically import components to prevent loading when not authenticated
const GasTable = dynamic(() => import('../components/GasTable'), { ssr: false });
const GasTableEth = dynamic(() => import('../components/GasTableEth'), { ssr: false });
const GasTableComparison = dynamic(() => import('../components/GasTableComparison'), { ssr: false });
const GasTableYearlySummary = dynamic(() => import('../components/GasTableYearlySummary'), { ssr: false });
const GasTableYearlySummaryPLS = dynamic(() => import('../components/GasTableYearlySummaryPLS'), { ssr: false });

const GasPage = () => {
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

export default withAuth(GasPage); 