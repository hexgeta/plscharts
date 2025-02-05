import React from 'react';
import TshareChart from '../components/TshareChart';
import TshareProjectionChart from '../components/TshareProjectionChart';
import TshareProjectionLeagues from '../components/TshareProjectionLeagues';
const TSharesPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">T-Share Statistics</h1>
        <TshareChart />
        <TshareProjectionChart />
        <TshareProjectionLeagues />
      </div>
    </div>
  );
};

export default TSharesPage; 