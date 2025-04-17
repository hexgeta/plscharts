import React from 'react';
import PriceChart from '../components/AllPrices';
import PriceChartPLS from '../components/AllPricesPLS';
import PriceChartETH from '../components/AllPricesETH';
import { withAuth } from '@/components/withAuth';

const PricesPage = () => {
  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">Price Charts</h1>
      <p className="text-white/60 text-center">A chart showing pooled asset prices in a single view.</p>
      <div>
        {/* <PriceChart/> */}
        <PriceChartPLS/>
        <PriceChartETH/>
      </div>
    </div>
  );
};

export default withAuth(PricesPage);