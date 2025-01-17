import React from 'react';
import VsGainsHEX from '../components/vsgainshex';
import VsGainsRHTickers from '../components/vsgainsrhtickers';
import VsGainsEverything from '../components/vsgainseverything';
import VsGainsTop20 from '../components/vsgainstop20';



const CryptoGains = () => {
  return (
    <div className='p-2 sm:p-4'>
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">Crypto Gains in Xs</h1>
      <p className="text-white/60 text-center">
        These charts plot performance of important assets against one another from their local lows or a custom date.
      </p> 
      <div>     
     <VsGainsTop20/>
     <VsGainsHEX/>
    <VsGainsRHTickers/>
     <VsGainsEverything/>
      </div>
    </div>
  );
};

export default CryptoGains;